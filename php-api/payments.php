<?php
/**
 * HeritOS — Payments & Finance. Money in (payments against orders) and money
 * out (expenses), plus a cash-position summary.
 *
 *   GET  /payments.php?action=list                  → recent payments
 *   POST /payments.php?action=create {order_id?, customer_name, amount, method, reference, note}
 *   GET  /payments.php?action=expenses              → recent expenses
 *   POST /payments.php?action=expense_create {category, amount, vendor, note, spent_on}
 *   GET  /payments.php?action=summary               → in / out / net (+ this month)
 *
 * Staff-only (managers+).
 */
require __DIR__ . '/_lib.php';
cors();

$STAFF = ['super_admin', 'admin', 'manager'];
$METHODS = ['cash', 'transfer', 'card', 'cod'];
$CATEGORIES = ['fabric', 'tailoring', 'packaging', 'marketing', 'rent', 'fees', 'other'];

$user = require_auth($STAFF);
$action = $_GET['action'] ?? 'summary';

/* ---- PAYMENTS (money in) ------------------------------------------------- */
if ($action === 'list' && method() === 'GET') {
  $rows = [];
  $sql = "SELECT p.id, p.order_id, p.customer_name, p.amount, p.method, p.reference, p.note, p.created_at,
                 o.code AS order_code
            FROM payments p
       LEFT JOIN orders o ON o.id = p.order_id
        ORDER BY p.id DESC LIMIT 200";
  $res = $conn->query($sql);
  while ($res && $row = $res->fetch_assoc()) $rows[] = $row;
  json($rows);
}

if ($action === 'create' && method() === 'POST') {
  $b = body();
  $amount = in_num($b, 'amount', 0);
  if ($amount <= 0) fail('Amount must be greater than zero');
  $orderId = isset($b['order_id']) && $b['order_id'] !== '' ? in_int($b, 'order_id') : null;
  $customer = trim(in_str($b, 'customer_name'));
  $method = in_array($b['method'] ?? '', $METHODS, true) ? $b['method'] : 'cash';
  $reference = trim(in_str($b, 'reference'));
  $note = trim(in_str($b, 'note'));
  $stmt = $conn->prepare('INSERT INTO payments (order_id, customer_name, amount, method, reference, note, created_by) VALUES (?,?,?,?,?,?,?)');
  $stmt->bind_param('isdsssi', $orderId, $customer, $amount, $method, $reference, $note, $user['id']);
  $stmt->execute();
  $id = $conn->insert_id;
  // Keep the order's paid figure in step when a payment is linked.
  if ($orderId) {
    $u = $conn->prepare('UPDATE orders SET paid = paid + ? WHERE id = ?');
    $u->bind_param('di', $amount, $orderId);
    $u->execute();
  }
  audit($user['id'], 'payment_create', 'payment', $id, ['amount' => $amount]);
  json(['id' => $id], 201);
}

/* ---- EXPENSES (money out) ------------------------------------------------ */
if ($action === 'expenses' && method() === 'GET') {
  $rows = [];
  $res = $conn->query("SELECT id, category, amount, vendor, note, spent_on, created_at FROM expenses ORDER BY spent_on DESC, id DESC LIMIT 200");
  while ($res && $row = $res->fetch_assoc()) $rows[] = $row;
  json($rows);
}

if ($action === 'expense_create' && method() === 'POST') {
  $b = body();
  $amount = in_num($b, 'amount', 0);
  if ($amount <= 0) fail('Amount must be greater than zero');
  $category = in_array($b['category'] ?? '', $CATEGORIES, true) ? $b['category'] : 'other';
  $vendor = trim(in_str($b, 'vendor'));
  $note = trim(in_str($b, 'note'));
  $spentOn = trim(in_str($b, 'spent_on'));
  if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $spentOn)) $spentOn = date('Y-m-d');
  $stmt = $conn->prepare('INSERT INTO expenses (category, amount, vendor, note, spent_on, created_by) VALUES (?,?,?,?,?,?)');
  $stmt->bind_param('sdsssi', $category, $amount, $vendor, $note, $spentOn, $user['id']);
  $stmt->execute();
  $id = $conn->insert_id;
  audit($user['id'], 'expense_create', 'expense', $id, ['amount' => $amount, 'category' => $category]);
  json(['id' => $id], 201);
}

/* ---- SUMMARY ------------------------------------------------------------- */
if ($action === 'summary' && method() === 'GET') {
  $in = (float)($conn->query("SELECT COALESCE(SUM(amount),0) AS s FROM payments")->fetch_assoc()['s'] ?? 0);
  $out = (float)($conn->query("SELECT COALESCE(SUM(amount),0) AS s FROM expenses")->fetch_assoc()['s'] ?? 0);
  $inMonth = (float)($conn->query("SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE created_at >= DATE_FORMAT(NOW(),'%Y-%m-01')")->fetch_assoc()['s'] ?? 0);
  $outMonth = (float)($conn->query("SELECT COALESCE(SUM(amount),0) AS s FROM expenses WHERE spent_on >= DATE_FORMAT(NOW(),'%Y-%m-01')")->fetch_assoc()['s'] ?? 0);
  // Outstanding = unpaid balance across live orders.
  $outstanding = (float)($conn->query("SELECT COALESCE(SUM(GREATEST(0, total - paid)),0) AS s FROM orders WHERE deleted_at IS NULL AND status <> 'cancelled'")->fetch_assoc()['s'] ?? 0);

  $byCat = [];
  $r = $conn->query("SELECT category, SUM(amount) AS total FROM expenses GROUP BY category ORDER BY total DESC");
  while ($r && $row = $r->fetch_assoc()) $byCat[] = ['category' => $row['category'], 'total' => (float)$row['total']];

  json([
    'in' => $in, 'out' => $out, 'net' => $in - $out,
    'in_month' => $inMonth, 'out_month' => $outMonth, 'net_month' => $inMonth - $outMonth,
    'outstanding' => $outstanding,
    'expenses_by_category' => $byCat,
  ]);
}

fail('Unknown action', 404);
