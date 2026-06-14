<?php
/**
 * HeritOS — Analytics & Reports. Read-only aggregations over the live tables.
 * No new schema — the numbers behind every decision.
 *
 *   GET /analytics.php  → {
 *     kpis: { revenue, orders, units, customers, avg_order, stock_value },
 *     sales_by_day:   [{ day, orders, revenue }]   (last 14 days),
 *     by_channel:     [{ channel, orders, revenue }],
 *     by_status:      [{ status, orders }],
 *     top_products:   [{ name, units, revenue }]   (top 8),
 *     low_stock:      [{ product, sku, size, color, stock }] (≤5, top 10),
 *     new_customers:  [{ day, count }]              (last 14 days)
 *   }
 *
 * Staff-only (managers+).
 */
require __DIR__ . '/_lib.php';
cors();

$STAFF = ['super_admin', 'admin', 'manager'];
require_auth($STAFF);

$out = [];

/* KPIs ---------------------------------------------------------------------*/
$rev = $conn->query("SELECT COALESCE(SUM(total),0) AS revenue, COUNT(*) AS orders FROM orders WHERE deleted_at IS NULL AND status <> 'cancelled'")->fetch_assoc();
$units = (int)($conn->query("SELECT COALESCE(SUM(i.qty),0) AS u FROM order_items i JOIN orders o ON o.id = i.order_id WHERE o.deleted_at IS NULL AND o.status <> 'cancelled'")->fetch_assoc()['u'] ?? 0);
$customers = (int)($conn->query("SELECT COUNT(*) AS c FROM customers WHERE deleted_at IS NULL")->fetch_assoc()['c'] ?? 0);
$stockValue = (float)($conn->query("SELECT COALESCE(SUM(v.stock * COALESCE(v.price_override, p.base_price)),0) AS v FROM product_variants v JOIN products p ON p.id = v.product_id WHERE p.deleted_at IS NULL")->fetch_assoc()['v'] ?? 0);
$revenue = (float)$rev['revenue']; $orders = (int)$rev['orders'];
$out['kpis'] = [
  'revenue' => $revenue,
  'orders' => $orders,
  'units' => $units,
  'customers' => $customers,
  'avg_order' => $orders ? $revenue / $orders : 0,
  'stock_value' => $stockValue,
];

