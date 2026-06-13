<?php
/**
 * HeritOS — Tailoring & Production (the core workshop module).
 *
 *   GET  /tailoring.php?action=list                 → orders + customer/tailor names
 *   GET  /tailoring.php?action=get&id=N             → one order + stage history
 *   GET  /tailoring.php?action=tailors              → users who can be assigned
 *   POST /tailoring.php?action=create  {customer, garment_type, fabric, measurements,
 *                                       price, deposit, due_date, assigned_tailor_id, notes}
 *   POST /tailoring.php?action=stage&id=N {stage, note}
 *
 * Staff-only. Roles allowed below; customers never reach this endpoint.
 */
require __DIR__ . '/_lib.php';
cors();

$STAFF = ['super_admin', 'admin', 'manager', 'tailor', 'employee'];
$STAGES = ['measure', 'cut', 'sew', 'finish', 'fitting', 'done', 'cancelled'];
$GARMENTS = ['agbada', 'kaftan', 'senator', 'suit', 'shirt', 'trouser', 'other'];

$user = require_auth($STAFF);
$action = $_GET['action'] ?? 'list';

/* ---- LIST ---------------------------------------------------------------- */
if ($action === 'list' && method() === 'GET') {
  $rows = [];
  $sql = "SELECT o.id, o.code, o.garment_type, o.fabric, o.stage, o.price, o.deposit,
                 o.fabric_cost, o.labour_cost, o.due_date, o.fitting_date, o.notes, o.assigned_tailor_id,
                 c.name AS customer_name, c.phone AS customer_phone,
                 t.name AS tailor_name
            FROM tailoring_orders o
            JOIN customers c ON c.id = o.customer_id
       LEFT JOIN users t ON t.id = o.assigned_tailor_id
           WHERE o.deleted_at IS NULL
        ORDER BY o.due_date IS NULL, o.due_date ASC, o.id DESC";
  $res = $conn->query($sql);
  while ($res && $row = $res->fetch_assoc()) $rows[] = $row;
  json($rows);
}

/* ---- GET ONE ------------------------------------------------------------- */
if ($action === 'get' && method() === 'GET') {
  $id = (int)($_GET['id'] ?? 0);
  $stmt = $conn->prepare(
    "SELECT o.*, c.name AS customer_name, c.phone AS customer_phone, t.name AS tailor_name
       FROM tailoring_orders o
       JOIN customers c ON c.id = o.customer_id
  LEFT JOIN users t ON t.id = o.assigned_tailor_id
      WHERE o.id = ? AND o.deleted_at IS NULL"
  );
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $order = $stmt->get_result()->fetch_assoc();
  if (!$order) fail('Order not found', 404);

  $events = [];
  $stmt = $conn->prepare(
    "SELECT e.stage, e.note, e.created_at, u.name AS user_name
       FROM tailoring_events e LEFT JOIN users u ON u.id = e.user_id
      WHERE e.order_id = ? ORDER BY e.id DESC"
  );
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $r = $stmt->get_result();
  while ($row = $r->fetch_assoc()) $events[] = $row;

  $order['events'] = $events;
  json($order);
}

/* ---- TAILORS (for assignment) ------------------------------------------- */
if ($action === 'tailors' && method() === 'GET') {
  $rows = [];
  $res = $conn->query(
    "SELECT id, name, role FROM users
      WHERE deleted_at IS NULL AND role IN ('tailor','manager','admin','super_admin')
   ORDER BY name"
  );
  while ($res && $row = $res->fetch_assoc()) $rows[] = $row;
  json($rows);
}

