<?php
/**
 * HeritOS — Customer self-service portal (public, customer-authenticated).
 *
 * Login is knowledge-based: phone + any of the customer's real order codes →
 * a random expiring token. No password, no SMS/OTP infra. (Upgrade path: send a
 * one-time code over WhatsApp via wa_dispatch and verify that instead.)
 *
 *   POST /account.php?action=login {phone, order_code}     → {token, name}
 *   GET  /account.php?action=me            (Bearer)        → profile + credit
 *   GET  /account.php?action=orders        (Bearer)        → their orders
 *   GET  /account.php?action=order&code=…  (Bearer)        → one order + items
 *   POST /account.php?action=reorder&code=…(Bearer)        → items to re-add
 *   POST /account.php?action=measurements  (Bearer) {measurements}
 *   POST /account.php?action=return        (Bearer) {order_code, reason}
 *   GET  /account.php?action=referral      (Bearer)        → code + share link
 */
require __DIR__ . '/_lib.php';
cors();

$action = $_GET['action'] ?? 'me';

/** Last 9 digits of a phone, for forgiving matches across +234 / 0 prefixes. */
function tail9($p) { return substr(preg_replace('/\D/', '', (string)$p), -9); }

/** Require a valid customer token; returns the customer row. */
function require_customer() {
  global $conn;
  $tok = bearer();
  if (!$tok) fail('Please sign in', 401);
  $stmt = $conn->prepare(
    'SELECT c.* FROM customer_tokens t JOIN customers c ON c.id = t.customer_id
      WHERE t.token = ? AND t.expires_at > NOW() AND c.deleted_at IS NULL'
  );
  $stmt->bind_param('s', $tok);
  $stmt->execute();
  $c = $stmt->get_result()->fetch_assoc();
  if (!$c) fail('Your session has expired — please sign in again', 401);
  return $c;
}

/* ---- LOGIN --------------------------------------------------------------- */
if ($action === 'login' && method() === 'POST') {
  $b = body();
  $phone = trim($b['phone'] ?? '');
  $orderCode = strtoupper(trim($b['order_code'] ?? ''));
  if ($phone === '' || $orderCode === '') fail('Enter your phone and an order code');

  // The order must exist, match the phone, and resolve to a customer.
  $stmt = $conn->prepare('SELECT id, customer_id, customer_phone FROM orders WHERE UPPER(code) = ? AND deleted_at IS NULL LIMIT 1');
  $stmt->bind_param('s', $orderCode);
  $stmt->execute();
  $o = $stmt->get_result()->fetch_assoc();
  if (!$o || tail9($o['customer_phone']) === '' || tail9($o['customer_phone']) !== tail9($phone)) {
    fail('We could not match that order code and phone', 404);
  }

  $customerId = (int)($o['customer_id'] ?: customer_id_by_phone($phone));
  if (!$customerId) fail('No account found for that phone', 404);

  $token = bin2hex(random_bytes(24));           // 48 chars
  $stmt = $conn->prepare('INSERT INTO customer_tokens (token, customer_id, expires_at) VALUES (?,?, DATE_ADD(NOW(), INTERVAL 30 DAY))');
  $stmt->bind_param('si', $token, $customerId);
  $stmt->execute();

  $name = $conn->query('SELECT name FROM customers WHERE id = ' . $customerId)->fetch_assoc()['name'] ?? '';
  json(['token' => $token, 'name' => $name]);
}

/* ---- Everything below needs a customer token ----------------------------- */
$me = require_customer();
$cid = (int)$me['id'];

/* ---- ME ------------------------------------------------------------------ */
if ($action === 'me' && method() === 'GET') {
  $measurements = $me['measurements'] ? json_decode($me['measurements'], true) : null;
  json([
    'id' => $cid,
    'name' => $me['name'],
    'phone' => $me['phone'],
    'email' => $me['email'],
    'credit' => credit_balance($cid),
    'measurements' => $measurements,
    'birthday' => $me['birthday'] ?? null,
    'referral_code' => $me['referral_code'] ?? null,
  ]);
}

