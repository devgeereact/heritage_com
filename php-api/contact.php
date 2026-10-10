<?php
/**
 * HeritOS — public enquiries / contact form.
 *
 *   POST /contact.php                 (PUBLIC) {name, phone, email, company?, type,
 *                                              interest, message, website_url_confirm?}
 *                                              → {ok:true}
 *       `website_url_confirm` is a hidden honeypot: if filled, silently drop (bots
 *       fill every field). `company` is a real optional field (finding A11).
 *   GET  /contact.php?action=list     (STAFF)  → enquiries, newest first
 *   POST /contact.php?action=status&id=N (STAFF) {status} → new|contacted|closed
 *
 * The submit endpoint is the only public write in HeritOS. Everything is
 * validated and parameterised; no auth so visitors can reach it.
 */
require __DIR__ . '/_lib.php';
cors();

$TYPES = ['fitting', 'bespoke', 'wholesale', 'general'];
$STATUSES = ['new', 'contacted', 'closed'];
$action = $_GET['action'] ?? '';

/* ---- PUBLIC SUBMIT ------------------------------------------------------- */
if ($action === '' && method() === 'POST') {
  $b = body();

  // Honeypot: the field is hidden from people, so only bots fill it.
  if (trim((string)($b['website_url_confirm'] ?? '')) !== '') json(['ok' => true]);

  $name = trim($b['name'] ?? '');
  $phone = trim($b['phone'] ?? '');
  $email = trim($b['email'] ?? '');
  $company = trim((string)($b['company'] ?? ''));
  $type = in_array($b['type'] ?? '', $TYPES, true) ? $b['type'] : 'general';
  $interest = trim($b['interest'] ?? '');
  $message = trim($b['message'] ?? '');

  if ($name === '') fail('Please tell us your name');
  if ($phone === '' && $email === '') fail('Please leave a phone number or email so we can reply');
  if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) fail('That email address looks wrong');
  if (mb_strlen($name) > 160 || mb_strlen($message) > 4000) fail('That message is too long');
  if (mb_strlen($company) > 160) fail('That company name is too long');

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

  json(['ok' => true], 201);
}

/* ---- STAFF: LIST --------------------------------------------------------- */
if ($action === 'list' && method() === 'GET') {
  require_auth(['super_admin', 'admin', 'manager', 'employee']);
  $rows = [];
  $res = $conn->query(
    'SELECT id, name, phone, email, ' . (has_column('enquiries', 'company') ? 'company' : 'NULL AS company') . ',
            type, interest, message, status, created_at
       FROM enquiries ORDER BY id DESC LIMIT 500'
  );
  while ($res && $row = $res->fetch_assoc()) $rows[] = $row;
  json($rows);
}

/* ---- STAFF: SET STATUS --------------------------------------------------- */
if ($action === 'status' && method() === 'POST') {
  $user = require_auth(['super_admin', 'admin', 'manager', 'employee']);
  $id = (int)($_GET['id'] ?? 0);
  $b = body();
  $status = $b['status'] ?? '';
  if (!in_array($status, $STATUSES, true)) fail('Invalid status');

  $stmt = $conn->prepare('UPDATE enquiries SET status = ? WHERE id = ?');
  $stmt->bind_param('si', $status, $id);
  $stmt->execute();

  audit($user['id'], 'enquiry_status', 'enquiry', $id, ['status' => $status]);
  json(['ok' => true, 'status' => $status]);
}

fail('Unknown action', 404);