/* Sales by day (14d) -------------------------------------------------------*/
$out['sales_by_day'] = [];
$r = $conn->query("SELECT DATE(created_at) AS day, COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue
                     FROM orders WHERE deleted_at IS NULL AND status <> 'cancelled'
                      AND created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
                    GROUP BY DATE(created_at) ORDER BY day ASC");
while ($r && $row = $r->fetch_assoc()) $out['sales_by_day'][] = ['day' => $row['day'], 'orders' => (int)$row['orders'], 'revenue' => (float)$row['revenue']];

/* By channel ---------------------------------------------------------------*/
$out['by_channel'] = [];
$r = $conn->query("SELECT channel, COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue
                     FROM orders WHERE deleted_at IS NULL AND status <> 'cancelled'
                    GROUP BY channel ORDER BY revenue DESC");
while ($r && $row = $r->fetch_assoc()) $out['by_channel'][] = ['channel' => $row['channel'], 'orders' => (int)$row['orders'], 'revenue' => (float)$row['revenue']];

/* By status ----------------------------------------------------------------*/
$out['by_status'] = [];
$r = $conn->query("SELECT status, COUNT(*) AS orders FROM orders WHERE deleted_at IS NULL GROUP BY status");
while ($r && $row = $r->fetch_assoc()) $out['by_status'][] = ['status' => $row['status'], 'orders' => (int)$row['orders']];

/* Top products -------------------------------------------------------------*/
$out['top_products'] = [];
$r = $conn->query("SELECT i.label AS name, SUM(i.qty) AS units, SUM(i.qty * i.unit_price) AS revenue
                     FROM order_items i JOIN orders o ON o.id = i.order_id
                    WHERE o.deleted_at IS NULL AND o.status <> 'cancelled'
                    GROUP BY i.label ORDER BY revenue DESC LIMIT 8");
while ($r && $row = $r->fetch_assoc()) $out['top_products'][] = ['name' => $row['name'], 'units' => (int)$row['units'], 'revenue' => (float)$row['revenue']];

/* Low stock ----------------------------------------------------------------*/
$out['low_stock'] = [];
$r = $conn->query("SELECT p.name AS product, v.sku, v.size, v.color, v.stock
                     FROM product_variants v JOIN products p ON p.id = v.product_id
                    WHERE p.deleted_at IS NULL AND v.stock <= 5
                    ORDER BY v.stock ASC LIMIT 10");
while ($r && $row = $r->fetch_assoc()) $out['low_stock'][] = ['product' => $row['product'], 'sku' => $row['sku'], 'size' => $row['size'], 'color' => $row['color'], 'stock' => (int)$row['stock']];

/* New customers (14d) ------------------------------------------------------*/
$out['new_customers'] = [];
$r = $conn->query("SELECT DATE(created_at) AS day, COUNT(*) AS count FROM customers
                    WHERE deleted_at IS NULL AND created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
                    GROUP BY DATE(created_at) ORDER BY day ASC");
while ($r && $row = $r->fetch_assoc()) $out['new_customers'][] = ['day' => $row['day'], 'count' => (int)$row['count']];

/* Profit / margin (COGS via variant → product cost_price) -------------------*/
/* Only variant-backed lines carry a cost; revenue counts all lines, so this is
 * a floor on profit until every line is mapped to a costed product. */
$cogs = (float)($conn->query(
  "SELECT COALESCE(SUM(i.qty * p.cost_price),0) AS c
     FROM order_items i
     JOIN orders o ON o.id = i.order_id
     JOIN product_variants v ON v.id = i.variant_id
     JOIN products p ON p.id = v.product_id
    WHERE o.deleted_at IS NULL AND o.status <> 'cancelled'"
)->fetch_assoc()['c'] ?? 0);
$rev = (float)$out['kpis']['revenue'];
$out['kpis']['cogs'] = $cogs;
$out['kpis']['profit'] = $rev - $cogs;
$out['kpis']['margin'] = $rev > 0 ? ($rev - $cogs) / $rev : 0;

/* New vs returning customers ----------------------------------------------*/
/* An order is "returning" if the same customer placed an earlier (lower-id)
 * non-cancelled order; first-ever orders and guest (unlinked) orders are new.
 * Tracks the "turn buyers into repeat family" goal in money, not just counts. */
$out['customer_split'] = ['new' => ['orders' => 0, 'revenue' => 0], 'returning' => ['orders' => 0, 'revenue' => 0]];
$r = $conn->query(
  "SELECT CASE WHEN o.customer_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM orders e
               WHERE e.customer_id = o.customer_id AND e.id < o.id
                 AND e.deleted_at IS NULL AND e.status <> 'cancelled'
          ) THEN 'returning' ELSE 'new' END AS kind,
          COUNT(*) AS orders, COALESCE(SUM(o.total),0) AS revenue
     FROM orders o
    WHERE o.deleted_at IS NULL AND o.status <> 'cancelled'
    GROUP BY kind"
);
while ($r && $row = $r->fetch_assoc()) {
  $k = $row['kind'] === 'returning' ? 'returning' : 'new';
  $out['customer_split'][$k] = ['orders' => (int)$row['orders'], 'revenue' => (float)$row['revenue']];
}

/* Revenue by region — "Lagos to the world" --------------------------------*/
/* Classified in PHP (no region column yet): a +<non-234> phone OR a foreign
 * place-name in the ship address ⇒ Diaspora; "Lagos" in the address ⇒ Lagos;
 * everything else ⇒ Other Nigeria. A heuristic, but it reads live data and
 * needs no new capture step. */
$region = ['Lagos' => ['orders' => 0, 'revenue' => 0], 'Other Nigeria' => ['orders' => 0, 'revenue' => 0], 'Diaspora' => ['orders' => 0, 'revenue' => 0]];
$foreign = '/\b(uk|u\.k|united kingdom|london|england|usa|u\.s|united states|america|canada|germany|france|ireland|dubai|uae|netherlands|sweden|italy|spain|australia)\b/i';
$r = $conn->query("SELECT total, customer_phone, ship_address FROM orders WHERE deleted_at IS NULL AND status <> 'cancelled'");
while ($r && $row = $r->fetch_assoc()) {
  $phone = trim((string)($row['customer_phone'] ?? ''));
  $addr = (string)($row['ship_address'] ?? '');
  $intlPhone = $phone !== '' && $phone[0] === '+' && strpos($phone, '+234') !== 0;
  if ($intlPhone || preg_match($foreign, $addr)) $bucket = 'Diaspora';
  elseif (stripos($addr, 'lagos') !== false)     $bucket = 'Lagos';
  else                                            $bucket = 'Other Nigeria';
  $region[$bucket]['orders']++;
  $region[$bucket]['revenue'] += (float)$row['total'];
}
$out['by_region'] = [];
foreach ($region as $name => $v) $out['by_region'][] = ['region' => $name, 'orders' => $v['orders'], 'revenue' => $v['revenue']];

/* Campaign attribution (UTM source) ---------------------------------------*/
$out['by_source'] = [];
$r = $conn->query("SELECT COALESCE(NULLIF(source,''),'direct') AS source, COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue
                     FROM orders WHERE deleted_at IS NULL AND status <> 'cancelled'
                    GROUP BY source ORDER BY revenue DESC LIMIT 12");
while ($r && $row = $r->fetch_assoc()) $out['by_source'][] = ['source' => $row['source'], 'orders' => (int)$row['orders'], 'revenue' => (float)$row['revenue']];

/* By payment method --------------------------------------------------------*/
$out['by_payment'] = [];
$r = $conn->query("SELECT payment_method AS method, COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue
                     FROM orders WHERE deleted_at IS NULL AND status <> 'cancelled'
                    GROUP BY payment_method ORDER BY revenue DESC");
while ($r && $row = $r->fetch_assoc()) $out['by_payment'][] = ['method' => $row['method'], 'orders' => (int)$row['orders'], 'revenue' => (float)$row['revenue']];

/* Worst sellers — active published pieces with the least (or no) sales -------*/
$out['worst_sellers'] = [];
$r = $conn->query(
  "SELECT p.name, COALESCE(SUM(i.qty),0) AS units, COALESCE(SUM(i.qty*i.unit_price),0) AS revenue
     FROM products p
LEFT JOIN product_variants v ON v.product_id = p.id
LEFT JOIN order_items i ON i.variant_id = v.id
LEFT JOIN orders o ON o.id = i.order_id AND o.deleted_at IS NULL AND o.status <> 'cancelled'
    WHERE p.deleted_at IS NULL AND p.status = 'active'
 GROUP BY p.id ORDER BY units ASC, revenue ASC LIMIT 8"
);
while ($r && $row = $r->fetch_assoc()) $out['worst_sellers'][] = ['name' => $row['name'], 'units' => (int)$row['units'], 'revenue' => (float)$row['revenue']];

/* Returns — pipeline counts + top reasons ----------------------------------*/
$out['returns'] = ['by_status' => [], 'top_reasons' => []];
$r = $conn->query("SELECT return_status AS status, COUNT(*) AS n FROM orders
                    WHERE deleted_at IS NULL AND return_status <> 'none' GROUP BY return_status");
while ($r && $row = $r->fetch_assoc()) $out['returns']['by_status'][] = ['status' => $row['status'], 'count' => (int)$row['n']];
$r = $conn->query("SELECT return_reason AS reason, COUNT(*) AS n FROM orders
                    WHERE deleted_at IS NULL AND return_status <> 'none' AND return_reason IS NOT NULL AND return_reason <> ''
                 GROUP BY return_reason ORDER BY n DESC LIMIT 6");
while ($r && $row = $r->fetch_assoc()) $out['returns']['top_reasons'][] = ['reason' => $row['reason'], 'count' => (int)$row['n']];

/* NPS — promoters (9–10) minus detractors (0–6), as a % --------------------*/
$out['nps'] = ['score' => null, 'responses' => 0];
try {
  $n = $conn->query("SELECT COUNT(*) total,
                            SUM(score >= 9) promoters, SUM(score <= 6) detractors
                       FROM nps_responses")->fetch_assoc();
  $total = (int)($n['total'] ?? 0);
  if ($total > 0) {
    $nps = round((((int)$n['promoters'] - (int)$n['detractors']) / $total) * 100);
    $out['nps'] = ['score' => (int)$nps, 'responses' => $total,
                   'promoters' => (int)$n['promoters'], 'detractors' => (int)$n['detractors']];
  }
} catch (\Throwable $e) { /* table may not exist yet */ }

json($out);
