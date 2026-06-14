<?php
/**
 * HeritOS — Reviews, ratings + photo UGC (with moderation).
 *
 *  PUBLIC:
 *   GET  /reviews.php?action=list&slug=…        → approved reviews + summary
 *   POST /reviews.php?action=submit {product_slug, product_name, name, phone?,
 *                                    rating, title?, body?, photo_url?}
 *   GET  /reviews.php?action=gallery            → approved photo reviews ("as worn by")
 *
 *  STAFF (moderation):
 *   GET  /reviews.php?action=moderate&status=pending
 *   POST /reviews.php?action=status&id=N {status}        approve | reject | pending
 *   POST /reviews.php?action=respond&id=N {response}
 *
 * Verified-purchase = the reviewer's phone has a non-cancelled order line for
 * this product slug. New reviews land 'pending' until a staffer approves them.
 */
require __DIR__ . '/_lib.php';
cors();

$action = $_GET['action'] ?? 'list';
$STATUSES = ['pending', 'approved', 'rejected'];

/* ---- PUBLIC: list + summary for a product -------------------------------- */
if ($action === 'list' && method() === 'GET') {
  $slug = trim($_GET['slug'] ?? '');
  if ($slug === '') fail('slug is required');

  $rows = [];
  $stmt = $conn->prepare(
    "SELECT id, author_name, rating, title, body, photo_url, verified, response, created_at
       FROM reviews WHERE product_slug = ? AND status = 'approved'
      ORDER BY verified DESC, id DESC LIMIT 100"
  );
  $stmt->bind_param('s', $slug);
  $stmt->execute();
  $r = $stmt->get_result();
  while ($row = $r->fetch_assoc()) $rows[] = $row;

  $sum = $conn->query("SELECT COUNT(*) AS c, COALESCE(AVG(rating),0) AS avg FROM reviews WHERE product_slug = '" . $conn->real_escape_string($slug) . "' AND status='approved'")->fetch_assoc();
  json(['summary' => ['count' => (int)$sum['c'], 'average' => round((float)$sum['avg'], 1)], 'reviews' => $rows]);
}

/* ---- PUBLIC: photo gallery ("as worn by") -------------------------------- */
if ($action === 'gallery' && method() === 'GET') {
  $rows = [];
  $res = $conn->query("SELECT product_slug, product_name, author_name, photo_url, rating FROM reviews
                        WHERE status='approved' AND photo_url IS NOT NULL AND photo_url <> ''
                        ORDER BY id DESC LIMIT 40");
  while ($res && $row = $res->fetch_assoc()) $rows[] = $row;
  json($rows);
}

/* ---- PUBLIC: submit a review --------------------------------------------- */
if ($action === 'submit' && method() === 'POST') {
  $b = body();
  $slug = trim($b['product_slug'] ?? '');
  $pname = trim($b['product_name'] ?? '');
  $name = trim($b['name'] ?? '');
  $phone = trim($b['phone'] ?? '');
  $rating = max(1, min(5, (int)($b['rating'] ?? 0)));
  $title = trim($b['title'] ?? '');
  $bodyText = trim($b['body'] ?? '');
  $photo = trim($b['photo_url'] ?? '');
  if ($slug === '' || $name === '' || !$rating) fail('Name, rating and the piece are required');
  if ($bodyText === '' && $title === '') fail('Add a few words about the piece');

  // Verified-purchase: this phone's customer has an order line for this slug.
  $verified = 0; $customerId = null;
  if ($phone !== '') {
    $cid = customer_id_by_phone($phone);
    if ($cid) {
      $customerId = $cid;
      $stmt = $conn->prepare(
        "SELECT 1 FROM order_items i JOIN orders o ON o.id = i.order_id
          WHERE o.customer_id = ? AND o.deleted_at IS NULL AND o.status <> 'cancelled'
            AND i.sku LIKE CONCAT(?, '%') LIMIT 1"
      );
      $like = $slug;
      $stmt->bind_param('is', $customerId, $like);
      $stmt->execute();
      if ($stmt->get_result()->fetch_assoc()) $verified = 1;
    }
  }

  $stmt = $conn->prepare(
    'INSERT INTO reviews (product_slug, product_name, customer_id, author_name, rating, title, body, photo_url, verified)
     VALUES (?,?,?,?,?,?,?,?,?)'
  );
  $photoVal = $photo !== '' ? $photo : null;
  $titleVal = $title !== '' ? $title : null;
  $bodyVal = $bodyText !== '' ? $bodyText : null;
  $stmt->bind_param('ssisisssi', $slug, $pname, $customerId, $name, $rating, $titleVal, $bodyVal, $photoVal, $verified);
  $stmt->execute();
  json(['ok' => true, 'verified' => (bool)$verified, 'status' => 'pending'], 201);
}

/* ---- Everything below is staff-only -------------------------------------- */
$STAFF = ['super_admin', 'admin', 'manager', 'editor'];
$user = require_auth($STAFF);

/* ---- MODERATE (queue) ---------------------------------------------------- */
if ($action === 'moderate' && method() === 'GET') {
  $status = $_GET['status'] ?? 'pending';
  $rows = [];
  if (in_array($status, $STATUSES, true)) {
    $stmt = $conn->prepare('SELECT * FROM reviews WHERE status = ? ORDER BY id DESC LIMIT 200');
    $stmt->bind_param('s', $status);
  } else {
    $stmt = $conn->prepare('SELECT * FROM reviews ORDER BY id DESC LIMIT 200');
  }
  $stmt->execute();
  $r = $stmt->get_result();
  while ($row = $r->fetch_assoc()) $rows[] = $row;

  $counts = [];
  $cres = $conn->query("SELECT status, COUNT(*) c FROM reviews GROUP BY status");
  while ($cres && $row = $cres->fetch_assoc()) $counts[$row['status']] = (int)$row['c'];
  json(['counts' => $counts, 'reviews' => $rows]);
}

/* ---- STATUS -------------------------------------------------------------- */
if ($action === 'status' && method() === 'POST') {
  $id = (int)($_GET['id'] ?? 0);
  $b = body();
  $status = $b['status'] ?? '';
  if (!in_array($status, $STATUSES, true)) fail('Invalid status');
  $stmt = $conn->prepare('UPDATE reviews SET status = ? WHERE id = ?');
  $stmt->bind_param('si', $status, $id);
  $stmt->execute();
  audit($user['id'], 'review_status', 'review', $id, ['status' => $status]);
  json(['ok' => true, 'status' => $status]);
}

/* ---- RESPOND ------------------------------------------------------------- */
if ($action === 'respond' && method() === 'POST') {
  $id = (int)($_GET['id'] ?? 0);
  $b = body();
  $response = trim($b['response'] ?? '');
  $rv = $response !== '' ? $response : null;
  $stmt = $conn->prepare('UPDATE reviews SET response = ? WHERE id = ?');
  $stmt->bind_param('si', $rv, $id);
  $stmt->execute();
  audit($user['id'], 'review_respond', 'review', $id);
  json(['ok' => true]);
}

fail('Unknown action', 404);
