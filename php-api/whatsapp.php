<?php
/**
 * HeritOS — WhatsApp (the brand's #1 channel: sales + support in one inbox).
 *
 *   GET  /whatsapp.php?action=threads                → conversations (one per phone)
 *   GET  /whatsapp.php?action=thread&phone=…         → full message history, marks inbound seen
 *   POST /whatsapp.php?action=send {phone, body, customer_id?, template?}
 *   POST /whatsapp.php?action=broadcast {body, segment?}   → blast a customer segment
 *   GET  /whatsapp.php?action=templates              → quick replies
 *   POST /whatsapp.php?action=template_save {id?, name, body}
 *   POST /whatsapp.php?action=template_delete {id}
 *   GET|POST /whatsapp.php?action=webhook            → Meta Cloud API webhook (PUBLIC)
 *
 * Sends go through wa_dispatch() in _lib.php: real Meta Cloud API when
 * WHATSAPP_TOKEN + WHATSAPP_PHONE_ID are set, else a logged wa.me fallback.
 * Staff-only except the webhook, which Meta calls unauthenticated.
 */
require __DIR__ . '/_lib.php';
cors();

$action = $_GET['action'] ?? 'threads';

/* ---- WEBHOOK (public — Meta calls this) ---------------------------------- */
if ($action === 'webhook') {
  // Verification handshake: echo hub.challenge when the verify token matches.
  if (method() === 'GET') {
    $mode = $_GET['hub_mode'] ?? ($_GET['hub.mode'] ?? '');
    $token = $_GET['hub_verify_token'] ?? ($_GET['hub.verify_token'] ?? '');
    $challenge = $_GET['hub_challenge'] ?? ($_GET['hub.challenge'] ?? '');
    if ($mode === 'subscribe' && $token !== '' && $token === cfg('WHATSAPP_VERIFY_TOKEN')) {
      header('Content-Type: text/plain');
      echo htmlspecialchars(preg_replace("/[^A-Za-z0-9_-]/", "", (string)$challenge), ENT_QUOTES, "UTF-8"); // Meta sends a plain token; nothing else is echoed
      exit;
    }
    http_response_code(403);
    exit;
  }

  // Inbound messages + delivery status updates. Meta signs every POST with
  // X-Hub-Signature-256 (HMAC-SHA256 of the raw body with the app secret). When
  // WA_APP_SECRET is set, unsigned or wrongly signed posts are refused, so nobody
  // can inject fake customer messages into the inbox. While it is not set the
  // webhook still works, and the server log carries a warning.
  $secret = (string)cfg('WA_APP_SECRET', '');
  if ($secret !== '') {
    $raw = (string)file_get_contents('php://input');
    $sig = (string)($_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '');
    $expected = 'sha256=' . hash_hmac('sha256', $raw, $secret);
    if ($sig === '' || !hash_equals($expected, $sig)) {
      http_response_code(403);
      exit;
    }
  } else {
    error_log('HeritOS whatsapp.php: WA_APP_SECRET is not set; webhook signatures are not checked.');
  }
  $b = body();
  try {
    foreach (($b['entry'] ?? []) as $entry) {
      foreach (($entry['changes'] ?? []) as $change) {
        $value = $change['value'] ?? [];
        // Inbound messages from customers.
        foreach (($value['messages'] ?? []) as $msg) {
          $from = wa_normalize_phone($msg['from'] ?? '');
          $text = $msg['text']['body'] ?? ('[' . ($msg['type'] ?? 'message') . ']');
          $waId = $msg['id'] ?? null;
          if ($from === '') continue;
          // Link to a known customer by phone tail.
          $custId = null;
          $cstmt = $conn->prepare("SELECT id FROM customers WHERE deleted_at IS NULL AND RIGHT(REGEXP_REPLACE(phone,'[^0-9]',''),9) = RIGHT(?,9) LIMIT 1");
          $cstmt->bind_param('s', $from);
          $cstmt->execute();
          if ($row = $cstmt->get_result()->fetch_assoc()) $custId = (int)$row['id'];
          $dir = 'in'; $status = 'delivered';
          $ins = $conn->prepare('INSERT INTO whatsapp_messages (customer_id, phone, direction, body, status, wa_message_id) VALUES (?,?,?,?,?,?)');
          $ins->bind_param('isssss', $custId, $from, $dir, $text, $status, $waId);
          $ins->execute();
        }
        // Delivery/read receipts for our outbound messages.
        foreach (($value['statuses'] ?? []) as $st) {
          $waId = $st['id'] ?? '';
          $status = $st['status'] ?? '';
          if ($waId !== '' && in_array($status, ['sent', 'delivered', 'read', 'failed'], true)) {
            $u = $conn->prepare('UPDATE whatsapp_messages SET status = ? WHERE wa_message_id = ?');
            $u->bind_param('ss', $status, $waId);
            $u->execute();
          }
        }
      }
    }
  } catch (\Throwable $e) { /* never 500 a webhook — Meta will retry-storm */ }
  json(['ok' => true]);
}

