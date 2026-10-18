<?php
/**
 * HeritOS: customer portal over tailoring jobs and retail orders (Phase 3, A09).
 * Customer session (Bearer token from access.php or the legacy login) on every action.
 *
 *   GET  ?action=me                         {name, first_name, email_masked, phone_masked, features}
 *   GET  ?action=jobs                       {jobs:[...], orders:[...]}
 *   GET  ?action=job&ref=                   job_public_view + messages, change_requests, feedback, can_* flags
 *   GET  ?action=messages&ref=              client-visible thread (marks owner messages read)
 *   POST ?action=message                    {ref, body, request_key}
 *   GET  ?action=change_requests&ref=
 *   POST ?action=change_request             {ref, kind: address|garment|other, details, address?, request_key}
 *   GET  ?action=slots&type=&from=&days=    free slots for fitting, collection or consultation
 *   POST ?action=appointment_request        {ref, type, start, note?, request_key}
 *   POST ?action=appointment_reschedule_request {ref, appointment_id, start, reason?, request_key}
 *   GET  ?action=measurements               own sets (only when portal_show_measurements is on)
 *   GET  ?action=measurement_templates      templates a customer may propose against
 *   POST ?action=propose_measurements       {ref?, template_key, unit, vals, note?, request_key}  → pending set (+ change request)
 *   POST ?action=feedback                   {ref, rating?, comment?, contact_ok, publish_consent, photo_consent, request_key}
 *   POST ?action=quote_accept               {ref, quote_id, content_hash, confirm:true}  (only when portal_quote_accept_enabled is on)
 *   POST ?action=sample_decide              {ref, sample_id, decision, note?, request_key}  (company contacts who may approve; Phase 5)
 *
 * Phase 5 (company_portal_enabled on): company contacts see company jobs as lines and totals, wearers see only their own
 * garment (jobs lists them as company_jobs and wearing). Every other action stays limited to the job's own client.
 *
 * Every lookup is filtered by the signed-in customer. Another customer's
 * reference answers exactly like a missing one: 404 {"error":"Not found"}.
 * Responses never carry notes, internal notes, costs, the assigned tailor,
 * the staff HC code, unverified payments or internal messages.
 */
require __DIR__ . '/_lib.php';
require __DIR__ . '/_portal.php';
cors();

$me = require_customer_session();
$cid = (int)$me['id'];
$action = $_GET['action'] ?? 'jobs';

function features() {
  return ['quote_accept' => setting_flag('portal_quote_accept_enabled'), 'measurements' => setting_flag('portal_show_measurements')];
}

/** Masked email: a•••@example.test */
function email_masked($e) {
  $e = trim((string)$e);
  if ($e === '' || strpos($e, '@') === false) return '';
  [$u, $d] = explode('@', $e, 2);
  return mb_substr($u, 0, 1) . '•••@' . $d;
}

