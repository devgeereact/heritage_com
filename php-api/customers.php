<?php
/**
 * HeritOS — Customers (CRM). Saved measurements + order history, shared with
 * the tailoring workshop.
 *
 *   GET  /customers.php?action=list            → customers + order/spend summary
 *   GET  /customers.php?action=get&id=N        → customer + measurements + orders
 *   POST /customers.php?action=create  {name, phone, email, notes, measurements}
 *   POST /customers.php?action=update&id=N {name, phone, email, notes}
 *   POST /customers.php?action=measure&id=N {measurements}
 *
 * Staff-only.
 */
require __DIR__ . '/_lib.php';
cors();

$STAFF = ['super_admin', 'admin', 'manager', 'tailor', 'employee'];
$user = require_auth($STAFF);
$action = $_GET['action'] ?? 'list';

/* ---- LIST ---------------------------------------------------------------- */
if ($action === 'list' && method() === 'GET') {
  $rows = [];
  $sql = "SELECT c.id, c.name, c.phone, c.email, c.tags, c.segment, c.loyalty_points,
                 COUNT(o.id) AS order_count,
                 SUM(o.stage NOT IN ('done','cancelled')) AS active_orders,
                 COALESCE(SUM(o.price), 0) AS ordered_value
            FROM customers c
       LEFT JOIN tailoring_orders o ON o.customer_id = c.id AND o.deleted_at IS NULL
           WHERE c.deleted_at IS NULL
        GROUP BY c.id
        ORDER BY c.name";
  $res = $conn->query($sql);
  while ($res && $row = $res->fetch_assoc()) $rows[] = $row;
  json($rows);
}

/* ---- GET ONE ------------------------------------------------------------- */
if ($action === 'get' && method() === 'GET') {
  $id = (int)($_GET['id'] ?? 0);
  $stmt = $conn->prepare('SELECT * FROM customers WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $customer = $stmt->get_result()->fetch_assoc();
  if (!$customer) fail('Customer not found', 404);

  $orders = [];
  $stmt = $conn->prepare(
    "SELECT id, code, garment_type, fabric, stage, price, due_date
       FROM tailoring_orders WHERE customer_id = ? AND deleted_at IS NULL ORDER BY id DESC"
  );
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $r = $stmt->get_result();
  while ($row = $r->fetch_assoc()) $orders[] = $row;

  $customer['orders'] = $orders;
  json($customer);
}

/* ---- CREATE -------------------------------------------------------------- */
if ($action === 'create' && method() === 'POST') {
  $b = body();
  $name = trim($b['name'] ?? '');
  if ($name === '') fail('Customer name is required');
  $phone = trim($b['phone'] ?? '');
  $email = trim($b['email'] ?? '');
  $notes = trim($b['notes'] ?? '');
  $tags = trim($b['tags'] ?? '');
  $segment = trim($b['segment'] ?? '');
  $measurements = isset($b['measurements']) ? json_encode($b['measurements']) : null;

  $stmt = $conn->prepare('INSERT INTO customers (name, phone, email, notes, tags, segment, measurements) VALUES (?,?,?,?,?,?,?)');
  $stmt->bind_param('sssssss', $name, $phone, $email, $notes, $tags, $segment, $measurements);
  $stmt->execute();
  $id = $conn->insert_id;
  audit($user['id'], 'customer_create', 'customer', $id, ['name' => $name]);
  json(['id' => $id], 201);
}

/* ---- UPDATE -------------------------------------------------------------- */
if ($action === 'update' && method() === 'POST') {
  $id = (int)($_GET['id'] ?? 0);
  $b = body();
  $name = trim($b['name'] ?? '');
  if ($name === '') fail('Customer name is required');
  $phone = trim($b['phone'] ?? '');
  $email = trim($b['email'] ?? '');
  $notes = trim($b['notes'] ?? '');
  $tags = trim($b['tags'] ?? '');
  $segment = trim($b['segment'] ?? '');
  $birthday = !empty($b['birthday']) ? $b['birthday'] : null;

  $stmt = $conn->prepare('UPDATE customers SET name=?, phone=?, email=?, notes=?, tags=?, segment=?, birthday=? WHERE id=? AND deleted_at IS NULL');
  $stmt->bind_param('sssssssi', $name, $phone, $email, $notes, $tags, $segment, $birthday, $id);
  $stmt->execute();
  audit($user['id'], 'customer_update', 'customer', $id);
  json(['ok' => true]);
}

/* ---- UPCOMING BIRTHDAYS (gifting prompts) -------------------------------- */
if ($action === 'birthdays' && method() === 'GET') {
  $rows = [];
  // Next 30 days, ignoring year (month/day window).
  $res = $conn->query(
    "SELECT id, name, phone, birthday,
            DATE_FORMAT(birthday, '%m-%d') AS md
       FROM customers
      WHERE deleted_at IS NULL AND birthday IS NOT NULL
        AND (
          (DAYOFYEAR(birthday) - DAYOFYEAR(CURDATE()) + 366) % 366 <= 30
        )
   ORDER BY (DAYOFYEAR(birthday) - DAYOFYEAR(CURDATE()) + 366) % 366 ASC
      LIMIT 20"
  );
  while ($res && $row = $res->fetch_assoc()) $rows[] = $row;
  json($rows);
}

/* ---- MEASUREMENTS -------------------------------------------------------- */
if ($action === 'measure' && method() === 'POST') {
  $id = (int)($_GET['id'] ?? 0);
  $b = body();
  $measurements = isset($b['measurements']) ? json_encode($b['measurements']) : null;
  $stmt = $conn->prepare('UPDATE customers SET measurements=? WHERE id=? AND deleted_at IS NULL');
  $stmt->bind_param('si', $measurements, $id);
  $stmt->execute();
  audit($user['id'], 'customer_measure', 'customer', $id);
  json(['ok' => true]);
}

fail('Unknown action', 404);
