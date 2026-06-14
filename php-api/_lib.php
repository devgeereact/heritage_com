<?php
/**
 * HeritOS — shared API helpers. Every endpoint does `require '_lib.php';`
 * (which itself requires config.php and gives us $conn).
 */
require __DIR__ . '/config.php';

// config.php connected with mysqli exceptions OFF (so a bad connection returns
// clean JSON, not a fatal). Now that we're connected, turn them ON so any
// query/prepare error THROWS instead of silently returning false — a missing
// table or bad column then surfaces as a clean 500, never an empty [] or a
// raw fatal with a stack trace.
if (function_exists('mysqli_report')) {
  mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
}

$__debug = defined('GK_DEBUG') && GK_DEBUG;

// Emit CORS headers RIGHT NOW, before any query can fail. Previously these were
// only sent when an endpoint called cors() — so a server-side 500 (thrown by the
// exception handler below) carried no Access-Control-Allow-Origin, and the
// browser reported a generic "Failed to fetch" instead of the real JSON error.
// Sending them up front means even a 500 is readable cross-origin.
cors_headers();

// Any uncaught error/exception (including "prepare() returned false" Errors)
// becomes a clean JSON 500. Detail is only included when GK_DEBUG is on.
set_exception_handler(function ($e) use ($__debug) {
  cors_headers(); // safe to re-call; header() just overwrites
  if (!headers_sent()) {
    http_response_code(500);
    header('Content-Type: application/json');
  }
  echo json_encode([
    'error' => 'Server error',
    'detail' => $__debug ? ($e->getMessage()) : null,
  ]);
  exit;
});

/** Emit just the CORS response headers (no OPTIONS short-circuit). */
function cors_headers() {
  if (headers_sent()) return;
  // Production is same-origin (no Origin header). In dev, Vite may pick any
  // localhost port (auto-port), so reflect any localhost/127.0.0.1 origin, plus
  // whatever CORS_ORIGIN is configured to. Anything else is not allowed.
  $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
  $allowed = $origin !== '' && (
    $origin === CORS_ORIGIN ||
    preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#', $origin)
  );
  header('Access-Control-Allow-Origin: ' . ($allowed ? $origin : CORS_ORIGIN));
  header('Vary: Origin');
  header('Access-Control-Allow-Credentials: true');
  header('Access-Control-Allow-Headers: Content-Type, Authorization');
  header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
}

/** Emit CORS headers and short-circuit pre-flight OPTIONS. */
function cors() {
  cors_headers();
  if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
}

/** Send a JSON response and stop. */
function json($data, $code = 200) {
  http_response_code($code);
  header('Content-Type: application/json');
  echo json_encode($data);
  exit;
}

function fail($msg, $code = 400) { json(['error' => $msg], $code); }

/** Decode the JSON request body to an associative array. */
function body() {
  $raw = file_get_contents('php://input');
  $d = json_decode($raw, true);
  return is_array($d) ? $d : [];
}

function method() { return $_SERVER['REQUEST_METHOD']; }

/**
 * Read a config value that may be defined either as a constant (define('SMTP_HOST',…))
 * or as a plain global variable ($SMTP_HOST = …) in config.php — so both styles work.
 * Returns $default when neither is set or the value is an empty string.
 */
function cfg($name, $default = '') {
  if (defined($name)) { $v = constant($name); return ($v === '' || $v === null) ? $default : $v; }
  if (array_key_exists($name, $GLOBALS)) { $v = $GLOBALS[$name]; return ($v === '' || $v === null) ? $default : $v; }
  return $default;
}

/** Read the Bearer token from the Authorization header. */
function bearer() {
  $h = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
  if (preg_match('/Bearer\s+(.+)/i', $h, $m)) return trim($m[1]);
  return null;
}

/**
 * Require a valid session token; returns the user row (id, name, email, role).
 * Pass a list of allowed roles to gate by role (server-side, never trust client).
 */
