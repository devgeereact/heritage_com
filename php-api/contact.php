<?php
/**
 * HeritOS — public enquiries / contact form.
 *
 *   POST /contact.php                 (PUBLIC) {name, phone, email, company?, type,
 *                                              interest, message, quantity?, desired_date?,
 *                                              website_url_confirm?}
 *                                              → {ok:true}
 *       `website_url_confirm` is a hidden honeypot: if filled, silently drop (bots
 *       fill every field). `company` is a real optional field (finding A11).
 *   GET  /contact.php?action=list     (STAFF)  → enquiries, newest first
 *   POST /contact.php?action=status&id=N (STAFF) {status} → new|contacted|awaiting_reply|
 *                                              quote_sent|accepted|closed. 'contacted' is the
 *                                              legacy alias and is stored as awaiting_reply.
 *       The full pipeline (follow-ups, conversion) lives in enquiries.php.
 *
 * The submit endpoint is the only public write in HeritOS. Everything is
 * validated and parameterised; no auth so visitors can reach it.
 */
require __DIR__ . '/_lib.php';
cors();

$TYPES = ['fitting', 'bespoke', 'wholesale', 'general'];
$STATUSES = ['new', 'contacted', 'awaiting_reply', 'quote_sent', 'accepted', 'closed'];
$action = $_GET['action'] ?? '';

/* ---- PUBLIC SUBMIT ------------------------------------------------------- */
if ($action === '' && method() === 'POST') {
  $b = body();

  // Honeypot: the field is hidden from people, so only bots fill it.
  if (trim(in_str($b, 'website_url_confirm')) !== '') json(['ok' => true]);

  $name = trim(in_str($b, 'name'));
  $phone = trim(in_str($b, 'phone'));
  $email = trim(in_str($b, 'email'));
  $company = trim(in_str($b, 'company'));
  $type = in_array($b['type'] ?? '', $TYPES, true) ? $b['type'] : 'general';
  $interest = trim(in_str($b, 'interest'));
  $message = trim(in_str($b, 'message'));

  if ($name === '') fail('Please tell us your name');
  if ($phone === '' && $email === '') fail('Please leave a phone number or email so we can reply');
  if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) fail('That email address looks wrong');
  if (mb_strlen($name) > 160 || mb_strlen($message) > 4000) fail('That message is too long');
  if (mb_strlen($company) > 160) fail('That company name is too long');
  // Optional extras (schema_phase18.sql). Bad values are dropped, not fatal, so a
  // visitor never loses an enquiry over a date typo.
  $quantity = filter_var($b['quantity'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 9999]]);
  $quantity = $quantity === false ? null : $quantity;
  $desired = trim(in_str($b, 'desired_date'));
  if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $desired) || !checkdate((int)substr($desired, 5, 2), (int)substr($desired, 8, 2), (int)substr($desired, 0, 4))) $desired = null;

  // `company` needs schema_phase17.sql; until it is imported the enquiry is still
  // saved and the company name is kept in the message so nothing is lost.
  if (has_column('enquiries', 'company')) {
    $companyVal = $company !== '' ? $company : null;
    $stmt = $conn->prepare(
      'INSERT INTO enquiries (name, phone, email, company, type, interest, message) VALUES (?,?,?,?,?,?,?)'
    );
    $stmt->bind_param('sssssss', $name, $phone, $email, $companyVal, $type, $interest, $message);
  } else {
    if ($company !== '') $message = 'Company: ' . $company . "\n" . $message;
    $stmt = $conn->prepare(
      'INSERT INTO enquiries (name, phone, email, type, interest, message) VALUES (?,?,?,?,?,?)'
    );
    $stmt->bind_param('ssssss', $name, $phone, $email, $type, $interest, $message);
  }
  $stmt->execute();
  $newId = (int)$conn->insert_id;
  if (has_column('enquiries', 'desired_date') && ($quantity !== null || $desired !== null)) {
    $up = $conn->prepare('UPDATE enquiries SET quantity = ?, desired_date = ? WHERE id = ?');
    $up->bind_param('isi', $quantity, $desired, $newId);
    $up->execute();
  }

  json(['ok' => true], 201);
}

/* ---- STAFF: LIST --------------------------------------------------------- */
if ($action === 'list' && method() === 'GET') {
  require_auth(['super_admin', 'admin', 'manager', 'employee']);
  $rows = [];
  $extra = has_column('enquiries', 'next_follow_up') ? ', quantity, desired_date, next_follow_up, client_id, job_id' : '';
  $res = $conn->query(
    'SELECT id, name, phone, email, ' . (has_column('enquiries', 'company') ? 'company' : 'NULL AS company') . ',
            type, interest, message, status, created_at' . $extra . '
       FROM enquiries ORDER BY id DESC LIMIT 500'
  );
  while ($res && $row = $res->fetch_assoc()) {
    // Old screens know new/contacted/closed; legacy_status keeps them readable.
    $row['legacy_status'] = in_array($row['status'], ['new', 'closed'], true) ? $row['status'] : 'contacted';
    $rows[] = $row;
  }
  json($rows);
}

/* ---- STAFF: SET STATUS --------------------------------------------------- */
if ($action === 'status' && method() === 'POST') {
  $user = require_auth(['super_admin', 'admin', 'manager', 'employee']);
  $id = in_int($_GET, 'id');
  $b = body();
  $status = $b['status'] ?? '';
  if (!in_array($status, $STATUSES, true)) fail('Invalid status');
  // Legacy alias: once the pipeline columns exist, 'contacted' is stored as awaiting_reply.
  if ($status === 'contacted' && has_column('enquiries', 'next_follow_up')) $status = 'awaiting_reply';

  $stmt = $conn->prepare('UPDATE enquiries SET status = ? WHERE id = ?');
  $stmt->bind_param('si', $status, $id);
  $stmt->execute();

  audit($user['id'], 'enquiry_status', 'enquiry', $id, ['status' => $status]);
  json(['ok' => true, 'status' => $status]);
}

fail('Unknown action', 404);
