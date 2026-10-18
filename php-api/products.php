<?php
/**
 * HeritOS — Products & Variants (ready-to-wear catalogue).
 *
 *   GET  /products.php?action=list                → products + variant/stock summary
 *   GET  /products.php?action=get&id=N            → product + its variants
 *   POST /products.php?action=create  {name, category, fabric, description,
 *                                      base_price, sizes:[], colors:[]}
 *                                      → product + auto size×colour variants
 *   POST /products.php?action=stock&id=V {stock}  → set one variant's stock
 *   POST /products.php?action=status&id=N {status}→ draft|active|archived
 *
 * Staff-only.
 */
require __DIR__ . '/_lib.php';
cors();

$STAFF = ['super_admin', 'admin', 'manager', 'editor', 'employee'];
$STATUSES = ['draft', 'active', 'archived'];

$user = require_auth($STAFF);
$action = $_GET['action'] ?? 'list';

/* ---- LIST ---------------------------------------------------------------- */
if ($action === 'list' && method() === 'GET') {
  $rows = [];
  $sql = "SELECT p.id, p.code, p.name, p.category, p.fabric, p.base_price, p.cost_price, p.status, p.image_url,
                 COUNT(v.id) AS variant_count,
                 COALESCE(SUM(v.stock), 0) AS total_stock
            FROM products p
       LEFT JOIN product_variants v ON v.product_id = p.id
           WHERE p.deleted_at IS NULL
        GROUP BY p.id
        ORDER BY p.id DESC";
  $res = $conn->query($sql);
  while ($res && $row = $res->fetch_assoc()) $rows[] = $row;
  json($rows);
}

/* ---- GET ONE ------------------------------------------------------------- */
if ($action === 'get' && method() === 'GET') {
  $id = in_int($_GET, 'id');
  $stmt = $conn->prepare('SELECT * FROM products WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $product = $stmt->get_result()->fetch_assoc();
  if (!$product) fail('Product not found', 404);

  $variants = [];
  $stmt = $conn->prepare('SELECT id, sku, size, color, stock, price_override FROM product_variants WHERE product_id = ? ORDER BY size, color');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $r = $stmt->get_result();
  while ($row = $r->fetch_assoc()) $variants[] = $row;

  $product['variants'] = $variants;
  json($product);
}

/* ---- CREATE -------------------------------------------------------------- */
if ($action === 'create' && method() === 'POST') {
  $b = body();
  $name = trim(in_str($b, 'name'));
  $category = trim(in_str($b, 'category'));
  $fabric = trim(in_str($b, 'fabric'));
  $description = trim(in_str($b, 'description'));
  $basePrice = in_num($b, 'base_price', 0);
  $costPrice = in_num($b, 'cost_price', 0);
  $story = trim(in_str($b, 'story'));
  $care = trim(in_str($b, 'care'));
  $oneOfAKind = !empty($b['one_of_a_kind']) ? 1 : 0;
  $sizes = array_values(array_filter(array_map(fn($v) => trim(scalar_text($v)), (array)($b['sizes'] ?? []))));
  $colors = array_values(array_filter(array_map(fn($v) => trim(scalar_text($v)), (array)($b['colors'] ?? []))));
  if ($name === '') fail('Product name is required');

  // Next PRD-#### code.
  $res = $conn->query('SELECT MAX(id) AS m FROM products');
  $next = (int)($res->fetch_assoc()['m'] ?? 0) + 1;
  $code = 'PRD-' . str_pad((string)$next, 4, '0', STR_PAD_LEFT);

  $stmt = $conn->prepare(
    'INSERT INTO products (code, name, category, fabric, description, story, care,
                           base_price, cost_price, one_of_a_kind, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)'
  );
  $stmt->bind_param('sssssssddii', $code, $name, $category, $fabric, $description,
    $story, $care, $basePrice, $costPrice, $oneOfAKind, $user['id']);
  $stmt->execute();
  $productId = $conn->insert_id;

  // Build the size × colour matrix. If none given, make a single one-size variant.
  if (!$sizes) $sizes = ['OS'];          // one size
  if (!$colors) $colors = ['Default'];
  $vstmt = $conn->prepare('INSERT INTO product_variants (product_id, sku, size, color, stock) VALUES (?,?,?,?,0)');
  $made = 0;
  foreach ($sizes as $size) {
    foreach ($colors as $color) {
      $sku = $code . '-' . strtoupper(preg_replace('/\s+/', '', $size)) . '-' . strtoupper(preg_replace('/\s+/', '', $color));
      $vstmt->bind_param('isss', $productId, $sku, $size, $color);
      @$vstmt->execute();             // ignore rare duplicate SKU collisions
      $made++;
    }
  }

  audit($user['id'], 'product_create', 'product', $productId, ['code' => $code, 'variants' => $made]);
  json(['id' => $productId, 'code' => $code, 'variants' => $made], 201);
}