function require_auth($roles = null) {
  global $conn;
  $tok = bearer();
  if (!$tok) fail('Not authenticated', 401);
  $stmt = $conn->prepare(
    'SELECT u.id, u.name, u.email, u.role
       FROM auth_tokens t JOIN users u ON u.id = t.user_id
      WHERE t.token = ? AND t.expires_at > NOW() AND u.deleted_at IS NULL'
  );
  $stmt->bind_param('s', $tok);
  $stmt->execute();
  $res = $stmt->get_result();
  $user = $res->fetch_assoc();
  if (!$user) fail('Session expired', 401);
  if ($roles && !in_array($user['role'], (array)$roles, true)) fail('Forbidden', 403);
  return $user;
}

/* ---- WhatsApp (shared so any endpoint can fire a notification) ------------ */

/** Normalise a phone to digits in international form. NG local 0XXXXXXXXXX and
 * bare 10-digit numbers are assumed Nigerian (+234). */
function wa_normalize_phone($p) {
  $d = preg_replace('/\D/', '', (string)$p);
  if ($d === '') return '';
  if (strlen($d) === 11 && $d[0] === '0') $d = '234' . substr($d, 1);
  elseif (strlen($d) === 10)             $d = '234' . $d;
  return $d;
}

/** POST a plain-text message via the Meta WhatsApp Cloud API. Returns decoded JSON or null. */
function wa_cloud_send($phoneId, $token, $to, $body) {
  $url = 'https://graph.facebook.com/v21.0/' . $phoneId . '/messages';
  $payload = json_encode([
    'messaging_product' => 'whatsapp', 'to' => $to, 'type' => 'text',
    'text' => ['preview_url' => true, 'body' => $body],
  ]);
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_POSTFIELDS => $payload,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token, 'Content-Type: application/json'],
    CURLOPT_TIMEOUT => 20,
  ]);
  $raw = curl_exec($ch);
  curl_close($ch);
  return $raw ? json_decode($raw, true) : null;
}

/**
 * Send (or queue) a WhatsApp message and log it. Cloud API when configured,
 * otherwise a 'manual' log row + a wa.me click-to-send link. Best-effort and
 * non-fatal: a missing token, dead network or absent table never breaks the
 * caller (so order/checkout flows stay safe to notify from).
 */
function wa_dispatch($phone, $body, $customerId = null, $template = null, $createdBy = null) {
  global $conn;
  $to = wa_normalize_phone($phone);
  if ($to === '' || trim((string)$body) === '') return ['ok' => false, 'error' => 'no phone or body'];

  $token = cfg('WHATSAPP_TOKEN');
  $phoneId = cfg('WHATSAPP_PHONE_ID');
  $status = 'manual'; $waId = null; $error = null; $ok = false;

  if ($token && $phoneId) {
    try {
      $resp = wa_cloud_send($phoneId, $token, $to, $body);
      if ($resp && !empty($resp['messages'][0]['id'])) { $status = 'sent'; $waId = $resp['messages'][0]['id']; $ok = true; }
      else { $status = 'failed'; $error = substr(is_array($resp) ? json_encode($resp['error'] ?? $resp) : 'send failed', 0, 240); }
    } catch (\Throwable $e) { $status = 'failed'; $error = substr($e->getMessage(), 0, 240); }
  }

  try {
    $dir = 'out';
    $stmt = $conn->prepare(
      'INSERT INTO whatsapp_messages (customer_id, phone, direction, body, template, status, wa_message_id, error, created_by)
       VALUES (?,?,?,?,?,?,?,?,?)'
    );
    $stmt->bind_param('isssssssi', $customerId, $to, $dir, $body, $template, $status, $waId, $error, $createdBy);
    $stmt->execute();
  } catch (\Throwable $e) { /* table may not exist yet — logging is best-effort */ }

  return ['ok' => $ok, 'status' => $status, 'wa_message_id' => $waId, 'phone' => $to,
          'wa_link' => 'https://wa.me/' . $to . '?text=' . rawurlencode($body)];
}

/* ---- Coupons (shared by coupons.php validate + store.php checkout) -------- */

