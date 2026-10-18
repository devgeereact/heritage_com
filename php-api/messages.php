<?php
/**
 * HeritOS: job messages, change requests and feedback, owner side (Phase 3).
 *
 *   GET  ?action=inbox                      jobs with messages: last message, unread count; plus totals
 *   GET  ?action=unread_count               {messages, change_requests, feedback_follow_up}
 *   GET  ?action=thread&job_id=N            every message, internal notes included
 *   POST ?action=post                       {job_id, visibility: internal|client, channel, body, request_key}
 *   POST ?action=mark_read                  {job_id}
 *   GET  ?action=change_requests[&status=open][&job_id=]
 *   POST ?action=change_decide&id=N         {decision: approve|decline, response, price_effect?, date_effect?}
 *   GET  ?action=feedback_list[&follow_up=open]
 *   POST ?action=feedback_update&id=N       {follow_up: none|open|done}
 *   POST ?action=feedback_publish&id=N      → testimonial (hidden until shown in Content), only with publication consent
 *
 * Owner roles only. Bodies are plain text, stored and returned as typed; the
 * interface renders them as text, never as HTML. Internal notes (visibility
 * 'internal', channel 'note') never reach the portal.
 */
require __DIR__ . '/_lib.php';
require __DIR__ . '/_jobs.php';
require __DIR__ . '/_mail.php';
cors();

$user = require_auth(ROLES_OWNER);
$uid = (int)$user['id'];
$action = $_GET['action'] ?? 'inbox';
$id = in_int($_GET, 'id');

function msg_view(array $m) {
  foreach (['id', 'job_id', 'customer_id', 'author_user_id'] as $k) if ($m[$k] !== null) $m[$k] = (int)$m[$k];
  $m['created_at_local'] = lagos_iso($m['created_ts'] ?? null);
  unset($m['created_ts']);
  unset($m['request_key']);
  return $m;
}

function change_staff_view(array $r) {
  foreach (['id', 'job_id', 'customer_id', 'measurement_set_id', 'appointment_id', 'decided_by'] as $k) if (isset($r[$k])) $r[$k] = (int)$r[$k];
  $r['payload'] = $r['payload'] !== null ? json_decode($r['payload'], true) : null;
  unset($r['request_key']);
  return $r;
}

/** Add a system message to the client thread (plain text). Caller may hold a transaction. */
function thread_add_notice($jobId, $customerId, $body) {
  db_exec("INSERT INTO job_messages (job_id, customer_id, author_type, visibility, channel, body) VALUES (?,?, 'system', 'client', 'portal', ?)",
    'iis', (int)$jobId, (int)$customerId, mb_substr($body, 0, 2000));
}