/** Client-visible messages of a job, oldest first. */
function client_thread($jobId) {
  return array_map(fn($m) => ['id' => (int)$m['id'], 'from' => $m['author_type'] === 'customer' ? 'you' : ($m['author_type'] === 'system' ? 'system' : 'herit'),
    'body' => $m['body'], 'at' => lagos_iso($m['created_at']), 'read' => $m['author_type'] === 'customer' ? $m['read_by_owner_at'] !== null : true],
    db_rows("SELECT id, author_type, body, UNIX_TIMESTAMP(created_at) AS created_at, read_by_owner_at FROM job_messages
              WHERE job_id = ? AND visibility = 'client' ORDER BY id", 'i', (int)$jobId));
}

/** TIMESTAMP columns are read as Unix time so the MySQL session zone never shifts them. */
const CHANGE_SQL = 'SELECT *, UNIX_TIMESTAMP(created_at) AS created_ts FROM job_change_requests';

function change_view(array $r) {
  $p = $r['payload'] !== null ? json_decode($r['payload'], true) : null;
  return ['id' => (int)$r['id'], 'kind' => $r['kind'], 'status' => $r['status'], 'details' => $p['details'] ?? null,
          'address' => $p['address'] ?? null, 'requested_start' => $p['start'] ?? null,
          'owner_response' => $r['owner_response'], 'price_effect' => $r['price_effect'], 'date_effect' => $r['date_effect'],
          'created_at' => lagos_iso($r['created_ts'] ?? null), 'decided_at' => lagos_iso($r['decided_at'])];
}

function feedback_wording() {
  return ['publish' => (string)setting_get('feedback_publish_wording', ''), 'photo' => (string)setting_get('feedback_photo_wording', '')];
}

/** The quote a customer sees: the accepted one, else the current sent and unexpired one. */
function portal_quote(array $job) {
  $q = null;
  if (!empty($job['quote_id'])) $q = db_row("SELECT * FROM quotes WHERE id = ? AND status = 'accepted'", 'i', (int)$job['quote_id']);
  if (!$q) $q = db_row("SELECT * FROM quotes WHERE job_id = ? AND status = 'sent' AND (valid_until IS NULL OR valid_until >= ?) ORDER BY id DESC LIMIT 1",
    'is', (int)$job['id'], lagos_today());
  if ($q) $q['items'] = db_rows('SELECT description, garment_type, qty, unit_price, line_total FROM quote_items WHERE quote_id = ? ORDER BY sort, id', 'i', (int)$q['id']);
  return $q;
}

/** Insert a row keyed by request_key once; a repeat by the same customer returns the first id. Another customer's key is refused generically. */
function insert_once($table, $key, callable $insert) {
  global $conn, $cid;
  $ex = db_row("SELECT id, customer_id FROM `$table` WHERE request_key = ?", 's', $key);
  if ($ex) {
    if ((int)$ex['customer_id'] !== $cid) fail('Invalid request key');
    return [(int)$ex['id'], true];
  }
  try { $insert(); return [(int)$conn->insert_id, false]; }
  catch (mysqli_sql_exception $e) {
    if (!is_duplicate_key($e)) throw $e;
    $ex = db_row("SELECT id, customer_id FROM `$table` WHERE request_key = ?", 's', $key);
    if (!$ex || (int)$ex['customer_id'] !== $cid) throw $e;
    return [(int)$ex['id'], true];
  }
}

$b = method() === 'POST' ? body() : [];
$ref = $_GET['ref'] ?? ($b['ref'] ?? '');

/* ---- ME ------------------------------------------------------------------- */
if ($action === 'me' && method() === 'GET') {
  json(['name' => $me['name'], 'first_name' => trim(explode(' ', trim((string)$me['name']))[0] ?? ''),
        'email_masked' => email_masked($me['email']), 'phone_masked' => phone_masked($me['phone']),
        'features' => features(), 'timezone' => BUSINESS_TZ,
        'company' => company_portal_on() ? array_map(fn($r) => ['name' => $r['name'], 'can_approve_samples' => (int)$r['can_approve_samples']],
          db_rows('SELECT co.name, k.can_approve_samples FROM company_contacts k JOIN companies co ON co.id = k.company_id
                    WHERE k.customer_id = ? AND k.active = 1 AND k.can_view_jobs = 1 AND co.deleted_at IS NULL ORDER BY co.name', 'i', $cid)) : null]);
}

/* ---- JOBS ----------------------------------------------------------------- */
if ($action === 'jobs' && method() === 'GET') {
  $jobs = db_rows("SELECT o.id, o.public_ref, o.description, o.garment_type, o.quantity, o.job_stage, o.stage, o.due_date, o.event_date, o.created_at,
                          (SELECT COUNT(*) FROM job_messages m WHERE m.job_id = o.id AND m.visibility = 'client' AND m.author_type <> 'customer'
                              AND m.read_by_customer_at IS NULL) AS unread
                     FROM tailoring_orders o
                    WHERE o.customer_id = ? AND o.deleted_at IS NULL AND o.public_ref IS NOT NULL" .
                    (has_column('tailoring_orders', 'job_kind') ? " AND o.job_kind <> 'company'" : '') . "
                 ORDER BY o.id DESC LIMIT 100", 'i', $cid);
  // Phase 5: company jobs this person may follow as a contact, and garments they wear.
  $companyJobs = []; $wearing = [];
  if (company_portal_on()) {
    $companyJobs = db_rows("SELECT o.public_ref, o.description, o.quantity, o.handed_over_qty, o.job_stage, o.stage, o.due_date, co.name AS company_name
                              FROM tailoring_orders o JOIN companies co ON co.id = o.company_id
                              JOIN company_contacts k ON k.company_id = o.company_id AND k.customer_id = ? AND k.active = 1 AND k.can_view_jobs = 1
                             WHERE o.job_kind = 'company' AND o.deleted_at IS NULL AND o.public_ref IS NOT NULL ORDER BY o.id DESC LIMIT 100", 'i', $cid);
    $wearing = db_rows("SELECT o.public_ref, o.due_date, i.id, i.description, i.garment_type, i.qty, i.qty_ready, i.qty_handed_over, i.item_stage
                          FROM job_items i JOIN tailoring_orders o ON o.id = i.job_id
                         WHERE i.wearer_customer_id = ? AND i.item_stage <> 'cancelled' AND o.job_kind = 'company' AND o.deleted_at IS NULL
                           AND o.public_ref IS NOT NULL ORDER BY i.id DESC LIMIT 100", 'i', $cid);
  }
  $orders = has_column('orders', 'public_ref') ? db_rows(
    "SELECT o.public_ref, o.status, o.total, UNIX_TIMESTAMP(o.created_at) AS created_at, o.courier, o.tracking_url, COUNT(i.id) AS item_count
       FROM orders o LEFT JOIN order_items i ON i.order_id = o.id
      WHERE o.customer_id = ? AND o.deleted_at IS NULL AND o.public_ref IS NOT NULL
   GROUP BY o.id ORDER BY o.id DESC LIMIT 100", 'i', $cid) : [];
  json([
    'jobs' => array_map(function ($j) {
      $stage = job_stage_of($j);
      return ['ref' => $j['public_ref'], 'description' => $j['description'], 'garment_type' => $j['garment_type'], 'quantity' => (int)$j['quantity'],
              'stage' => $stage, 'stage_label' => JOB_PUBLIC_STAGE_LABELS[$stage] ?? null, 'promised_date' => $j['due_date'],
              'event_date' => $j['event_date'], 'unread' => (int)$j['unread']];
    }, $jobs),
    'orders' => array_map(fn($o) => ['ref' => $o['public_ref'], 'status' => $o['status'], 'total' => $o['total'], 'item_count' => (int)$o['item_count'],
      'created_at' => lagos_iso($o['created_at']), 'courier' => $o['courier'], 'tracking_url' => $o['tracking_url']], $orders),
    'company_jobs' => array_map(function ($j) {
      $stage = job_stage_of($j);
      return ['ref' => $j['public_ref'], 'company' => $j['company_name'], 'description' => $j['description'], 'quantity' => (int)$j['quantity'],
              'quantity_handed_over' => (int)$j['handed_over_qty'], 'stage' => $stage, 'stage_label' => JOB_PUBLIC_STAGE_LABELS[$stage] ?? null,
              'promised_date' => $j['due_date']];
    }, $companyJobs),
    'wearing' => array_map(fn($w) => wearer_item_public_view($w + ['id' => $w['id']], ['public_ref' => $w['public_ref'], 'due_date' => $w['due_date']]), $wearing),
  ]);
}

/* ---- JOB ------------------------------------------------------------------ */
if ($action === 'job' && method() === 'GET') {
  $job = portal_job($me, $ref, ['owner', 'contact', 'wearer']);
  $jid = (int)$job['id'];
  // Phase 5: a wearer sees only their own garment; a company contact sees the
  // job as lines and totals (never wearers or measurements), the latest sample
  // and, when allowed, approves it.
  if ($job['portal_access'] === 'wearer') json(wearer_item_public_view($job['portal_item'], $job));
  if ($job['portal_access'] === 'contact') {
    $view = company_job_public_view($job,
      db_rows('SELECT * FROM job_items WHERE job_id = ? ORDER BY sort, id', 'i', $jid),
      db_rows('SELECT * FROM job_samples WHERE job_id = ? ORDER BY version', 'i', $jid),
      portal_quote($job), job_ledger($jid),
      db_rows('SELECT * FROM job_handovers WHERE job_id = ? ORDER BY id', 'i', $jid),
      db_rows('SELECT stage, kind, public, UNIX_TIMESTAMP(created_at) AS created_at FROM tailoring_events WHERE order_id = ? AND public = 1 ORDER BY id', 'i', $jid));
    $view['messages'] = client_thread($jid);
    $view['can'] = ['approve_sample' => contact_can($job['portal_contact'], 'approve_samples') && ($view['sample']['status'] ?? '') === 'submitted'];
    json($view);
  }
  $quote = portal_quote($job);
  $view = job_public_view($job, $quote, job_ledger($jid),
    db_rows('SELECT * FROM job_handovers WHERE job_id = ? ORDER BY id', 'i', $jid),
    db_rows('SELECT * FROM appointments WHERE job_id = ? ORDER BY starts_at', 'i', $jid),
    db_rows('SELECT stage, kind, public, UNIX_TIMESTAMP(created_at) AS created_at FROM tailoring_events WHERE order_id = ? AND public = 1 ORDER BY id', 'i', $jid));
  $f = features();
  if ($view['quote'] && $f['quote_accept'] && $quote['status'] === 'sent') $view['quote']['content_hash'] = $quote['content_hash'];
  $fb = db_row('SELECT rating, comment, contact_ok, publish_consent, photo_consent, UNIX_TIMESTAMP(created_at) AS created_at FROM job_feedback WHERE job_id = ?', 'i', $jid);
  $view['messages'] = client_thread($jid);
  $view['change_requests'] = array_map('change_view', db_rows(CHANGE_SQL . ' WHERE job_id = ? AND customer_id = ? ORDER BY id DESC', 'ii', $jid, $cid));
  $view['feedback'] = $fb ? ['rating' => $fb['rating'] !== null ? (int)$fb['rating'] : null, 'comment' => $fb['comment'], 'contact_ok' => (int)$fb['contact_ok'],
                              'publish_consent' => $fb['publish_consent'], 'photo_consent' => (int)$fb['photo_consent'], 'at' => lagos_iso($fb['created_at'])] : null;
  $view['can'] = [
    'accept_quote' => (bool)($view['quote'] && $f['quote_accept'] && $quote['status'] === 'sent'),
    'give_feedback' => $job['job_stage'] === 'handed_over' && !$fb,
    'request_appointment' => !in_array($job['job_stage'], ['handed_over', 'cancelled'], true),
    'request_change' => !in_array($job['job_stage'], ['handed_over', 'cancelled'], true),
  ];
  $view['feedback_wording'] = feedback_wording();
  json($view);
}

/* ---- MESSAGES ------------------------------------------------------------- */
if ($action === 'messages' && method() === 'GET') {
  $job = portal_job($me, $ref, ['owner', 'contact']);
  $thread = client_thread((int)$job['id']);
  db_exec("UPDATE job_messages SET read_by_customer_at = UTC_TIMESTAMP()
            WHERE job_id = ? AND visibility = 'client' AND author_type <> 'customer' AND read_by_customer_at IS NULL", 'i', (int)$job['id']);
  json(['ref' => $job['public_ref'], 'messages' => $thread]);
}

if ($action === 'message' && method() === 'POST') {
  $job = portal_job($me, $ref, ['owner', 'contact']);
  $key = body_request_key($b);
  $body = message_body_clean($b['body'] ?? '');
  if ($body === null) fail('Write a message of up to 2000 characters');
  $jid = (int)$job['id'];
  [$mid, $dup] = insert_once('job_messages', $key, function () use ($jid, $cid, $body, $key) {
    db_exec("INSERT INTO job_messages (job_id, customer_id, author_type, visibility, channel, body, request_key)
             VALUES (?,?, 'customer', 'client', 'portal', ?, ?)", 'iiss', $jid, $cid, $body, $key);
  });
  json(['ok' => true, 'id' => $mid, 'duplicate' => $dup, 'messages' => client_thread($jid)], $dup ? 200 : 201);
}

/* ---- CHANGE REQUESTS ------------------------------------------------------ */
if ($action === 'change_requests' && method() === 'GET') {
  $job = portal_job($me, $ref);
  json(['items' => array_map('change_view', db_rows(CHANGE_SQL . ' WHERE job_id = ? AND customer_id = ? ORDER BY id DESC', 'ii', (int)$job['id'], $cid))]);
}

if ($action === 'change_request' && method() === 'POST') {
  $job = portal_job($me, $ref);
  if (in_array($job['job_stage'], ['handed_over', 'cancelled'], true)) fail('This job is closed. Send a message instead.', 409);
  $key = body_request_key($b);
  $kind = $b['kind'] ?? '';
  if (!in_array($kind, ['address', 'garment', 'other'], true)) fail('Kind must be address, garment or other (use the appointment and measurement forms for those)');
  $details = message_body_clean($b['details'] ?? '', 1000);
  if ($details === null) fail('Describe the change (up to 1000 characters)');
  $payload = ['details' => $details];
  if ($kind === 'address') {
    $addr = message_body_clean($b['address'] ?? '', 500);
    if ($addr === null) fail('Give the corrected address');
    $payload['address'] = $addr;
  }
  $jid = (int)$job['id'];
  $json = json_encode($payload, JSON_UNESCAPED_UNICODE);
  [$rid, $dup] = insert_once('job_change_requests', $key, function () use ($jid, $cid, $kind, $json, $key) {
    db_exec('INSERT INTO job_change_requests (job_id, customer_id, kind, payload, request_key) VALUES (?,?,?,?,?)', 'iisss', $jid, $cid, $kind, $json, $key);
  });
  json(['duplicate' => $dup] + change_view(db_row(CHANGE_SQL . ' WHERE id = ?', 'i', $rid)), $dup ? 200 : 201);
}

/* ---- APPOINTMENTS --------------------------------------------------------- */
if ($action === 'slots' && method() === 'GET') {
  $type = $_GET['type'] ?? 'fitting';
  if (!in_array($type, APPOINTMENT_TYPES, true)) fail('Unknown appointment type');
  $from = ymd_or_null($_GET['from'] ?? '') ?? lagos_today();
  if ($from < lagos_today()) $from = lagos_today();
  $days = max(1, min(14, in_int($_GET, 'days', 7)));
  json(['timezone' => BUSINESS_TZ, 'type' => $type, 'slots' => appt_free_slots($type, $from, $days)]);
}

if ($action === 'appointment_request' && method() === 'POST') {
  $job = portal_job($me, $ref);
  if (in_array($job['job_stage'], ['handed_over', 'cancelled'], true)) fail('This job is closed. Send a message instead.', 409);
  $key = body_request_key($b);
  $type = $b['type'] ?? '';
  if (!in_array($type, APPOINTMENT_TYPES, true)) fail('Type must be fitting, collection or consultation');
  $utc = lagos_local_to_utc($b['start'] ?? '');
  if ($utc === null || !preg_match('/[ T]\d{2}:\d{2}/', in_str($b, 'start'))) fail('Choose a time from the list');
  $note = trim(in_str($b, 'note'));
  if (mb_strlen($note) > 500) fail('Please keep the note under 500 characters');
  $ex = db_row('SELECT customer_id FROM appointments WHERE request_key = ?', 's', $key);
  if ($ex && (int)$ex['customer_id'] !== $cid) fail('Invalid request key');
  $r = appt_reserve(['type' => $type, 'start_ts' => utc_ts($utc), 'mode' => 'client', 'source' => 'portal', 'status' => 'requested',
    'request_key' => $key, 'customer_id' => $cid, 'job_id' => (int)$job['id'], 'contact_name' => $me['name'],
    'contact_phone' => $me['phone'] ?: null, 'contact_email' => $me['email'] ?: null, 'client_note' => $note ?: null],
    ['type' => 'customer', 'id' => $cid]);
  json(['duplicate' => $r['duplicate'], 'message' => 'Request received. We will confirm, or suggest another time.']
       + appointment_public_view($r['appointment']), $r['duplicate'] ? 200 : 201);
}

if ($action === 'appointment_reschedule_request' && method() === 'POST') {
  $job = portal_job($me, $ref);
  $key = body_request_key($b);
  $appt = db_row("SELECT * FROM appointments WHERE id = ? AND job_id = ? AND customer_id = ?", 'iii', in_int($b, 'appointment_id'), (int)$job['id'], $cid);
  if (!$appt) fail('Not found', 404);
  if (!in_array($appt['status'], ['requested', 'confirmed'], true)) fail('That appointment can no longer be moved', 409);
  $utc = lagos_local_to_utc($b['start'] ?? '');
  if ($utc === null || !preg_match('/[ T]\d{2}:\d{2}/', in_str($b, 'start'))) fail('Choose a new time from the list');
  $reason = message_body_clean($b['reason'] ?? 'Please move my appointment', 500) ?? 'Please move my appointment';
  $payload = json_encode(['details' => $reason, 'start' => lagos_iso($utc)], JSON_UNESCAPED_UNICODE);
  $jid = (int)$job['id']; $aid = (int)$appt['id'];
  [$rid, $dup] = insert_once('job_change_requests', $key, function () use ($jid, $cid, $payload, $aid, $key) {
    db_exec("INSERT INTO job_change_requests (job_id, customer_id, kind, payload, appointment_id, request_key) VALUES (?,?, 'reschedule', ?,?,?)",
      'iisis', $jid, $cid, $payload, $aid, $key);
  });
  json(['duplicate' => $dup] + change_view(db_row(CHANGE_SQL . ' WHERE id = ?', 'i', $rid)), $dup ? 200 : 201);
}

/* ---- MEASUREMENTS --------------------------------------------------------- */
if ($action === 'measurements' && method() === 'GET') {
  if (!setting_flag('portal_show_measurements')) fail('Not found', 404);
  $rows = db_rows("SELECT s.template_key, t.label, s.unit, s.vals, s.status, s.taken_at FROM measurement_sets s
                     LEFT JOIN measurement_templates t ON t.tkey = s.template_key
                    WHERE s.customer_id = ? AND s.status IN ('approved','pending') ORDER BY s.id DESC LIMIT 50", 'i', $cid);
  json(['read_only' => true, 'sets' => array_map(fn($r) => ['template' => $r['label'] ?? $r['template_key'], 'template_key' => $r['template_key'],
    'unit' => $r['unit'], 'values' => json_decode($r['vals'], true) ?: (object)[], 'status' => $r['status'], 'taken_at' => $r['taken_at']], $rows)]);
}

if ($action === 'measurement_templates' && method() === 'GET') {
  json(['templates' => array_map(fn($t) => ['key' => $t['tkey'], 'label' => $t['label'], 'fields' => array_values(array_filter(
    json_decode($t['fields'], true) ?: [], fn($f) => empty($f['hidden'])))],
    db_rows("SELECT tkey, label, fields FROM measurement_templates WHERE active = 1 AND tkey <> 'legacy' ORDER BY sort, label"))]);
}

if ($action === 'propose_measurements' && method() === 'POST') {
  // Always a proposal: a pending set the owner reviews. It never changes an
  // approved set or any job snapshot (BR-06, BR-07).
  $key = body_request_key($b);
  $job = trim((string)$ref) !== '' ? portal_job($me, $ref) : null;
  $ex = db_row('SELECT customer_id FROM measurement_sets WHERE request_key = ?', 's', $key);
  if ($ex && (int)$ex['customer_id'] !== $cid) fail('Invalid request key');
  $tpl = $b['template_key'] ?? '';
  if ($tpl === 'legacy') fail('Unknown measurement template');
  $r = measurement_create(['customer_id' => $cid, 'template_key' => $tpl, 'unit' => in_str($b, 'unit'), 'vals' => $b['vals'] ?? [],
    'notes' => in_str($b, 'note', null), 'request_key' => $key, 'source' => 'customer', 'approve' => false], null);
  $set = $r['set'];
  $crId = null;
  if ($job) {
    $crKey = 'ms-' . $key;
    $payload = json_encode(['details' => 'New measurements proposed (set #' . (int)$set['id'] . ')'], JSON_UNESCAPED_UNICODE);
    $jid = (int)$job['id']; $sid = (int)$set['id'];
    $crKey = substr($crKey, 0, 64);
    [$crId] = insert_once('job_change_requests', $crKey, function () use ($jid, $cid, $payload, $sid, $crKey) {
      db_exec("INSERT INTO job_change_requests (job_id, customer_id, kind, payload, measurement_set_id, request_key) VALUES (?,?, 'measurement', ?,?,?)",
        'iisis', $jid, $cid, $payload, $sid, $crKey);
    });
  }
  json(['ok' => true, 'pending' => true, 'duplicate' => $r['duplicate'], 'warnings' => $r['warnings'], 'change_request_id' => $crId,
        'message' => 'Thank you. We will check these before using them.'], $r['duplicate'] ? 200 : 201);
}

/* ---- FEEDBACK ------------------------------------------------------------- */
if ($action === 'feedback' && method() === 'POST') {
  $job = portal_job($me, $ref);
  if ($job['job_stage'] !== 'handed_over') fail('Feedback opens once your order has been collected or delivered', 409);
  $key = body_request_key($b);
  $f = feedback_clean($b);
  if ($f['errors']) json(['error' => 'Some answers need fixing', 'errors' => $f['errors']], 400);
  $c = $f['clean'];
  $w = feedback_wording();
  $follow = ($c['rating'] !== null && $c['rating'] <= 2) ? 'open' : 'none';
  $jid = (int)$job['id'];
  $ex = db_row('SELECT id, request_key FROM job_feedback WHERE job_id = ?', 'i', $jid);
  if ($ex) {
    if ($ex['request_key'] === $key) json(['ok' => true, 'duplicate' => true, 'message' => 'Thank you for your feedback.']);
    fail('Feedback has already been given for this order', 409);
  }
  try {
    db_exec('INSERT INTO job_feedback (job_id, customer_id, rating, comment, contact_ok, publish_consent, photo_consent, publish_wording, photo_wording, follow_up, request_key)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)', 'iiisisissss', $jid, $cid, $c['rating'], $c['comment'], $c['contact_ok'], $c['publish_consent'],
      $c['photo_consent'], $w['publish'], $w['photo'], $follow, $key);
  } catch (mysqli_sql_exception $e) {
    if (!is_duplicate_key($e)) throw $e;
    fail('Feedback has already been given for this order', 409);
  }
  json(['ok' => true, 'duplicate' => false, 'message' => 'Thank you for your feedback.'], 201);
}

/* ---- QUOTE ACCEPT (off by default) ---------------------------------------- */
if ($action === 'quote_accept' && method() === 'POST') {
  if (!setting_flag('portal_quote_accept_enabled')) fail('Please contact Herit to accept this quote', 403);
  $job = portal_job($me, $ref);
  if (empty($b['confirm'])) fail('Confirm that you accept this quote');
  $qid = in_int($b, 'quote_id');
  $q = db_row('SELECT id, job_id, customer_id FROM quotes WHERE id = ?', 'i', $qid);
  if (!$q || (int)$q['job_id'] !== (int)$job['id'] || (int)$q['customer_id'] !== $cid) fail('Not found', 404);
  $res = quote_accept($qid, 'portal', 'Accepted by the client in the portal', in_str($b, 'content_hash'), null, $cid);
  if (!$res['already']) audit(null, 'quote_accept_portal', 'quote', $qid, ['customer_id' => $cid]);
  json(['ok' => true, 'already' => $res['already']]);
}

/* ---- SAMPLE DECISION (Phase 5, company contacts) ----------------------------- */
/* POST ?action=sample_decide {ref, sample_id, decision: approve|changes, note?, request_key}
 * Only a contact with can_approve_samples, and only on the latest submitted
 * version; anyone else gets the same 404 as a missing job. */
if ($action === 'sample_decide' && method() === 'POST') {
  $job = portal_job($me, $ref, ['contact']);
  if (!contact_can($job['portal_contact'], 'approve_samples')) fail('Not found', 404);
  $key = body_request_key($b);
  $to = ['approve' => 'approved', 'changes' => 'changes_requested'][in_str($b, 'decision')] ?? null;
  if (!$to) fail('decision must be approve or changes');
  $note = mb_substr(trim(in_str($b, 'note')), 0, 500) ?: null;
  if ($to === 'changes_requested' && $note === null) fail('Say what should change');
  $jid = (int)$job['id'];
  $sid = in_int($b, 'sample_id');
  $contactId = (int)$job['portal_contact']['id'];
  $res = db_tx(function () use ($jid, $sid, $to, $note, $contactId, $key) {
    job_lock($jid);
    $s = db_row('SELECT * FROM job_samples WHERE id = ? AND job_id = ? FOR UPDATE', 'ii', $sid, $jid);
    if (!$s) tx_fail('Not found', 404);
    $latest = db_row('SELECT id FROM job_samples WHERE job_id = ? ORDER BY version DESC LIMIT 1', 'i', $jid);
    // A repeat of the same decision (same key) is answered as done.
    if ($s['status'] === $to && (int)$s['decided_contact_id'] === $contactId) return ['already' => true];
    if ((int)$latest['id'] !== $sid || !sample_transition_ok($s['status'], $to)) tx_fail('This sample version is no longer waiting for a decision', 409);
    db_exec("UPDATE job_samples SET status = ?, decided_channel = 'portal', decided_contact_id = ?, decision_note = ?, decided_at = UTC_TIMESTAMP() WHERE id = ?",
      'sisi', $to, $contactId, $note, $sid);
    db_exec('UPDATE tailoring_orders SET sample_status = ?, lock_version = lock_version + 1 WHERE id = ?', 'si', job_sample_status_for($to), $jid);
    job_event($jid, 'sample', null, 'Sample version ' . (int)$s['version'] . ($to === 'approved' ? ' approved' : ': changes requested') . ' (portal)',
      ['sample_id' => $sid, 'decision' => $to, 'channel' => 'portal', 'contact_id' => $contactId, 'request_key' => $key], 1, null);
    return ['already' => false];
  });
  if (!$res['already']) audit(null, 'company_sample_decision_portal', 'tailoring_order', $jid, ['sample_id' => $sid, 'decision' => $to, 'customer_id' => $cid]);
  json(['ok' => true, 'already' => $res['already'], 'status' => $to]);
}

fail('Unknown action', 404);