/**
 * Evaluate a coupon code against a goods subtotal + shipping. Single source of
 * truth so the storefront's live quote and the server's authoritative checkout
 * price can never disagree. Returns:
 *   ['ok'=>true, 'coupon_id', 'code', 'type', 'value', 'discount', 'free_ship', 'description']
 *   ['ok'=>false, 'error'=>'…']
 * discount is the ₦ taken off goods (free_ship returns discount=0, free_ship=true).
 */
function coupon_eval($code, $subtotal, $shipping = 0) {
  global $conn;
  $code = strtoupper(trim((string)$code));
  if ($code === '') return ['ok' => false, 'error' => 'Enter a code'];

  $stmt = $conn->prepare('SELECT * FROM coupons WHERE UPPER(code) = ? LIMIT 1');
  $stmt->bind_param('s', $code);
  $stmt->execute();
  $c = $stmt->get_result()->fetch_assoc();
  if (!$c) return ['ok' => false, 'error' => 'That code is not valid'];
  if (!(int)$c['active']) return ['ok' => false, 'error' => 'That code is no longer active'];

  $today = date('Y-m-d');
  if (!empty($c['starts_at']) && $today < $c['starts_at']) return ['ok' => false, 'error' => 'That code is not active yet'];
  if (!empty($c['expires_at']) && $today > $c['expires_at']) return ['ok' => false, 'error' => 'That code has expired'];
  if ((int)$c['usage_limit'] > 0 && (int)$c['used'] >= (int)$c['usage_limit']) return ['ok' => false, 'error' => 'That code has been fully used'];

  $subtotal = (float)$subtotal;
  if ($subtotal < (float)$c['min_spend']) {
    return ['ok' => false, 'error' => 'Spend ₦' . number_format((float)$c['min_spend']) . ' to use this code'];
  }

  $discount = 0; $freeShip = false;
  if ($c['type'] === 'percent')        $discount = round($subtotal * ((float)$c['value']) / 100, 2);
  elseif ($c['type'] === 'fixed')      $discount = min((float)$c['value'], $subtotal);
  elseif ($c['type'] === 'free_ship') { $freeShip = true; $discount = 0; }

  return [
    'ok' => true, 'coupon_id' => (int)$c['id'], 'code' => $c['code'], 'type' => $c['type'],
    'value' => (float)$c['value'], 'discount' => $discount, 'free_ship' => $freeShip,
    'description' => $c['description'], 'shipping_saved' => $freeShip ? (float)$shipping : 0,
  ];
}

/* ---- Store credit (loyalty / refunds-as-credit / goodwill) ---------------- */

/** A customer's store-credit balance = SUM of their ledger deltas. */
function credit_balance($customerId) {
  global $conn;
  $customerId = (int)$customerId;
  if (!$customerId) return 0.0;
  $row = $conn->query('SELECT COALESCE(SUM(delta),0) AS bal FROM store_credit WHERE customer_id = ' . $customerId)->fetch_assoc();
  return (float)($row['bal'] ?? 0);
}

/** Append a ledger row (positive = earn, negative = redeem). Best-effort. */
function credit_add($customerId, $delta, $reason = 'adjust', $ref = null, $note = null, $createdBy = null) {
  global $conn;
  $customerId = (int)$customerId;
  if (!$customerId || (float)$delta === 0.0) return false;
  try {
    $stmt = $conn->prepare('INSERT INTO store_credit (customer_id, delta, reason, ref, note, created_by) VALUES (?,?,?,?,?,?)');
    $d = (float)$delta;
    $stmt->bind_param('idsssi', $customerId, $d, $reason, $ref, $note, $createdBy);
    $stmt->execute();
    return true;
  } catch (\Throwable $e) { return false; }
}

/** Find a customer id by phone (last-9-digit match). 0 if none. */
function customer_id_by_phone($phone) {
  global $conn;
  $norm = preg_replace('/\D/', '', (string)$phone);
  if ($norm === '') return 0;
  $stmt = $conn->prepare("SELECT id FROM customers WHERE deleted_at IS NULL AND RIGHT(REGEXP_REPLACE(phone,'[^0-9]',''),9) = RIGHT(?,9) LIMIT 1");
  $stmt->bind_param('s', $norm);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();
  return $row ? (int)$row['id'] : 0;
}

