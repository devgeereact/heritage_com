<?php
/**
 * HeritOS: Appointments and availability (Phase 3, A08).
 *
 *   GET  ?action=list&from=YYYY-MM-DD&to=YYYY-MM-DD[&status=][&job_id=][&customer_id=]   Lagos dates, inclusive
 *   GET  ?action=get&id=N                appointment + history
 *   GET  ?action=requests                requested appointments still on hold
 *   GET  ?action=slots&type=&from=&days= free slots (same rules clients get)
 *   POST ?action=create                  {type, start | (all_day, date), duration_min?, customer_id?, job_id?, enquiry_id?,
 *                                         contact_name?, contact_phone?, contact_email?, notes_internal?, client_note?,
 *                                         override_reason?, request_key}
 *   POST ?action=confirm&id=N            requested → confirmed
 *   POST ?action=decline&id=N            {reason} requested → cancelled
 *   POST ?action=reschedule&id=N         {start | (all_day, date), reason, override_reason?}
 *   POST ?action=complete|no_show|cancel&id=N   {reason?}
 *   GET  ?action=availability_get        {availability, ready:{type:bool}, public_booking_enabled, timezone, durations_allowed, steps_allowed}
 *   POST ?action=availability_save       {availability?, public_booking_enabled?}
 *   GET  ?action=blocks&from=&to=        closed dates and leave
 *   POST ?action=block_save              {start, end, reason}   (dates or Lagos date-times)
 *   POST ?action=block_delete&id=N       future blocks only
 *
 * Reads: workshop roles (tailors see times, never contact details or notes).
 * Writes: owner roles. Times in requests are Lagos local ("2026-10-12T10:00")
 * unless they carry an offset; responses carry UTC plus *_local ISO strings.
 */
require __DIR__ . '/_lib.php';
require __DIR__ . '/_jobs.php';
cors();

$user = require_auth(ROLES_WORKSHOP);
$isOwner = is_owner_role($user['role']);
$action = $_GET['action'] ?? 'list';
$id = in_int($_GET, 'id');
$actor = ['type' => 'owner', 'id' => (int)$user['id']];

function owner_only($isOwner) { if (!$isOwner) fail('Forbidden', 403); }

/** Staff view; tailors get times, type, status and the job only. */
function appt_staff_view(array $a, $isOwner) {
  $v = appointment_view($a);
  if (!$isOwner) {
    $v = array_intersect_key($v, array_flip(['id', 'type', 'status', 'starts_at', 'ends_at', 'all_day', 'job_id', 'job_code',
      'starts_at_local', 'ends_at_local']));
  }
  return $v;
}

/** Parse a start from a body: Lagos local or with an offset. Returns Unix time or fails. */
function body_start_ts(array $b) {
  $utc = lagos_local_to_utc($b['start'] ?? '');
  if ($utc === null || !preg_match('/[ T]\d{2}:\d{2}/', in_str($b, 'start'))) fail('Give a start date and time, for example 2026-10-12T10:00');
  return utc_ts($utc);
}

const APPT_LIST_SQL = "SELECT a.*, c.name AS client_name, c.client_ref, o.code AS job_code, o.public_ref AS job_ref
  FROM appointments a LEFT JOIN customers c ON c.id = a.customer_id LEFT JOIN tailoring_orders o ON o.id = a.job_id";

/* ---- LIST ----------------------------------------------------------------- */
if ($action === 'list' && method() === 'GET') {
  $from = ymd_or_null($_GET['from'] ?? '') ?? lagos_today();
  $to = ymd_or_null($_GET['to'] ?? '') ?? date_add_days($from, 7);
  if ($to < $from) fail('"to" must not be before "from"');
  if (date_add_days($from, 92) < $to) fail('Ask for 92 days or fewer at a time');
  $st = '';
  if (!empty($_GET['status'])) {
    $list = array_values(array_intersect(explode(',', in_str($_GET, 'status')), APPOINTMENT_STATUSES));
    if (!$list) fail('Unknown status');
    $st = implode(',', $list);          // only known status words; matched with FIND_IN_SET
  }
  $jobId = in_int($_GET, 'job_id');
  $custId = in_int($_GET, 'customer_id');
  $rows = db_rows(APPT_LIST_SQL . " WHERE a.starts_at < ? AND a.ends_at > ? AND (? = '' OR FIND_IN_SET(a.status, ?) > 0)
                                      AND (? = 0 OR a.job_id = ?) AND (? = 0 OR a.customer_id = ?)
                                 ORDER BY a.starts_at, a.id LIMIT 500", 'ssssiiii',
    utc_sql(lagos_midnight_ts(date_add_days($to, 1))), utc_sql(lagos_midnight_ts($from)), $st, $st, $jobId, $jobId, $custId, $custId);
  json(['from' => $from, 'to' => $to, 'timezone' => BUSINESS_TZ,
        'items' => array_map(fn($r) => appt_staff_view($r, $isOwner), $rows)]);
}

