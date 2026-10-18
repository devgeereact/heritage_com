<?php
/**
 * HeritOS — Referral program ("give ₦, get ₦").
 *
 *   GET /referrals.php?action=leaderboard            → top referrers (staff)
 *   GET  /referrals.php?action=code&customer_id=N    → a customer's share code, or code:null (staff, read-only)
 *   POST /referrals.php?action=ensure_code {customer_id} → creates the code if missing (staff, K-28)
 *
 * The reward maths lives in referral_settle() (_lib.php), fired when a referred
 * friend's order is genuinely paid. This file is the staff read/share surface.
 */
require __DIR__ . '/_lib.php';
cors();

$STAFF = ['super_admin', 'admin', 'manager'];
$user = require_auth($STAFF);

$action = $_GET['action'] ?? 'leaderboard';
$reward = (float)cfg('REFERRAL_REWARD', 0);

/* ---- LEADERBOARD --------------------------------------------------------- */
if ($action === 'leaderboard' && method() === 'GET') {
  $rows = [];
  // Settled referred orders per referrer + the credit they've earned.
  $sql = "SELECT c.id, c.name, c.phone, c.referral_code,
                 COUNT(DISTINCT o.id) AS referred,
                 COALESCE((SELECT SUM(s.delta) FROM store_credit s
                            WHERE s.customer_id = c.id AND s.reason = 'referral' AND s.delta > 0), 0) AS earned
            FROM orders o
            JOIN customers c ON c.id = o.referrer_id
           WHERE o.referrer_id IS NOT NULL AND o.referral_settled = 1 AND o.deleted_at IS NULL
        GROUP BY c.id
        ORDER BY referred DESC, earned DESC
           LIMIT 50";
  $res = $conn->query($sql);
  while ($res && $row = $res->fetch_assoc()) {
    $rows[] = ['customer_id' => (int)$row['id'], 'name' => $row['name'], 'phone' => $row['phone'],
               'code' => $row['referral_code'], 'referred' => (int)$row['referred'], 'earned' => (float)$row['earned']];
  }

  // Pending (captured but not yet paid) for visibility.
  $pending = (int)($conn->query("SELECT COUNT(*) AS p FROM orders WHERE referrer_id IS NOT NULL AND referral_settled = 0 AND deleted_at IS NULL")->fetch_assoc()['p'] ?? 0);

  json(['reward' => $reward, 'pending' => $pending, 'referrers' => $rows]);
}

/* ---- CODE (read) and ENSURE_CODE (create) -------------------------------- */
// K-28: the GET only reads; a customer with no code gets code:null. Creating a
// code is the POST ensure_code, so the CSRF check on writes covers it.
function referral_code_answer($cid, $code, $reward) {
  return ['customer_id' => $cid, 'code' => $code, 'reward' => $reward,
          'share_url' => $code ? 'https://heritclothing.com/shop?ref=' . rawurlencode($code) : null];
}

if ($action === 'code' && method() === 'GET') {
  $cid = in_int($_GET, 'customer_id');
  if (!$cid) fail('customer_id is required');
  $stmt = $conn->prepare('SELECT referral_code FROM customers WHERE id = ?');
  $stmt->bind_param('i', $cid);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();
  if (!$row) fail('Customer not found', 404);
  json(referral_code_answer($cid, ($row['referral_code'] ?? '') !== '' ? $row['referral_code'] : null, $reward));
}

if ($action === 'ensure_code' && method() === 'POST') {
  $cid = in_int(body(), 'customer_id');
  if (!$cid) fail('customer_id is required');
  $code = ensure_referral_code($cid);
  if (!$code) fail('Could not generate a code', 500);
  audit($user['id'], 'referral_code_ensure', 'customer', $cid);
  json(referral_code_answer($cid, $code, $reward));
}

fail('Unknown action', 404);
