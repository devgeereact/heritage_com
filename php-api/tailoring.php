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
 *   POST ?action=confirm_review&id=N     {outcome: ready}
 *   POST ?action=assign|fitting|costs|remind&id=N   (unchanged contracts)
 *   GET  ?action=group_list | group_get&id=N, POST ?action=group_create
 *
 * Workshop roles only (owner roles plus tailor). Money (price, deposit, ledger,
 * costs) is owner-only: tailors never receive money fields. The legacy `stage`
 * column is written alongside job_stage for one release (dual-write).
 */
require __DIR__ . '/_lib.php';
require __DIR__ . '/_jobs.php';
cors();

$GARMENTS = ['agbada', 'kaftan', 'senator', 'suit', 'shirt', 'trouser', 'other'];
$FABRIC_SOURCES = ['client', 'herit', 'mixed'];

// K-01: employee was allowed here by the server but not by the app. Jobs are
// for workshop roles only, matching the approved permissions.
$user = require_auth(ROLES_WORKSHOP);
$isOwner = is_owner_role($user['role']);
$action = $_GET['action'] ?? 'list';
$id = (int)($_GET['id'] ?? 0);

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
    $v = trim((string)$b[$k]);
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
    $f['assigned_tailor_id'] = ($b['assigned_tailor_id'] === '' || $b['assigned_tailor_id'] === null) ? null : (int)$b['assigned_tailor_id'];
  }
  return $f;
}