/* ---- GET ------------------------------------------------------------------ */
if ($action === 'get' && method() === 'GET') {
  $a = db_row(APPT_LIST_SQL . ' WHERE a.id = ?', 'i', $id);
  if (!$a) fail('Appointment not found', 404);
  $out = appt_staff_view($a, $isOwner);
  if ($isOwner) {
    $out['events'] = array_map(function ($e) {
      $e['id'] = (int)$e['id'];
      $e['from_starts_at_local'] = lagos_iso($e['from_starts_at']);
      $e['to_starts_at_local'] = lagos_iso($e['to_starts_at']);
      return $e;
    }, db_rows('SELECT e.*, u.name AS actor_name FROM appointment_events e LEFT JOIN users u ON u.id = e.actor_id AND e.actor_type = \'owner\'
                 WHERE e.appointment_id = ? ORDER BY e.id', 'i', $id));
  }
  json($out);
}

/* ---- REQUESTS (waiting for the owner) ------------------------------------- */
if ($action === 'requests' && method() === 'GET') {
  owner_only($isOwner);
  $rows = db_rows(APPT_LIST_SQL . " WHERE a.status = 'requested' AND (a.hold_expires_at IS NULL OR a.hold_expires_at > UTC_TIMESTAMP())
                                   ORDER BY a.starts_at LIMIT 200");
  json(['count' => count($rows), 'items' => array_map(fn($r) => appt_staff_view($r, true), $rows)]);
}

/* ---- SLOTS ---------------------------------------------------------------- */
if ($action === 'slots' && method() === 'GET') {
  $type = $_GET['type'] ?? 'consultation';
  if (!in_array($type, APPOINTMENT_TYPES, true)) fail('Unknown type');
  $from = ymd_or_null($_GET['from'] ?? '') ?? lagos_today();
  $days = max(1, min(31, in_int($_GET, 'days', 7)));
  json(['timezone' => BUSINESS_TZ, 'type' => $type, 'ready' => availability_ready(availability_get(), $type),
        'slots' => appt_free_slots($type, $from, $days)]);
}

/* ---- CREATE --------------------------------------------------------------- */
if ($action === 'create' && method() === 'POST') {
  owner_only($isOwner);
  $b = body();
  $key = body_request_key($b);
  $allDay = !empty($b['all_day']);
  $d = ['type' => $b['type'] ?? '', 'mode' => 'owner', 'source' => 'owner', 'status' => 'confirmed', 'request_key' => $key,
        'all_day' => $allDay, 'date' => $b['date'] ?? null, 'duration_min' => $b['duration_min'] ?? null,
        'override_reason' => in_str($b, 'override_reason')];
  if (!$allDay) $d['start_ts'] = body_start_ts($b);
  foreach (['customer_id', 'job_id', 'enquiry_id'] as $k) $d[$k] = !empty($b[$k]) ? in_int($b, $k) : null;
  if ($d['job_id']) {
    $job = db_row('SELECT id, customer_id FROM tailoring_orders WHERE id = ? AND deleted_at IS NULL', 'i', $d['job_id']);
    if (!$job) fail('Job not found', 404);
    if ($d['customer_id'] && $d['customer_id'] !== (int)$job['customer_id']) fail('That job belongs to another client');
    $d['customer_id'] = (int)$job['customer_id'];
  }
  if ($d['customer_id'] && !db_row('SELECT id FROM customers WHERE id = ? AND deleted_at IS NULL', 'i', $d['customer_id'])) fail('Client not found', 404);
  foreach (['contact_name' => 160, 'contact_phone' => 40, 'contact_email' => 190, 'client_note' => 500, 'notes_internal' => 5000] as $k => $max) {
    $v = trim(in_str($b, $k));
    if (mb_strlen($v) > $max) fail("$k is too long");
    $d[$k] = $v === '' ? null : $v;
  }
  if ($d['contact_email'] !== null && !filter_var($d['contact_email'], FILTER_VALIDATE_EMAIL)) fail('Contact email looks wrong');
  if (!$d['customer_id'] && !$d['contact_name']) fail('Choose a client or give a contact name');
  $r = appt_reserve($d, $actor);
  if (!$r['duplicate']) audit($user['id'], 'appointment_create', 'appointment', (int)$r['appointment']['id'],
    ['type' => $d['type'], 'override' => $r['appointment']['override_reason'] !== null]);
  json(['duplicate' => $r['duplicate']] + appt_staff_view($r['appointment'], true), $r['duplicate'] ? 200 : 201);
}

/* ---- RESCHEDULE ----------------------------------------------------------- */
if ($action === 'reschedule' && method() === 'POST') {
  owner_only($isOwner);
  $b = body();
  $cur = db_row('SELECT * FROM appointments WHERE id = ?', 'i', $id);
  if (!$cur) fail('Appointment not found', 404);
  $reason = trim(in_str($b, 'reason'));
  if (mb_strlen($reason) > 200) fail('Reason is too long');
  $allDay = !empty($b['all_day']);
  $dur = (int)round((utc_ts($cur['ends_at']) - utc_ts($cur['starts_at'])) / 60);
  $d = ['id' => $id, 'type' => $cur['type'], 'mode' => 'owner', 'reason' => $reason !== '' ? $reason : 'Rescheduled by the owner',
        'all_day' => $allDay, 'date' => $b['date'] ?? null, 'override_reason' => in_str($b, 'override_reason'),
        'duration_min' => in_array($dur, APPOINTMENT_DURATIONS, true) ? $dur : null];
  if (!$allDay) $d['start_ts'] = body_start_ts($b);
  $r = appt_reserve($d, $actor);
  audit($user['id'], 'appointment_reschedule', 'appointment', $id, ['from' => $cur['starts_at'], 'to' => $r['appointment']['starts_at']]);
  json(appt_staff_view($r['appointment'], true));
}

/* ---- STATUS CHANGES ------------------------------------------------------- */
$STATUS_ACTIONS = ['confirm' => 'confirmed', 'decline' => 'cancelled', 'complete' => 'completed', 'no_show' => 'no_show', 'cancel' => 'cancelled'];
if (isset($STATUS_ACTIONS[$action]) && method() === 'POST') {
  owner_only($isOwner);
  $b = body();
  $reason = mb_substr(trim(in_str($b, 'reason')), 0, 200);
  $cur = db_row('SELECT status FROM appointments WHERE id = ?', 'i', $id);
  if (!$cur) fail('Appointment not found', 404);
  if ($action === 'decline' && $cur['status'] !== 'requested') fail('Only a request can be declined; cancel a confirmed appointment instead', 409);
  if ($action === 'confirm' && $cur['status'] !== 'requested' && $cur['status'] !== 'confirmed') fail('Only a request can be confirmed (this one is ' . $cur['status'] . ')', 409);
  $row = appt_set_status($id, $STATUS_ACTIONS[$action], $reason !== '' ? $reason : ucfirst(str_replace('_', ' ', $action)), $actor);
  if ($action === 'confirm' && $row['status'] !== 'confirmed') fail('That request has expired', 409);
  audit($user['id'], 'appointment_' . $action, 'appointment', $id, $reason !== '' ? ['reason' => $reason] : null);
  json(appt_staff_view($row, true));
}

/* ---- AVAILABILITY --------------------------------------------------------- */
if ($action === 'availability_get' && method() === 'GET') {
  $a = availability_get();
  $ready = [];
  foreach (APPOINTMENT_TYPES as $t) $ready[$t] = availability_ready($a, $t);
  json(['availability' => $a, 'ready' => $ready, 'public_booking_enabled' => setting_flag('public_booking_enabled'),
        'timezone' => BUSINESS_TZ, 'durations_allowed' => APPOINTMENT_DURATIONS, 'steps_allowed' => APPOINTMENT_STEPS]);
}

if ($action === 'availability_save' && method() === 'POST') {
  owner_only($isOwner);
  $b = body();
  $saved = [];
  $upsert = 'INSERT INTO settings (skey, svalue, updated_by) VALUES (?,?,?) ON DUPLICATE KEY UPDATE svalue = VALUES(svalue), updated_by = VALUES(updated_by)';
  if (array_key_exists('availability', $b)) {
    $r = availability_clean($b['availability']);
    if ($r['errors']) json(['error' => 'Some availability settings need fixing', 'errors' => $r['errors']], 400);
    db_exec($upsert, 'ssi', $k = 'availability', $v = json_encode($r['clean']), $user['id']);
    $saved[] = 'availability';
  }
  if (array_key_exists('public_booking_enabled', $b)) {
    db_exec($upsert, 'ssi', $k = 'public_booking_enabled', $v = !empty($b['public_booking_enabled']) ? '1' : '0', $user['id']);
    $saved[] = 'public_booking_enabled';
  }
  audit($user['id'], 'availability_update', 'settings', null, ['keys' => $saved]);
  $a = availability_get();
  $ready = [];
  foreach (APPOINTMENT_TYPES as $t) $ready[$t] = availability_ready($a, $t);
  json(['ok' => true, 'saved' => $saved, 'availability' => $a, 'ready' => $ready,
        'public_booking_enabled' => (string)db_row("SELECT svalue FROM settings WHERE skey = 'public_booking_enabled'")['svalue'] === '1']);
}

/* ---- BLOCKS (closed dates, leave) ----------------------------------------- */
if ($action === 'blocks' && method() === 'GET') {
  $from = ymd_or_null($_GET['from'] ?? '') ?? lagos_today();
  $to = ymd_or_null($_GET['to'] ?? '') ?? date_add_days($from, 60);
  $rows = db_rows('SELECT * FROM availability_blocks WHERE starts_at < ? AND ends_at > ? ORDER BY starts_at',
    'ss', utc_sql(lagos_midnight_ts(date_add_days($to, 1))), utc_sql(lagos_midnight_ts($from)));
  json(['items' => array_map(fn($r) => ['id' => (int)$r['id'], 'starts_at' => $r['starts_at'], 'ends_at' => $r['ends_at'],
    'starts_at_local' => lagos_iso($r['starts_at']), 'ends_at_local' => lagos_iso($r['ends_at']), 'reason' => $r['reason']], $rows)]);
}

if ($action === 'block_save' && method() === 'POST') {
  owner_only($isOwner);
  $b = body();
  // A bare date means the whole Lagos day; an end date is inclusive.
  $s = in_str($b, 'start'); $e = in_str($b, 'end');
  $sTs = ymd_or_null($s) !== null ? lagos_midnight_ts($s) : utc_ts(lagos_local_to_utc($s));
  $eTs = ymd_or_null($e) !== null ? lagos_midnight_ts(date_add_days($e, 1)) : utc_ts(lagos_local_to_utc($e));
  if (!$sTs || !$eTs || $eTs <= $sTs) fail('Give a start and an end after it (dates or date-times)');
  if ($eTs - $sTs > 366 * 86400) fail('A block can last a year at most');
  $reason = mb_substr(trim(in_str($b, 'reason')), 0, 160) ?: null;
  db_exec('INSERT INTO availability_blocks (starts_at, ends_at, reason, created_by) VALUES (?,?,?,?)', 'sssi', utc_sql($sTs), utc_sql($eTs), $reason, $user['id']);
  $newId = (int)$conn->insert_id;
  audit($user['id'], 'availability_block', 'availability_block', $newId, ['reason' => $reason]);
  $clash = (int)db_row("SELECT COUNT(*) AS n FROM appointments WHERE all_day = 0 AND status IN ('requested','confirmed') AND starts_at < ? AND ends_at > ?",
    'ss', utc_sql($eTs), utc_sql($sTs))['n'];
  json(['id' => $newId, 'starts_at_local' => lagos_iso($sTs), 'ends_at_local' => lagos_iso($eTs),
        'warning' => $clash ? "$clash existing appointment(s) fall inside this block; they are not moved automatically." : null], 201);
}

if ($action === 'block_delete' && method() === 'POST') {
  owner_only($isOwner);
  $row = db_row('SELECT * FROM availability_blocks WHERE id = ?', 'i', $id);
  if (!$row) fail('Block not found', 404);
  if (utc_ts($row['ends_at']) <= time()) fail('Past blocks are kept as history', 409);
  db_exec('DELETE FROM availability_blocks WHERE id = ?', 'i', $id);
  audit($user['id'], 'availability_block_delete', 'availability_block', $id);
  json(['ok' => true]);
}

fail('Unknown action', 404);
