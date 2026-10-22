<?php
/**
 * HeritOS: Jobs (tailoring and production), the core workshop module.
 *
 *   GET  ?action=meta                    stages, labels, transitions, payment states, templates
 *   GET  ?action=list[&job_stage=]       jobs with client and tailor names
 *   GET  ?action=get&id=N                one job, timeline, snapshot (+ money for owner roles)
 *   GET  ?action=tailors                 users who can be assigned
 *   POST ?action=create                  {customer_id | customer,phone,email,confirm_new, garment_type, ...}
 *   POST ?action=update&id=N             {lock_version, description, quantity, dates, next_action, ...}
 *   POST ?action=stage&id=N              {stage, note, force?, reason?} (new or legacy stage values)
 *   POST ?action=confirm_review&id=N     {outcome: ready|handed_over}
 *   POST ?action=attach_measurements&id=N {set_id, reason?}
 *   POST ?action=measure&id=N            legacy form; now a measurement set
 *   POST ?action=pay&id=N                legacy form; now a ledger entry (see ledger.php)
 *   GET  ?action=document&id=N&doc=quote|invoice|receipt[&ref=]   printable data (owner roles)
 *   GET  ?action=handovers&id=N, POST ?action=handover_save&id=N, POST ?action=handover_complete&id=N&hid=H
 *   POST ?action=assign|fitting|costs|remind&id=N   (unchanged contracts)
 *   GET  ?action=group_list | group_get&id=N, POST ?action=group_create
 *
 * Workshop roles only (owner roles plus tailor). Money (price, deposit, ledger,
 * costs) is owner-only: tailors never receive money fields. The legacy `stage`
 * column is written alongside job_stage for one release (dual-write).
 */
require __DIR__ . '/_lib.php';
require __DIR__ . '/_jobs.php';
require_once __DIR__ . '/_company.php';
cors();

$GARMENTS = ['agbada', 'kaftan', 'senator', 'suit', 'shirt', 'trouser', 'other'];
$FABRIC_SOURCES = ['client', 'herit', 'mixed'];

// K-01: employee was allowed here by the server but not by the app. Jobs are
// for workshop roles only, matching the approved permissions.
$user = require_auth(ROLES_WORKSHOP);
$isOwner = is_owner_role($user['role']);
$action = $_GET['action'] ?? 'list';
$id = in_int($_GET, 'id');

/** Shape a job row for output: typed numbers, labels, money only for owners. */
function job_view(array $o, $isOwner) {
  foreach (['id', 'customer_id', 'assigned_tailor_id', 'group_id', 'quantity', 'handed_over_qty', 'lock_version',
            'stage_review', 'enquiry_id', 'quote_id', 'measurement_set_id'] as $k) {
    if (array_key_exists($k, $o) && $o[$k] !== null) $o[$k] = (int)$o[$k];
  }
  if (array_key_exists('job_stage', $o)) $o['job_stage'] = job_stage_of($o);
  $o['stage_label'] = JOB_STAGE_LABELS[$o['job_stage'] ?? ''] ?? null;
  if (array_key_exists('measurement_snapshot', $o)) {
    $o['measurement_snapshot'] = $o['measurement_snapshot'] !== null ? json_decode($o['measurement_snapshot'], true) : null;
  }
  if (array_key_exists('measurements', $o) && is_string($o['measurements'])) {
    $o['measurements'] = json_decode($o['measurements'], true);
  }
  if ($isOwner && array_key_exists('price', $o) && array_key_exists('paid_total', $o)) {
    $o['balance'] = minor_to_decimal(max(0, decimal_to_minor($o['price']) - decimal_to_minor($o['paid_total'])));
  }
  return $isOwner ? $o : job_strip_money($o);
}

/** Validate a garment/date/text field set from a body; returns [col => value]. */
function job_fields_from_body(array $b, array $garments, array $fabricSources) {
  $f = [];
  if (array_key_exists('garment_type', $b)) {
    if (!in_array($b['garment_type'], $garments, true)) fail('Unknown garment type');
    $f['garment_type'] = $b['garment_type'];
  }
  foreach (['due_date', 'event_date', 'next_action_date'] as $k) {
    if (!array_key_exists($k, $b)) continue;
    if ($b[$k] === null || $b[$k] === '') { $f[$k] = null; continue; }
    $d = ymd_or_null($b[$k]);
    if ($d === null) fail("Invalid date for $k (use YYYY-MM-DD)");
    $f[$k] = $d;
  }
  foreach (['description' => 255, 'next_action' => 160, 'fabric' => 160, 'notes' => 5000] as $k => $max) {
    if (!array_key_exists($k, $b)) continue;
    $v = trim(in_str($b, $k));
    if (mb_strlen($v) > $max) fail("$k is too long");
    $f[$k] = $v === '' ? null : $v;
  }
  if (array_key_exists('quantity', $b)) {
    $q = filter_var($b['quantity'], FILTER_VALIDATE_INT);
    if ($q === false || $q < 1 || $q > 9999) fail('Quantity must be a whole number from 1');
    $f['quantity'] = $q;
  }
  if (array_key_exists('fabric_source', $b)) {
    if ($b['fabric_source'] === null || $b['fabric_source'] === '') $f['fabric_source'] = null;
    elseif (!in_array($b['fabric_source'], $fabricSources, true)) fail('Fabric source must be client, herit or mixed');
    else $f['fabric_source'] = $b['fabric_source'];
  }
  if (array_key_exists('assigned_tailor_id', $b)) {
    $f['assigned_tailor_id'] = ($b['assigned_tailor_id'] === '' || $b['assigned_tailor_id'] === null) ? null : in_int($b, 'assigned_tailor_id');
  }
  return $f;
}