/* ---- INBOX ---------------------------------------------------------------- */
if ($action === 'inbox' && method() === 'GET') {
  $rows = db_rows("SELECT m.job_id, o.code, o.public_ref, c.name AS client_name, MAX(m.created_at) AS last_at, UNIX_TIMESTAMP(MAX(m.created_at)) AS last_ts,
                          SUM(m.author_type = 'customer' AND m.read_by_owner_at IS NULL) AS unread
                     FROM job_messages m JOIN tailoring_orders o ON o.id = m.job_id JOIN customers c ON c.id = m.customer_id
                 GROUP BY m.job_id, o.code, o.public_ref, c.name
                 ORDER BY SUM(m.author_type = 'customer' AND m.read_by_owner_at IS NULL) > 0 DESC, MAX(m.created_at) DESC LIMIT 200");
  json(['items' => array_map(fn($r) => ['job_id' => (int)$r['job_id'], 'code' => $r['code'], 'client_name' => $r['client_name'],
    'last_at' => $r['last_at'], 'last_at_local' => lagos_iso($r['last_ts']), 'unread' => (int)$r['unread']], $rows),
    'unread_total' => array_sum(array_map(fn($r) => (int)$r['unread'], $rows))]);
}

if ($action === 'unread_count' && method() === 'GET') {
  json(['messages' => (int)db_row('SELECT COUNT(*) AS n ' . UNREAD_MESSAGES_FROM)['n'],
        'change_requests' => (int)db_row("SELECT COUNT(*) AS n FROM job_change_requests WHERE status = 'open'")['n'],
        'feedback_follow_up' => (int)db_row('SELECT COUNT(*) AS n ' . OPEN_FEEDBACK_FROM)['n']]);
}

/* ---- THREAD --------------------------------------------------------------- */
if ($action === 'thread' && method() === 'GET') {
  $jobId = in_int($_GET, 'job_id');
  if (!db_row('SELECT id FROM tailoring_orders WHERE id = ? AND deleted_at IS NULL', 'i', $jobId)) fail('Job not found', 404);
  json(['job_id' => $jobId, 'messages' => array_map('msg_view', db_rows(
    'SELECT m.*, UNIX_TIMESTAMP(m.created_at) AS created_ts, u.name AS author_name FROM job_messages m LEFT JOIN users u ON u.id = m.author_user_id WHERE m.job_id = ? ORDER BY m.id', 'i', $jobId))]);
}

/* ---- POST ----------------------------------------------------------------- */
if ($action === 'post' && method() === 'POST') {
  $b = body();
  $key = body_request_key($b);
  $job = db_row('SELECT o.id, o.customer_id, o.public_ref, c.name, c.phone, c.email FROM tailoring_orders o JOIN customers c ON c.id = o.customer_id
                  WHERE o.id = ? AND o.deleted_at IS NULL', 'i', in_int($b, 'job_id'));
  if (!$job) fail('Job not found', 404);
  $vis = $b['visibility'] ?? '';
  if (!in_array($vis, ['internal', 'client'], true)) fail('Visibility must be internal or client');
  $channel = $vis === 'internal' ? 'note' : ($b['channel'] ?? 'portal');
  if (!in_array($channel, MESSAGE_CHANNELS, true) || ($vis === 'client' && $channel === 'note')) fail('Channel must be portal, whatsapp, email, phone or in_person');
  $body = message_body_clean($b['body'] ?? '');
  if ($body === null) fail('Write a message of up to 2000 characters');
  $ex = db_row('SELECT *, UNIX_TIMESTAMP(created_at) AS created_ts FROM job_messages WHERE request_key = ?', 's', $key);
  if ($ex) {
    if ((int)$ex['job_id'] !== (int)$job['id']) fail('That request key was already used for another job', 409);
    json(['duplicate' => true] + msg_view($ex));
  }
  // Delivery for client messages: portal shows it; WhatsApp and email also send now.
  $delivery = 'na'; $extra = [];
  if ($channel === 'whatsapp') {
    $r = wa_dispatch($job['phone'], $body, (int)$job['customer_id'], 'job_message', $uid);
    $delivery = $r['status'] ?? ($r['ok'] ? 'sent' : 'failed');
    if (!in_array($delivery, ['sent', 'failed', 'manual'], true)) $delivery = 'failed';
    if (!empty($r['wa_link'])) $extra['wa_link'] = $r['wa_link'];
  } elseif ($channel === 'email') {
    if (!filter_var((string)$job['email'], FILTER_VALIDATE_EMAIL)) fail('This client has no email address');
    $r = mail_send_html($job['email'], 'A message about your Herit Clothing order', '<p>' . nl2br(htmlspecialchars($body, ENT_QUOTES, 'UTF-8')) . '</p>', ['user_id' => $uid]);
    $delivery = $r['ok'] ? 'sent' : 'failed';
  }
  try {
    db_exec('INSERT INTO job_messages (job_id, customer_id, author_type, author_user_id, visibility, channel, body, delivery_status, read_by_owner_at, request_key)
             VALUES (?,?, \'owner\', ?,?,?,?,?, UTC_TIMESTAMP(), ?)', 'iiisssss', (int)$job['id'], (int)$job['customer_id'], $uid, $vis, $channel, $body, $delivery, $key);
  } catch (mysqli_sql_exception $e) {
    if (!is_duplicate_key($e)) throw $e;
    json(['duplicate' => true] + msg_view(db_row('SELECT *, UNIX_TIMESTAMP(created_at) AS created_ts FROM job_messages WHERE request_key = ?', 's', $key)));
  }
  $mid = (int)$conn->insert_id;
  audit($uid, 'job_message', 'tailoring_order', (int)$job['id'], ['visibility' => $vis, 'channel' => $channel, 'delivery' => $delivery]);
  json(['duplicate' => false] + msg_view(db_row('SELECT *, UNIX_TIMESTAMP(created_at) AS created_ts FROM job_messages WHERE id = ?', 'i', $mid)) + $extra, 201);
}

if ($action === 'mark_read' && method() === 'POST') {
  $b = body();
  $n = db_exec("UPDATE job_messages SET read_by_owner_at = UTC_TIMESTAMP() WHERE job_id = ? AND author_type = 'customer' AND read_by_owner_at IS NULL",
    'i', in_int($b, 'job_id'))->affected_rows;
  json(['ok' => true, 'marked' => $n]);
}

/* ---- CHANGE REQUESTS ------------------------------------------------------ */
if ($action === 'change_requests' && method() === 'GET') {
  $status = $_GET['status'] ?? 'open';
  if (!in_array($status, ['open', 'approved', 'declined', 'withdrawn', 'all'], true)) fail('Unknown status');
  $jobId = in_int($_GET, 'job_id');
  $rows = db_rows("SELECT r.*, o.code, o.job_stage, c.name AS client_name FROM job_change_requests r
                     JOIN tailoring_orders o ON o.id = r.job_id JOIN customers c ON c.id = r.customer_id
                    WHERE (? = 'all' OR r.status = ?) AND (? = 0 OR r.job_id = ?) ORDER BY r.id DESC LIMIT 200",
    'ssii', $status, $status, $jobId, $jobId);
  json(['items' => array_map('change_staff_view', $rows)]);
}

if ($action === 'change_decide' && method() === 'POST') {
  $b = body();
  $decision = $b['decision'] ?? '';
  if (!in_array($decision, ['approve', 'decline'], true)) fail('Decision must be approve or decline');
  $response = trim(in_str($b, 'response'));
  if (mb_strlen($response) > 500) fail('Response is too long (500 characters at most)');
  $price = null;
  if (isset($b['price_effect']) && $b['price_effect'] !== '' && $b['price_effect'] !== null) {
    $raw = trim(in_str($b, 'price_effect'));
    $neg = str_starts_with($raw, '-');
    $minor = money_to_minor(ltrim($raw, '+-'));
    if ($minor === null) fail('Price effect must be an amount such as "5,000" or "-2000"');
    $price = minor_to_decimal($neg ? -$minor : $minor);
  }
  $date = null;
  if (!empty($b['date_effect'])) { $date = ymd_or_null($b['date_effect']); if (!$date) fail('Date effect must be YYYY-MM-DD'); }

  $cr = db_row('SELECT * FROM job_change_requests WHERE id = ?', 'i', $id);
  if (!$cr) fail('Change request not found', 404);
  if ($cr['status'] !== 'open') fail('This request has already been decided (' . $cr['status'] . ')', 409);

  // A reschedule is applied through the booking lock first, so a clash answers 409 and nothing changes.
  if ($decision === 'approve' && $cr['kind'] === 'reschedule') {
    $p = json_decode((string)$cr['payload'], true) ?: [];
    $utc = lagos_local_to_utc($p['start'] ?? '');
    $appt = $cr['appointment_id'] ? db_row('SELECT * FROM appointments WHERE id = ?', 'i', (int)$cr['appointment_id']) : null;
    if (!$utc || !$appt) fail('The requested time or appointment is missing', 409);
    $dur = (int)round((utc_ts($appt['ends_at']) - utc_ts($appt['starts_at'])) / 60);
    appt_reserve(['id' => (int)$appt['id'], 'type' => $appt['type'], 'mode' => 'owner', 'start_ts' => utc_ts($utc),
      'duration_min' => in_array($dur, APPOINTMENT_DURATIONS, true) ? $dur : null,
      'reason' => 'Client asked to move it (request #' . $id . ')', 'override_reason' => in_str($b, 'override_reason')], ['type' => 'owner', 'id' => $uid]);
  }

  $res = db_tx(function () use ($cr, $decision, $response, $price, $date, $uid, $id) {
    $job = job_lock((int)$cr['job_id']);
    if (!$job) tx_fail('Job not found', 404);
    $cur = db_row('SELECT status FROM job_change_requests WHERE id = ? FOR UPDATE', 'i', $id);
    if ($cur['status'] !== 'open') tx_fail('This request has already been decided', 409);
    $late = in_array($job['job_stage'], JOB_STAGES_PRODUCTION_ON, true);
    if ($decision === 'approve' && $late && in_array($cr['kind'], CHANGE_KINDS_NEED_EFFECT, true) && $price === null && $date === null) {
      tx_fail('Cutting has started: state the effect on price or date (use 0 for no price change) so the client can see it', 422);
    }
    if ($cr['kind'] === 'measurement' && $cr['measurement_set_id']) {
      $set = db_row('SELECT * FROM measurement_sets WHERE id = ? FOR UPDATE', 'i', (int)$cr['measurement_set_id']);
      if ($set && $set['status'] === 'pending') {
        if ($decision === 'approve') measurement_approve_tx((int)$set['id'], (int)$set['customer_id'], $set['template_key'], $uid);
        else db_exec("UPDATE measurement_sets SET status = 'rejected' WHERE id = ?", 'i', (int)$set['id']);
      }
      // The job snapshot is never changed here: the owner re-attaches the set explicitly (BR-06).
    }
    $status = $decision === 'approve' ? 'approved' : 'declined';
    db_exec('UPDATE job_change_requests SET status = ?, owner_response = ?, price_effect = ?, date_effect = ?, decided_by = ?, decided_at = UTC_TIMESTAMP() WHERE id = ?',
      'ssssii', $status, $response !== '' ? $response : null, $price, $date, $uid, $id);
    $label = ['reschedule' => 'appointment change', 'address' => 'address correction', 'measurement' => 'new measurements',
              'garment' => 'garment change', 'other' => 'request'][$cr['kind']] ?? 'request';
    $msg = 'Your ' . $label . ' was ' . ($status === 'approved' ? 'approved' : 'declined') . '.'
      . ($price !== null ? ' Effect on price: ₦' . number_format((float)$price, 2) . '.' : '')
      . ($date !== null ? ' New promised date: ' . $date . '.' : '')
      . ($response !== '' ? "\n\n" . $response : '');
    thread_add_notice($cr['job_id'], $cr['customer_id'], $msg);
    job_event($cr['job_id'], 'change', $job['job_stage'], 'Change request #' . $id . ' (' . $cr['kind'] . ') ' . $status,
      ['change_request_id' => $id, 'price_effect' => $price, 'date_effect' => $date], 0, $uid);
    return $status;
  });
  audit($uid, 'change_request_' . $decision, 'job_change_request', $id, ['kind' => $cr['kind']]);
  json(change_staff_view(db_row('SELECT * FROM job_change_requests WHERE id = ?', 'i', $id)) + ['note' => $cr['kind'] === 'measurement' && $res === 'approved'
    ? 'Set approved. The job still uses its earlier snapshot until you attach the new set.' : null]);
}

/* ---- FEEDBACK ------------------------------------------------------------- */
if ($action === 'feedback_list' && method() === 'GET') {
  $fu = $_GET['follow_up'] ?? '';
  if ($fu !== '' && !in_array($fu, ['none', 'open', 'done'], true)) fail('Unknown follow_up');
  $rows = db_rows("SELECT f.*, o.code, o.public_ref, c.name AS client_name FROM job_feedback f
                     JOIN tailoring_orders o ON o.id = f.job_id JOIN customers c ON c.id = f.customer_id
                    WHERE (? = '' OR f.follow_up = ?) ORDER BY f.id DESC LIMIT 200", 'ss', $fu, $fu);
  json(['items' => array_map(function ($f) {
    foreach (['id', 'job_id', 'customer_id', 'contact_ok', 'photo_consent', 'published_testimonial_id'] as $k) if ($f[$k] !== null) $f[$k] = (int)$f[$k];
    $f['rating'] = $f['rating'] !== null ? (int)$f['rating'] : null;
    unset($f['request_key']);
    return $f;
  }, $rows)]);
}

if ($action === 'feedback_update' && method() === 'POST') {
  $b = body();
  $fu = $b['follow_up'] ?? '';
  if (!in_array($fu, ['none', 'open', 'done'], true)) fail('follow_up must be none, open or done');
  if (db_exec('UPDATE job_feedback SET follow_up = ? WHERE id = ?', 'si', $fu, $id)->affected_rows === 0
      && !db_row('SELECT id FROM job_feedback WHERE id = ?', 'i', $id)) fail('Feedback not found', 404);
  json(['ok' => true, 'follow_up' => $fu]);
}

if ($action === 'feedback_publish' && method() === 'POST') {
  // Never automatic (BR-33): the owner chooses, and only with publication consent.
  $f = db_row('SELECT f.*, c.name FROM job_feedback f JOIN customers c ON c.id = f.customer_id WHERE f.id = ?', 'i', $id);
  if (!$f) fail('Feedback not found', 404);
  if ($f['published_testimonial_id']) json(['ok' => true, 'testimonial_id' => (int)$f['published_testimonial_id'], 'already' => true]);
  $name = testimonial_name($f['publish_consent'], $f['name']);
  if ($name === null) fail('The client did not agree to publication', 409);
  if ($f['rating'] === null || trim((string)$f['comment']) === '') fail('Only feedback with both a rating and a comment can become a testimonial', 409);
  if (!has_table('testimonials')) fail('Testimonials are not set up on this database', 409);
  // Added hidden: the owner shows it from Content when ready.
  db_exec("INSERT INTO testimonials (name, quote, rating, featured, status) VALUES (?,?,?, 0, 'hidden')", 'ssi', $name, $f['comment'], (int)$f['rating']);
  $tid = (int)$conn->insert_id;
  db_exec('UPDATE job_feedback SET published_testimonial_id = ? WHERE id = ?', 'ii', $tid, $id);
  audit($uid, 'feedback_publish', 'job_feedback', $id, ['testimonial_id' => $tid, 'consent' => $f['publish_consent']]);
  json(['ok' => true, 'testimonial_id' => $tid, 'status' => 'hidden', 'already' => false], 201);
}

fail('Unknown action', 404);
