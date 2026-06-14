<?php
/**
 * HeritOS — Orders (ready-to-wear selling, all channels).
 *
 *   GET  /orders.php?action=list                  → orders + item count + summary
 *   GET  /orders.php?action=get&id=N              → order + line items
 *   POST /orders.php?action=create  {customer, phone, channel, payment_method,
 *                                    ship_address, notes,
 *                                    items:[{variant_id?, label, sku?, qty, unit_price}]}
 *   POST /orders.php?action=status&id=N {status}  → pipeline stage
 *
 * Staff-only. Variant line items deduct live stock on create.
 */
require __DIR__ . '/_lib.php';
cors();

$STAFF = ['super_admin', 'admin', 'manager', 'seller', 'employee'];
$CHANNELS = ['web', 'whatsapp', 'market', 'instagram', 'phone'];
$STATUSES = ['pending', 'paid', 'making', 'packing', 'shipped', 'delivered', 'cancelled'];
$PAYMENTS = ['cash', 'transfer', 'card', 'cod', 'unpaid'];
$RETURNS = ['none', 'requested', 'approved', 'received', 'refunded', 'rejected'];

$user = require_auth($STAFF);
$action = $_GET['action'] ?? 'list';

/* ---- LIST ---------------------------------------------------------------- */
if ($action === 'list' && method() === 'GET') {
  $rows = [];
  $sql = "SELECT o.id, o.code, o.customer_name, o.customer_phone, o.channel, o.status,
                 o.total, o.paid, o.payment_method, o.created_at,
                 o.courier, o.tracking_url, o.return_status,
                 COUNT(i.id) AS item_count, COALESCE(SUM(i.qty),0) AS unit_count
            FROM orders o
       LEFT JOIN order_items i ON i.order_id = o.id
           WHERE o.deleted_at IS NULL
        GROUP BY o.id
        ORDER BY o.id DESC";
  $res = $conn->query($sql);
  while ($row = $res->fetch_assoc()) $rows[] = $row;
  json($rows);
}

/* ---- GET ONE ------------------------------------------------------------- */
if ($action === 'get' && method() === 'GET') {
  $id = (int)($_GET['id'] ?? 0);
  $stmt = $conn->prepare('SELECT * FROM orders WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $order = $stmt->get_result()->fetch_assoc();
  if (!$order) fail('Order not found', 404);

  $items = [];
  $stmt = $conn->prepare('SELECT id, variant_id, label, sku, qty, unit_price FROM order_items WHERE order_id = ?');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $r = $stmt->get_result();
  while ($row = $r->fetch_assoc()) $items[] = $row;

  $order['items'] = $items;
  json($order);
}

/* ---- CREATE -------------------------------------------------------------- */
if ($action === 'create' && method() === 'POST') {
  $b = body();
  $customerName = trim($b['customer'] ?? '');
  $phone = trim($b['phone'] ?? '');
  $channel = in_array($b['channel'] ?? '', $CHANNELS, true) ? $b['channel'] : 'web';
  $payment = in_array($b['payment_method'] ?? '', $PAYMENTS, true) ? $b['payment_method'] : 'unpaid';
  $shipAddress = trim($b['ship_address'] ?? '');
  $notes = trim($b['notes'] ?? '');
  $items = is_array($b['items'] ?? null) ? $b['items'] : [];
  if ($customerName === '') fail('Customer name is required');
  if (!$items) fail('Add at least one item');

  // Link to an existing customer by phone, else leave unlinked.
  $customerId = null;
  if ($phone !== '') {
    $stmt = $conn->prepare('SELECT id FROM customers WHERE phone = ? AND deleted_at IS NULL LIMIT 1');
    $stmt->bind_param('s', $phone);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    if ($row) $customerId = (int)$row['id'];
  }

  // Compute total from the line items (server-side; never trust the client total).
  $total = 0;
  foreach ($items as $it) {
    $qty = max(1, (int)($it['qty'] ?? 1));
    $price = (float)($it['unit_price'] ?? 0);
    $total += $qty * $price;
  }
  $paid = ($payment === 'unpaid') ? 0 : $total;

  // Next ORD-#### code.
  $res = $conn->query('SELECT MAX(id) AS m FROM orders');
  $next = (int)($res->fetch_assoc()['m'] ?? 0) + 1;
  $code = 'ORD-' . str_pad((string)$next, 4, '0', STR_PAD_LEFT);

  $stmt = $conn->prepare(
    'INSERT INTO orders (code, customer_id, customer_name, customer_phone, channel,
                         payment_method, total, paid, ship_address, notes, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)'
  );
  $stmt->bind_param(
    'sissssddssi',
    $code, $customerId, $customerName, $phone, $channel,
    $payment, $total, $paid, $shipAddress, $notes, $user['id']
  );
  $stmt->execute();
  $orderId = $conn->insert_id;

  // Insert line items; deduct stock for variant-backed lines.
  $itemStmt = $conn->prepare(
    'INSERT INTO order_items (order_id, variant_id, label, sku, qty, unit_price) VALUES (?,?,?,?,?,?)'
  );
  $stockStmt = $conn->prepare(
    'UPDATE product_variants SET stock = GREATEST(0, stock - ?) WHERE id = ?'
  );
  $soldVariantIds = [];
  foreach ($items as $it) {
    $variantId = isset($it['variant_id']) && $it['variant_id'] !== '' ? (int)$it['variant_id'] : null;
    $label = trim($it['label'] ?? 'Item');
    $sku = isset($it['sku']) ? trim($it['sku']) : null;
    $qty = max(1, (int)($it['qty'] ?? 1));
    $price = (float)($it['unit_price'] ?? 0);
    $itemStmt->bind_param('iissid', $orderId, $variantId, $label, $sku, $qty, $price);
    $itemStmt->execute();
    if ($variantId) {
      $stockStmt->bind_param('ii', $qty, $variantId);
      $stockStmt->execute();
      $soldVariantIds[] = $variantId;
    }
  }

  // One-of-a-kind auto-retire + care-attach. For every product touched by this
  // order's variant lines: (a) if it's a hand-dyed one-off now at zero stock,
  // archive it so it can never be sold twice; (b) collect its care notes so the
  // care instructions travel onto the order.
  if (!empty($soldVariantIds)) {
    $in = implode(',', array_map('intval', array_unique($soldVariantIds)));
    // Archive sold-out one-of-a-kind pieces.
    $conn->query(
      "UPDATE products p
          SET p.status = 'archived'
        WHERE p.one_of_a_kind = 1 AND p.deleted_at IS NULL
          AND p.id IN (SELECT v.product_id FROM product_variants v WHERE v.id IN ($in))
          AND (SELECT COALESCE(SUM(v2.stock),0) FROM product_variants v2 WHERE v2.product_id = p.id) = 0"
    );
    // Gather care instructions for the pieces on this order.
    $careRes = $conn->query(
      "SELECT DISTINCT p.name, p.care FROM products p
         JOIN product_variants v ON v.product_id = p.id
        WHERE v.id IN ($in) AND p.care IS NOT NULL AND p.care <> ''"
    );
    $careLines = [];
    while ($careRes && $row = $careRes->fetch_assoc()) $careLines[] = $row['name'] . ': ' . $row['care'];
    if ($careLines) {
      $careBlock = "\nCare: " . implode(' | ', $careLines);
      $upd = $conn->prepare('UPDATE orders SET notes = CONCAT(COALESCE(notes,""), ?) WHERE id = ?');
      $upd->bind_param('si', $careBlock, $orderId);
      $upd->execute();
    }
  }

  audit($user['id'], 'order_create', 'order', $orderId, ['code' => $code, 'total' => $total]);
  json(['id' => $orderId, 'code' => $code, 'total' => $total], 201);
}