// job_kind and company_id arrive with schema_phase27.sql (Phase 5); before that every job is individual.
define('JOB_LIST_COLS', "o.id, o.code, o.public_ref, o.customer_id, o.group_id, o.garment_type, o.quantity, o.description, o.fabric,
       o.fabric_source, o.stage, o.job_stage, o.stage_review, o.price, o.deposit, o.paid_total, o.payment_state,
       o.fabric_cost, o.labour_cost, o.due_date, o.event_date, o.fitting_date, o.next_action, o.next_action_date,
       o.handed_over_qty, o.lock_version, o.notes, o.assigned_tailor_id, o.enquiry_id, o.quote_id,
       " . (has_column('tailoring_orders', 'job_kind') ? 'o.job_kind, o.company_id' : "'individual' AS job_kind, NULL AS company_id") . ",
       c.name AS customer_name, c.phone AS customer_phone, c.client_ref, t.name AS tailor_name");

/* ---- META ---------------------------------------------------------------- */
if ($action === 'meta' && method() === 'GET') {
  $stages = [];
  foreach (JOB_STAGES as $s) {
    $stages[] = ['key' => $s, 'label' => JOB_STAGE_LABELS[$s], 'public_label' => JOB_PUBLIC_STAGE_LABELS[$s],
                 'next' => JOB_TRANSITIONS[$s], 'legacy' => job_stage_to_legacy($s)];
  }
  $legacy = [];
  foreach (LEGACY_STAGES as $s) { [$n, $rf] = job_stage_from_legacy($s); $legacy[$s] = ['stage' => $n, 'review' => $rf]; }
  $out = [
    'stages' => $stages, 'legacy_map' => $legacy, 'garments' => $GARMENTS, 'fabric_sources' => $FABRIC_SOURCES,
    'guards' => ['measurements_approved' => 'needs an approved measurement snapshot', 'handed_over' => 'only through handover records'],
  ];
  if ($isOwner) {
    $out['payment_states'] = PAYMENT_STATES;
    $out['payment_methods'] = PAYMENT_METHODS;
    $out['verified_methods'] = verified_methods();
  }
  json($out);
}

/* ---- LIST ---------------------------------------------------------------- */
if ($action === 'list' && method() === 'GET') {
  $where = 'o.deleted_at IS NULL';
  $types = ''; $args = [];
  if (!empty($_GET['job_stage'])) {
    if (!in_array($_GET['job_stage'], JOB_STAGES, true)) fail('Unknown stage');
    $where .= ' AND o.job_stage = ?'; $types .= 's'; $args[] = $_GET['job_stage'];
  }
  $rows = db_rows("SELECT " . JOB_LIST_COLS . "
                     FROM tailoring_orders o
                     JOIN customers c ON c.id = o.customer_id
                LEFT JOIN users t ON t.id = o.assigned_tailor_id
                    WHERE $where
                 ORDER BY o.due_date IS NULL, o.due_date ASC, o.id DESC", $types, ...$args);
  json(array_map(fn($r) => job_view($r, $isOwner), $rows));
}

/* ---- GET ONE ------------------------------------------------------------- */
if ($action === 'get' && method() === 'GET') {
  $order = db_row(
    "SELECT o.*, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email, c.client_ref,
            t.name AS tailor_name
       FROM tailoring_orders o
       JOIN customers c ON c.id = o.customer_id
  LEFT JOIN users t ON t.id = o.assigned_tailor_id
      WHERE o.id = ? AND o.deleted_at IS NULL", 'i', $id);
  if (!$order) fail('Order not found', 404);

  $events = db_rows(
    "SELECT e.id, e.stage, e.kind, e.note, e.meta, e.public, e.created_at, u.name AS user_name
       FROM tailoring_events e LEFT JOIN users u ON u.id = e.user_id
      WHERE e.order_id = ? ORDER BY e.id DESC", 'i', $id);
  foreach ($events as &$ev) {
    $ev['meta'] = $ev['meta'] !== null ? json_decode($ev['meta'], true) : null;
    $ev['public'] = (int)$ev['public'];
    // Money notes ("Payment ₦x recorded") are history; tailors do not see them.
    if (!$isOwner && ($ev['kind'] === 'payment' || ($ev['meta']['money'] ?? false))) $ev['note'] = 'Payment recorded';
  }
  unset($ev);

  $order = job_view($order, $isOwner);
  $order['events'] = $events;
  $next = JOB_TRANSITIONS[$order['job_stage']] ?? [];
  $order['allowed_next'] = array_values(array_filter($next, fn($s) => $s !== 'handed_over'));
  $order['has_approved_snapshot'] = !empty($order['measurement_snapshot_at']);
  $order['handovers'] = array_map(fn($h) => handover_view($h, $isOwner), db_rows('SELECT * FROM job_handovers WHERE job_id = ? ORDER BY id', 'i', $id));
  if ($isOwner) {
    $order['money'] = money_view(job_money($id, $order['price']), $order['price'], $order['payment_state']);
    $order['ledger'] = array_map('ledger_row_view', job_ledger($id));
    $order['quotes'] = array_map(function ($q) {
      return ['id' => (int)$q['id'], 'number' => quote_number($q['series_id'], $q['version']), 'version' => (int)$q['version'],
              'status' => $q['status'], 'total' => $q['total'], 'sent_at' => $q['sent_at'], 'accepted_at' => $q['accepted_at']];
    }, db_rows('SELECT id, series_id, version, status, total, sent_at, accepted_at FROM quotes WHERE job_id = ? OR (job_id IS NULL AND enquiry_id IS NOT NULL AND enquiry_id = ?) ORDER BY id DESC',
               'ii', $id, (int)$order['enquiry_id']));
  }
  json($order);
}

/* ---- TAILORS (for assignment) ------------------------------------------- */
if ($action === 'tailors' && method() === 'GET') {
  json(db_rows("SELECT id, name, role FROM users
                 WHERE deleted_at IS NULL AND role IN ('tailor','manager','admin','super_admin') ORDER BY name"));
}

/* ---- CREATE -------------------------------------------------------------- */
/* Takes customer_id, or name + phone/email. A phone or email that matches an
 * existing client answers 409 {candidates} unless confirm_new is true: there is
 * no silent attach by phone any more (BR-03). Price is owner-only.           */
if ($action === 'create' && method() === 'POST') {
  $b = body();
  $f = job_fields_from_body($b, $GARMENTS, $FABRIC_SOURCES);
  if (!isset($f['garment_type'])) $f['garment_type'] = in_array($b['garment_type'] ?? '', $GARMENTS, true) ? $b['garment_type'] : 'agbada';
  $stage = ($b['job_stage'] ?? '') === 'quote' ? 'quote' : 'confirmed';

  $price = '0.00';
  $depositMinor = 0;
  if ($isOwner) {
    if (isset($b['price']) && $b['price'] !== '') {
      $p = money_to_minor($b['price']);
      if ($p === null) fail('Price must be an amount like 45000 or 45,000.00');
      $price = minor_to_decimal($p);
    }
    if (isset($b['deposit']) && $b['deposit'] !== '' && in_str($b, 'deposit') !== '0') {
      $depositMinor = money_to_minor($b['deposit']);
      if ($depositMinor === null) fail('Deposit must be an amount like 20000');
    }
  }

  [$customerId] = resolve_client([
    'id' => $b['customer_id'] ?? null, 'name' => $b['customer'] ?? ($b['name'] ?? ''), 'phone' => $b['phone'] ?? '',
    'email' => $b['email'] ?? '', 'confirm_new' => !empty($b['confirm_new']),
  ], $user['id']);

  $measurements = (isset($b['measurements']) && is_array($b['measurements']) && $b['measurements']) ? json_encode($b['measurements']) : null;
  [$orderId, $code, $publicRef] = db_tx(function () use ($f, $customerId, $stage, $price, $measurements, $user) {
    $r = job_insert($f + ['customer_id' => $customerId, 'job_stage' => $stage, 'price' => $price, 'measurements' => $measurements], $user['id']);
    job_event($r[0], 'stage', $stage, 'Job created', ['to' => $stage], 1, $user['id']);
    return $r;
  });
  $extra = job_after_create($orderId, $customerId, $b, $depositMinor, $user);

  audit($user['id'], 'tailoring_create', 'tailoring_order', $orderId, ['code' => $code, 'customer_id' => $customerId]);
  json(['id' => $orderId, 'code' => $code, 'public_ref' => $publicRef, 'customer_id' => $customerId] + $extra, 201);
}

/** After a job is created: the legacy deposit field and measurements from the old form. */
function job_after_create($orderId, $customerId, array $b, $depositMinor, $user) {
  $extra = [];
  if (is_array($b['measurements'] ?? null) && $b['measurements']) {
    $r = legacy_measure_to_set($customerId, $b['measurements'], in_str($b, 'unit', 'in'), 'owner', is_owner_role($user['role']), $user['id']);
    if ($r['set']) {
      $extra['measurement_set_id'] = $r['set']['id'];
      if ($r['set']['status'] === 'approved') {
        db_tx(function () use ($orderId, $r, $user) { job_attach_snapshot_tx(job_lock($orderId), $r['set'], $user['id']); });
      }
    }
    if ($r['errors']) $extra['measurement_errors'] = $r['errors'];
    if ($r['warnings']) $extra['measurement_warnings'] = $r['warnings'];
  }
  if ($depositMinor > 0) $extra += job_record_legacy_payment($orderId, $depositMinor, $b, $user, 'Deposit recorded when the job was created');
  return $extra;
}

/**
 * A payment from an old form (job creation deposit, legacy pay action) written
 * to the ledger. The old forms do not say how the client paid, so the method is
 * 'unknown' unless sent, and it waits for verification unless the method is in
 * payment_verified_methods (default cash only). Returns response extras.
 */
function job_record_legacy_payment($orderId, $minor, array $b, $user, $note) {
  $method = in_array($b['method'] ?? '', PAYMENT_METHODS, true) ? $b['method'] : 'unknown';
  $key = isset($b['request_key']) && request_key_ok($b['request_key']) ? $b['request_key'] : 'srv-' . bin2hex(random_bytes(12));
  [$row, $dup] = db_tx(function () use ($orderId, $minor, $method, $key, $note, $user) {
    if (!job_lock($orderId)) tx_fail('Order not found', 404);
    $r = ledger_insert_tx($orderId, ['kind' => 'payment', 'amount_minor' => $minor, 'method' => $method, 'note' => $note,
      'request_key' => $key, 'verified' => payment_verified_on_entry($method, verified_methods())], $user['id']);
    if (!$r[1]) {
      job_recalc_money($orderId);
      job_event($orderId, 'payment', null, 'Payment ₦' . number_format(intdiv($minor, 100)) . ' recorded' . ($r[0]['verified'] ? '' : ' (awaiting verification)'),
        ['payment_id' => (int)$r[0]['id'], 'money' => true], 0, $user['id']);
    }
    return $r;
  });
  return ['payment_id' => (int)$row['id'], 'payment_verified' => (int)$row['verified'], 'payment_duplicate' => $dup];
}

/* ---- UPDATE (optimistic concurrency) ------------------------------------- */
/* Send the lock_version you loaded. If someone changed the job since, nothing is
 * written and the answer is 409 "Changed elsewhere, reload".                 */
if ($action === 'update' && method() === 'POST') {
  $b = body();
  if (!isset($b['lock_version']) || filter_var($b['lock_version'], FILTER_VALIDATE_INT) === false) fail('lock_version is required');
  $lv = in_int($b, 'lock_version');
  $f = job_fields_from_body($b, $GARMENTS, $FABRIC_SOURCES);
  if (!$f) fail('Nothing to update');
  if (isset($f['quantity'])) {
    $cur = db_row('SELECT handed_over_qty FROM tailoring_orders WHERE id = ?', 'i', $id);
    if ($cur && $f['quantity'] < (int)$cur['handed_over_qty']) fail('Quantity cannot be less than the pieces already handed over');
  }
  $sets = []; $types = ''; $args = [];
  foreach ($f as $col => $val) {
    $sets[] = "`$col` = ?";
    $types .= in_array($col, ['quantity', 'assigned_tailor_id'], true) ? 'i' : 's';
    $args[] = $val;
  }
  $types .= 'ii'; $args[] = $id; $args[] = $lv;
  $stmt = db_exec('UPDATE tailoring_orders SET ' . implode(', ', $sets) . ', lock_version = lock_version + 1
                    WHERE id = ? AND lock_version = ? AND deleted_at IS NULL', $types, ...$args);
  if ($stmt->affected_rows === 0) {
    $cur = db_row('SELECT lock_version FROM tailoring_orders WHERE id = ? AND deleted_at IS NULL', 'i', $id);
    if (!$cur) fail('Order not found', 404);
    json(['error' => 'Changed elsewhere, reload', 'lock_version' => (int)$cur['lock_version']], 409);
  }
  job_event($id, 'update', null, 'Job details updated', ['fields' => array_keys($f)], 0, $user['id']);
  audit($user['id'], 'tailoring_update', 'tailoring_order', $id, ['fields' => array_keys($f)]);
  $row = db_row('SELECT lock_version FROM tailoring_orders WHERE id = ?', 'i', $id);
  json(['ok' => true, 'lock_version' => (int)$row['lock_version']]);
}

/* ---- ASSIGN / RESCHEDULE -------------------------------------------------- */
if ($action === 'assign' && method() === 'POST') {
  $b = body();
  $tailorId = isset($b['assigned_tailor_id']) && $b['assigned_tailor_id'] !== '' ? in_int($b, 'assigned_tailor_id') : null;
  $dueDate = $b['due_date'] ?? null;
  if ($dueDate === '') $dueDate = null;
  if ($dueDate !== null && ymd_or_null($dueDate) === null) fail('Invalid due date');

  $stmt = db_exec('UPDATE tailoring_orders SET assigned_tailor_id = ?, due_date = ?, lock_version = lock_version + 1
                    WHERE id = ? AND deleted_at IS NULL', 'isi', $tailorId, $dueDate, $id);
  if ($stmt->affected_rows === 0 && !db_row('SELECT id FROM tailoring_orders WHERE id = ? AND deleted_at IS NULL', 'i', $id)) {
    fail('Order not found', 404);
  }
  audit($user['id'], 'tailoring_assign', 'tailoring_order', $id, ['tailor' => $tailorId, 'due' => $dueDate]);
  json(['ok' => true, 'assigned_tailor_id' => $tailorId, 'due_date' => $dueDate]);
}

/* ---- STAGE --------------------------------------------------------------- */
/* New values follow the transition table (owner roles may force with a reason
 * of 5+ characters). Legacy values (measure, cut, sew, finish, done) from the
 * current board are mapped through job_stage_from_legacy and kept working;
 * 'done' maps to 'ready', never straight to handed_over.                     */
if ($action === 'stage' && method() === 'POST') {
  $b = body();
  $want = in_str($b, 'stage');
  $note = mb_substr(trim(in_str($b, 'note')), 0, 255);
  $force = !empty($b['force']);
  $reason = trim(in_str($b, 'reason'));
  $isLegacyValue = in_array($want, LEGACY_STAGES, true) && !in_array($want, JOB_STAGES, true);
  if (!$isLegacyValue && !in_array($want, JOB_STAGES, true)) fail('Invalid stage');

  $out = db_tx(function () use ($id, $want, $note, $force, $reason, $isLegacyValue, $isOwner, $user) {
    $job = job_lock($id);
    if (!$job) tx_fail('Order not found', 404);
    $from = $job['job_stage'];
    $to = $isLegacyValue ? job_stage_from_legacy($want)[0] : $want;
    $terminal = in_array($from, ['handed_over', 'cancelled'], true);

    if ($to === 'handed_over') tx_fail('Record a handover (collection or delivery) to mark a job handed over');
    if ($terminal && $to !== $from && !($force && $isOwner && mb_strlen($reason) >= 5)) {
      tx_fail('This job is ' . JOB_STAGE_LABELS[$from] . '. An owner can reopen it with force and a reason.', 409);
    }

    if ($isLegacyValue) {
      // Old board: keep the exact legacy column it asked for, map job_stage.
      if ($to === $from) {
        db_exec('UPDATE tailoring_orders SET stage = ?, lock_version = lock_version + 1 WHERE id = ?', 'si', $want, $id);
        job_event($id, 'stage', $to, $note !== '' ? $note : ('Workshop step: ' . $want), ['legacy_value' => $want, 'from' => $from, 'to' => $to], 0, $user['id']);
      } else {
        job_set_stage_tx($job, $to, $user['id'], $note, ['legacy_value' => $want, 'transition_ok' => job_transition_ok($from, $to)]);
        db_exec('UPDATE tailoring_orders SET stage = ? WHERE id = ?', 'si', $want, $id);
      }
    } else {
      if ($to === $from) return ['job_stage' => $to, 'unchanged' => true];
      $ok = job_transition_ok($from, $to);
      if (!$ok) {
        if (!$force) tx_fail('Cannot move from ' . JOB_STAGE_LABELS[$from] . ' to ' . JOB_STAGE_LABELS[$to], 409, ['allowed' => JOB_TRANSITIONS[$from] ?? []]);
        if (!$isOwner) tx_fail('Only an owner can force a stage change', 403);
        if (mb_strlen($reason) < 5) tx_fail('Give a reason of at least 5 characters to force a stage change');
      }
      if ($to === 'measurements_approved' && empty($job['measurement_snapshot_at'])) {
        tx_fail('Attach an approved measurement set to this job first');
      }
      job_set_stage_tx($job, $to, $user['id'], $note, $ok ? [] : ['forced' => true, 'reason' => $reason]);
    }
    return ['job_stage' => $to];
  });

  audit($user['id'], 'tailoring_stage', 'tailoring_order', $id, ['stage' => $out['job_stage'], 'requested' => $want, 'forced' => $force]);
  $row = db_row('SELECT stage, job_stage, lock_version FROM tailoring_orders WHERE id = ?', 'i', $id);
  json(['ok' => true, 'job_stage' => $row['job_stage'], 'stage' => $row['stage'], 'stage_label' => JOB_STAGE_LABELS[$row['job_stage']],
        'lock_version' => (int)$row['lock_version'], 'unchanged' => !empty($out['unchanged'])]);
}

/* ---- CONFIRM A MIGRATED 'done' JOB ---------------------------------------- */
if ($action === 'confirm_review' && method() === 'POST') {
  if (!$isOwner) fail('Forbidden', 403);
  $b = body();
  $outcome = in_str($b, 'outcome');
  if (!in_array($outcome, job_review_outcomes(), true)) fail('Outcome must be one of: ' . implode(', ', job_review_outcomes()));
  db_tx(function () use ($id, $outcome, $user, $b) {
    $job = job_lock($id);
    if (!$job) tx_fail('Order not found', 404);
    if (!(int)$job['stage_review']) tx_fail('This job does not need review', 409);
    job_review_apply_tx($job, $outcome, $user, $b);
  });
  audit($user['id'], 'tailoring_confirm_review', 'tailoring_order', $id, ['outcome' => $outcome]);
  $row = db_row('SELECT job_stage, stage_review, lock_version FROM tailoring_orders WHERE id = ?', 'i', $id);
  json(['ok' => true, 'job_stage' => $row['job_stage'], 'stage_review' => (int)$row['stage_review'], 'lock_version' => (int)$row['lock_version']]);
}

function job_review_outcomes() { return ['ready', 'handed_over']; }

/* 'ready': still in the shop. 'handed_over': it was collected before Phase 2;
 * a completed handover record is written for the remaining pieces, so the job
 * still reaches handed_over only through a handover (with the balance kept). */
function job_review_apply_tx(array $job, $outcome, $user, array $b) {
  global $conn;
  if ($outcome === 'handed_over') {
    $remaining = max(1, (int)$job['quantity']) - (int)$job['handed_over_qty'];
    $key = 'review-' . (int)$job['id'] . '-' . bin2hex(random_bytes(6));
    $note = 'Confirmed collected (record from before Phase 2)';
    db_exec("INSERT INTO job_handovers (job_id, method, status, quantity, request_key, recorded_by, evidence_note)
             VALUES (?, 'collection', 'planned', ?, ?, ?, ?)", 'iisis', (int)$job['id'], $remaining, $key, $user['id'], $note);
    $hid = (int)$conn->insert_id;
    db_exec('UPDATE tailoring_orders SET stage_review = 0 WHERE id = ?', 'i', (int)$job['id']);
    handover_complete_tx($job, $hid, ['evidence_note' => $note, 'received_by' => in_str($b, 'received_by', null)], $user);
    return;
  }
  db_exec('UPDATE tailoring_orders SET stage_review = 0, lock_version = lock_version + 1 WHERE id = ?', 'i', (int)$job['id']);
  job_event($job['id'], 'review', $job['job_stage'], 'Owner confirmed: still ready, not yet collected', ['outcome' => $outcome], 0, $user['id']);
}

/* ---- ATTACH MEASUREMENTS (job snapshot, BR-06) --------------------------- */
/* {set_id, reason?}. The set must be approved and belong to the job's client.
 * From in_production onwards a reason of 5+ characters is required and the
 * event records the old and new set ids. Later profile changes never alter it. */
if ($action === 'attach_measurements' && method() === 'POST') {
  $b = body();
  $setId = in_int($b, 'set_id');
  $reason = trim(in_str($b, 'reason'));
  $snap = db_tx(function () use ($id, $setId, $reason, $user) {
    $job = job_lock($id);
    if (!$job) tx_fail('Order not found', 404);
    $set = db_row('SELECT * FROM measurement_sets WHERE id = ?', 'i', $setId);
    if (!$set) tx_fail('Measurement set not found', 404);
    return job_attach_snapshot_tx($job, $set, $user['id'], $reason);
  });
  audit($user['id'], 'tailoring_attach_measurements', 'tailoring_order', $id, ['set_id' => $setId]);
  $row = db_row('SELECT lock_version, measurement_snapshot_at FROM tailoring_orders WHERE id = ?', 'i', $id);
  json(['ok' => true, 'measurement_snapshot' => $snap, 'measurement_snapshot_at' => $row['measurement_snapshot_at'], 'lock_version' => (int)$row['lock_version']]);
}

/* ---- MEASUREMENTS (legacy form, kept for cached screens) ----------------- */
/* {measurements, sync_customer, unit?}. Now creates a measurement set (template
 * 'legacy', inches as the old form states). An owner's set is approved and
 * attached to the job; a tailor's set waits for approval. The old JSON columns
 * are still mirrored for this release so the old screen shows what was typed. */
if ($action === 'measure' && method() === 'POST') {
  $b = body();
  $vals = is_array($b['measurements'] ?? null) ? $b['measurements'] : [];
  $syncCustomer = !empty($b['sync_customer']);
  $job = db_row('SELECT id, customer_id FROM tailoring_orders WHERE id = ? AND deleted_at IS NULL', 'i', $id);
  if (!$job) fail('Order not found', 404);
  $key = isset($b['request_key']) && $b['request_key'] !== '' ? body_request_key($b) : null;
  $r = legacy_measure_to_set((int)$job['customer_id'], $vals, in_str($b, 'unit', 'in'), 'owner', $isOwner, $user['id'], $key);
  if ($r['errors']) json(['error' => 'Some measurements need fixing', 'errors' => $r['errors']], 400);

  $attached = false;
  if ($r['set'] && $r['set']['status'] === 'approved') {
    db_tx(function () use ($id, $r, $user) {
      $j = job_lock($id);
      $late = in_array($j['job_stage'], JOB_STAGES_PRODUCTION_ON, true);
      job_attach_snapshot_tx($j, $r['set'], $user['id'], $late ? 'Updated on the job measurement form' : '');
    });
    $attached = true;
  }
  $json = $vals ? json_encode($vals) : null;
  db_exec('UPDATE tailoring_orders SET measurements = ?, lock_version = lock_version + 1 WHERE id = ?', 'si', $json, $id);
  if ($syncCustomer) db_exec('UPDATE customers SET measurements = ? WHERE id = ?', 'si', $json, (int)$job['customer_id']);
  audit($user['id'], 'tailoring_measure', 'tailoring_order', $id, ['sync' => $syncCustomer, 'set_id' => $r['set']['id'] ?? null]);
  json(['ok' => true, 'set_id' => $r['set']['id'] ?? null, 'set_status' => $r['set']['status'] ?? null,
        'attached' => $attached, 'warnings' => $r['warnings']]);
}

/* ---- RECORD PAYMENT (legacy form, kept for cached screens) --------------- */
/* {amount, method?, request_key?}. Now a ledger entry (see ledger.php). There
 * is no cap at the price any more: an overpayment shows as credit (BR-24).  */
if ($action === 'pay' && method() === 'POST') {
  if (!$isOwner) fail('Forbidden', 403);
  $b = body();
  $minor = money_to_minor($b['amount'] ?? null);
  if ($minor === null || $minor <= 0) fail('Amount must be positive');
  $extra = job_record_legacy_payment($id, $minor, $b, $user, 'Recorded on the job payment form');
  $o = db_row('SELECT price, paid_total, payment_state FROM tailoring_orders WHERE id = ?', 'i', $id);
  $t = job_money($id, $o['price']);
  audit($user['id'], 'tailoring_pay', 'tailoring_order', $id, ['amount' => minor_to_decimal($minor), 'payment_id' => $extra['payment_id']]);
  json(['ok' => true, 'deposit' => (float)$o['paid_total'], 'balance' => (float)minor_to_decimal($t['balance']),
        'credit' => minor_to_decimal($t['credit']), 'payment_state' => $o['payment_state']] + $extra);
}

/* ---- PRINTABLE DOCUMENT DATA (owner roles) ------------------------------- */
/* ?action=document&id=N&doc=quote|invoice|receipt[&ref=quoteId|paymentId]
 * Everything is computed here so the print page only lays it out.
 * Numbers: Q-{series}-v{n}, INV-{job code}, RCT-{payment id}.               */
if ($action === 'document' && method() === 'GET') {
  if (!$isOwner) fail('Forbidden', 403);
  $doc = in_str($_GET, 'doc');
  if (!in_array($doc, ['quote', 'invoice', 'receipt'], true)) fail('doc must be quote, invoice or receipt');
  $ref = in_int($_GET, 'ref');
  $job = db_row("SELECT o.id, o.code, o.customer_id, o.garment_type, o.quantity, o.description, o.fabric, o.due_date, o.event_date,
                        o.price, o.paid_total, o.payment_state, o.quote_id, o.job_stage, o.stage,
                        c.name AS client_name, c.client_ref, c.phone AS client_phone, c.email AS client_email, c.company_name
                   FROM tailoring_orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = ? AND o.deleted_at IS NULL", 'i', $id);
  if (!$job) fail('Order not found', 404);
  $business = [];
  foreach (['store_name', 'business_phone', 'business_email', 'business_address', 'business_hours_text', 'deposit_policy_text'] as $k) {
    $business[$k] = setting_get($k, null);
  }
  $entries = array_map('ledger_row_view', job_ledger($id));
  $t = job_money($id, $job['price']);
  $out = [
    'doc' => $doc, 'issued_on' => lagos_today(), 'business' => $business,
    'client' => ['id' => (int)$job['customer_id'], 'name' => $job['client_name'], 'client_ref' => $job['client_ref'],
                 'phone' => $job['client_phone'], 'email' => $job['client_email'], 'company_name' => $job['company_name']],
    'job' => ['id' => (int)$job['id'], 'code' => $job['code'], 'garment_type' => $job['garment_type'], 'quantity' => (int)$job['quantity'],
              'description' => $job['description'], 'fabric' => $job['fabric'], 'due_date' => $job['due_date'], 'event_date' => $job['event_date'],
              'stage_label' => JOB_STAGE_LABELS[job_stage_of($job)] ?? null],
    'totals' => money_view($t, $job['price'], $job['payment_state']),
  ];
  // Company jobs (Phase 5): bill the company. The quote's frozen bill-to wins;
  // before a quote is sent, the live company details are used.
  $bill = has_column('tailoring_orders', 'job_kind') ? company_bill_to_snapshot($id) : null;
  if ($bill) {
    $qid = $ref && $doc === 'quote' ? $ref : (int)$job['quote_id'];
    $frozen = $qid && has_column('quotes', 'bill_to_snapshot') ? db_row('SELECT bill_to_snapshot FROM quotes WHERE id = ?', 'i', $qid) : null;
    $snap = $frozen && $frozen['bill_to_snapshot'] ? json_decode($frozen['bill_to_snapshot'], true) : null;
    $out['bill_to'] = $snap ?: $bill;
    $out['bill_to_frozen'] = (bool)$snap;
    $out['po_number'] = $out['bill_to']['po_number'] ?? null;
  }
  $quoteFor = function ($qid) use ($id) {
    $q = db_row('SELECT * FROM quotes WHERE id = ? AND (job_id = ? OR job_id IS NULL)', 'ii', (int)$qid, $id);
    if (!$q) return null;
    $q['number'] = quote_number($q['series_id'], $q['version']);
    $q['items'] = db_rows('SELECT description, garment_type, qty, unit_price, line_total FROM quote_items WHERE quote_id = ? ORDER BY sort, id', 'i', (int)$q['id']);
    unset($q['request_key']);
    return $q;
  };
  if ($doc === 'quote') {
    $qid = $ref ?: (int)$job['quote_id'];
    if (!$qid) { $last = db_row('SELECT id FROM quotes WHERE job_id = ? ORDER BY id DESC LIMIT 1', 'i', $id); $qid = $last ? (int)$last['id'] : 0; }
    $q = $qid ? $quoteFor($qid) : null;
    if (!$q) fail('No quote for this job', 404);
    $out['number'] = $q['number'];
    $out['quote'] = $q;
  } elseif ($doc === 'invoice') {
    $out['number'] = 'INV-' . $job['code'];
    $q = $job['quote_id'] ? $quoteFor($job['quote_id']) : null;
    $out['lines'] = $q ? $q['items'] : [[
      'description' => $job['description'] ?: ucfirst($job['garment_type']), 'garment_type' => $job['garment_type'],
      'qty' => (string)$job['quantity'], 'unit_price' => null, 'line_total' => $job['price'],
    ]];
    $out['quote_number'] = $q['number'] ?? null;
    $out['entries'] = $entries;
  } else {
    $entry = null;
    foreach ($entries as $e) if ($e['id'] === $ref) $entry = $e;
    if (!$entry) fail('Payment not found on this job (ref=payment id)', 404);
    $entry['reversed'] = $entry['reversed_by_id'] !== null;
    $out['number'] = 'RCT-' . $entry['id'];
    $out['entry'] = $entry;
  }
  json($out);
}

/* ---- DELIVERY AND COLLECTION -------------------------------------------- */

/* GET ?action=handovers&id=N */
if ($action === 'handovers' && method() === 'GET') {
  if (!db_row('SELECT id FROM tailoring_orders WHERE id = ? AND deleted_at IS NULL', 'i', $id)) fail('Order not found', 404);
  json(array_map(fn($h) => handover_view($h, $isOwner), db_rows('SELECT * FROM job_handovers WHERE job_id = ? ORDER BY id', 'i', $id)));
}

/* POST ?action=handover_save&id=N   {hid?, method, status?, planned_for, quantity, address, courier,
 *                                     contact_name, contact_phone, tracking_url, request_key}
 * Creates (request_key required) or updates a planned or dispatched handover. */
if ($action === 'handover_save' && method() === 'POST') {
  $b = body();
  $hid = in_int($b, 'hid');
  $method = in_str($b, 'method');
  if (!in_array($method, ['collection', 'delivery'], true)) fail('Method must be collection or delivery');
  $status = in_str($b, 'status', 'planned');
  if (!in_array($status, ['planned', 'dispatched', 'failed', 'cancelled'], true)) fail('Status must be planned, dispatched, failed or cancelled (use handover_complete to complete)');
  $planned = null;
  if (!empty($b['planned_for'])) { $planned = lagos_local_to_utc($b['planned_for']); if ($planned === null) fail('Invalid planned_for (use YYYY-MM-DDTHH:MM, Lagos time)'); }
  $qty = filter_var($b['quantity'] ?? 1, FILTER_VALIDATE_INT);
  if ($qty === false || $qty < 1) fail('Quantity must be a whole number from 1');
  $url = trim(in_str($b, 'tracking_url'));
  if ($url !== '' && (!sanitize_url_ok($url, false) || stripos($url, 'https://') !== 0)) fail('Tracking link must start with https://');
  $txt = fn($k, $max) => mb_substr(trim(in_str($b, $k)), 0, $max) ?: null;
  $f = ['method' => $method, 'status' => $status, 'planned_for' => $planned, 'quantity' => $qty, 'address' => $txt('address', 2000),
        'courier' => $txt('courier', 80), 'contact_name' => $txt('contact_name', 120), 'contact_phone' => $txt('contact_phone', 40),
        'tracking_url' => $url ?: null];
  $key = $hid ? null : body_request_key($b);

  $outId = db_tx(function () use ($conn, $id, $hid, $f, $key, $user) {
    $job = job_lock($id);
    if (!$job) tx_fail('Order not found', 404);
    if (in_array($job['job_stage'], ['quote', 'cancelled', 'handed_over'], true)) tx_fail('This job cannot be handed over at stage ' . JOB_STAGE_LABELS[$job['job_stage']], 409);
    $remaining = max(1, (int)$job['quantity']) - (int)$job['handed_over_qty'];
    if ($f['status'] !== 'cancelled' && $f['quantity'] > $remaining) tx_fail("Only $remaining piece(s) are left to hand over", 409);
    if ($hid) {
      $h = db_row('SELECT * FROM job_handovers WHERE id = ? AND job_id = ? FOR UPDATE', 'ii', $hid, $id);
      if (!$h) tx_fail('Handover not found', 404);
      if (!in_array($h['status'], ['planned', 'dispatched', 'failed'], true)) tx_fail('A ' . $h['status'] . ' handover cannot be changed', 409);
      db_exec('UPDATE job_handovers SET method = ?, status = ?, planned_for = ?, quantity = ?, address = ?, courier = ?, contact_name = ?,
                      contact_phone = ?, tracking_url = ? WHERE id = ?', 'sssisssssi',
        $f['method'], $f['status'], $f['planned_for'], $f['quantity'], $f['address'], $f['courier'], $f['contact_name'], $f['contact_phone'], $f['tracking_url'], $hid);
      return $hid;
    }
    if ($ex = db_row('SELECT id FROM job_handovers WHERE request_key = ?', 's', $key)) return (int)$ex['id'];
    db_exec('INSERT INTO job_handovers (job_id, method, status, planned_for, quantity, address, courier, contact_name, contact_phone, tracking_url, request_key, recorded_by)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', 'isssissssssi',
      $id, $f['method'], $f['status'], $f['planned_for'], $f['quantity'], $f['address'], $f['courier'], $f['contact_name'], $f['contact_phone'], $f['tracking_url'], $key, $user['id']);
    $newId = (int)$conn->insert_id;
    job_event($id, 'handover', $job['job_stage'], ucfirst($f['method']) . ' planned for ' . $f['quantity'] . ' piece(s)', ['handover_id' => $newId], 0, $user['id']);
    return $newId;
  });
  audit($user['id'], 'tailoring_handover_save', 'tailoring_order', $id, ['handover_id' => $outId, 'status' => $status]);
  json(handover_view(db_row('SELECT * FROM job_handovers WHERE id = ?', 'i', $outId), $isOwner), $hid ? 200 : 201);
}

/* POST ?action=handover_complete&id=N&hid=H  {received_by, evidence_note, checklist:{...}} */
if ($action === 'handover_complete' && method() === 'POST') {
  $b = body();
  $hid = isset($_GET['hid']) ? in_int($_GET, 'hid') : in_int($b, 'hid');
  $res = db_tx(function () use ($id, $hid, $b, $user) {
    $job = job_lock($id);
    if (!$job) tx_fail('Order not found', 404);
    $h = db_row('SELECT * FROM job_handovers WHERE id = ? AND job_id = ? FOR UPDATE', 'ii', $hid, $id);
    if (!$h) tx_fail('Handover not found', 404);
    if ($h['status'] === 'completed') return ['already' => true];
    if ($h['status'] === 'cancelled') tx_fail('This handover was cancelled', 409);
    $remaining = max(1, (int)$job['quantity']) - (int)$job['handed_over_qty'];
    if ((int)$h['quantity'] > $remaining) tx_fail("Only $remaining piece(s) are left to hand over", 409);
    [$done, $qty, $stage, $bal] = handover_complete_tx($job, $hid, $b, $user);
    return ['already' => false, 'balance' => $bal];
  });
  $j = db_row('SELECT job_stage, quantity, handed_over_qty, lock_version FROM tailoring_orders WHERE id = ?', 'i', $id);
  if (!$res['already']) audit($user['id'], 'tailoring_handover_complete', 'tailoring_order', $id, ['handover_id' => $hid]);
  $out = ['handover' => handover_view(db_row('SELECT * FROM job_handovers WHERE id = ?', 'i', $hid), $isOwner),
          'job_stage' => $j['job_stage'], 'handed_over_qty' => (int)$j['handed_over_qty'], 'quantity' => (int)$j['quantity'],
          'progress' => (int)$j['handed_over_qty'] . ' of ' . (int)$j['quantity'] . ' handed over', 'lock_version' => (int)$j['lock_version'],
          'already_completed' => $res['already']];
  if ($isOwner && !$res['already'] && $res['balance'] > 0) $out['warning'] = 'Handed over with ₦' . number_format(intdiv($res['balance'], 100)) . ' still to pay';
  json($out);
}

/* ---- COSTS (per-project profitability) ----------------------------------- */
if ($action === 'costs' && method() === 'POST') {
  if (!$isOwner) fail('Forbidden', 403);
  $b = body();
  $fabricCost = in_num($b, 'fabric_cost', 0);
  $labourCost = in_num($b, 'labour_cost', 0);
  db_exec('UPDATE tailoring_orders SET fabric_cost = ?, labour_cost = ?, lock_version = lock_version + 1 WHERE id = ? AND deleted_at IS NULL',
    'ddi', $fabricCost, $labourCost, $id);
  audit($user['id'], 'tailoring_costs', 'tailoring_order', $id, ['fabric' => $fabricCost, 'labour' => $labourCost]);
  json(['ok' => true, 'fabric_cost' => $fabricCost, 'labour_cost' => $labourCost]);
}

/* ---- FITTING DATE -------------------------------------------------------- */
if ($action === 'fitting' && method() === 'POST') {
  $b = body();
  $date = $b['fitting_date'] ?? null;
  if ($date === '') $date = null;
  if ($date !== null && ymd_or_null($date) === null) fail('Invalid fitting date');
  $job = db_row('SELECT id, customer_id FROM tailoring_orders WHERE id = ? AND deleted_at IS NULL', 'i', $id);
  if (!$job) fail('Order not found', 404);
  db_exec('UPDATE tailoring_orders SET fitting_date = ?, lock_version = lock_version + 1 WHERE id = ? AND deleted_at IS NULL', 'si', $date, $id);
  // Phase 3: the date also lives as an all-day fitting appointment (it never
  // blocks timed slots). Moving the date moves that appointment, with history;
  // clearing it cancels it. Timed fittings are booked in Appointments.
  $apptId = null;
  if (has_table('appointments')) {
    $ex = db_row("SELECT id FROM appointments WHERE job_id = ? AND type = 'fitting' AND all_day = 1 AND status = 'confirmed' ORDER BY id DESC LIMIT 1", 'i', $id);
    $actor = ['type' => 'owner', 'id' => (int)$user['id']];
    if ($date === null) {
      if ($ex) appt_set_status((int)$ex['id'], 'cancelled', 'Fitting date cleared on the job', $actor);
    } elseif ($ex) {
      $apptId = (int)appt_reserve(['id' => (int)$ex['id'], 'type' => 'fitting', 'mode' => 'owner', 'all_day' => true, 'date' => $date,
        'reason' => 'Fitting date changed on the job'], $actor)['appointment']['id'];
    } else {
      $apptId = (int)appt_reserve(['type' => 'fitting', 'mode' => 'owner', 'source' => 'owner', 'status' => 'confirmed', 'all_day' => true,
        'date' => $date, 'job_id' => $id, 'customer_id' => (int)$job['customer_id'],
        'request_key' => 'fit-' . $id . '-' . bin2hex(random_bytes(8))], $actor)['appointment']['id'];
    }
  }
  audit($user['id'], 'tailoring_fitting', 'tailoring_order', $id, ['fitting_date' => $date]);
  json(['ok' => true, 'fitting_date' => $date, 'appointment_id' => $apptId]);
}

/* ---- REMIND (WhatsApp fitting / balance nudge) --------------------------- */
if ($action === 'remind' && method() === 'POST') {
  $b = body();
  $kind = $b['kind'] ?? 'fitting';            // 'fitting' | 'balance' | 'custom'
  if ($kind === 'balance' && !$isOwner) fail('Forbidden', 403);
  $custom = trim(in_str($b, 'message'));

  $o = db_row('SELECT o.code, o.price, o.paid_total, o.fitting_date, o.customer_id, c.name AS customer_name, c.phone AS customer_phone
                 FROM tailoring_orders o JOIN customers c ON c.id = o.customer_id
                WHERE o.id = ? AND o.deleted_at IS NULL', 'i', $id);
  if (!$o) fail('Order not found', 404);
  if (trim((string)$o['customer_phone']) === '') fail('No phone on file for this customer');

  $first = explode(' ', trim($o['customer_name']))[0] ?: 'there';
  $balanceMinor = max(0, decimal_to_minor($o['price']) - decimal_to_minor($o['paid_total']));
  if ($custom !== '') {
    $msg = $custom;
  } elseif ($kind === 'balance') {
    $msg = "Hi {$first}, a quick note on your Herit Clothing order {$o['code']}: a balance of ₦" . number_format(intdiv($balanceMinor, 100)) . " remains. Reply here to settle it. Thank you!";
  } else {
    $when = $o['fitting_date'] ? (' on ' . $o['fitting_date']) : ' soon';
    $msg = "Hi {$first}, your fitting for order {$o['code']} is scheduled{$when}. Please let us know if that still works for you. Herit Clothing";
  }

  $res = wa_dispatch($o['customer_phone'], $msg, $o['customer_id'] ? (int)$o['customer_id'] : null, 'tailoring_reminder', $user['id']);
  audit($user['id'], 'tailoring_remind', 'tailoring_order', $id, ['kind' => $kind, 'status' => $res['status']]);
  json($res);
}

/* ---- ASO-EBI / GROUP ORDERS ---------------------------------------------- */
if ($action === 'group_list' && method() === 'GET') {
  $rows = db_rows(
    "SELECT g.id, g.code, g.organiser_name, g.event, g.due_date, g.discount_pct,
            COUNT(o.id) AS members, COALESCE(SUM(o.price),0) AS total
       FROM tailoring_groups g
  LEFT JOIN tailoring_orders o ON o.group_id = g.id AND o.deleted_at IS NULL
      WHERE g.deleted_at IS NULL
   GROUP BY g.id ORDER BY g.id DESC");
  if (!$isOwner) foreach ($rows as &$r) { unset($r['total'], $r['discount_pct']); }
  json($rows);
}

if ($action === 'group_get' && method() === 'GET') {
  $g = db_row('SELECT * FROM tailoring_groups WHERE id = ? AND deleted_at IS NULL', 'i', $id);
  if (!$g) fail('Group not found', 404);
  $members = db_rows(
    "SELECT o.id, o.code, o.garment_type, o.fabric, o.stage, o.job_stage, o.price, o.deposit, o.paid_total, o.payment_state,
            o.due_date, c.name AS customer_name, c.phone AS customer_phone, t.name AS tailor_name
       FROM tailoring_orders o JOIN customers c ON c.id = o.customer_id
  LEFT JOIN users t ON t.id = o.assigned_tailor_id
      WHERE o.group_id = ? AND o.deleted_at IS NULL ORDER BY o.id ASC", 'i', $id);
  $g['members'] = array_map(fn($m) => job_view($m, $isOwner), $members);
  if (!$isOwner) unset($g['discount_pct']);
  json($g);
}

/* Each member needs customer_id, or name + phone with confirm_new when the phone
 * or email matches an existing client. Every member is checked BEFORE anything is
 * written, so a 409 never leaves half a group behind.                          */
if ($action === 'group_create' && method() === 'POST') {
  $b = body();
  $organiser = trim(in_str($b, 'organiser'));
  $orgPhone = trim(in_str($b, 'phone'));
  $event = trim(in_str($b, 'event'));
  $dueDate = ymd_or_null($b['due_date'] ?? '');
  $discount = max(0, min(100, in_num($b, 'discount_pct', 0)));
  $notes = trim(in_str($b, 'notes'));
  $members = is_array($b['members'] ?? null) ? $b['members'] : [];
  if ($organiser === '') fail('Organiser name is required');
  if (!$members) fail('Add at least one member');

  foreach ($members as $i => $m) {
    in_text_only($m, ['name', 'phone', 'email', 'fabric', 'garment_type']);
    in_int($m, 'customer_id');
    if (trim(in_str($m, 'name')) === '' || !empty($m['customer_id']) || !empty($m['confirm_new'])) continue;
    $cands = customer_candidates(in_str($m, 'phone'), in_str($m, 'email'));
    if ($cands) json(['error' => 'Member ' . ($i + 1) . ' (' . trim($m['name']) . ') matches an existing client. Pick one or confirm new.',
                      'member_index' => $i, 'candidates' => $cands], 409);
  }

  [$groupId, $gcode, $made] = db_tx(function () use ($conn, $organiser, $orgPhone, $event, $dueDate, $discount, $notes, $members, $GARMENTS, $isOwner, $user) {
    $stmt = $conn->prepare('INSERT INTO tailoring_groups (code, organiser_name, organiser_phone, event, due_date, discount_pct, notes, created_by) VALUES (?,?,?,?,?,?,?,?)');
    [$groupId, $gcode] = insert_with_code('tailoring_groups', 'HCG', function ($gcode) use ($conn, $stmt, $organiser, $orgPhone, $event, $dueDate, $discount, $notes, $user) {
      $stmt->bind_param('sssssdsi', $gcode, $organiser, $orgPhone, $event, $dueDate, $discount, $notes, $user['id']);
      $stmt->execute();
      return $conn->insert_id;
    });
    $made = 0;
    foreach ($members as $m) {
      $mname = trim($m['name'] ?? '');
      if ($mname === '') continue;
      [$customerId] = resolve_client(['id' => $m['customer_id'] ?? null, 'name' => $mname, 'phone' => trim($m['phone'] ?? ''),
                                      'email' => trim($m['email'] ?? ''), 'confirm_new' => true], $user['id'], true);
      $priceMinor = $isOwner ? (money_to_minor($m['price'] ?? 0) ?? 0) : 0;
      $priceMinor = (int)round($priceMinor * (1 - $discount / 100));
      $meas = (isset($m['measurements']) && is_array($m['measurements']) && $m['measurements']) ? json_encode($m['measurements']) : null;
      [$oid] = job_insert([
        'customer_id' => $customerId, 'group_id' => $groupId,
        'garment_type' => in_array($m['garment_type'] ?? '', $GARMENTS, true) ? $m['garment_type'] : 'other',
        'fabric' => trim($m['fabric'] ?? '') ?: null, 'measurements' => $meas,
        'notes' => 'Aso-ebi ' . $gcode . ($event !== '' ? ' · ' . $event : ''),
        'job_stage' => 'confirmed', 'price' => minor_to_decimal($priceMinor), 'due_date' => $dueDate,
      ], $user['id']);
      job_event($oid, 'stage', 'confirmed', 'Added to group ' . $gcode, ['to' => 'confirmed'], 1, $user['id']);
      $made++;
    }
    return [$groupId, $gcode, $made];
  });

  audit($user['id'], 'tailoring_group_create', 'tailoring_group', $groupId, ['code' => $gcode, 'members' => $made]);
  json(['id' => $groupId, 'code' => $gcode, 'members' => $made], 201);
}

fail('Unknown action', 404);
