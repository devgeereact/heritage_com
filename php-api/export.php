<?php
/**
 * HeritOS — Data / accounting export. Returns CSV (as a JSON {filename, csv}
 * payload so the browser can save it with the Bearer token attached).
 *
 *   GET /export.php?type=orders|payments|expenses|customers|products
 *
 * Staff-only (managers+). Feed straight into Excel, QuickBooks or Wave.
 */
require __DIR__ . '/_lib.php';
cors();

$STAFF = ['super_admin', 'admin', 'manager'];
$user = require_auth($STAFF);

$type = $_GET['type'] ?? 'orders';

/** Build a CSV string from a header row + array of associative rows. */
function to_csv($headers, $rows) {
  $fh = fopen('php://temp', 'r+');
  fputcsv($fh, $headers);
  foreach ($rows as $r) fputcsv($fh, $r);
  rewind($fh);
  $csv = stream_get_contents($fh);
  fclose($fh);
  return $csv;
}

$QUERIES = [
  'orders' => [
    'headers' => ['code', 'date', 'customer', 'phone', 'channel', 'status', 'payment', 'total', 'paid', 'balance', 'source'],
    'sql' => "SELECT code, DATE(created_at) d, customer_name, customer_phone, channel, status, payment_method, total, paid, source
                FROM orders WHERE deleted_at IS NULL ORDER BY id DESC",
    'map' => fn($r) => [$r['code'], $r['d'], $r['customer_name'], $r['customer_phone'], $r['channel'], $r['status'],
                        $r['payment_method'], $r['total'], $r['paid'], (float)$r['total'] - (float)$r['paid'], $r['source']],
  ],
  'payments' => [
    'headers' => ['id', 'date', 'order', 'customer', 'amount', 'method', 'reference', 'note'],
    'sql' => "SELECT p.id, DATE(p.created_at) d, o.code, p.customer_name, p.amount, p.method, p.reference, p.note
                FROM payments p LEFT JOIN orders o ON o.id = p.order_id ORDER BY p.id DESC",
    'map' => fn($r) => [$r['id'], $r['d'], $r['code'], $r['customer_name'], $r['amount'], $r['method'], $r['reference'], $r['note']],
  ],
  'expenses' => [
    'headers' => ['id', 'date', 'category', 'amount', 'vendor', 'note'],
    'sql' => "SELECT id, spent_on, category, amount, vendor, note FROM expenses ORDER BY spent_on DESC, id DESC",
    'map' => fn($r) => [$r['id'], $r['spent_on'], $r['category'], $r['amount'], $r['vendor'], $r['note']],
  ],
  'customers' => [
    'headers' => ['id', 'name', 'phone', 'email', 'segment', 'tags', 'loyalty_points', 'created'],
    'sql' => "SELECT id, name, phone, email, segment, tags, loyalty_points, DATE(created_at) d
                FROM customers WHERE deleted_at IS NULL ORDER BY id DESC",
    'map' => fn($r) => [$r['id'], $r['name'], $r['phone'], $r['email'], $r['segment'], $r['tags'], $r['loyalty_points'], $r['d']],
  ],
  'products' => [
    'headers' => ['code', 'slug', 'name', 'category', 'fabric', 'base_price', 'cost_price', 'stock', 'status', 'published'],
    'sql' => "SELECT p.code, p.slug, p.name, p.category, p.fabric, p.base_price, p.cost_price, p.status, p.published,
                     COALESCE(SUM(v.stock),0) stock
                FROM products p LEFT JOIN product_variants v ON v.product_id = p.id
               WHERE p.deleted_at IS NULL GROUP BY p.id ORDER BY p.id DESC",
    'map' => fn($r) => [$r['code'], $r['slug'], $r['name'], $r['category'], $r['fabric'], $r['base_price'],
                        $r['cost_price'], $r['stock'], $r['status'], $r['published']],
  ],
];

if (!isset($QUERIES[$type])) fail('Unknown export type', 400);

$def = $QUERIES[$type];
$rows = [];
$res = $conn->query($def['sql']);
while ($res && $row = $res->fetch_assoc()) $rows[] = ($def['map'])($row);

$csv = to_csv($def['headers'], $rows);
$filename = 'herit-' . $type . '-' . date('Y-m-d') . '.csv';
audit($user['id'], 'export', $type, null, ['rows' => count($rows)]);
json(['filename' => $filename, 'csv' => $csv, 'rows' => count($rows)]);
