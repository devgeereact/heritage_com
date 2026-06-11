<?php
/**
 * HeritOS — public enquiries / contact form.
 *
 *   POST /contact.php                 (PUBLIC) {name, phone, email, type, interest,
 *                                              message, company?}  → {ok:true}
 *       `company` is a honeypot: if filled, silently drop (bots fill every field).
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

  // Honeypot — real users never see/fill `company`.
  if (trim($b['company'] ?? '') !== '') json(['ok' => true]);

  $name = trim($b['name'] ?? '');
  $phone = trim($b['phone'] ?? '');
  $email = trim($b['email'] ?? '');
  $type = in_array($b['type'] ?? '', $TYPES, true) ? $b['type'] : 'general';
  $interest = trim($b['interest'] ?? '');
  $message = trim($b['message'] ?? '');

  if ($name === '') fail('Please tell us your name');
  if ($phone === '' && $email === '') fail('Please leave a phone number or email so we can reply');
  if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) fail('That email address looks wrong');
  if (mb_strlen($name) > 160 || mb_strlen($message) > 4000) fail('That message is too long');

  $stmt = $conn->prepare(
    'INSERT INTO enquiries (name, phone, email, type, interest, message) VALUES (?,?,?,?,?,?)'
  );
  $stmt->bind_param('ssssss', $name, $phone, $email, $type, $interest, $message);
  $stmt->execute();

  json(['ok' => true], 201);
}

/* ---- STAFF: LIST --------------------------------------------------------- */
if ($action === 'list' && method() === 'GET') {
  require_auth(['super_admin', 'admin', 'manager', 'employee']);
  $rows = [];
  $res = $conn->query(
    'SELECT id, name, phone, email, type, interest, message, status, created_at
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
