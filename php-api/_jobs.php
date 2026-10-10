<?php
/**
 * HeritOS: shared database helpers for Phase 2 (jobs, clients, measurement sets,
 * the payment ledger). Requires _lib.php to have run first ($conn, json, fail).
 *
 * Convention: functions ending in _tx do not open or close a transaction; the
 * caller wraps them in begin_transaction()/commit() and holds the job lock.
 * New DATETIME columns are written with UTC_TIMESTAMP() and hold UTC.
 */
require_once __DIR__ . '/_domain.php';

/* ---- Small query helpers -------------------------------------------------- */

/** Prepare, bind and execute. Returns the statement. */
function db_exec($sql, $types = '', ...$args) {
  global $conn;
  $stmt = $conn->prepare($sql);
  if ($types !== '') $stmt->bind_param($types, ...$args);
  $stmt->execute();
  return $stmt;
}

function db_row($sql, $types = '', ...$args) {
  return db_exec($sql, $types, ...$args)->get_result()->fetch_assoc() ?: null;
}

function db_rows($sql, $types = '', ...$args) {
  $res = db_exec($sql, $types, ...$args)->get_result();
  $out = [];
  while ($r = $res->fetch_assoc()) $out[] = $r;
  return $out;
}

/** Run $fn inside a transaction; roll back and rethrow on any error. */
function db_tx(callable $fn) {
  global $conn;
  $conn->begin_transaction();
  try {
    $out = $fn();
    $conn->commit();
    return $out;
  } catch (Throwable $e) {
    $conn->rollback();
    throw $e;
  }
}

/** Respond with an error from inside db_tx: roll back first, then fail(). */
function tx_fail($msg, $code = 400, $extra = []) {
  global $conn;
  try { $conn->rollback(); } catch (Throwable $e) { /* nothing open */ }
  json(array_merge(['error' => $msg], $extra), $code);
}

/** The request key from a body, validated; generates one when $generate is set. */
function body_request_key(array $b, $generate = false) {
  $k = $b['request_key'] ?? null;
  if ($k === null || $k === '') {
    if ($generate) return 'srv-' . bin2hex(random_bytes(12));
    fail('A request key is required (request_key)');
  }
  if (!request_key_ok($k)) fail('Invalid request key');
  return $k;
}

/* ---- Settings ------------------------------------------------------------- */

function setting_get($key, $default = null) {
  static $cache = [];
  if (!array_key_exists($key, $cache)) {
    $r = db_row('SELECT svalue FROM settings WHERE skey = ?', 's', $key);
    $cache[$key] = $r ? $r['svalue'] : null;
  }
  $v = $cache[$key];
  return ($v === null || $v === '') ? $default : $v;
}

/** Methods that count as verified the moment they are recorded (default: cash only). */
function verified_methods() {
  $v = json_decode((string)setting_get('payment_verified_methods', '["cash"]'), true);
  return is_array($v) ? array_values(array_intersect($v, PAYMENT_METHODS)) : ['cash'];
}

/* ---- Jobs ----------------------------------------------------------------- */

/**
 * A job's stage. A row written by the pre-Phase-2 code after schema_phase18.sql
 * was imported has job_stage NULL until the migration is re-run; read it through
 * the legacy mapping meanwhile.
 */
function job_stage_of(array $row) {
  if (!empty($row['job_stage'])) return $row['job_stage'];
  return job_stage_from_legacy($row['stage'] ?? '')[0] ?? 'confirmed';
}

/** Lock and return a live job row (SELECT ... FOR UPDATE), or null. job_stage is never null in the result. */
function job_lock($id) {
  $row = db_row('SELECT * FROM tailoring_orders WHERE id = ? AND deleted_at IS NULL FOR UPDATE', 'i', (int)$id);
  if ($row) $row['job_stage'] = job_stage_of($row);
  return $row;
}