/* ---- UPDATE -------------------------------------------------------------- */
/* Edit the product's own fields (not variants). Storytelling + craft fields
 * live here so "the story is in the cloth" is editable, not just at create.  */
if ($action === 'update' && method() === 'POST') {
  $id = in_int($_GET, 'id');
  $b = body();
  $name = trim(in_str($b, 'name'));
  if ($name === '') fail('Product name is required');
  $category = trim(in_str($b, 'category'));
  $fabric = trim(in_str($b, 'fabric'));
  $description = trim(in_str($b, 'description'));
  $story = trim(in_str($b, 'story'));
  $care = trim(in_str($b, 'care'));
  $basePrice = in_num($b, 'base_price', 0);
  $costPrice = in_num($b, 'cost_price', 0);
  $oneOfAKind = !empty($b['one_of_a_kind']) ? 1 : 0;
  $imageUrl = trim(in_str($b, 'image_url'));

  // Storefront publishing fields (optional).
  $slug = trim(in_str($b, 'slug'));
  $slug = $slug !== '' ? strtolower(preg_replace('/[^a-z0-9-]+/i', '-', $slug)) : null;
  $slug = $slug ? trim($slug, '-') : null;
  $published = !empty($b['published']) ? 1 : 0;
  $storefront = isset($b['storefront']) && is_array($b['storefront']) ? json_encode($b['storefront']) : null;

  $stmt = $conn->prepare(
    'UPDATE products SET name=?, category=?, fabric=?, description=?, story=?, care=?,
                         base_price=?, cost_price=?, one_of_a_kind=?, image_url=?,
                         slug=?, published=?, storefront=COALESCE(?, storefront)
       WHERE id=? AND deleted_at IS NULL'
  );
  $stmt->bind_param('ssssssddissisi', $name, $category, $fabric, $description, $story, $care,
    $basePrice, $costPrice, $oneOfAKind, $imageUrl, $slug, $published, $storefront, $id);
  try { $stmt->execute(); }
  catch (\Throwable $e) { fail('That storefront slug is already taken', 409); }
  if ($stmt->affected_rows === 0) {
    $chk = $conn->prepare('SELECT id FROM products WHERE id=? AND deleted_at IS NULL');
    $chk->bind_param('i', $id);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) fail('Product not found', 404);
  }

  audit($user['id'], 'product_update', 'product', $id, ['name' => $name, 'published' => $published]);
  json(['ok' => true, 'id' => $id]);
}

/* ---- VARIANT STOCK ------------------------------------------------------- */
if ($action === 'stock' && method() === 'POST') {
  $variantId = in_int($_GET, 'id');
  $b = body();
  if (!isset($b['stock'])) fail('stock is required');
  $stock = in_int($b, 'stock');
  if ($stock < 0) fail('stock cannot be negative');

  $stmt = $conn->prepare('UPDATE product_variants SET stock = ? WHERE id = ?');
  $stmt->bind_param('ii', $stock, $variantId);
  $stmt->execute();

  audit($user['id'], 'variant_stock', 'product_variant', $variantId, ['stock' => $stock]);
  json(['ok' => true, 'stock' => $stock]);
}

/* ---- STATUS -------------------------------------------------------------- */
if ($action === 'status' && method() === 'POST') {
  $id = in_int($_GET, 'id');
  $b = body();
  $status = $b['status'] ?? '';
  if (!in_array($status, $STATUSES, true)) fail('Invalid status');

  $stmt = $conn->prepare('UPDATE products SET status = ? WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('si', $status, $id);
  $stmt->execute();

  audit($user['id'], 'product_status', 'product', $id, ['status' => $status]);
  json(['ok' => true, 'status' => $status]);
}

fail('Unknown action', 404);