/* ---- Everything below is staff-only -------------------------------------- */
$STAFF = ['super_admin', 'admin', 'manager', 'seller', 'editor', 'employee'];
$user = require_auth($STAFF);

/* ---- THREADS ------------------------------------------------------------- */
if ($action === 'threads' && method() === 'GET') {
  $rows = [];
  $sql = "SELECT m.phone,
                 MAX(m.created_at) AS last_at,
                 SUM(m.direction = 'in' AND m.seen = 0) AS unread,
                 (SELECT x.body FROM whatsapp_messages x WHERE x.phone = m.phone ORDER BY x.id DESC LIMIT 1) AS last_body,
                 (SELECT x.direction FROM whatsapp_messages x WHERE x.phone = m.phone ORDER BY x.id DESC LIMIT 1) AS last_dir,
                 (SELECT c.name FROM customers c
                    WHERE c.id = (SELECT x2.customer_id FROM whatsapp_messages x2
                                   WHERE x2.phone = m.phone AND x2.customer_id IS NOT NULL
                                   ORDER BY x2.id DESC LIMIT 1)) AS customer_name
            FROM whatsapp_messages m
        GROUP BY m.phone
        ORDER BY last_at DESC";
  $res = $conn->query($sql);
  while ($res && $row = $res->fetch_assoc()) {
    $rows[] = [
      'phone' => $row['phone'],
      'customer_name' => $row['customer_name'],
      'last_body' => $row['last_body'],
      'last_dir' => $row['last_dir'],
      'last_at' => $row['last_at'],
      'unread' => (int)$row['unread'],
    ];
  }
  json($rows);
}

/* ---- THREAD (history) ---------------------------------------------------- */
if ($action === 'thread' && method() === 'GET') {
  $phone = wa_normalize_phone($_GET['phone'] ?? '');
  if ($phone === '') fail('phone is required');

  $msgs = [];
  $stmt = $conn->prepare('SELECT id, direction, body, status, template, created_at FROM whatsapp_messages WHERE phone = ? ORDER BY id ASC');
  $stmt->bind_param('s', $phone);
  $stmt->execute();
  $r = $stmt->get_result();
  while ($row = $r->fetch_assoc()) $msgs[] = $row;

  // Mark inbound as seen now that staff has opened the thread.
  $conn->query("UPDATE whatsapp_messages SET seen = 1 WHERE phone = '" . $conn->real_escape_string($phone) . "' AND direction = 'in' AND seen = 0");

  // Best-effort customer name.
  $name = null;
  $cstmt = $conn->prepare("SELECT name FROM customers WHERE deleted_at IS NULL AND RIGHT(REGEXP_REPLACE(phone,'[^0-9]',''),9) = RIGHT(?,9) LIMIT 1");
  $cstmt->bind_param('s', $phone);
  $cstmt->execute();
  if ($row = $cstmt->get_result()->fetch_assoc()) $name = $row['name'];

  json(['phone' => $phone, 'customer_name' => $name, 'messages' => $msgs]);
}