/* ---- ORDERS -------------------------------------------------------------- */
if ($action === 'orders' && method() === 'GET') {
  $rows = [];
  $stmt = $conn->prepare(
    "SELECT o.code, o.status, o.total, o.paid, o.created_at, o.return_status,
            o.courier, o.tracking_url, COUNT(i.id) AS item_count
       FROM orders o LEFT JOIN order_items i ON i.order_id = o.id
      WHERE o.customer_id = ? AND o.deleted_at IS NULL
      GROUP BY o.id ORDER BY o.id DESC"
  );
  $stmt->bind_param('i', $cid);
  $stmt->execute();
  $r = $stmt->get_result();
  while ($row = $r->fetch_assoc()) $rows[] = $row;
  json($rows);
}

/* ---- ORDER DETAIL -------------------------------------------------------- */
if ($action === 'order' && method() === 'GET') {
  $code = strtoupper(trim($_GET['code'] ?? ''));
  $stmt = $conn->prepare('SELECT * FROM orders WHERE UPPER(code) = ? AND customer_id = ? AND deleted_at IS NULL LIMIT 1');
  $stmt->bind_param('si', $code, $cid);
  $stmt->execute();
  $o = $stmt->get_result()->fetch_assoc();
  if (!$o) fail('Order not found', 404);

  $items = [];
  $istmt = $conn->prepare('SELECT label, sku, qty, unit_price FROM order_items WHERE order_id = ?');
  $istmt->bind_param('i', $o['id']);
  $istmt->execute();
  $ir = $istmt->get_result();
  while ($row = $ir->fetch_assoc()) $items[] = $row;
  $o['items'] = $items;
  json($o);
}

/* ---- REORDER ------------------------------------------------------------- */
/* Returns the buyable lines so the storefront can refill the basket. */
if ($action === 'reorder' && method() === 'POST') {
  $code = strtoupper(trim($_GET['code'] ?? ''));
  $stmt = $conn->prepare('SELECT id FROM orders WHERE UPPER(code) = ? AND customer_id = ? AND deleted_at IS NULL LIMIT 1');
  $stmt->bind_param('si', $code, $cid);
  $stmt->execute();
  $o = $stmt->get_result()->fetch_assoc();
  if (!$o) fail('Order not found', 404);

  $items = [];
  $istmt = $conn->prepare("SELECT label, sku, qty, unit_price FROM order_items WHERE order_id = ? AND sku NOT IN ('shipping','discount','giftcard','credit') AND unit_price > 0");
  $istmt->bind_param('i', $o['id']);
  $istmt->execute();
  $ir = $istmt->get_result();
  while ($row = $ir->fetch_assoc()) {
    // Web SKUs are "<slug>-<size>"; recover slug + size for the cart.
    $sku = (string)$row['sku'];
    $size = ''; $slug = $sku;
    if (preg_match('/^(.*)-([a-z0-9 ]+)$/i', $sku, $m)) { $slug = $m[1]; $size = $m[2]; }
    $items[] = ['slug' => $slug, 'size' => $size, 'qty' => (int)$row['qty'], 'label' => $row['label'], 'unit_price' => (float)$row['unit_price']];
  }
  json(['items' => $items]);
}

/* ---- MEASUREMENTS -------------------------------------------------------- */
if ($action === 'measurements' && method() === 'POST') {
  $b = body();
  $measurements = isset($b['measurements']) ? json_encode($b['measurements']) : null;
  $stmt = $conn->prepare('UPDATE customers SET measurements = ? WHERE id = ?');
  $stmt->bind_param('si', $measurements, $cid);
  $stmt->execute();
  json(['ok' => true]);
}

