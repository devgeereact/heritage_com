<?php
/**
 * HeritOS — Store credit + gift cards (loyalty / goodwill / gifting).
 *
 *  PUBLIC (storefront checkout):
 *   GET  /loyalty.php?action=credit_balance&phone=…   → {balance, customer_id}
 *   GET  /loyalty.php?action=gift_check&code=…        → {ok, balance, code}
 *
 *  STAFF:
 *   GET  /loyalty.php?action=balances                 → customers with credit
 *   GET  /loyalty.php?action=history&customer_id=N    → ledger + balance
 *   POST /loyalty.php?action=adjust {customer_id, delta, reason?, note?}
 *   GET  /loyalty.php?action=gift_list
 *   POST /loyalty.php?action=gift_issue {amount, recipient_name?, message?}
 *   POST /loyalty.php?action=gift_toggle&id=N {active}
 *
 * Credit balance = SUM(store_credit.delta). Gift cards carry their own balance.
 */
require __DIR__ . '/_lib.php';
cors();

$action = $_GET['action'] ?? 'balances';

/* ---- PUBLIC: credit balance of the signed-in customer -------------------- */
/* A phone number alone no longer reveals whether someone is a customer or what
 * credit they hold: only a verified customer session (portal sign-in) sees its
 * own balance. Anyone else gets a zero balance, so checkout simply hides the
 * credit option. The phone parameter is ignored. */
if ($action === 'credit_balance' && method() === 'GET') {
  require_once __DIR__ . '/_portal.php';
  $me = customer_session_optional();
  json(['customer_id' => null, 'balance' => $me ? credit_balance((int)$me['id']) : 0]);
}

/* ---- PUBLIC: gift-card balance check ------------------------------------- */
if ($action === 'gift_check' && method() === 'GET') {
  $code = strtoupper(trim(in_str($_GET, 'code')));
  if ($code === '') fail('Enter a gift card code');
  // Codes are short, so failed checks are limited per IP to stop guessing.
  $ipKey = 'ip:' . client_ip();
  throttle_enforce([[(int)cfg('GIFT_CHECK_MAX_FAILS_PER_IP', 10), 'gift_check_fail', $ipKey]], 3600);
  $stmt = $conn->prepare('SELECT code, balance, active FROM gift_cards WHERE UPPER(code) = ? LIMIT 1');
  $stmt->bind_param('s', $code);
  $stmt->execute();
  $g = $stmt->get_result()->fetch_assoc();
  if (!$g || !(int)$g['active']) {
    audit(null, 'gift_check_fail', $ipKey);
    json(['ok' => false, 'error' => 'That gift card is not valid']);
  }
  json(['ok' => true, 'code' => $g['code'], 'balance' => (float)$g['balance']]);
}

/* ---- Everything below is staff-only -------------------------------------- */
$STAFF = ['super_admin', 'admin', 'manager'];
$user = require_auth($STAFF);

/* ---- BALANCES ------------------------------------------------------------ */
if ($action === 'balances' && method() === 'GET') {
  $rows = [];
  $sql = "SELECT s.customer_id, c.name, c.phone, SUM(s.delta) AS balance, MAX(s.created_at) AS last_at
            FROM store_credit s JOIN customers c ON c.id = s.customer_id
        GROUP BY s.customer_id
          HAVING balance <> 0
        ORDER BY balance DESC";
  $res = $conn->query($sql);
  while ($res && $row = $res->fetch_assoc()) {
    $rows[] = ['customer_id' => (int)$row['customer_id'], 'name' => $row['name'], 'phone' => $row['phone'],
               'balance' => (float)$row['balance'], 'last_at' => $row['last_at']];
  }
  json($rows);
}

/* ---- HISTORY ------------------------------------------------------------- */
if ($action === 'history' && method() === 'GET') {
  $cid = in_int($_GET, 'customer_id');
  $rows = [];
  $stmt = $conn->prepare('SELECT delta, reason, ref, note, created_at FROM store_credit WHERE customer_id = ? ORDER BY id DESC');
  $stmt->bind_param('i', $cid);
  $stmt->execute();
  $r = $stmt->get_result();
  while ($row = $r->fetch_assoc()) $rows[] = $row;
  json(['customer_id' => $cid, 'balance' => credit_balance($cid), 'entries' => $rows]);
}

/* ---- ADJUST (issue / deduct credit) -------------------------------------- */
if ($action === 'adjust' && method() === 'POST') {
  $b = body();
  $cid = in_int($b, 'customer_id');
  $delta = in_num($b, 'delta', 0);
  $reason = trim(in_str($b, 'reason', 'adjust'));
  $note = trim(in_str($b, 'note'));
  if (!$cid) fail('customer_id is required');
  if ($delta === 0.0) fail('Amount cannot be zero');

  // Never let a manual deduction push the balance negative.
  if ($delta < 0 && credit_balance($cid) + $delta < 0) fail('That exceeds the available balance');

  credit_add($cid, $delta, $reason ?: 'adjust', null, $note, $user['id']);
  audit($user['id'], 'credit_adjust', 'customer', $cid, ['delta' => $delta, 'reason' => $reason]);
  json(['ok' => true, 'balance' => credit_balance($cid)]);
}

/* ---- GIFT CARDS ---------------------------------------------------------- */
if ($action === 'gift_list' && method() === 'GET') {
  $rows = [];
  $res = $conn->query('SELECT id, code, initial_amount, balance, recipient_name, message, active, created_at FROM gift_cards ORDER BY id DESC');
  while ($res && $row = $res->fetch_assoc()) $rows[] = $row;
  json($rows);
}

if ($action === 'gift_issue' && method() === 'POST') {
  $b = body();
  $amount = in_num($b, 'amount', 0);
  if ($amount <= 0) fail('Amount must be positive');
  $recipient = trim(in_str($b, 'recipient_name'));
  $message = trim(in_str($b, 'message'));

  // Unique HG-XXXXXXXX code.
  $code = '';
  for ($i = 0; $i < 5; $i++) {
    $try = 'HG-' . strtoupper(bin2hex(random_bytes(8)));   // 64-bit; older 32-bit codes still work (K-23)
    $chk = $conn->prepare('SELECT id FROM gift_cards WHERE code = ?');
    $chk->bind_param('s', $try);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) { $code = $try; break; }
  }
  if ($code === '') fail('Could not generate a code, try again', 500);

  $stmt = $conn->prepare('INSERT INTO gift_cards (code, initial_amount, balance, recipient_name, message, created_by) VALUES (?,?,?,?,?,?)');
  $stmt->bind_param('sddssi', $code, $amount, $amount, $recipient, $message, $user['id']);
  $stmt->execute();
  audit($user['id'], 'gift_issue', 'gift_card', $conn->insert_id, ['code' => $code, 'amount' => $amount]);
  json(['ok' => true, 'code' => $code, 'balance' => $amount], 201);
}

if ($action === 'gift_toggle' && method() === 'POST') {
  $id = in_int($_GET, 'id');
  $b = body();
  $active = !empty($b['active']) ? 1 : 0;
  $stmt = $conn->prepare('UPDATE gift_cards SET active = ? WHERE id = ?');
  $stmt->bind_param('ii', $active, $id);
  $stmt->execute();
  audit($user['id'], 'gift_toggle', 'gift_card', $id, ['active' => $active]);
  json(['ok' => true, 'active' => $active]);
}

fail('Unknown action', 404);