/* ---- CREATE -------------------------------------------------------------- */
if ($action === 'create' && method() === 'POST') {
  $b = body();
  $customerName = trim($b['customer'] ?? '');
  $phone = trim($b['phone'] ?? '');
  $garment = in_array($b['garment_type'] ?? '', $GARMENTS, true) ? $b['garment_type'] : 'agbada';
  $fabric = trim($b['fabric'] ?? '');
  $notes = trim($b['notes'] ?? '');
  $price = (float)($b['price'] ?? 0);
  $deposit = (float)($b['deposit'] ?? 0);
  $dueDate = $b['due_date'] ?? null;
  $tailorId = isset($b['assigned_tailor_id']) && $b['assigned_tailor_id'] !== '' ? (int)$b['assigned_tailor_id'] : null;
  $measurements = isset($b['measurements']) ? json_encode($b['measurements']) : null;

  if ($customerName === '') fail('Customer name is required');
  if ($dueDate === '') $dueDate = null;

  // Find an existing customer by phone, otherwise create one.
  $customerId = null;
  if ($phone !== '') {
    $stmt = $conn->prepare('SELECT id FROM customers WHERE phone = ? AND deleted_at IS NULL LIMIT 1');
    $stmt->bind_param('s', $phone);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    if ($row) $customerId = (int)$row['id'];
  }
  if (!$customerId) {
    $stmt = $conn->prepare('INSERT INTO customers (name, phone, measurements) VALUES (?,?,?)');
    $stmt->bind_param('sss', $customerName, $phone, $measurements);
    $stmt->execute();
    $customerId = $conn->insert_id;
  }

  // Generate the next HC-#### code.
  $res = $conn->query('SELECT MAX(id) AS m FROM tailoring_orders');
  $next = (int)($res->fetch_assoc()['m'] ?? 0) + 1;
  $code = 'HC-' . str_pad((string)$next, 4, '0', STR_PAD_LEFT);

  $stmt = $conn->prepare(
    'INSERT INTO tailoring_orders
       (code, customer_id, garment_type, fabric, measurements, notes,
        assigned_tailor_id, stage, price, deposit, due_date, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
  );
  $stage = 'measure';
  // Types: code s, customer i, garment s, fabric s, measurements s, notes s,
  //        tailor i, stage s, price d, deposit d, due_date s, created_by i
  $stmt->bind_param(
    'sissssisddsi',
    $code, $customerId, $garment, $fabric, $measurements, $notes,
    $tailorId, $stage, $price, $deposit, $dueDate, $user['id']
  );
  $stmt->execute();
  $orderId = $conn->insert_id;

  $stmt = $conn->prepare('INSERT INTO tailoring_events (order_id, stage, note, user_id) VALUES (?,?,?,?)');
  $openNote = 'Order created';
  $stmt->bind_param('issi', $orderId, $stage, $openNote, $user['id']);
  $stmt->execute();

  audit($user['id'], 'tailoring_create', 'tailoring_order', $orderId, ['code' => $code]);
  json(['id' => $orderId, 'code' => $code], 201);
}

/* ---- ASSIGN / RESCHEDULE -------------------------------------------------- */
/* Reassign the tailor and/or change the due date after creation.             */
if ($action === 'assign' && method() === 'POST') {
  $id = (int)($_GET['id'] ?? 0);
  $b = body();
  $tailorId = isset($b['assigned_tailor_id']) && $b['assigned_tailor_id'] !== '' ? (int)$b['assigned_tailor_id'] : null;
  $dueDate = $b['due_date'] ?? null;
  if ($dueDate === '') $dueDate = null;

  $stmt = $conn->prepare('UPDATE tailoring_orders SET assigned_tailor_id = ?, due_date = ? WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('isi', $tailorId, $dueDate, $id);
  $stmt->execute();
  if ($stmt->affected_rows === 0) {
    $chk = $conn->prepare('SELECT id FROM tailoring_orders WHERE id = ? AND deleted_at IS NULL');
    $chk->bind_param('i', $id);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) fail('Order not found', 404);
  }

  audit($user['id'], 'tailoring_assign', 'tailoring_order', $id, ['tailor' => $tailorId, 'due' => $dueDate]);
  json(['ok' => true, 'assigned_tailor_id' => $tailorId, 'due_date' => $dueDate]);
}

/* ---- ADVANCE / SET STAGE ------------------------------------------------- */
if ($action === 'stage' && method() === 'POST') {
  $id = (int)($_GET['id'] ?? 0);
  $b = body();
  $stage = $b['stage'] ?? '';
  $note = trim($b['note'] ?? '');
  if (!in_array($stage, $STAGES, true)) fail('Invalid stage');

  $stmt = $conn->prepare('UPDATE tailoring_orders SET stage = ? WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('si', $stage, $id);
  $stmt->execute();
  if ($stmt->affected_rows === 0) {
    // affected_rows is 0 if the stage was unchanged; confirm the row exists.
    $chk = $conn->prepare('SELECT id FROM tailoring_orders WHERE id = ? AND deleted_at IS NULL');
    $chk->bind_param('i', $id);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) fail('Order not found', 404);
  }

  $stmt = $conn->prepare('INSERT INTO tailoring_events (order_id, stage, note, user_id) VALUES (?,?,?,?)');
  $stmt->bind_param('issi', $id, $stage, $note, $user['id']);
  $stmt->execute();

  audit($user['id'], 'tailoring_stage', 'tailoring_order', $id, ['stage' => $stage]);
  json(['ok' => true, 'stage' => $stage]);
}

/* ---- MEASUREMENTS -------------------------------------------------------- */
/* Save this order's measurement snapshot. Optionally write it back to the
 * customer's reusable profile so the next bespoke order pre-fills.            */
if ($action === 'measure' && method() === 'POST') {
  $id = (int)($_GET['id'] ?? 0);
  $b = body();
  $measurements = isset($b['measurements']) ? json_encode($b['measurements']) : null;
  $syncCustomer = !empty($b['sync_customer']);

  $stmt = $conn->prepare('UPDATE tailoring_orders SET measurements = ? WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('si', $measurements, $id);
  $stmt->execute();

  if ($syncCustomer) {
    $row = $conn->query('SELECT customer_id FROM tailoring_orders WHERE id = ' . (int)$id)->fetch_assoc();
    if ($row && $row['customer_id']) {
      $cu = $conn->prepare('UPDATE customers SET measurements = ? WHERE id = ?');
      $cu->bind_param('si', $measurements, $row['customer_id']);
      $cu->execute();
    }
  }

  audit($user['id'], 'tailoring_measure', 'tailoring_order', $id, ['sync' => $syncCustomer]);
  json(['ok' => true]);
}

/* ---- RECORD PAYMENT (deposit / balance) ---------------------------------- */
/* Add a payment to the order; deposit accrues toward price. Logged on the
 * timeline so the money trail is visible. 50% deposit is the house rule.      */
if ($action === 'pay' && method() === 'POST') {
  $id = (int)($_GET['id'] ?? 0);
  $b = body();
  $amount = (float)($b['amount'] ?? 0);
  if ($amount <= 0) fail('Amount must be positive');

  $row = $conn->query('SELECT price, deposit FROM tailoring_orders WHERE id = ' . (int)$id . ' AND deleted_at IS NULL')->fetch_assoc();
  if (!$row) fail('Order not found', 404);
  $price = (float)$row['price'];
  $newDeposit = min((float)$row['deposit'] + $amount, $price > 0 ? $price : (float)$row['deposit'] + $amount);

  $stmt = $conn->prepare('UPDATE tailoring_orders SET deposit = ? WHERE id = ?');
  $stmt->bind_param('di', $newDeposit, $id);
  $stmt->execute();

  $ev = $conn->prepare('INSERT INTO tailoring_events (order_id, stage, note, user_id) SELECT id, stage, ?, ? FROM tailoring_orders WHERE id = ?');
  $payNote = 'Payment ₦' . number_format($amount) . ' recorded';
  $ev->bind_param('sii', $payNote, $user['id'], $id);
  $ev->execute();

  audit($user['id'], 'tailoring_pay', 'tailoring_order', $id, ['amount' => $amount, 'deposit' => $newDeposit]);
  json(['ok' => true, 'deposit' => $newDeposit, 'balance' => max(0, $price - $newDeposit)]);
}

/* ---- COSTS (per-project profitability) ----------------------------------- */
if ($action === 'costs' && method() === 'POST') {
  $id = (int)($_GET['id'] ?? 0);
  $b = body();
  $fabricCost = (float)($b['fabric_cost'] ?? 0);
  $labourCost = (float)($b['labour_cost'] ?? 0);

  $stmt = $conn->prepare('UPDATE tailoring_orders SET fabric_cost = ?, labour_cost = ? WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('ddi', $fabricCost, $labourCost, $id);
  $stmt->execute();

  audit($user['id'], 'tailoring_costs', 'tailoring_order', $id, ['fabric' => $fabricCost, 'labour' => $labourCost]);
  json(['ok' => true, 'fabric_cost' => $fabricCost, 'labour_cost' => $labourCost]);
}

/* ---- FITTING DATE -------------------------------------------------------- */
if ($action === 'fitting' && method() === 'POST') {
  $id = (int)($_GET['id'] ?? 0);
  $b = body();
  $date = $b['fitting_date'] ?? null;
  if ($date === '') $date = null;

  $stmt = $conn->prepare('UPDATE tailoring_orders SET fitting_date = ? WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('si', $date, $id);
  $stmt->execute();

  audit($user['id'], 'tailoring_fitting', 'tailoring_order', $id, ['fitting_date' => $date]);
  json(['ok' => true, 'fitting_date' => $date]);
}

/* ---- REMIND (WhatsApp fitting / balance nudge) --------------------------- */
if ($action === 'remind' && method() === 'POST') {
  $id = (int)($_GET['id'] ?? 0);
  $b = body();
  $kind = $b['kind'] ?? 'fitting';            // 'fitting' | 'balance' | 'custom'
  $custom = trim($b['message'] ?? '');

  $o = $conn->query(
    'SELECT o.code, o.price, o.deposit, o.fitting_date, o.customer_id, c.name AS customer_name, c.phone AS customer_phone
       FROM tailoring_orders o JOIN customers c ON c.id = o.customer_id
      WHERE o.id = ' . (int)$id . ' AND o.deleted_at IS NULL'
  )->fetch_assoc();
  if (!$o) fail('Order not found', 404);
  if (trim((string)$o['customer_phone']) === '') fail('No phone on file for this customer');

  $first = explode(' ', trim($o['customer_name']))[0] ?: 'there';
  $balance = max(0, (float)$o['price'] - (float)$o['deposit']);
  if ($custom !== '') {
    $msg = $custom;
  } elseif ($kind === 'balance') {
    $msg = "Hi {$first}, a quick note on your Herit Clothing order {$o['code']}: a balance of ₦" . number_format($balance) . " remains. Reply here to settle it. Thank you!";
  } else {
    $when = $o['fitting_date'] ? (' on ' . $o['fitting_date']) : ' soon';
    $msg = "Hi {$first}, your fitting for order {$o['code']} is scheduled{$when}. Please let us know if that still works for you. — Herit Clothing";
  }

  $res = wa_dispatch($o['customer_phone'], $msg, $o['customer_id'] ? (int)$o['customer_id'] : null, 'tailoring_reminder', $user['id']);
  audit($user['id'], 'tailoring_remind', 'tailoring_order', $id, ['kind' => $kind, 'status' => $res['status']]);
  json($res);
}

fail('Unknown action', 404);
