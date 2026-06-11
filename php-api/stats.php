<?php
/**
 * HeritOS — dashboard stats. One call returns every headline number so the
 * dashboard renders in a single round-trip.
 *
 *   GET /stats.php  (STAFF) → { tailoring, catalogue, enquiries, customers }
 */
require __DIR__ . '/_lib.php';
cors();
require_auth(['super_admin', 'admin', 'manager', 'tailor', 'editor', 'employee']);

if (method() !== 'GET') fail('Method not allowed', 405);

function scalar($conn, $sql) {
  $res = $conn->query($sql);
  if (!$res) return 0;
  $row = $res->fetch_row();
  return $row ? (int)$row[0] : 0;
}

/* ---- Tailoring ----------------------------------------------------------- */
$byStage = [];
$res = $conn->query(
  "SELECT stage, COUNT(*) c FROM tailoring_orders WHERE deleted_at IS NULL GROUP BY stage"
);
while ($res && $row = $res->fetch_assoc()) $byStage[$row['stage']] = (int)$row['c'];

$tailoring = [
  'active'   => scalar($conn, "SELECT COUNT(*) FROM tailoring_orders WHERE deleted_at IS NULL AND stage NOT IN ('done','cancelled')"),
  'by_stage' => $byStage,
  'due_week' => scalar($conn, "SELECT COUNT(*) FROM tailoring_orders WHERE deleted_at IS NULL AND stage NOT IN ('done','cancelled') AND due_date IS NOT NULL AND due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)"),
  'overdue'  => scalar($conn, "SELECT COUNT(*) FROM tailoring_orders WHERE deleted_at IS NULL AND stage NOT IN ('done','cancelled') AND due_date IS NOT NULL AND due_date < CURDATE()"),
];

/* ---- Catalogue ----------------------------------------------------------- */
$catalogue = [
  'products'     => scalar($conn, "SELECT COUNT(*) FROM products WHERE deleted_at IS NULL"),
  'active'       => scalar($conn, "SELECT COUNT(*) FROM products WHERE deleted_at IS NULL AND status = 'active'"),
  'variants'     => scalar($conn, "SELECT COUNT(*) FROM product_variants"),
  'low_stock'    => scalar($conn, "SELECT COUNT(*) FROM product_variants WHERE stock > 0 AND stock <= 5"),
  'out_of_stock' => scalar($conn, "SELECT COUNT(*) FROM product_variants WHERE stock = 0"),
  'stock_units'  => scalar($conn, "SELECT COALESCE(SUM(stock),0) FROM product_variants"),
];

/* ---- Enquiries & customers ---------------------------------------------- */
$enquiries = [
  'new'   => scalar($conn, "SELECT COUNT(*) FROM enquiries WHERE status = 'new'"),
  'total' => scalar($conn, "SELECT COUNT(*) FROM enquiries"),
];
$customers = scalar($conn, "SELECT COUNT(*) FROM customers WHERE deleted_at IS NULL");

json([
  'tailoring'  => $tailoring,
  'catalogue'  => $catalogue,
  'enquiries'  => $enquiries,
  'customers'  => $customers,
]);
