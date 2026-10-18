<?php
/**
 * HeritOS — Customer self-service portal (public, customer-authenticated).
 *
 * Sign-in: the verified route is access.php (reference + registered contact,
 * then a single-use code or an owner invite). The older knowledge-based login
 * below (phone + order reference) is LEGACY: it answers only while
 * ALLOW_LEGACY_ORDER_CODE_LOOKUP is on (default on until the owner switches it
 * off) and now issues the same hashed, expiring session as access.php.
 *
 *   POST /account.php?action=login {phone, order_code}     → {token, name}   (legacy flag only)
 *   GET  /account.php?action=me            (Bearer)        → profile + credit
 *   GET  /account.php?action=orders        (Bearer)        → their orders
 *   GET  /account.php?action=order&code=…  (Bearer)        → one order + items
 *   POST /account.php?action=reorder&code=…(Bearer)        → items to re-add
 *   POST /account.php?action=measurements  (Bearer) {measurements, unit?} → a PENDING
 *        measurement set the owner reviews (BR-07, A10); legacy flag only. The portal's
 *        propose_measurements (portal.php) is the route for new clients
 *   POST /account.php?action=return        (Bearer) {order_code, reason}
 *   GET  /account.php?action=referral      (Bearer)        → code + share link
 */
require __DIR__ . '/_lib.php';
require __DIR__ . '/_portal.php';
cors();

$action = $_GET['action'] ?? 'me';

/** Last 9 digits of a phone, for forgiving matches across +234 / 0 prefixes. */
function tail9($p) { return substr(preg_replace('/\D/', '', (string)$p), -9); }

/** Require a valid customer session (hashed session, or a legacy token while the flag is on). */
function require_customer() { return require_customer_session(); }

/* ---- LOGIN --------------------------------------------------------------- */
if ($action === 'login' && method() === 'POST') {
  if (!legacy_portal_login_enabled()) fail('Unknown action', 404);
  $b = body();
  $phone = trim(in_str($b, 'phone'));
  $orderCode = strtoupper(trim(in_str($b, 'order_code')));
  if ($phone === '' || $orderCode === '') fail('Enter your phone and an order reference');

  // Same audit_log throttle as staff login (auth.php): failures counted per IP
  // and per phone (hashed, so attempted numbers are not stored). 0 disables one.
  $ipKey = 'ip:' . client_ip();
  $phoneKey = 'phone:' . substr(hash('sha256', tail9($phone)), 0, 32);
  throttle_enforce([
    [(int) cfg('CUSTOMER_LOGIN_MAX_PER_IP', 10), 'cust_login_fail_ip', $ipKey],
    [(int) cfg('CUSTOMER_LOGIN_MAX_PER_PHONE', 5), 'cust_login_fail_phone', $phoneKey],
  ], (int) cfg('LOGIN_THROTTLE_WINDOW', 900));

  // One message and status for every failure, so the reply never reveals
  // whether a phone has an account or an order code exists.
  $loginFail = function () use ($ipKey, $phoneKey) {
    audit(null, 'cust_login_fail_ip', $ipKey);
    audit(null, 'cust_login_fail_phone', $phoneKey);
    fail('We could not sign you in with that order code and phone', 404);
  };

  // The order must exist, match the phone, and resolve to a customer. The
  // reference is the random public_ref; the old ORD- code is accepted only while
  // ALLOW_LEGACY_ORDER_CODE_LOOKUP is on (default on during the transition).
  $o = order_by_customer_ref($orderCode, 'id, customer_id, customer_phone');
  if (!$o || tail9($o['customer_phone']) === '' || tail9($o['customer_phone']) !== tail9($phone)) $loginFail();

  $customerId = (int)($o['customer_id'] ?: customer_id_by_phone($phone));
  if (!$customerId) $loginFail();

  if (has_table('customer_sessions')) {
    $token = customer_session_issue($customerId, 'legacy');   // hashed, expires after customer_session_days
  } else {
    // schema_phase24.sql not imported yet: the old raw token, as before.
    $token = bin2hex(random_bytes(24));
    db_exec('INSERT INTO customer_tokens (token, customer_id, expires_at) VALUES (?,?, DATE_ADD(NOW(), INTERVAL 30 DAY))', 'si', $token, $customerId);
  }

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
    'measurements_pending' => (bool)db_row("SELECT id FROM measurement_sets WHERE customer_id = ? AND source = 'customer' AND status = 'pending' LIMIT 1", 'i', $cid),
    'birthday' => $me['birthday'] ?? null,
    'referral_code' => $me['referral_code'] ?? null,
  ]);
}

/* ---- ORDERS -------------------------------------------------------------- */
if ($action === 'orders' && method() === 'GET') {
  $rows = [];
  $stmt = $conn->prepare(
    "SELECT o.code, " . (has_column('orders', 'public_ref') ? 'o.public_ref' : 'NULL AS public_ref') . ", o.status, o.total, o.paid, o.created_at, o.return_status,
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
  $code = strtoupper(trim(in_str($_GET, 'code')));
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
  $code = strtoupper(trim(in_str($_GET, 'code')));
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
  // Legacy route only; new clients propose through portal.php. Either way the
  // result is a pending proposal, never a direct overwrite (A10).
  if (!legacy_portal_login_enabled()) fail('Unknown action', 404);
  // A customer's measurements are a proposal: they wait for the owner's approval
  // and never overwrite the approved profile or any job snapshot (BR-07, A10).
  // The account form is labelled inches, so that is the default unit.
  $b = body();
  $vals = is_array($b['measurements'] ?? null) ? $b['measurements'] : [];
  $unit = in_array($b['unit'] ?? '', ['cm', 'in'], true) ? $b['unit'] : 'in';
  $r = legacy_measure_to_set($cid, $vals, $unit, 'customer', false, null);
  if ($r['errors']) json(['error' => 'Some measurements need fixing', 'errors' => $r['errors']], 400);
  if (!$r['set']) fail('Enter at least one measurement');
  json(['ok' => true, 'pending' => true, 'message' => 'Thank you. We will check these before using them.']);
}

/* ---- RETURN REQUEST ------------------------------------------------------ */
if ($action === 'return' && method() === 'POST') {
  $b = body();
  $code = strtoupper(trim(in_str($b, 'order_code')));
  $reason = trim(in_str($b, 'reason'));
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
  $bd = !empty($b['birthday']) ? in_str($b, 'birthday') : null;
  $stmt = $conn->prepare('UPDATE customers SET birthday = ? WHERE id = ?');
  $stmt->bind_param('si', $bd, $cid);
  $stmt->execute();
  json(['ok' => true, 'birthday' => $bd]);
}

/* ---- NPS (satisfaction survey) ------------------------------------------- */
if ($action === 'nps_submit' && method() === 'POST') {
  $b = body();
  $score = max(0, min(10, in_int($b, 'score', -1)));
  if (!isset($b['score'])) fail('A score is required');
  $comment = substr(trim(in_str($b, 'comment')), 0, 500);
  $orderCode = trim(in_str($b, 'order_code')) ?: null;
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
  $slug = trim(in_str($b, 'slug'));
  $name = trim(in_str($b, 'name'));
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