/* ---- Referrals ("give ₦, get ₦") ----------------------------------------- */

/** Get a customer's referral code, generating + persisting one if absent. */
function ensure_referral_code($customerId) {
  global $conn;
  $customerId = (int)$customerId;
  if (!$customerId) return null;
  $row = $conn->query('SELECT name, referral_code FROM customers WHERE id = ' . $customerId)->fetch_assoc();
  if (!$row) return null;
  if (!empty($row['referral_code'])) return $row['referral_code'];

  // Base on the first name + a short random tail; retry on collision.
  $base = strtoupper(preg_replace('/[^A-Za-z]/', '', explode(' ', trim($row['name']))[0] ?? 'HERIT'));
  $base = substr($base ?: 'HERIT', 0, 8);
  for ($i = 0; $i < 6; $i++) {
    $code = $base . strtoupper(bin2hex(random_bytes(2)));   // e.g. ADAOKAFOR + 4 hex
    $stmt = $conn->prepare('UPDATE customers SET referral_code = ? WHERE id = ? AND (referral_code IS NULL OR referral_code = "")');
    $stmt->bind_param('si', $code, $customerId);
    try { $stmt->execute(); if ($stmt->affected_rows > 0) return $code; }
    catch (\Throwable $e) { /* unique collision — try another tail */ }
    // Re-read in case a concurrent call set it.
    $r2 = $conn->query('SELECT referral_code FROM customers WHERE id = ' . $customerId)->fetch_assoc();
    if (!empty($r2['referral_code'])) return $r2['referral_code'];
  }
  return null;
}

/** Find the customer who owns a referral code. 0 if none. */
function referrer_by_code($code) {
  global $conn;
  $code = strtoupper(trim((string)$code));
  if ($code === '') return 0;
  $stmt = $conn->prepare('SELECT id FROM customers WHERE UPPER(referral_code) = ? AND deleted_at IS NULL LIMIT 1');
  $stmt->bind_param('s', $code);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();
  return $row ? (int)$row['id'] : 0;
}

/**
 * Settle a referral once its order is genuinely paid: credit both the referrer
 * and the new customer, then mark it settled so it can never double-pay. Safe to
 * call repeatedly (idempotent via referral_settled). Returns true if it paid out.
 */
function referral_settle($orderId) {
  global $conn;
  $orderId = (int)$orderId;
  $reward = (float)cfg('REFERRAL_REWARD', 0);
  if (!$orderId || $reward <= 0) return false;

  $o = $conn->query("SELECT id, code, customer_id, referrer_id, referral_settled FROM orders WHERE id = $orderId AND deleted_at IS NULL")->fetch_assoc();
  if (!$o || (int)$o['referral_settled'] || !$o['referrer_id'] || !$o['customer_id']) return false;
  if ((int)$o['referrer_id'] === (int)$o['customer_id']) return false;

  // Mark settled FIRST (and only if still unsettled) to avoid a double payout
  // under concurrent calls; only credit if we actually flipped it.
  $upd = $conn->query("UPDATE orders SET referral_settled = 1 WHERE id = $orderId AND referral_settled = 0");
  if ($conn->affected_rows < 1) return false;

  credit_add((int)$o['referrer_id'], $reward, 'referral', $o['code'], 'Referral reward — friend ordered');
  credit_add((int)$o['customer_id'], $reward, 'referral', $o['code'], 'Welcome referral credit');
  return true;
}

/** Write a row to the audit log. */
function audit($userId, $action, $entity = null, $entityId = null, $meta = null) {
  global $conn;
  $m = $meta ? json_encode($meta) : null;
  $stmt = $conn->prepare(
    'INSERT INTO audit_log (user_id, action, entity, entity_id, meta) VALUES (?,?,?,?,?)'
  );
  $stmt->bind_param('issis', $userId, $action, $entity, $entityId, $m);
  $stmt->execute();
}
