<?php
/**
 * HeritOS — Inventory & Stock.
 *
 * Live stock sits on product_variants.stock (orders.php deducts it on sale).
 * This endpoint is the management layer over it: see stock by variant, spot
 * what's low or out, move stock with a reason, and run a stock-take.
 *
 *   GET  /stock.php?action=list                   → every variant + product + stock + value,
 *                                                    plus a summary (units, value, low, out)
 *   GET  /stock.php?action=history&id=V           → adjustment history for one variant
 *   POST /stock.php?action=adjust&id=V {delta, reason, note}
 *                                                  → move stock by a signed delta
 *   POST /stock.php?action=set&id=V {stock, note} → set absolute count (stock-take); logs the diff
 *
 * Staff-only. Every move writes a stock_adjustments row + audit entry.
 */
require __DIR__ . '/_lib.php';
cors();

$STAFF = ['super_admin', 'admin', 'manager', 'employee'];
$REASONS = ['received', 'return', 'damage', 'count', 'correction'];
$LOW = 5;   // at or below this (but > 0) = "low stock"

$user = require_auth($STAFF);
$action = $_GET['action'] ?? 'list';

/* ---- LIST ---------------------------------------------------------------- */
if ($action === 'list' && method() === 'GET') {
  $rows = [];
  $sql = "SELECT v.id, v.sku, v.size, v.color, v.stock,
                 COALESCE(v.price_override, p.base_price) AS price,
                 (v.stock * COALESCE(v.price_override, p.base_price)) AS stock_value,
                 p.id AS product_id, p.code AS product_code, p.name AS product_name,
                 p.category, p.fabric, p.status
            FROM product_variants v
            JOIN products p ON p.id = v.product_id
           WHERE p.deleted_at IS NULL
        ORDER BY (v.stock = 0) DESC, v.stock ASC, p.name ASC";
  $res = $conn->query($sql);
  $units = 0; $value = 0.0; $low = 0; $out = 0;
  while ($res && $row = $res->fetch_assoc()) {
    $row['stock'] = (int)$row['stock'];
    $row['price'] = (float)$row['price'];
    $row['stock_value'] = (float)$row['stock_value'];
    $row['state'] = $row['stock'] === 0 ? 'out' : ($row['stock'] <= $LOW ? 'low' : 'ok');
    $units += $row['stock'];
    $value += $row['stock_value'];
    if ($row['state'] === 'out') $out++;
    elseif ($row['state'] === 'low') $low++;
    $rows[] = $row;
  }
  json([
    'variants' => $rows,
    'summary' => [
      'skus'  => count($rows),
      'units' => $units,
      'value' => $value,
      'low'   => $low,
      'out'   => $out,
      'low_threshold' => $LOW,
    ],
  ]);
}

/* ---- HISTORY ------------------------------------------------------------- */
if ($action === 'history' && method() === 'GET') {
  $variantId = (int)($_GET['id'] ?? 0);
  $rows = [];
  $stmt = $conn->prepare(
    'SELECT a.id, a.delta, a.reason, a.note, a.stock_after, a.created_at, u.name AS user_name
       FROM stock_adjustments a
       LEFT JOIN users u ON u.id = a.user_id
      WHERE a.variant_id = ?
      ORDER BY a.id DESC
      LIMIT 100'
  );
  $stmt->bind_param('i', $variantId);
  $stmt->execute();
  $r = $stmt->get_result();
  while ($row = $r->fetch_assoc()) $rows[] = $row;
  json($rows);
}

/* ---- ADJUST (signed delta) ---------------------------------------------- */
if ($action === 'adjust' && method() === 'POST') {
  $variantId = (int)($_GET['id'] ?? 0);
  $b = body();
  $delta = (int)($b['delta'] ?? 0);
  $reason = $b['reason'] ?? '';
  $note = isset($b['note']) ? trim($b['note']) : null;
  if ($delta === 0) fail('Delta cannot be zero');
  if (!in_array($reason, $REASONS, true)) fail('Invalid reason');

  $stockAfter = apply_move($conn, $variantId, $delta, $reason, $note, $user['id']);
  json(['ok' => true, 'stock' => $stockAfter, 'delta' => $delta]);
}

/* ---- SET (absolute, for stock-take) ------------------------------------- */
if ($action === 'set' && method() === 'POST') {
  $variantId = (int)($_GET['id'] ?? 0);
  $b = body();
  if (!isset($b['stock'])) fail('stock is required');
  $target = (int)$b['stock'];
  if ($target < 0) fail('stock cannot be negative');
  $note = isset($b['note']) ? trim($b['note']) : null;

  // Compute the delta against current stock under a row lock, then log as a count.
  $conn->begin_transaction();
  try {
    $cur = current_stock($conn, $variantId);
    if ($cur === null) { $conn->rollback(); fail('Variant not found', 404); }
    $delta = $target - $cur;
    $upd = $conn->prepare('UPDATE product_variants SET stock = ? WHERE id = ?');
    $upd->bind_param('ii', $target, $variantId);
    $upd->execute();
    log_adjustment($conn, $variantId, $delta, 'count', $note, $target, $user['id']);
    $conn->commit();
  } catch (Throwable $e) {
    $conn->rollback();
    throw $e;
  }
  audit($user['id'], 'stock_set', 'product_variant', $variantId, ['stock' => $target]);
  json(['ok' => true, 'stock' => $target]);
}

fail('Unknown action', 404);

/* ---- helpers ------------------------------------------------------------- */

/** Current stock for a variant, locked for update. Null if not found. */
function current_stock($conn, $variantId) {
  $stmt = $conn->prepare('SELECT stock FROM product_variants WHERE id = ? FOR UPDATE');
  $stmt->bind_param('i', $variantId);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();
  return $row ? (int)$row['stock'] : null;
}

/** Apply a signed delta atomically (clamped at 0) and log it. Returns new stock. */
function apply_move($conn, $variantId, $delta, $reason, $note, $userId) {
  $conn->begin_transaction();
  try {
    $cur = current_stock($conn, $variantId);
    if ($cur === null) { $conn->rollback(); fail('Variant not found', 404); }
    $after = max(0, $cur + $delta);
    $applied = $after - $cur;                  // real change after clamping
    $upd = $conn->prepare('UPDATE product_variants SET stock = ? WHERE id = ?');
    $upd->bind_param('ii', $after, $variantId);
    $upd->execute();
    log_adjustment($conn, $variantId, $applied, $reason, $note, $after, $userId);
    $conn->commit();
  } catch (Throwable $e) {
    $conn->rollback();
    throw $e;
  }
  audit($userId, 'stock_adjust', 'product_variant', $variantId, ['delta' => $delta, 'reason' => $reason]);
  return $after;
}

/** Insert one stock_adjustments row. */
function log_adjustment($conn, $variantId, $delta, $reason, $note, $stockAfter, $userId) {
  $stmt = $conn->prepare(
    'INSERT INTO stock_adjustments (variant_id, delta, reason, note, stock_after, user_id)
     VALUES (?,?,?,?,?,?)'
  );
  $stmt->bind_param('iissii', $variantId, $delta, $reason, $note, $stockAfter, $userId);
  $stmt->execute();
}