/* ---- STATUS -------------------------------------------------------------- */
if ($action === 'status' && method() === 'POST') {
  $id = (int)($_GET['id'] ?? 0);
  $b = body();
  $status = $b['status'] ?? '';
  if (!in_array($status, $STATUSES, true)) fail('Invalid status');

  $stmt = $conn->prepare('UPDATE orders SET status = ? WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('si', $status, $id);
  $stmt->execute();

  // A referral pays out once its order reaches a paid/fulfilled state.
  if (in_array($status, ['paid', 'making', 'packing', 'shipped', 'delivered'], true)) {
    referral_settle($id);
  }

  audit($user['id'], 'order_status', 'order', $id, ['status' => $status]);
  json(['ok' => true, 'status' => $status]);
}

/* ---- TRACKING ------------------------------------------------------------ */
/* Attach courier + tracking details and move the order to 'shipped'.        */
if ($action === 'track' && method() === 'POST') {
  $id = (int)($_GET['id'] ?? 0);
  $b = body();
  $courier = trim($b['courier'] ?? '');
  $ref = trim($b['tracking_ref'] ?? '');
  $url = trim($b['tracking_url'] ?? '');
  $markShipped = ($b['mark_shipped'] ?? true) ? 'shipped' : null;

  if ($markShipped) {
    $stmt = $conn->prepare("UPDATE orders SET courier = ?, tracking_ref = ?, tracking_url = ?, status = 'shipped' WHERE id = ? AND deleted_at IS NULL");
    $stmt->bind_param('sssi', $courier, $ref, $url, $id);
  } else {
    $stmt = $conn->prepare('UPDATE orders SET courier = ?, tracking_ref = ?, tracking_url = ? WHERE id = ? AND deleted_at IS NULL');
    $stmt->bind_param('sssi', $courier, $ref, $url, $id);
  }
  $stmt->execute();

  // WhatsApp dispatch notification to the customer (non-fatal).
  $o = $conn->query('SELECT code, customer_name, customer_phone, customer_id FROM orders WHERE id = ' . (int)$id)->fetch_assoc();
  if ($o && trim((string)$o['customer_phone']) !== '') {
    $first = explode(' ', trim($o['customer_name']))[0] ?: 'there';
    $line = "Hi {$first}, your Herit Clothing order {$o['code']} is on its way! 📦"
      . ($courier !== '' ? "\nCourier: {$courier}" : '')
      . ($ref !== '' ? "\nTracking: {$ref}" : '')
      . ($url !== '' ? "\n{$url}" : '');
    wa_dispatch($o['customer_phone'], $line, $o['customer_id'] ? (int)$o['customer_id'] : null, 'dispatch', $user['id']);
  }

  audit($user['id'], 'order_track', 'order', $id, ['courier' => $courier, 'ref' => $ref]);
  json(['ok' => true, 'courier' => $courier, 'tracking_ref' => $ref, 'tracking_url' => $url]);
}

/* ---- RETURN / EXCHANGE --------------------------------------------------- */
if ($action === 'return' && method() === 'POST') {
  $id = (int)($_GET['id'] ?? 0);
  $b = body();
  $rs = $b['return_status'] ?? '';
  $reason = trim($b['return_reason'] ?? '');
  if (!in_array($rs, $RETURNS, true)) fail('Invalid return status');

  $stmt = $conn->prepare('UPDATE orders SET return_status = ?, return_reason = ? WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('ssi', $rs, $reason, $id);
  $stmt->execute();
  audit($user['id'], 'order_return', 'order', $id, ['return_status' => $rs, 'reason' => $reason]);
  json(['ok' => true, 'return_status' => $rs, 'return_reason' => $reason]);
}

/* ---- RECORD PAYMENT (installment / "pay small small" / transfer confirm) -- */
if ($action === 'pay' && method() === 'POST') {
  $id = (int)($_GET['id'] ?? 0);
  $b = body();
  $amount = (float)($b['amount'] ?? 0);
  $pmethod = in_array($b['method'] ?? '', $PAYMENTS, true) ? $b['method'] : 'transfer';
  $reference = trim($b['reference'] ?? '');
  if ($amount <= 0) fail('Amount must be positive');

  $o = $conn->query('SELECT code, customer_name, total, paid FROM orders WHERE id = ' . (int)$id . ' AND deleted_at IS NULL')->fetch_assoc();
  if (!$o) fail('Order not found', 404);

  // Log the money-in + bump the order's paid figure (capped at total).
  $pstmt = $conn->prepare('INSERT INTO payments (order_id, customer_name, amount, method, reference, note, created_by) VALUES (?,?,?,?,?,?,?)');
  $note = 'Part payment';
  $pstmt->bind_param('isdsssi', $id, $o['customer_name'], $amount, $pmethod, $reference, $note, $user['id']);
  $pstmt->execute();

  $newPaid = min((float)$o['total'], (float)$o['paid'] + $amount);
  $balance = max(0, (float)$o['total'] - $newPaid);
  // Fully paid → advance an unpaid/pending order to 'paid'.
  if ($balance <= 0) {
    $conn->query("UPDATE orders SET paid = $newPaid, status = IF(status='pending','paid',status) WHERE id = " . (int)$id);
  } else {
    $upd = $conn->prepare('UPDATE orders SET paid = ? WHERE id = ?');
    $upd->bind_param('di', $newPaid, $id);
    $upd->execute();
  }
  audit($user['id'], 'order_pay', 'order', $id, ['amount' => $amount, 'method' => $pmethod]);
  json(['ok' => true, 'paid' => $newPaid, 'balance' => $balance]);
}

/* ---- REFUND (cash or to store credit) ------------------------------------ */
if ($action === 'refund' && method() === 'POST') {
  $id = (int)($_GET['id'] ?? 0);
  $b = body();
  $amount = (float)($b['amount'] ?? 0);
  $to = ($b['to'] ?? 'credit') === 'cash' ? 'cash' : 'credit';
  $reason = trim($b['reason'] ?? '');
  if ($amount <= 0) fail('Amount must be positive');

  $o = $conn->query('SELECT code, customer_id, paid FROM orders WHERE id = ' . (int)$id . ' AND deleted_at IS NULL')->fetch_assoc();
  if (!$o) fail('Order not found', 404);
  if ($amount > (float)$o['paid']) fail('Refund exceeds what was paid');

  // Reverse the money on the order; mark the return refunded.
  $newPaid = max(0, (float)$o['paid'] - $amount);
  $conn->query("UPDATE orders SET paid = $newPaid, return_status = 'refunded' WHERE id = " . (int)$id);

  if ($to === 'credit') {
    if (!$o['customer_id']) fail('No customer on this order to credit');
    credit_add((int)$o['customer_id'], $amount, 'refund', $o['code'], $reason ?: 'Refund to store credit', $user['id']);
  } else {
    // Cash/transfer refund — book it as money out.
    $ex = $conn->prepare("INSERT INTO expenses (category, amount, vendor, note, spent_on, created_by) VALUES ('refund', ?, ?, ?, CURDATE(), ?)");
    $vend = 'Refund ' . $o['code'];
    $rnote = $reason ?: 'Cash refund';
    $ex->bind_param('dssi', $amount, $vend, $rnote, $user['id']);
    $ex->execute();
  }
  audit($user['id'], 'order_refund', 'order', $id, ['amount' => $amount, 'to' => $to]);
  json(['ok' => true, 'refunded' => $amount, 'to' => $to]);
}

fail('Unknown action', 404);
