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
  $slug = trim(in_str($_GET, 'slug'));
  if ($slug === '') fail('slug is required');

  $rows = [];
  $stmt = $conn->prepare(
    "SELECT id, author_name, rating, title, body, photo_url, verified, response, created_at
       FROM reviews WHERE product_slug = ? AND status = 'approved' AND kind = 'review'
      ORDER BY verified DESC, id DESC LIMIT 100"
  );
  $stmt->bind_param('s', $slug);
  $stmt->execute();
  $r = $stmt->get_result();
  while ($row = $r->fetch_assoc()) $rows[] = $row;

  $sum = $conn->query("SELECT COUNT(*) AS c, COALESCE(AVG(rating),0) AS avg FROM reviews WHERE product_slug = '" . $conn->real_escape_string($slug) . "' AND status='approved' AND kind='review'")->fetch_assoc();
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

/* ---- PUBLIC: Q&A for a product ------------------------------------------- */
if ($action === 'qa_list' && method() === 'GET') {
  $slug = trim(in_str($_GET, 'slug'));
  if ($slug === '') fail('slug is required');
  $rows = [];
  $stmt = $conn->prepare("SELECT id, author_name, body AS question, answer, created_at FROM reviews
                           WHERE product_slug = ? AND kind = 'question' AND status = 'approved' ORDER BY id DESC LIMIT 50");
  $stmt->bind_param('s', $slug);
  $stmt->execute();
  $r = $stmt->get_result();
  while ($row = $r->fetch_assoc()) $rows[] = $row;
  json($rows);
}

/* ---- PUBLIC: submit a review --------------------------------------------- */
if ($action === 'submit' && method() === 'POST') {
  // Product reviews belong to the deferred retail shop: closed until shop_enabled is on.
  $shop = $conn->query("SELECT svalue FROM settings WHERE skey = 'shop_enabled' LIMIT 1");
  $shopRow = $shop ? $shop->fetch_assoc() : null;
  if ((string)($shopRow['svalue'] ?? '') !== '1') fail('The shop is not open.', 403);
  // Anonymous write: limit per IP per hour (audit_log rows, as booking.php does).
  $ipKey = 'ip:' . client_ip();
  throttle_enforce([[(int)cfg('REVIEW_MAX_PER_IP', 5), 'review_submit_ip', $ipKey]], 3600);
  audit(null, 'review_submit_ip', $ipKey);
  $b = body();
  $slug = trim(in_str($b, 'product_slug'));
  $pname = trim(in_str($b, 'product_name'));
  $name = trim(in_str($b, 'name'));
  $phone = trim(in_str($b, 'phone'));
  $kind = ($b['kind'] ?? 'review') === 'question' ? 'question' : 'review';
  $rating = max(1, min(5, in_int($b, 'rating')));
  $title = trim(in_str($b, 'title'));
  $bodyText = trim(in_str($b, 'body'));
  $photo = trim(in_str($b, 'photo_url'));
  foreach ([[$slug, 190], [$pname, 190], [$name, 120], [$phone, 40], [$title, 160], [$bodyText, 3000], [$photo, 500]] as [$v, $max]) {
    if (mb_strlen($v) > $max) fail('Some details are too long. Please shorten them.');
  }
  if ($photo !== '' && !preg_match('#^https://#i', $photo)) $photo = '';
  if ($kind === 'question') {
    if ($slug === '' || $name === '' || $bodyText === '') fail('Name, the piece and your question are required');
    $rating = 0;
  } else {
    if ($slug === '' || $name === '' || !$rating) fail('Name, rating and the piece are required');
    if ($bodyText === '' && $title === '') fail('Add a few words about the piece');
  }

  // Verified-purchase: only a signed-in customer (verified portal session) who has
  // an order line for this slug. A typed phone number is not proof of identity, so
  // it no longer links the review to a customer or marks it verified.
  $verified = 0; $customerId = null;
  require_once __DIR__ . '/_portal.php';
  $me = customer_session_optional();
  if ($me) {
    $cid = (int)$me['id'];
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
    'INSERT INTO reviews (product_slug, product_name, kind, customer_id, author_name, rating, title, body, photo_url, verified)
     VALUES (?,?,?,?,?,?,?,?,?,?)'
  );
  $photoVal = $photo !== '' ? $photo : null;
  $titleVal = $title !== '' ? $title : null;
  $bodyVal = $bodyText !== '' ? $bodyText : null;
  $stmt->bind_param('sssisisssi', $slug, $pname, $kind, $customerId, $name, $rating, $titleVal, $bodyVal, $photoVal, $verified);
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
  $id = in_int($_GET, 'id');
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
  $id = in_int($_GET, 'id');
  $b = body();
  $response = trim(in_str($b, 'response'));
  $rv = $response !== '' ? $response : null;
  $stmt = $conn->prepare('UPDATE reviews SET response = ? WHERE id = ?');
  $stmt->bind_param('si', $rv, $id);
  $stmt->execute();
  audit($user['id'], 'review_respond', 'review', $id);
  json(['ok' => true]);
}

/* ---- ANSWER (a question) ------------------------------------------------- */
if ($action === 'answer' && method() === 'POST') {
  $id = in_int($_GET, 'id');
  $b = body();
  $answer = trim(in_str($b, 'answer'));
  $av = $answer !== '' ? $answer : null;
  // Answering publishes the question.
  $stmt = $conn->prepare("UPDATE reviews SET answer = ?, status = 'approved' WHERE id = ? AND kind = 'question'");
  $stmt->bind_param('si', $av, $id);
  $stmt->execute();
  audit($user['id'], 'review_answer', 'review', $id);
  json(['ok' => true]);
}

fail('Unknown action', 404);
