<?php
/**
 * HeritOS: public consultation requests (Phase 3). No sign-in.
 *
 *   GET  ?action=config                                   {enabled, timezone, types:[{type, duration_min}]}
 *   GET  ?action=slots&type=consultation&from=YYYY-MM-DD&days=N (N ≤ 14)
 *        → {timezone, type, slots:[{start, end}]}   ISO 8601 with +01:00; busy times are never returned
 *   POST ?action=request  {type:'consultation', start, name, phone | email, note?, hp_url, request_key}
 *        → 201 {ok, message}   a REQUEST the owner confirms; never an instant booking
 *
 * Off until the owner switches public_booking_enabled on (default off): slots and
 * request then answer 503 and config says enabled:false. With no working hours
 * set there are no slots either. Fittings and collections are requested only
 * from the customer portal.
 *
 * Throttled per IP through audit_log: BOOKING_SLOTS_MAX_PER_IP (default 60) and
 * BOOKING_REQUEST_MAX_PER_IP (default 5) per BOOKING_THROTTLE_WINDOW seconds
 * (default 3600). Errors stay generic and never say what else is booked.
 */
require __DIR__ . '/_lib.php';
require __DIR__ . '/_jobs.php';
cors();

$action = $_GET['action'] ?? 'config';
const PUBLIC_TYPES = ['consultation'];
$enabled = has_table('appointments') && setting_flag('public_booking_enabled');
$ipKey = 'ip:' . client_ip();
$window = (int)cfg('BOOKING_THROTTLE_WINDOW', 3600);

if ($action === 'config' && method() === 'GET') {
  if (!$enabled) json(['enabled' => false, 'timezone' => BUSINESS_TZ, 'types' => []]);
  $a = availability_get();
  $types = [];
  foreach (PUBLIC_TYPES as $t) if (availability_ready($a, $t)) $types[] = ['type' => $t, 'duration_min' => (int)$a['durations'][$t]];
  json(['enabled' => (bool)$types, 'timezone' => BUSINESS_TZ, 'types' => $types,
        'horizon_days' => $types ? (int)$a['horizon_days'] : null, 'min_notice_hours' => $types ? (int)$a['min_notice_hours'] : null]);
}

if (!$enabled && in_array($action, ['slots', 'request'], true)) fail('Online appointment requests are not available at the moment.', 503);

if ($action === 'slots' && method() === 'GET') {
  throttle_enforce([[(int)cfg('BOOKING_SLOTS_MAX_PER_IP', 60), 'booking_slots_ip', $ipKey]], $window);
  audit(null, 'booking_slots_ip', $ipKey);
  $type = $_GET['type'] ?? 'consultation';
  if (!in_array($type, PUBLIC_TYPES, true)) fail('Unknown appointment type');
  $from = ymd_or_null($_GET['from'] ?? '') ?? lagos_today();
  if ($from < lagos_today()) $from = lagos_today();
  $days = max(1, min(14, in_int($_GET, 'days', 7)));
  json(['timezone' => BUSINESS_TZ, 'type' => $type, 'slots' => appt_free_slots($type, $from, $days)]);
}

if ($action === 'request' && method() === 'POST') {
  throttle_enforce([[(int)cfg('BOOKING_REQUEST_MAX_PER_IP', 5), 'booking_request_ip', $ipKey]], $window);
  $b = body();
  $ok = ['ok' => true, 'message' => 'Request received. We will confirm your appointment, or suggest another time.'];
  // Honeypot: a filled hidden field gets the normal reply and nothing is stored.
  if (trim(in_str($b, 'hp_url')) !== '') json($ok, 201);
  $key = body_request_key($b);
  $type = $b['type'] ?? 'consultation';
  if (!in_array($type, PUBLIC_TYPES, true)) fail('Unknown appointment type');
  $name = trim(in_str($b, 'name'));
  $phone = trim(in_str($b, 'phone'));
  $email = trim(in_str($b, 'email'));
  $note = trim(in_str($b, 'note'));
  if ($name === '' || mb_strlen($name) > 160) fail('Please give your name');
  if ($phone === '' && $email === '') fail('Please give a phone number or an email address');
  if ($phone !== '' && (strlen(preg_replace('/\D/', '', $phone)) < 7 || mb_strlen($phone) > 40)) fail('That phone number looks wrong');
  if ($email !== '' && (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190)) fail('That email address looks wrong');
  if (mb_strlen($note) > 500) fail('Please keep the note under 500 characters');
  $utc = lagos_local_to_utc($b['start'] ?? '');
  if ($utc === null || !preg_match('/[ T]\d{2}:\d{2}/', in_str($b, 'start'))) fail('Choose a time from the list');

  // A repeat of the same request (double tap, retry) gets the same answer.
  if (db_row('SELECT id FROM appointments WHERE request_key = ?', 's', $key)) json($ok, 200);
  audit(null, 'booking_request_ip', $ipKey);

  $r = appt_reserve(['type' => $type, 'start_ts' => utc_ts($utc), 'mode' => 'client', 'source' => 'public', 'status' => 'requested',
    'request_key' => $key, 'contact_name' => $name, 'contact_phone' => $phone ?: null, 'contact_email' => $email ?: null,
    'client_note' => $note ?: null], ['type' => 'customer', 'id' => null]);
  if ($r['duplicate']) json($ok, 200);
  $appt = $r['appointment'];

  // Linked enquiry so the request shows in the pipeline as well (best-effort).
  try {
    $when = lagos_iso($appt['starts_at']);
    $msg = "Consultation request for $when (Lagos time)." . ($note !== '' ? "\n\n" . $note : '');
    db_exec("INSERT INTO enquiries (name, phone, email, type, interest, message, status, source, request_key)
             VALUES (?,?,?, 'bespoke', 'Consultation', ?, 'new', 'booking', ?)",
      'sssss', $name, $phone ?: null, $email ?: null, $msg, $k = 'appt-' . $appt['id']);
    $enqId = (int)$conn->insert_id;
    db_exec('UPDATE appointments SET enquiry_id = ? WHERE id = ?', 'ii', $enqId, (int)$appt['id']);
  } catch (Throwable $e) { /* the appointment request stands even if the enquiry insert fails */ }
  json($ok, 201);
}

fail('Unknown action', 404);
