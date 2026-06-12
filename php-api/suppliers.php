<?php
/**
 * HeritOS — Suppliers & Purchasing.
 *
 *   GET  /suppliers.php?action=list                 → suppliers + PO counts
 *   GET  /suppliers.php?action=get&id=N             → supplier + recent POs
 *   POST /suppliers.php?action=create  {name, contact, phone, email, address, notes}
 *   POST /suppliers.php?action=update&id=N {...}
 *
 *   GET  /suppliers.php?action=po_list              → purchase orders + summary
 *   GET  /suppliers.php?action=po_get&id=N          → PO + line items
 *   POST /suppliers.php?action=po_create {supplier_id, supplier_name, notes,
 *                                         items:[{variant_id?, label, sku?, qty, unit_cost}]}
 *   POST /suppliers.php?action=po_receive&id=N      → mark received; bump variant stock
 *   POST /suppliers.php?action=po_status&id=N {status}
 *
 * Staff-only (managers+).
 */
require __DIR__ . '/_lib.php';
cors();

$STAFF = ['super_admin', 'admin', 'manager'];
$PO_STATUSES = ['draft', 'ordered', 'received', 'cancelled'];

$user = require_auth($STAFF);
$action = $_GET['action'] ?? 'list';

/* ---- SUPPLIERS ----------------------------------------------------------- */
if ($action === 'list' && method() === 'GET') {
  $rows = [];
  $sql = "SELECT s.id, s.name, s.contact, s.phone, s.email, s.address,
                 COUNT(po.id) AS po_count,
                 COALESCE(SUM(CASE WHEN po.status='received' THEN po.total ELSE 0 END),0) AS spent
            FROM suppliers s
       LEFT JOIN purchase_orders po ON po.supplier_id = s.id AND po.deleted_at IS NULL
           WHERE s.deleted_at IS NULL
        GROUP BY s.id
        ORDER BY s.name ASC";
  $res = $conn->query($sql);
  while ($res && $row = $res->fetch_assoc()) $rows[] = $row;
  json($rows);
}

