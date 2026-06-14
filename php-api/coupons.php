<?php
/**
 * HeritOS — Coupons & promo codes (the promotions engine).
 *
 *   GET  /coupons.php?action=validate&code=…&subtotal=…   → PUBLIC quote (checkout)
 *   GET  /coupons.php?action=list                          → staff: codes + usage
 *   POST /coupons.php?action=create  {code,type,value,min_spend,usage_limit,
 *                                     starts_at,expires_at,active,description}
 *   POST /coupons.php?action=update&id=N {…same…}
 *   POST /coupons.php?action=toggle&id=N {active}
 *   POST /coupons.php?action=delete&id=N
 *
 * Discount maths lives in coupon_eval() (_lib.php) so the storefront quote and
 * the authoritative checkout price share one implementation.
 */
require __DIR__ . '/_lib.php';
cors();

$action = $_GET['action'] ?? 'list';
$TYPES = ['percent', 'fixed', 'free_ship'];

/* ---- VALIDATE (public — used by the storefront checkout) ----------------- */
if ($action === 'validate' && method() === 'GET') {
  $code = $_GET['code'] ?? '';
  $subtotal = (float)($_GET['subtotal'] ?? 0);
  $shipping = (float)($_GET['shipping'] ?? 0);
  json(coupon_eval($code, $subtotal, $shipping));
}

/* ---- Everything below is staff-only -------------------------------------- */
$STAFF = ['super_admin', 'admin', 'manager', 'editor'];
$user = require_auth($STAFF);

/* ---- LIST ---------------------------------------------------------------- */
if ($action === 'list' && method() === 'GET') {
  $rows = [];
  $sql = "SELECT c.*, COALESCE(SUM(r.discount),0) AS total_discount, COUNT(r.id) AS redemptions
            FROM coupons c
       LEFT JOIN coupon_redemptions r ON r.coupon_id = c.id
        GROUP BY c.id
        ORDER BY c.active DESC, c.id DESC";
  $res = $conn->query($sql);
  while ($res && $row = $res->fetch_assoc()) $rows[] = $row;
  json($rows);
}

/* ---- CREATE / UPDATE ----------------------------------------------------- */
if (($action === 'create' || $action === 'update') && method() === 'POST') {
  $b = body();
  $code = strtoupper(trim($b['code'] ?? ''));
  if ($code === '') fail('Code is required');
  if (!preg_match('/^[A-Z0-9_-]{2,40}$/', $code)) fail('Code: letters, numbers, - and _ only');
  $type = in_array($b['type'] ?? '', $TYPES, true) ? $b['type'] : 'percent';
  $value = (float)($b['value'] ?? 0);
  if ($type === 'percent' && ($value <= 0 || $value > 100)) fail('Percent must be 1–100');
  $minSpend = (float)($b['min_spend'] ?? 0);
  $usageLimit = max(0, (int)($b['usage_limit'] ?? 0));
  $startsAt = !empty($b['starts_at']) ? $b['starts_at'] : null;
  $expiresAt = !empty($b['expires_at']) ? $b['expires_at'] : null;
  $active = !empty($b['active']) ? 1 : 0;
  $description = trim($b['description'] ?? '');

  if ($action === 'create') {
    $stmt = $conn->prepare('INSERT INTO coupons (code, type, value, min_spend, usage_limit, starts_at, expires_at, active, description) VALUES (?,?,?,?,?,?,?,?,?)');
    $stmt->bind_param('ssddisssi', $code, $type, $value, $minSpend, $usageLimit, $startsAt, $expiresAt, $active, $description);
    try { $stmt->execute(); }
    catch (\Throwable $e) { fail('That code already exists', 409); }
    audit($user['id'], 'coupon_create', 'coupon', $conn->insert_id, ['code' => $code]);
    json(['ok' => true, 'id' => $conn->insert_id], 201);
  } else {
    $id = (int)($_GET['id'] ?? 0);
    $stmt = $conn->prepare('UPDATE coupons SET code=?, type=?, value=?, min_spend=?, usage_limit=?, starts_at=?, expires_at=?, active=?, description=? WHERE id=?');
    $stmt->bind_param('ssddisssii', $code, $type, $value, $minSpend, $usageLimit, $startsAt, $expiresAt, $active, $description, $id);
    try { $stmt->execute(); }
    catch (\Throwable $e) { fail('That code already exists', 409); }
    audit($user['id'], 'coupon_update', 'coupon', $id, ['code' => $code]);
    json(['ok' => true, 'id' => $id]);
  }
}

/* ---- TOGGLE -------------------------------------------------------------- */
if ($action === 'toggle' && method() === 'POST') {
  $id = (int)($_GET['id'] ?? 0);
  $b = body();
  $active = !empty($b['active']) ? 1 : 0;
  $stmt = $conn->prepare('UPDATE coupons SET active = ? WHERE id = ?');
  $stmt->bind_param('ii', $active, $id);
  $stmt->execute();
  audit($user['id'], 'coupon_toggle', 'coupon', $id, ['active' => $active]);
  json(['ok' => true, 'active' => $active]);
}

/* ---- DELETE -------------------------------------------------------------- */
if ($action === 'delete' && method() === 'POST') {
  $id = (int)($_GET['id'] ?? 0);
  $stmt = $conn->prepare('DELETE FROM coupons WHERE id = ?');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  audit($user['id'], 'coupon_delete', 'coupon', $id);
  json(['ok' => true]);
}

fail('Unknown action', 404);