const JOB_LIST_COLS = "o.id, o.code, o.public_ref, o.customer_id, o.group_id, o.garment_type, o.quantity, o.description, o.fabric,
       o.fabric_source, o.stage, o.job_stage, o.stage_review, o.price, o.deposit, o.paid_total, o.payment_state,
       o.fabric_cost, o.labour_cost, o.due_date, o.event_date, o.fitting_date, o.next_action, o.next_action_date,
       o.handed_over_qty, o.lock_version, o.notes, o.assigned_tailor_id, o.enquiry_id, o.quote_id,
       c.name AS customer_name, c.phone AS customer_phone, c.client_ref, t.name AS tailor_name";

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
  if ($isOwner) {
    $order['money'] = money_view(job_money($id, $order['price']), $order['price'], $order['payment_state']);
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
    if (isset($b['deposit']) && $b['deposit'] !== '' && (string)$b['deposit'] !== '0') {
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
    $r = legacy_measure_to_set($customerId, $b['measurements'], $b['unit'] ?? 'in', 'owner', is_owner_role($user['role']), $user['id']);
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

/** Legacy deposit at creation (replaced by a ledger entry once job_payments exists). */
function job_record_legacy_payment($orderId, $minor, array $b, $user, $note) {
  db_exec('UPDATE tailoring_orders SET deposit = ? WHERE id = ?', 'si', minor_to_decimal($minor), $orderId);
  return [];
}

/* ---- UPDATE (optimistic concurrency) ------------------------------------- */
/* Send the lock_version you loaded. If someone changed the job since, nothing is
 * written and the answer is 409 "Changed elsewhere, reload".                 */
if ($action === 'update' && method() === 'POST') {
  $b = body();
  if (!isset($b['lock_version']) || filter_var($b['lock_version'], FILTER_VALIDATE_INT) === false) fail('lock_version is required');
  $lv = (int)$b['lock_version'];
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
  $tailorId = isset($b['assigned_tailor_id']) && $b['assigned_tailor_id'] !== '' ? (int)$b['assigned_tailor_id'] : null;
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
  $want = (string)($b['stage'] ?? '');
  $note = mb_substr(trim((string)($b['note'] ?? '')), 0, 255);
  $force = !empty($b['force']);
  $reason = trim((string)($b['reason'] ?? ''));
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
  $outcome = (string)($b['outcome'] ?? '');
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

function job_review_outcomes() { return ['ready']; }

function job_review_apply_tx(array $job, $outcome, $user, array $b) {
  db_exec('UPDATE tailoring_orders SET stage_review = 0, lock_version = lock_version + 1 WHERE id = ?', 'i', (int)$job['id']);
  job_event($job['id'], 'review', $job['job_stage'], 'Owner confirmed: still ready, not yet collected', ['outcome' => $outcome], 0, $user['id']);
}

/* ---- ATTACH MEASUREMENTS (job snapshot, BR-06) --------------------------- */
/* {set_id, reason?}. The set must be approved and belong to the job's client.
 * From in_production onwards a reason of 5+ characters is required and the
 * event records the old and new set ids. Later profile changes never alter it. */
if ($action === 'attach_measurements' && method() === 'POST') {
  $b = body();
  $setId = (int)($b['set_id'] ?? 0);
  $reason = trim((string)($b['reason'] ?? ''));
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
  $r = legacy_measure_to_set((int)$job['customer_id'], $vals, $b['unit'] ?? 'in', 'owner', $isOwner, $user['id'], $key);
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

/* ---- RECORD PAYMENT (legacy) --------------------------------------------- */
if ($action === 'pay' && method() === 'POST') {
  if (!$isOwner) fail('Forbidden', 403);
  $b = body();
  $amount = (float)($b['amount'] ?? 0);
  if ($amount <= 0) fail('Amount must be positive');
  $conn->begin_transaction();
  try {
    $row = db_row('SELECT price, deposit FROM tailoring_orders WHERE id = ? AND deleted_at IS NULL FOR UPDATE', 'i', $id);
    if (!$row) { $conn->rollback(); fail('Order not found', 404); }
    $price = (float)$row['price'];
    $newDeposit = (float)$row['deposit'] + $amount;
    db_exec('UPDATE tailoring_orders SET deposit = ? WHERE id = ?', 'di', $newDeposit, $id);
    job_event($id, 'payment', null, 'Payment ₦' . number_format($amount) . ' recorded', ['money' => true], 0, $user['id']);
    $conn->commit();
  } catch (Throwable $e) { $conn->rollback(); throw $e; }
  audit($user['id'], 'tailoring_pay', 'tailoring_order', $id, ['amount' => $amount, 'deposit' => $newDeposit]);
  json(['ok' => true, 'deposit' => $newDeposit, 'balance' => max(0, $price - $newDeposit)]);
}

/* ---- COSTS (per-project profitability) ----------------------------------- */
if ($action === 'costs' && method() === 'POST') {
  if (!$isOwner) fail('Forbidden', 403);
  $b = body();
  $fabricCost = (float)($b['fabric_cost'] ?? 0);
  $labourCost = (float)($b['labour_cost'] ?? 0);
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
  db_exec('UPDATE tailoring_orders SET fitting_date = ?, lock_version = lock_version + 1 WHERE id = ? AND deleted_at IS NULL', 'si', $date, $id);
  audit($user['id'], 'tailoring_fitting', 'tailoring_order', $id, ['fitting_date' => $date]);
  json(['ok' => true, 'fitting_date' => $date]);
}

/* ---- REMIND (WhatsApp fitting / balance nudge) --------------------------- */
if ($action === 'remind' && method() === 'POST') {
  $b = body();
  $kind = $b['kind'] ?? 'fitting';            // 'fitting' | 'balance' | 'custom'
  if ($kind === 'balance' && !$isOwner) fail('Forbidden', 403);
  $custom = trim($b['message'] ?? '');

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
  $organiser = trim($b['organiser'] ?? '');
  $orgPhone = trim($b['phone'] ?? '');
  $event = trim($b['event'] ?? '');
  $dueDate = ymd_or_null($b['due_date'] ?? '');
  $discount = max(0, min(100, (float)($b['discount_pct'] ?? 0)));
  $notes = trim($b['notes'] ?? '');
  $members = is_array($b['members'] ?? null) ? $b['members'] : [];
  if ($organiser === '') fail('Organiser name is required');
  if (!$members) fail('Add at least one member');

  foreach ($members as $i => $m) {
    if (trim($m['name'] ?? '') === '' || !empty($m['customer_id']) || !empty($m['confirm_new'])) continue;
    $cands = customer_candidates($m['phone'] ?? '', $m['email'] ?? '');
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
