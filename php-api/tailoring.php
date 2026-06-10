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
                 o.due_date, o.notes, o.assigned_tailor_id,
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

fail('Unknown action', 404);