/* ---- SEND ---------------------------------------------------------------- */
if ($action === 'send' && method() === 'POST') {
  $b = body();
  $phone = trim($b['phone'] ?? '');
  $text = trim($b['body'] ?? '');
  $template = trim($b['template'] ?? '') ?: null;
  if ($phone === '' || $text === '') fail('phone and body are required');

  $customerId = isset($b['customer_id']) && $b['customer_id'] !== '' ? (int)$b['customer_id'] : null;
  if (!$customerId) {
    $norm = wa_normalize_phone($phone);
    $cstmt = $conn->prepare("SELECT id FROM customers WHERE deleted_at IS NULL AND RIGHT(REGEXP_REPLACE(phone,'[^0-9]',''),9) = RIGHT(?,9) LIMIT 1");
    $cstmt->bind_param('s', $norm);
    $cstmt->execute();
    if ($row = $cstmt->get_result()->fetch_assoc()) $customerId = (int)$row['id'];
  }

  $res = wa_dispatch($phone, $text, $customerId, $template, $user['id']);
  audit($user['id'], 'whatsapp_send', 'customer', $customerId, ['phone' => $res['phone'], 'status' => $res['status']]);
  json($res);
}

/* ---- BROADCAST ----------------------------------------------------------- */
if ($action === 'broadcast' && method() === 'POST') {
  // Owner decision D-024 (K-11): broadcasts reach customers who never opted in,
  // so they stay off until a recorded marketing opt-in exists. One-to-one
  // service messages (send) are unchanged.
  require_auth();
  fail('Promotional messages are switched off until customers can opt in (D-024).', 403);
  $b = body();
  $text = trim($b['body'] ?? '');
  $segment = trim($b['segment'] ?? '');
  if ($text === '') fail('body is required');

  if ($segment !== '' && $segment !== 'all') {
    $stmt = $conn->prepare("SELECT id, name, phone FROM customers WHERE deleted_at IS NULL AND phone <> '' AND segment = ? LIMIT 500");
    $stmt->bind_param('s', $segment);
  } else {
    $stmt = $conn->prepare("SELECT id, name, phone FROM customers WHERE deleted_at IS NULL AND phone <> '' LIMIT 500");
  }
  $stmt->execute();
  $res = $stmt->get_result();

  $sent = 0; $manual = 0; $failed = 0; $links = [];
  while ($row = $res->fetch_assoc()) {
    $personal = str_replace('{name}', explode(' ', trim($row['name']))[0] ?: 'there', $text);
    $d = wa_dispatch($row['phone'], $personal, (int)$row['id'], 'broadcast', $user['id']);
    if ($d['status'] === 'sent') $sent++;
    elseif ($d['status'] === 'manual') { $manual++; if (count($links) < 100) $links[] = ['name' => $row['name'], 'wa_link' => $d['wa_link']]; }
    else $failed++;
  }
  audit($user['id'], 'whatsapp_broadcast', null, null, ['segment' => $segment ?: 'all', 'sent' => $sent, 'manual' => $manual, 'failed' => $failed]);
  json(['ok' => true, 'sent' => $sent, 'manual' => $manual, 'failed' => $failed, 'links' => $links]);
}

/* ---- TEMPLATES ----------------------------------------------------------- */
if ($action === 'templates' && method() === 'GET') {
  $rows = [];
  $res = $conn->query('SELECT id, name, body FROM whatsapp_templates ORDER BY name');
  while ($res && $row = $res->fetch_assoc()) $rows[] = $row;
  json($rows);
}

if ($action === 'template_save' && method() === 'POST') {
  $b = body();
  $name = trim($b['name'] ?? '');
  $tbody = trim($b['body'] ?? '');
  if ($name === '' || $tbody === '') fail('name and body are required');
  $id = isset($b['id']) && $b['id'] !== '' ? (int)$b['id'] : 0;
  if ($id) {
    $stmt = $conn->prepare('UPDATE whatsapp_templates SET name = ?, body = ? WHERE id = ?');
    $stmt->bind_param('ssi', $name, $tbody, $id);
  } else {
    $stmt = $conn->prepare('INSERT INTO whatsapp_templates (name, body) VALUES (?,?)
                            ON DUPLICATE KEY UPDATE body = VALUES(body)');
    $stmt->bind_param('ss', $name, $tbody);
  }
  $stmt->execute();
  json(['ok' => true]);
}

if ($action === 'template_delete' && method() === 'POST') {
  $b = body();
  $id = (int)($b['id'] ?? 0);
  $stmt = $conn->prepare('DELETE FROM whatsapp_templates WHERE id = ?');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  json(['ok' => true]);
}

fail('Unknown action', 404);
