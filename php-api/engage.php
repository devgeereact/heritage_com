<?php
/**
 * HeritOS — Re-engagement (restock waitlist + abandoned-cart recovery).
 *
 *   GET  /engage.php?action=waitlist                 → who's waiting, by piece
 *   POST /engage.php?action=waitlist_notify {slug?, product?, message?}
 *                                                    → WhatsApp the waiters, mark notified
 *   GET  /engage.php?action=abandoned                → unrecovered carts (>20 min old)
 *   POST /engage.php?action=abandoned_nudge&id=N {message?}
 *                                                    → WhatsApp one cart, mark nudged
 *
 * Messaging goes through wa_dispatch() (Cloud API or wa.me fallback). Staff-only.
 */
require __DIR__ . '/_lib.php';
cors();

$STAFF = ['super_admin', 'admin', 'manager', 'editor'];
$user = require_auth($STAFF);

$action = $_GET['action'] ?? 'waitlist';

/* ---- WAITLIST ------------------------------------------------------------ */
if ($action === 'waitlist' && method() === 'GET') {
  $rows = [];
  $res = $conn->query(
    "SELECT id, product, slug, size, customer_name, phone, email, notified, created_at, notified_at
       FROM waitlist ORDER BY notified ASC, id DESC"
  );
  while ($res && $row = $res->fetch_assoc()) $rows[] = $row;

  // Summary by piece (waiting = not yet notified).
  $summary = [];
  $sres = $conn->query(
    "SELECT COALESCE(NULLIF(slug,''), product) AS key_ref, product, slug,
            SUM(notified = 0) AS waiting, COUNT(*) AS total
       FROM waitlist GROUP BY key_ref ORDER BY waiting DESC"
  );
  while ($sres && $row = $sres->fetch_assoc()) {
    $summary[] = ['ref' => $row['key_ref'], 'product' => $row['product'], 'slug' => $row['slug'],
                  'waiting' => (int)$row['waiting'], 'total' => (int)$row['total']];
  }
  json(['summary' => $summary, 'rows' => $rows]);
}

if ($action === 'waitlist_notify' && method() === 'POST') {
  // Owner decision D-024 (K-11): no promotional WhatsApp sends until a recorded
  // marketing opt-in exists. Lists stay readable; nothing is sent.
  fail('Promotional messages are switched off until customers can opt in (D-024).', 403);
  $b = body();
  $slug = trim($b['slug'] ?? '');
  $product = trim($b['product'] ?? '');
  $custom = trim($b['message'] ?? '');
  if ($slug === '' && $product === '') fail('Which piece?');

  if ($slug !== '') {
    $stmt = $conn->prepare("SELECT * FROM waitlist WHERE slug = ? AND notified = 0");
    $stmt->bind_param('s', $slug);
  } else {
    $stmt = $conn->prepare("SELECT * FROM waitlist WHERE product = ? AND notified = 0");
    $stmt->bind_param('s', $product);
  }
  $stmt->execute();
  $res = $stmt->get_result();

  $sent = 0; $manual = 0; $links = []; $ids = [];
  while ($w = $res->fetch_assoc()) {
    $ids[] = (int)$w['id'];
    if (trim((string)$w['phone']) === '') continue;
    $first = explode(' ', trim($w['customer_name'] ?? ''))[0] ?: 'there';
    $piece = $w['product'] ?: 'the piece you wanted';
    $msg = $custom !== '' ? $custom
      : "Good news {$first}! {$piece}" . ($w['size'] ? " (size {$w['size']})" : '') . " is back in stock at Herit Clothing. Shop it before it goes: https://heritclothing.com/shop";
    $d = wa_dispatch($w['phone'], $msg, $w['customer_id'] ? (int)$w['customer_id'] : null, 'restock', $user['id']);
    if ($d['status'] === 'sent') $sent++;
    elseif ($d['status'] === 'manual') { $manual++; if (count($links) < 100) $links[] = ['name' => $w['customer_name'], 'wa_link' => $d['wa_link']]; }
  }
  if ($ids) {
    $in = implode(',', $ids);
    $conn->query("UPDATE waitlist SET notified = 1, notified_at = NOW() WHERE id IN ($in)");
  }
  audit($user['id'], 'waitlist_notify', null, null, ['slug' => $slug, 'product' => $product, 'sent' => $sent, 'manual' => $manual]);
  json(['ok' => true, 'sent' => $sent, 'manual' => $manual, 'count' => count($ids), 'links' => $links]);
}

/* ---- ABANDONED CARTS ----------------------------------------------------- */
if ($action === 'abandoned' && method() === 'GET') {
  $rows = [];
  // Older than 20 minutes + still unrecovered = genuinely abandoned.
  $res = $conn->query(
    "SELECT id, phone, customer_name, email, items, subtotal, nudged, created_at, updated_at
       FROM abandoned_carts
      WHERE recovered = 0 AND updated_at < (NOW() - INTERVAL 20 MINUTE)
      ORDER BY updated_at DESC LIMIT 200"
  );
  while ($res && $row = $res->fetch_assoc()) {
    $row['items'] = $row['items'] ? json_decode($row['items'], true) : [];
    $rows[] = $row;
  }
  json($rows);
}

if ($action === 'abandoned_nudge' && method() === 'POST') {
  fail('Promotional messages are switched off until customers can opt in (D-024).', 403);   // D-024 (K-11)
  $id = (int)($_GET['id'] ?? 0);
  $b = body();
  $custom = trim($b['message'] ?? '');
  $stmt = $conn->prepare('SELECT * FROM abandoned_carts WHERE id = ?');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $c = $stmt->get_result()->fetch_assoc();
  if (!$c) fail('Cart not found', 404);
  if (trim((string)$c['phone']) === '') fail('No phone on this cart');

  $first = explode(' ', trim($c['customer_name'] ?? ''))[0] ?: 'there';
  $msg = $custom !== '' ? $custom
    : "Hi {$first}, you left some lovely pieces in your basket at Herit Clothing 🌿 Still want them? Finish up here: https://heritclothing.com/checkout — we're happy to help on WhatsApp.";
  $cid = customer_id_by_phone($c['phone']);
  $d = wa_dispatch($c['phone'], $msg, $cid ?: null, 'abandoned_cart', $user['id']);
  $stmt = $conn->prepare('UPDATE abandoned_carts SET nudged = 1 WHERE id = ?');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  audit($user['id'], 'abandoned_nudge', null, $id, ['status' => $d['status']]);
  json($d);
}

fail('Unknown action', 404);