/* ---- RETURN REQUEST ------------------------------------------------------ */
if ($action === 'return' && method() === 'POST') {
  $b = body();
  $code = strtoupper(trim($b['order_code'] ?? ''));
  $reason = trim($b['reason'] ?? '');
  if ($code === '') fail('Which order?');

  $stmt = $conn->prepare("SELECT id, status, return_status, created_at FROM orders WHERE UPPER(code) = ? AND customer_id = ? AND deleted_at IS NULL LIMIT 1");
  $stmt->bind_param('si', $code, $cid);
  $stmt->execute();
  $o = $stmt->get_result()->fetch_assoc();
  if (!$o) fail('Order not found', 404);
  if ($o['return_status'] !== 'none') fail('A return is already in progress for this order');
  // 14-day window from order date.
  if (strtotime($o['created_at']) < strtotime('-14 days')) fail('This order is outside the 14-day return window');

  $up = $conn->prepare("UPDATE orders SET return_status = 'requested', return_reason = ? WHERE id = ?");
  $up->bind_param('si', $reason, $o['id']);
  $up->execute();
  json(['ok' => true, 'return_status' => 'requested']);
}

/* ---- SET BIRTHDAY (own, for gifting prompts) ----------------------------- */
if ($action === 'set_birthday' && method() === 'POST') {
  $b = body();
  $bd = !empty($b['birthday']) ? $b['birthday'] : null;
  $stmt = $conn->prepare('UPDATE customers SET birthday = ? WHERE id = ?');
  $stmt->bind_param('si', $bd, $cid);
  $stmt->execute();
  json(['ok' => true, 'birthday' => $bd]);
}

/* ---- NPS (satisfaction survey) ------------------------------------------- */
if ($action === 'nps_submit' && method() === 'POST') {
  $b = body();
  $score = max(0, min(10, (int)($b['score'] ?? -1)));
  if (!isset($b['score'])) fail('A score is required');
  $comment = substr(trim($b['comment'] ?? ''), 0, 500);
  $orderCode = trim($b['order_code'] ?? '') ?: null;
  $stmt = $conn->prepare('INSERT INTO nps_responses (customer_id, order_code, score, comment) VALUES (?,?,?,?)');
  $stmt->bind_param('isis', $cid, $orderCode, $score, $comment);
  $stmt->execute();
  json(['ok' => true]);
}

/* ---- WISHLIST ------------------------------------------------------------ */
if ($action === 'wishlist' && method() === 'GET') {
  $rows = [];
  $stmt = $conn->prepare('SELECT product_slug, product_name, created_at FROM wishlist_items WHERE customer_id = ? ORDER BY id DESC');
  $stmt->bind_param('i', $cid);
  $stmt->execute();
  $r = $stmt->get_result();
  while ($row = $r->fetch_assoc()) $rows[] = $row;
  json($rows);
}

if ($action === 'wishlist_toggle' && method() === 'POST') {
  $b = body();
  $slug = trim($b['slug'] ?? '');
  $name = trim($b['name'] ?? '');
  if ($slug === '') fail('Which piece?');

  // Toggle: remove if present, else add.
  $chk = $conn->prepare('SELECT id FROM wishlist_items WHERE customer_id = ? AND product_slug = ? LIMIT 1');
  $chk->bind_param('is', $cid, $slug);
  $chk->execute();
  if ($row = $chk->get_result()->fetch_assoc()) {
    $del = $conn->prepare('DELETE FROM wishlist_items WHERE id = ?');
    $del->bind_param('i', $row['id']);
    $del->execute();
    json(['ok' => true, 'saved' => false]);
  }
  $ins = $conn->prepare('INSERT INTO wishlist_items (customer_id, product_slug, product_name) VALUES (?,?,?)');
  $ins->bind_param('iss', $cid, $slug, $name);
  $ins->execute();
  json(['ok' => true, 'saved' => true]);
}

/* ---- REFERRAL ------------------------------------------------------------ */
if ($action === 'referral' && method() === 'GET') {
  $code = ensure_referral_code($cid);
  json([
    'code' => $code,
    'reward' => (float)cfg('REFERRAL_REWARD', 0),
    'share_url' => 'https://heritclothing.com/shop?ref=' . rawurlencode((string)$code),
  ]);
}

fail('Unknown action', 404);
