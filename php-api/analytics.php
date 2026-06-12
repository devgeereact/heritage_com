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

json($out);
