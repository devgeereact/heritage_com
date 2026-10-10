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
// by_stage keeps the legacy keys (the old dashboard reads them; stage is still
// dual-written). Counts use job_stage once schema_phase18.sql is imported, and
// "today" is the Lagos date computed here rather than the server's CURDATE().
$byStage = [];
$res = $conn->query(
  "SELECT stage, COUNT(*) c FROM tailoring_orders WHERE deleted_at IS NULL GROUP BY stage"
);
while ($res && $row = $res->fetch_assoc()) $byStage[$row['stage']] = (int)$row['c'];

$today = (new DateTime('now', new DateTimeZone('Africa/Lagos')))->format('Y-m-d');
$week = (new DateTime($today . ' +7 days'))->format('Y-m-d');
$open = has_column('tailoring_orders', 'job_stage')
  ? "job_stage NOT IN ('handed_over','cancelled')"
  : "stage NOT IN ('done','cancelled')";
$byJobStage = [];
if (has_column('tailoring_orders', 'job_stage')) {
  $res = $conn->query("SELECT job_stage, COUNT(*) c FROM tailoring_orders WHERE deleted_at IS NULL GROUP BY job_stage");
  while ($res && $row = $res->fetch_assoc()) $byJobStage[(string)$row['job_stage']] = (int)$row['c'];
}

$tailoring = [
  'active'       => scalar($conn, "SELECT COUNT(*) FROM tailoring_orders WHERE deleted_at IS NULL AND $open"),
  'by_stage'     => $byStage,
  'by_job_stage' => $byJobStage,
  'due_week'     => scalar($conn, "SELECT COUNT(*) FROM tailoring_orders WHERE deleted_at IS NULL AND $open AND due_date IS NOT NULL AND due_date BETWEEN '$today' AND '$week'"),
  'overdue'      => scalar($conn, "SELECT COUNT(*) FROM tailoring_orders WHERE deleted_at IS NULL AND $open AND due_date IS NOT NULL AND due_date < '$today'"),
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