if ($action === 'get' && method() === 'GET') {
  $id = (int)($_GET['id'] ?? 0);
  $stmt = $conn->prepare('SELECT * FROM suppliers WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $supplier = $stmt->get_result()->fetch_assoc();
  if (!$supplier) fail('Supplier not found', 404);

  $pos = [];
  $stmt = $conn->prepare('SELECT id, code, status, total, created_at, received_at FROM purchase_orders WHERE supplier_id = ? AND deleted_at IS NULL ORDER BY id DESC LIMIT 20');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $r = $stmt->get_result();
  while ($row = $r->fetch_assoc()) $pos[] = $row;
  $supplier['purchase_orders'] = $pos;
  json($supplier);
}

if ($action === 'create' && method() === 'POST') {
  $b = body();
  $name = trim($b['name'] ?? '');
  if ($name === '') fail('Supplier name is required');
  $contact = trim($b['contact'] ?? '');
  $phone = trim($b['phone'] ?? '');
  $email = trim($b['email'] ?? '');
  $address = trim($b['address'] ?? '');
  $notes = trim($b['notes'] ?? '');
  $stmt = $conn->prepare('INSERT INTO suppliers (name, contact, phone, email, address, notes) VALUES (?,?,?,?,?,?)');
  $stmt->bind_param('ssssss', $name, $contact, $phone, $email, $address, $notes);
  $stmt->execute();
  $id = $conn->insert_id;
  audit($user['id'], 'supplier_create', 'supplier', $id, ['name' => $name]);
  json(['id' => $id, 'name' => $name], 201);
}

if ($action === 'update' && method() === 'POST') {
  $id = (int)($_GET['id'] ?? 0);
  $b = body();
  $name = trim($b['name'] ?? '');
  if ($name === '') fail('Supplier name is required');
  $contact = trim($b['contact'] ?? '');
  $phone = trim($b['phone'] ?? '');
  $email = trim($b['email'] ?? '');
  $address = trim($b['address'] ?? '');
  $notes = trim($b['notes'] ?? '');
  $stmt = $conn->prepare('UPDATE suppliers SET name=?, contact=?, phone=?, email=?, address=?, notes=? WHERE id=? AND deleted_at IS NULL');
  $stmt->bind_param('ssssssi', $name, $contact, $phone, $email, $address, $notes, $id);
  $stmt->execute();
  audit($user['id'], 'supplier_update', 'supplier', $id, null);
  json(['ok' => true]);
}

/* ---- PURCHASE ORDERS ----------------------------------------------------- */
if ($action === 'po_list' && method() === 'GET') {
  $rows = [];
  $sql = "SELECT po.id, po.code, po.supplier_name, po.status, po.total, po.created_at, po.received_at,
                 COUNT(i.id) AS line_count, COALESCE(SUM(i.qty),0) AS unit_count
            FROM purchase_orders po
       LEFT JOIN purchase_order_items i ON i.po_id = po.id
           WHERE po.deleted_at IS NULL
        GROUP BY po.id
        ORDER BY po.id DESC";
  $res = $conn->query($sql);
  $open = 0; $received = 0; $outstanding = 0.0;
  while ($res && $row = $res->fetch_assoc()) {
    if ($row['status'] === 'received') $received++;
    else { $open++; $outstanding += (float)$row['total']; }
    $rows[] = $row;
  }
  json(['purchase_orders' => $rows, 'summary' => ['open' => $open, 'received' => $received, 'outstanding' => $outstanding]]);
}

if ($action === 'po_get' && method() === 'GET') {
  $id = (int)($_GET['id'] ?? 0);
  $stmt = $conn->prepare('SELECT * FROM purchase_orders WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $po = $stmt->get_result()->fetch_assoc();
  if (!$po) fail('Purchase order not found', 404);
  $items = [];
  $stmt = $conn->prepare('SELECT id, variant_id, label, sku, qty, unit_cost FROM purchase_order_items WHERE po_id = ?');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $r = $stmt->get_result();
  while ($row = $r->fetch_assoc()) $items[] = $row;
  $po['items'] = $items;
  json($po);
}

if ($action === 'po_create' && method() === 'POST') {
  $b = body();
  $supplierId = isset($b['supplier_id']) && $b['supplier_id'] !== '' ? (int)$b['supplier_id'] : null;
  $supplierName = trim($b['supplier_name'] ?? '');
  $notes = trim($b['notes'] ?? '');
  $items = is_array($b['items'] ?? null) ? $b['items'] : [];
  if ($supplierName === '' && $supplierId) {
    $stmt = $conn->prepare('SELECT name FROM suppliers WHERE id = ?');
    $stmt->bind_param('i', $supplierId);
    $stmt->execute();
    $supplierName = $stmt->get_result()->fetch_assoc()['name'] ?? '';
  }
  if ($supplierName === '') fail('Supplier is required');
  if (!$items) fail('Add at least one line');

  $total = 0;
  foreach ($items as $it) {
    $total += max(1, (int)($it['qty'] ?? 1)) * (float)($it['unit_cost'] ?? 0);
  }
  $res = $conn->query('SELECT MAX(id) AS m FROM purchase_orders');
  $next = (int)($res->fetch_assoc()['m'] ?? 0) + 1;
  $code = 'PO-' . str_pad((string)$next, 4, '0', STR_PAD_LEFT);

  $stmt = $conn->prepare('INSERT INTO purchase_orders (code, supplier_id, supplier_name, status, total, notes, created_by) VALUES (?,?,?,?,?,?,?)');
  $status = 'ordered';
  $stmt->bind_param('sissdsi', $code, $supplierId, $supplierName, $status, $total, $notes, $user['id']);
  $stmt->execute();
  $poId = $conn->insert_id;

  $istmt = $conn->prepare('INSERT INTO purchase_order_items (po_id, variant_id, label, sku, qty, unit_cost) VALUES (?,?,?,?,?,?)');
  foreach ($items as $it) {
    $variantId = isset($it['variant_id']) && $it['variant_id'] !== '' ? (int)$it['variant_id'] : null;
    $label = trim($it['label'] ?? 'Item');
    $sku = isset($it['sku']) ? trim($it['sku']) : null;
    $qty = max(1, (int)($it['qty'] ?? 1));
    $cost = (float)($it['unit_cost'] ?? 0);
    $istmt->bind_param('iissid', $poId, $variantId, $label, $sku, $qty, $cost);
    $istmt->execute();
  }
  audit($user['id'], 'po_create', 'purchase_order', $poId, ['code' => $code, 'total' => $total]);
  json(['id' => $poId, 'code' => $code, 'total' => $total], 201);
}

if ($action === 'po_receive' && method() === 'POST') {
  $id = (int)($_GET['id'] ?? 0);
  $conn->begin_transaction();
  try {
    $stmt = $conn->prepare("SELECT status FROM purchase_orders WHERE id = ? AND deleted_at IS NULL FOR UPDATE");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $po = $stmt->get_result()->fetch_assoc();
    if (!$po) { $conn->rollback(); fail('Purchase order not found', 404); }
    if ($po['status'] === 'received') { $conn->rollback(); fail('Already received'); }

    // Bump stock for each variant-backed line + log a 'received' adjustment.
    $lines = $conn->prepare('SELECT variant_id, qty FROM purchase_order_items WHERE po_id = ?');
    $lines->bind_param('i', $id);
    $lines->execute();
    $lr = $lines->get_result();
    $upd = $conn->prepare('UPDATE product_variants SET stock = stock + ? WHERE id = ?');
    $cur = $conn->prepare('SELECT stock FROM product_variants WHERE id = ?');
    $log = $conn->prepare('INSERT INTO stock_adjustments (variant_id, delta, reason, note, stock_after, user_id) VALUES (?,?,?,?,?,?)');
    $reason = 'received'; $note = 'PO ' . $id;
    $received = 0;
    while ($row = $lr->fetch_assoc()) {
      $vid = $row['variant_id'] ? (int)$row['variant_id'] : 0;
      $qty = (int)$row['qty'];
      if (!$vid || $qty <= 0) continue;
      $upd->bind_param('ii', $qty, $vid);
      $upd->execute();
      $cur->bind_param('i', $vid);
      $cur->execute();
      $after = (int)($cur->get_result()->fetch_assoc()['stock'] ?? 0);
      $log->bind_param('iissii', $vid, $qty, $reason, $note, $after, $user['id']);
      $log->execute();
      $received++;
    }
    $fin = $conn->prepare("UPDATE purchase_orders SET status='received', received_at=NOW() WHERE id = ?");
    $fin->bind_param('i', $id);
    $fin->execute();
    $conn->commit();
    audit($user['id'], 'po_receive', 'purchase_order', $id, ['lines' => $received]);
    json(['ok' => true, 'received_lines' => $received]);
  } catch (Throwable $e) {
    $conn->rollback();
    throw $e;
  }
}

if ($action === 'po_status' && method() === 'POST') {
  $id = (int)($_GET['id'] ?? 0);
  $b = body();
  $status = $b['status'] ?? '';
  if (!in_array($status, $PO_STATUSES, true)) fail('Invalid status');
  $stmt = $conn->prepare('UPDATE purchase_orders SET status = ? WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('si', $status, $id);
  $stmt->execute();
  audit($user['id'], 'po_status', 'purchase_order', $id, ['status' => $status]);
  json(['ok' => true, 'status' => $status]);
}

fail('Unknown action', 404);