/** Append a timeline event. $stage defaults to the job's current job_stage. */
function job_event($jobId, $kind, $stage, $note, $meta = null, $public = 0, $userId = null) {
  if ($stage === null) {
    $r = db_row('SELECT COALESCE(job_stage, stage) AS s FROM tailoring_orders WHERE id = ?', 'i', (int)$jobId);
    $stage = $r ? $r['s'] : '';
  }
  $m = $meta === null ? null : json_encode($meta, JSON_UNESCAPED_UNICODE);
  $note = mb_substr((string)$note, 0, 255);
  db_exec('INSERT INTO tailoring_events (order_id, stage, note, user_id, kind, meta, public) VALUES (?,?,?,?,?,?,?)',
    'ississi', (int)$jobId, $stage, $note, $userId, $kind, $m, (int)$public);
}

/** All ledger rows for a job, oldest first. */
function job_ledger($jobId) {
  return db_rows(
    'SELECT p.id, p.job_id, p.kind, p.amount, p.currency, p.method, p.external_ref, p.received_on, p.verified,
            p.verified_at, p.reverses_id, p.note, p.created_at, u.name AS recorded_by_name, v.name AS verified_by_name,
            (SELECT r.id FROM job_payments r WHERE r.reverses_id = p.id) AS reversed_by_id
       FROM job_payments p
  LEFT JOIN users u ON u.id = p.recorded_by
  LEFT JOIN users v ON v.id = p.verified_by
      WHERE p.job_id = ? ORDER BY p.id', 'i', (int)$jobId);
}

/** Ledger totals for a job given its price (decimal string). Minor units. */
function job_money($jobId, $price) {
  return ledger_totals(job_ledger($jobId), decimal_to_minor($price));
}

/** Money block for API responses (decimal strings), from ledger totals. */
function money_view(array $t, $price, $state) {
  return [
    'price' => minor_to_decimal(decimal_to_minor($price)),
    'paid_verified' => minor_to_decimal($t['net_verified']),
    'received' => minor_to_decimal($t['received']),
    'refunded' => minor_to_decimal($t['refunded']),
    'awaiting_verification' => minor_to_decimal($t['unverified']),
    'balance' => minor_to_decimal($t['balance']),
    'credit' => minor_to_decimal($t['credit']),
    'payment_state' => $state,
  ];
}

/**
 * Recompute a job's cached money fields from the ledger: paid_total (verified,
 * net of reversals and refunds), deposit (legacy mirror, NOT capped at the price)
 * and payment_state. Call under the job lock. Returns the totals.
 */
function job_recalc_money($jobId) {
  $job = db_row('SELECT price FROM tailoring_orders WHERE id = ?', 'i', (int)$jobId);
  if (!$job) return null;
  $t = job_money($jobId, $job['price']);
  $state = payment_state(decimal_to_minor($job['price']), $t['net_verified'], $t['refunded']);
  $paid = minor_to_decimal($t['net_verified']);
  db_exec('UPDATE tailoring_orders SET paid_total = ?, deposit = ?, payment_state = ? WHERE id = ?',
    'sssi', $paid, $paid, $state, (int)$jobId);
  $t['payment_state'] = $state;
  return $t;
}

/** Remove money fields from a job row for roles that never see money (tailor). */
function job_strip_money(array $row) {
  foreach (['price', 'deposit', 'paid_total', 'payment_state', 'fabric_cost', 'labour_cost', 'quote_id', 'money', 'ledger', 'quotes', 'balance'] as $k) {
    unset($row[$k]);
  }
  return $row;
}

/**
 * Change a job's stage under the lock, writing the legacy stage too (dual-write
 * for one release) and a timeline event. Validates transitions unless $force.
 * Returns the new stage. Caller holds the transaction.
 */
function job_set_stage_tx(array $job, $to, $userId, $note = '', $meta = null) {
  $legacy = job_stage_to_legacy($to);
  $from = $job['job_stage'];
  db_exec('UPDATE tailoring_orders SET job_stage = ?, stage = ?, stage_review = 0, lock_version = lock_version + 1 WHERE id = ?',
    'ssi', $to, $legacy, (int)$job['id']);
  $meta = array_merge(['from' => $from, 'to' => $to], (array)$meta);
  job_event($job['id'], 'stage', $to, $note !== '' ? $note : ('Stage: ' . (JOB_STAGE_LABELS[$to] ?? $to)), $meta, 1, $userId);
  return $to;
}

/** Insert a job (code HC-#### via insert_with_code, race-safe) plus a public_ref. Returns [id, code, public_ref]. */
function job_insert(array $f, $userId) {
  global $conn;
  $stage = $f['job_stage'] ?? 'quote';
  $legacy = job_stage_to_legacy($stage);
  $stmt = $conn->prepare(
    'INSERT INTO tailoring_orders
       (code, customer_id, group_id, garment_type, fabric, measurements, notes, assigned_tailor_id, stage, job_stage,
        price, deposit, due_date, event_date, quantity, description, fabric_source, enquiry_id, next_action, next_action_date, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,0,?,?,?,?,?,?,?,?,?)'
  );
  $customerId = (int)$f['customer_id'];
  $groupId = $f['group_id'] ?? null;
  $garment = $f['garment_type'] ?? 'other';
  $fabric = $f['fabric'] ?? null;
  $meas = $f['measurements'] ?? null;
  $notes = $f['notes'] ?? null;
  $tailor = $f['assigned_tailor_id'] ?? null;
  $price = $f['price'] ?? '0.00';
  $due = $f['due_date'] ?? null;
  $event = $f['event_date'] ?? null;
  $qty = max(1, (int)($f['quantity'] ?? 1));
  $desc = $f['description'] ?? null;
  $fsrc = $f['fabric_source'] ?? null;
  $enq = $f['enquiry_id'] ?? null;
  $na = $f['next_action'] ?? null;
  $nad = $f['next_action_date'] ?? null;
  [$id, $code] = insert_with_code('tailoring_orders', 'HC', function ($code) use (
    $conn, $stmt, $customerId, $groupId, $garment, $fabric, $meas, $notes, $tailor, $legacy, $stage, $price,
    $due, $event, $qty, $desc, $fsrc, $enq, $na, $nad, $userId
  ) {
    $stmt->bind_param('siissssisssssississi',
      $code, $customerId, $groupId, $garment, $fabric, $meas, $notes, $tailor, $legacy, $stage, $price,
      $due, $event, $qty, $desc, $fsrc, $enq, $na, $nad, $userId);
    $stmt->execute();
    return $conn->insert_id;
  });
  $ref = assign_public_ref('tailoring_orders', $id);
  return [$id, $code, $ref];
}

/* ---- Clients -------------------------------------------------------------- */

/**
 * Existing clients sharing this phone (last 9 digits) or email. Never merges;
 * the caller warns and lets the owner choose (BR-03). Up to 5 rows.
 */
function customer_candidates($phone, $email, $excludeId = 0) {
  $tail = phone_tail9($phone);
  $email = strtolower(trim((string)$email));
  if ($tail === '' && $email === '') return [];
  $rows = db_rows(
    "SELECT c.id, c.client_ref, c.name, c.phone, c.email,
            (SELECT COUNT(*) FROM tailoring_orders o WHERE o.customer_id = c.id AND o.deleted_at IS NULL) AS job_count
       FROM customers c
      WHERE c.deleted_at IS NULL AND c.id <> ?
        AND ((? <> '' AND c.phone_tail9 = ?) OR (? <> '' AND LOWER(c.email) = ?))
   ORDER BY c.id LIMIT 5",
    'issss', (int)$excludeId, $tail, $tail, $email, $email);
  return array_map(function ($r) {
    return ['id' => (int)$r['id'], 'client_ref' => $r['client_ref'], 'name' => $r['name'],
            'phone_masked' => phone_masked($r['phone']), 'email' => $r['email'], 'job_count' => (int)$r['job_count']];
  }, $rows);
}

/** Insert a client and set client_ref and phone_tail9. Returns the id. */
function customer_insert(array $c, $userId = null) {
  global $conn;
  $name = $c['name']; $phone = $c['phone'] ?? ''; $email = $c['email'] ?? '';
  $notes = $c['notes'] ?? null; $tags = $c['tags'] ?? null; $segment = $c['segment'] ?? null;
  $meas = $c['measurements'] ?? null;
  $company = $c['company_name'] ?? null;
  $pref = in_array($c['preferred_contact'] ?? '', ['whatsapp', 'phone', 'email'], true) ? $c['preferred_contact'] : null;
  $comm = $c['comm_notes'] ?? null;
  $tail = phone_tail9($phone) ?: null;
  db_exec('INSERT INTO customers (name, phone, email, notes, tags, segment, measurements, phone_tail9, company_name, preferred_contact, comm_notes)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)', 'sssssssssss',
    $name, $phone, $email, $notes, $tags, $segment, $meas, $tail, $company, $pref, $comm);
  $id = (int)$conn->insert_id;
  $ref = client_ref_from_id($id);
  db_exec('UPDATE customers SET client_ref = ? WHERE id = ?', 'si', $ref, $id);
  return $id;
}

/**
 * Resolve the client for a new job or conversion without silent merging:
 *   ['id' => N]                         use that client
 *   ['name', 'phone', 'email', 'confirm_new' => true]  create a new client
 * When a phone or email matches and neither id nor confirm_new is given, answers
 * 409 {error, candidates}. Returns [customer_id, created(bool)].
 */
function resolve_client(array $c, $userId, $inTx = false) {
  if (!empty($c['id'])) {
    $row = db_row('SELECT id FROM customers WHERE id = ? AND deleted_at IS NULL', 'i', (int)$c['id']);
    if (!$row) $inTx ? tx_fail('Client not found', 404) : fail('Client not found', 404);
    return [(int)$row['id'], false];
  }
  $name = trim((string)($c['name'] ?? ''));
  if ($name === '') $inTx ? tx_fail('Client name is required') : fail('Client name is required');
  $phone = trim((string)($c['phone'] ?? ''));
  $email = trim((string)($c['email'] ?? ''));
  if (empty($c['confirm_new'])) {
    $cands = customer_candidates($phone, $email);
    if ($cands) {
      $msg = 'A client with this phone or email already exists. Pick one, or confirm this is a new client.';
      $inTx ? tx_fail($msg, 409, ['candidates' => $cands]) : json(['error' => $msg, 'candidates' => $cands], 409);
    }
  }
  return [customer_insert($c + ['name' => $name, 'phone' => $phone, 'email' => $email], $userId), true];
}

/* ---- Measurement sets ----------------------------------------------------- */

function measurement_template($tkey) {
  $t = db_row('SELECT * FROM measurement_templates WHERE tkey = ?', 's', $tkey);
  if ($t) $t['fields'] = json_decode($t['fields'], true) ?: [];
  return $t;
}

/** Decode a set row for output. */
function measurement_set_view(array $s) {
  $s['vals'] = json_decode((string)$s['vals'], true) ?: (object)[];
  foreach (['id', 'customer_id', 'supersedes_id', 'approved_by', 'created_by'] as $k) {
    if (isset($s[$k])) $s[$k] = (int)$s[$k];
  }
  return $s;
}

/**
 * Approve a set: lock the client row, supersede the previous approved set for
 * the same client and template, then approve this one. Caller holds the tx.
 */
function measurement_approve_tx($setId, $customerId, $templateKey, $userId) {
  db_exec('SELECT id FROM customers WHERE id = ? FOR UPDATE', 'i', (int)$customerId)->get_result();
  $prev = db_row("SELECT id FROM measurement_sets WHERE customer_id = ? AND template_key = ? AND status = 'approved' AND id <> ? ORDER BY id DESC LIMIT 1",
    'isi', (int)$customerId, $templateKey, (int)$setId);
  db_exec("UPDATE measurement_sets SET status = 'superseded' WHERE customer_id = ? AND template_key = ? AND status = 'approved' AND id <> ?",
    'isi', (int)$customerId, $templateKey, (int)$setId);
  db_exec("UPDATE measurement_sets SET status = 'approved', approved_by = ?, approved_at = UTC_TIMESTAMP(),
                  supersedes_id = COALESCE(supersedes_id, ?) WHERE id = ?",
    'iii', $userId, $prev ? (int)$prev['id'] : null, (int)$setId);
}

/**
 * Create a measurement set. Values are cleaned against the template; errors
 * answer 400 with {errors}. Owner roles create it approved (superseding the
 * previous approved set), other roles and customers create it pending. A
 * repeated request_key returns the existing set with duplicate:true.
 * $d: customer_id, template_key, unit, vals, fit_preference, notes, taken_at,
 *     request_key, source ('owner'|'customer'), approve (bool).
 * Returns ['set' => row, 'warnings' => [], 'duplicate' => bool].
 */
function measurement_create(array $d, $userId) {
  global $conn;
  $key = $d['request_key'] ?? null;
  if ($key !== null) {
    $ex = db_row('SELECT * FROM measurement_sets WHERE request_key = ?', 's', $key);
    if ($ex) return ['set' => measurement_set_view($ex), 'warnings' => [], 'duplicate' => true];
  }
  $tpl = measurement_template($d['template_key'] ?? '');
  if (!$tpl || (!(int)$tpl['active'] && $tpl['tkey'] !== 'legacy')) fail('Unknown measurement template');
  $unit = $d['unit'] ?? '';
  $allowUnknown = ($d['source'] ?? '') === 'customer' ? false : !empty($d['allow_unknown_unit']);
  if (!in_array($unit, MEASUREMENT_UNITS, true) && !($allowUnknown && $unit === 'unknown')) fail('Choose cm or inches');
  $r = measurement_clean($tpl['fields'], is_array($d['vals'] ?? null) ? $d['vals'] : [], $unit);
  if ($r['errors']) json(['error' => 'Some measurements need fixing', 'errors' => $r['errors']], 400);
  if (!$r['clean']) fail('Enter at least one measurement');
  $fit = in_array($d['fit_preference'] ?? '', ['slim', 'regular', 'relaxed'], true) ? $d['fit_preference'] : null;
  $notes = isset($d['notes']) ? mb_substr(trim((string)$d['notes']), 0, 500) : null;
  $taken = ymd_or_null($d['taken_at'] ?? '') ?? lagos_today();
  $source = in_array($d['source'] ?? '', ['owner', 'customer'], true) ? $d['source'] : 'owner';
  $approve = !empty($d['approve']);
  $vals = json_encode($r['clean']);
  $cid = (int)$d['customer_id'];

  try {
    $id = db_tx(function () use ($conn, $cid, $tpl, $unit, $vals, $fit, $notes, $source, $taken, $userId, $key, $approve) {
      if (!db_row('SELECT id FROM customers WHERE id = ? AND deleted_at IS NULL FOR UPDATE', 'i', $cid)) tx_fail('Client not found', 404);
      db_exec("INSERT INTO measurement_sets (customer_id, template_key, unit, vals, fit_preference, notes, source, status, taken_at, created_by, request_key)
               VALUES (?,?,?,?,?,?,?, 'pending', ?,?,?)", 'isssssssis',
        $cid, $tpl['tkey'], $unit, $vals, $fit, $notes, $source, $taken, $userId, $key);
      $id = (int)$conn->insert_id;
      if ($approve) measurement_approve_tx($id, $cid, $tpl['tkey'], $userId);
      return $id;
    });
  } catch (mysqli_sql_exception $e) {
    if (!is_duplicate_key($e) || $key === null) throw $e;
    $ex = db_row('SELECT * FROM measurement_sets WHERE request_key = ?', 's', $key);
    return ['set' => measurement_set_view($ex), 'warnings' => [], 'duplicate' => true];
  }
  $set = db_row('SELECT * FROM measurement_sets WHERE id = ?', 'i', $id);
  return ['set' => measurement_set_view($set), 'warnings' => $r['warnings'], 'duplicate' => false];
}

/**
 * Freeze an approved set onto a job (BR-06). Caller holds the job lock and tx.
 * At in_production or later a reason is required and the event records the old
 * and new set ids.
 */
function job_attach_snapshot_tx(array $job, array $set, $userId, $reason = '') {
  if ($set['status'] !== 'approved') tx_fail('Only an approved measurement set can be used on a job');
  if ((int)$set['customer_id'] !== (int)$job['customer_id']) tx_fail('That measurement set belongs to another client');
  $late = in_array($job['job_stage'], JOB_STAGES_PRODUCTION_ON, true);
  if ($late && mb_strlen(trim((string)$reason)) < 5) tx_fail('Production has started: give a reason (at least 5 characters) for changing measurements');
  $tpl = measurement_template($set['template_key']);
  $snap = [
    'set_id' => (int)$set['id'], 'template_key' => $set['template_key'], 'label' => $tpl['label'] ?? $set['template_key'],
    'unit' => $set['unit'], 'vals' => is_array($set['vals']) ? $set['vals'] : (json_decode((string)$set['vals'], true) ?: []),
    'taken_at' => $set['taken_at'], 'approved_at' => $set['approved_at'], 'approved_by' => $set['approved_by'] !== null ? (int)$set['approved_by'] : null,
  ];
  $json = json_encode($snap, JSON_UNESCAPED_UNICODE);
  db_exec('UPDATE tailoring_orders SET measurement_set_id = ?, measurement_snapshot = ?, measurement_snapshot_at = UTC_TIMESTAMP(),
                  measurement_snapshot_by = ?, lock_version = lock_version + 1 WHERE id = ?',
    'isii', (int)$set['id'], $json, $userId, (int)$job['id']);
  job_event($job['id'], 'measurements', $job['job_stage'], 'Measurements attached: set #' . (int)$set['id']
    . ($late ? ' (reason: ' . trim((string)$reason) . ')' : ''),
    ['old_set_id' => $job['measurement_set_id'] !== null ? (int)$job['measurement_set_id'] : null, 'new_set_id' => (int)$set['id'], 'reason' => $reason ?: null],
    0, $userId);
  return $snap;
}

/* ---- Ledger --------------------------------------------------------------- */

/**
 * Insert one ledger row. Caller holds the job lock and transaction. A repeated
 * request_key returns the existing row with duplicate:true and writes nothing.
 * $e: kind, amount_minor (signed), method, external_ref, received_on, note,
 *     request_key, verified (0/1), reverses_id.
 */
function ledger_insert_tx($jobId, array $e, $userId) {
  global $conn;
  $ex = db_row('SELECT * FROM job_payments WHERE request_key = ?', 's', $e['request_key']);
  if ($ex) {
    if ((int)$ex['job_id'] !== (int)$jobId) tx_fail('That request key was already used for another job', 409);
    return [$ex, true];
  }
  $amount = minor_to_decimal($e['amount_minor']);
  $ver = (int)!empty($e['verified']);
  $method = $e['method'];
  $ref = isset($e['external_ref']) && trim((string)$e['external_ref']) !== '' ? mb_substr(trim((string)$e['external_ref']), 0, 120) : null;
  $on = ymd_or_null($e['received_on'] ?? '') ?? lagos_today();
  $note = isset($e['note']) && trim((string)$e['note']) !== '' ? mb_substr(trim((string)$e['note']), 0, 255) : null;
  $rev = $e['reverses_id'] ?? null;
  $vby = $ver ? $userId : null;
  try {
    db_exec('INSERT INTO job_payments (job_id, kind, amount, method, external_ref, received_on, verified, verified_by, verified_at,
                                       reverses_id, note, request_key, recorded_by)
             VALUES (?,?,?,?,?,?,?,?, IF(? = 1, UTC_TIMESTAMP(), NULL), ?,?,?,?)',
      'isssssiiiissi', (int)$jobId, $e['kind'], $amount, $method, $ref, $on, $ver, $vby, $ver, $rev, $note, $e['request_key'], $userId);
  } catch (mysqli_sql_exception $x) {
    if (!is_duplicate_key($x)) throw $x;
    // A racing request with the same key won, or a second reversal of the same entry.
    $ex = db_row('SELECT * FROM job_payments WHERE request_key = ?', 's', $e['request_key']);
    if ($ex) return [$ex, true];
    tx_fail('That entry has already been reversed', 409);
  }
  $row = db_row('SELECT * FROM job_payments WHERE id = ?', 'i', (int)$conn->insert_id);
  return [$row, false];
}

/** Ledger row shaped for output. */
function ledger_row_view(array $r) {
  foreach (['id', 'job_id', 'reverses_id', 'reversed_by_id', 'verified_by', 'recorded_by'] as $k) {
    if (array_key_exists($k, $r) && $r[$k] !== null) $r[$k] = (int)$r[$k];
  }
  $r['verified'] = (int)$r['verified'];
  $r['receipt_no'] = 'RCT-' . $r['id'];
  return $r;
}
