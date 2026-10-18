<?php
/**
 * HeritOS — Content hub. Staff CRUD for the public Blog (Journal) and the
 * curated Testimonials shown on the storefront.
 *
 *   GET  /content.php?action=blog_list                 → all posts (incl. drafts)
 *   GET  /content.php?action=blog_get&id=              → one post
 *   POST /content.php?action=blog_save   {id?, ...}    → create / update
 *   POST /content.php?action=blog_delete&id=
 *   GET  /content.php?action=testi_list                → all testimonials
 *   POST /content.php?action=testi_save  {id?, ...}    → create / update
 *   POST /content.php?action=testi_delete&id=
 *
 * Staff only (super_admin / admin / manager). Public reads go through store.php.
 */
require __DIR__ . '/_lib.php';
cors();

$STAFF = ['super_admin', 'admin', 'manager'];
$user = require_auth($STAFF);
$action = $_GET['action'] ?? '';

function slugify($s) {
  $s = strtolower(trim($s));
  $s = preg_replace('/[^a-z0-9]+/', '-', $s);
  return trim($s, '-') ?: 'post';
}

/* ---------------------------------------------------------------- BLOG */
if ($action === 'blog_list' && method() === 'GET') {
  $out = [];
  $res = $conn->query("SELECT id, slug, title, excerpt, category, tile, tags, status, author,
                              published_at, updated_at
                         FROM blog_posts ORDER BY COALESCE(published_at, updated_at) DESC");
  while ($res && $row = $res->fetch_assoc()) $out[] = $row;
  json(['posts' => $out]);
}

if ($action === 'blog_get' && method() === 'GET') {
  $id = in_int($_GET, 'id');
  $stmt = $conn->prepare("SELECT * FROM blog_posts WHERE id = ?");
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();
  if (!$row) fail('Post not found', 404);
  json($row);
}

if ($action === 'blog_save' && method() === 'POST') {
  $b = body();
  $id      = in_int($b, 'id');
  $title   = trim(in_str($b, 'title'));
  if ($title === '') fail('Title is required');
  $slug    = slugify(in_str($b, 'slug') ?: $title);
  $excerpt = trim(in_str($b, 'excerpt'));
  $bodyHtml= sanitize_html(in_str($b, 'body'));   // allowlist only; the storefront renders it as HTML
  $category= trim(in_str($b, 'category'));
  $tile    = trim(in_str($b, 'tile', 'hc-tile-mixed'));
  $tags    = trim(in_str($b, 'tags'));
  $status  = ($b['status'] ?? 'draft') === 'published' ? 'published' : 'draft';
  $author  = trim(in_str($b, 'author', $user['name'] ?? ''));

  // ensure slug uniqueness (ignore self on update)
  $chk = $conn->prepare("SELECT id FROM blog_posts WHERE slug = ? AND id <> ?");
  $chk->bind_param('si', $slug, $id);
  $chk->execute();
  if ($chk->get_result()->fetch_assoc()) $slug .= '-' . substr(md5($title . microtime()), 0, 4);

  if ($id) {
    // set published_at the first time it goes live
    $stmt = $conn->prepare("UPDATE blog_posts SET slug=?, title=?, excerpt=?, body=?, category=?,
                              tile=?, tags=?, status=?, author=?,
                              published_at = CASE WHEN ?='published' AND published_at IS NULL THEN NOW() ELSE published_at END
                            WHERE id=?");
    // 11 placeholders: nine SET strings, the status in the CASE, then the id.
    $stmt->bind_param('ssssssssssi', $slug, $title, $excerpt, $bodyHtml, $category, $tile, $tags, $status, $author, $status, $id);
    $stmt->execute();
    audit($user['id'], 'blog_update', 'blog_posts', $id, ['status' => $status]);
    json(['ok' => true, 'id' => $id, 'slug' => $slug]);
  } else {
    $pub = $status === 'published' ? date('Y-m-d H:i:s') : null;
    $stmt = $conn->prepare("INSERT INTO blog_posts (slug,title,excerpt,body,category,tile,tags,status,author,published_at)
                            VALUES (?,?,?,?,?,?,?,?,?,?)");
    $stmt->bind_param('ssssssssss', $slug, $title, $excerpt, $bodyHtml, $category, $tile, $tags, $status, $author, $pub);
    $stmt->execute();
    $newId = $conn->insert_id;
    audit($user['id'], 'blog_create', 'blog_posts', $newId, ['status' => $status]);
    json(['ok' => true, 'id' => $newId, 'slug' => $slug]);
  }
}

if ($action === 'blog_delete' && method() === 'POST') {
  $id = in_int($_GET, 'id');
  $stmt = $conn->prepare("DELETE FROM blog_posts WHERE id = ?");
  $stmt->bind_param('i', $id);
  $stmt->execute();
  audit($user['id'], 'blog_delete', 'blog_posts', $id);
  json(['ok' => true]);
}

/* -------------------------------------------------------- TESTIMONIALS */
if ($action === 'testi_list' && method() === 'GET') {
  $out = [];
  $res = $conn->query("SELECT * FROM testimonials ORDER BY featured DESC, sort ASC, id DESC");
  while ($res && $row = $res->fetch_assoc()) $out[] = $row;
  json(['testimonials' => $out]);
}

if ($action === 'testi_save' && method() === 'POST') {
  $b = body();
  $id       = in_int($b, 'id');
  $name     = trim(in_str($b, 'name'));
  $quote    = trim(in_str($b, 'quote'));
  if ($name === '' || $quote === '') fail('Name and quote are required');
  $location = trim(in_str($b, 'location'));
  $rating   = max(1, min(5, in_int($b, 'rating', 5)));
  $tile     = trim(in_str($b, 'tile', 'hc-tile-ankara'));
  $featured = !empty($b['featured']) ? 1 : 0;
  $status   = ($b['status'] ?? 'published') === 'hidden' ? 'hidden' : 'published';
  $sort     = in_int($b, 'sort');

  if ($id) {
    $stmt = $conn->prepare("UPDATE testimonials SET name=?, location=?, quote=?, rating=?, tile=?, featured=?, status=?, sort=? WHERE id=?");
    $stmt->bind_param('sssisisii', $name, $location, $quote, $rating, $tile, $featured, $status, $sort, $id);
    $stmt->execute();
    audit($user['id'], 'testimonial_update', 'testimonials', $id);
    json(['ok' => true, 'id' => $id]);
  } else {
    $stmt = $conn->prepare("INSERT INTO testimonials (name,location,quote,rating,tile,featured,status,sort) VALUES (?,?,?,?,?,?,?,?)");
    $stmt->bind_param('sssisisi', $name, $location, $quote, $rating, $tile, $featured, $status, $sort);
    $stmt->execute();
    $newId = $conn->insert_id;
    audit($user['id'], 'testimonial_create', 'testimonials', $newId);
    json(['ok' => true, 'id' => $newId]);
  }
}

if ($action === 'testi_delete' && method() === 'POST') {
  $id = in_int($_GET, 'id');
  $stmt = $conn->prepare("DELETE FROM testimonials WHERE id = ?");
  $stmt->bind_param('i', $id);
  $stmt->execute();
  audit($user['id'], 'testimonial_delete', 'testimonials', $id);
  json(['ok' => true]);
}

fail('Unknown action', 404);
