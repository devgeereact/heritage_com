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
/* Unread client messages and feedback to follow up. Today (count, per-job count and
 * items) and the menu badge (messages.php unread_count) all use these, so a message
 * or feedback on a deleted job, or with no job or client row, is in none of them
 * (K-07 L5). */
const UNREAD_MESSAGES_FROM = "FROM job_messages m JOIN tailoring_orders o ON o.id = m.job_id JOIN customers c ON c.id = m.customer_id
                WHERE m.author_type = 'customer' AND m.read_by_owner_at IS NULL AND o.deleted_at IS NULL";
const OPEN_FEEDBACK_FROM = "FROM job_feedback f JOIN tailoring_orders o ON o.id = f.job_id JOIN customers c ON c.id = f.customer_id
                WHERE f.follow_up = 'open' AND o.deleted_at IS NULL";

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

/**
 * Run $fn inside a transaction; roll back and rethrow on any error. A lost race
 * (deadlock or snapshot conflict, see is_tx_conflict) answers a plain 409 instead
 * of a 500. Defence in depth: callers still take their lock before any plain read
 * of the rows it protects, so a correct caller normally never reaches it.
 */
function db_tx(callable $fn) {
  global $conn;
  $conn->begin_transaction();
  try {
    $out = $fn();
    $conn->commit();
    return $out;
  } catch (Throwable $e) {
    $conn->rollback();
    if (is_tx_conflict($e)) fail(TX_CONFLICT_MESSAGE, 409);
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
  if (is_string($s['vals'])) $s['vals'] = json_decode($s['vals'], true) ?: (object)[];
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

/**
 * Wrap a value object from an old measurement form (inches, 'legacy' template)
 * into a measurement set without ever failing the caller's request: invalid or
 * empty input returns null plus the field errors. Owner roles get an approved
 * set; other roles and customers a pending one.
 * Returns ['set' => row|null, 'warnings' => [], 'errors' => [], 'duplicate' => bool].
 */
function legacy_measure_to_set($customerId, $vals, $unit, $source, $approve, $userId, $requestKey = null) {
  $tpl = measurement_template('legacy');
  if (!$tpl || !is_array($vals)) return ['set' => null, 'warnings' => [], 'errors' => [], 'duplicate' => false];
  $unit = in_array($unit, MEASUREMENT_UNITS, true) ? $unit : 'in';
  $chk = measurement_clean($tpl['fields'], $vals, $unit);
  if ($chk['errors'] || !$chk['clean']) return ['set' => null, 'warnings' => $chk['warnings'], 'errors' => $chk['errors'], 'duplicate' => false];
  $r = measurement_create([
    'customer_id' => $customerId, 'template_key' => 'legacy', 'unit' => $unit, 'vals' => $vals,
    'request_key' => $requestKey ?? ('legacy-' . bin2hex(random_bytes(12))), 'source' => $source, 'approve' => $approve,
    'notes' => 'Entered on the old measurement form',
  ], $userId);
  return $r + ['errors' => []];
}

/* ==== Phase 3 ============================================================== */

/** Does a table exist? Cached per request. Lets CI-deployed files run before a schema import. */
function has_table($table) {
  static $cache = [];
  if (!array_key_exists($table, $cache)) {
    $cache[$table] = (bool)db_row('SELECT 1 AS x FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1', 's', $table);
  }
  return $cache[$table];
}

/** A '0'/'1' setting as a boolean. */
function setting_flag($key, $default = false) {
  return (string)setting_get($key, $default ? '1' : '0') === '1';
}

/** Clean availability settings (empty until the owner fills them in). */
function availability_get() {
  $raw = json_decode((string)setting_get('availability', ''), true);
  return availability_clean(is_array($raw) ? $raw : [])['clean'];
}

/** A UTC DATETIME string from MySQL as Unix time. */
function utc_ts($s) { return $s === null ? null : strtotime($s . ' UTC'); }

/* ---- Appointments --------------------------------------------------------- */

function appt_event_tx($id, $fromStatus, $toStatus, $fromStart, $toStart, $reason, $actorType, $actorId = null) {
  db_exec('INSERT INTO appointment_events (appointment_id, from_status, to_status, from_starts_at, to_starts_at, reason, actor_type, actor_id)
           VALUES (?,?,?,?,?,?,?,?)', 'issssssi', (int)$id, $fromStatus, $toStatus, $fromStart, $toStart,
    $reason !== null ? mb_substr((string)$reason, 0, 255) : null, $actorType, $actorId);
}

/** Requested appointments whose hold has run out become 'expired' (lazy, under the booking lock). */
function appt_expire_holds_tx() {
  $rows = db_rows("SELECT id, starts_at FROM appointments WHERE status = 'requested' AND hold_expires_at IS NOT NULL AND hold_expires_at < UTC_TIMESTAMP() FOR UPDATE");
  foreach ($rows as $r) {
    db_exec("UPDATE appointments SET status = 'expired' WHERE id = ?", 'i', (int)$r['id']);
    appt_event_tx($r['id'], 'requested', 'expired', null, null, 'Request not confirmed before the hold ran out', 'system');
  }
  return count($rows);
}

/** Active timed reservations overlapping [from, to] (Unix), as [[start, end], ...]. */
function appt_busy($fromTs, $toTs, $excludeId = 0) {
  $rows = db_rows("SELECT starts_at, ends_at FROM appointments
                    WHERE all_day = 0 AND id <> ? AND starts_at < ? AND ends_at > ?
                      AND (status = 'confirmed' OR (status = 'requested' AND (hold_expires_at IS NULL OR hold_expires_at > UTC_TIMESTAMP())))",
    'iss', (int)$excludeId, utc_sql($toTs), utc_sql($fromTs));
  return array_map(fn($r) => [utc_ts($r['starts_at']), utc_ts($r['ends_at'])], $rows);
}

/** Blocked time overlapping [from, to] (Unix), as [[start, end], ...]. */
function appt_blocks($fromTs, $toTs) {
  $rows = db_rows('SELECT starts_at, ends_at FROM availability_blocks WHERE starts_at < ? AND ends_at > ?', 'ss', utc_sql($toTs), utc_sql($fromTs));
  return array_map(fn($r) => [utc_ts($r['starts_at']), utc_ts($r['ends_at'])], $rows);
}

/** Free slots for a type over Lagos dates [$fromDate, +$days). Empty when availability is not ready. */
function appt_free_slots($type, $fromDate, $days, $nowTs = null) {
  $a = availability_get();
  if (!availability_ready($a, $type)) return [];
  $now = $nowTs ?? time();
  $dur = (int)$a['durations'][$type] * 60;
  $buf = (int)$a['buffer_min'] * 60;
  $step = (int)($a['step_min'] ?? 15) * 60;
  $earliest = $now + (int)$a['min_notice_hours'] * 3600;
  $latest = $now + (int)$a['horizon_days'] * 86400;
  $from = lagos_midnight_ts($fromDate);
  if ($from === null) return [];
  $to = $from + (int)$days * 86400 + 7200;
  $busy = appt_busy($from - 86400, $to + 86400);
  $blocks = appt_blocks($from - 86400, $to + 86400);
  $out = [];
  for ($i = 0; $i < (int)$days; $i++) {
    $date = date_add_days($fromDate, $i);
    foreach (free_slots(slot_windows($a['weekly'], $date), $busy, $blocks, $dur, $buf, $step, $earliest, $latest) as [$s, $e]) {
      $out[] = ['start' => lagos_iso($s), 'end' => lagos_iso($e)];
    }
  }
  return $out;
}

const APPT_REASON_MESSAGES = [
  'not_configured' => 'Appointments cannot be requested yet.',
  'outside_hours' => 'That time is outside working hours.',
  'too_soon' => 'That time is too soon. Please choose a later time.',
  'too_far' => 'That time is too far ahead. Please choose an earlier date.',
  'blocked' => 'That time is not available.',
  'conflict' => 'That time is not available.',
];

/**
 * Reserve or move an appointment under the single booking lock (BR-12, BR-13).
 *   $d: id (reschedule) | request_key (create), type, start_ts or (all_day + date),
 *       duration_min (owner only), status ('confirmed' | 'requested'), source,
 *       customer_id, job_id, enquiry_id, contact_name/phone/email, notes_internal,
 *       client_note, override_reason (owner only), reason (reschedule), mode ('owner' | 'client').
 *   $actor: ['type' => 'owner'|'customer'|'system', 'id' => int|null]
 * Clients must hit a free slot exactly (422 for hours, notice or horizon; 409 for
 * a clash). The owner may book outside hours or over a clash only with an
 * override_reason, which is stored; min notice and horizon do not bind the owner.
 * All-day appointments never block timed slots and are not checked for clashes.
 * Returns ['appointment' => row, 'duplicate' => bool].
 */
function appt_reserve(array $d, array $actor) {
  global $conn;
  $isOwner = ($d['mode'] ?? 'owner') === 'owner';
  $id = (int)($d['id'] ?? 0);
  $key = $d['request_key'] ?? null;
  if (!$id && $key !== null) {
    $ex = db_row('SELECT * FROM appointments WHERE request_key = ?', 's', $key);
    if ($ex) return ['appointment' => $ex, 'duplicate' => true];
  }
  $a = availability_get();
  $type = $d['type'] ?? '';
  if (!in_array($type, APPOINTMENT_TYPES, true)) fail('Type must be consultation, fitting or collection');
  $allDay = $isOwner && !empty($d['all_day']);
  if ($allDay) {
    $start = lagos_midnight_ts($d['date'] ?? '');
    if ($start === null) fail('Give a date (YYYY-MM-DD) for an all-day appointment');
    $end = $start + 86400;
  } else {
    $start = $d['start_ts'] ?? null;
    if (!is_int($start)) fail('Give a start time');
    $durMin = $isOwner && !empty($d['duration_min']) ? (int)$d['duration_min'] : (int)($a['durations'][$type] ?? 0);
    if ($isOwner && !empty($d['duration_min']) && !in_array($durMin, APPOINTMENT_DURATIONS, true)) fail('Duration must be 30, 45 or 60 minutes');
    if ($durMin <= 0) fail($isOwner ? 'Choose a duration (30, 45 or 60 minutes), or set one in availability' : APPT_REASON_MESSAGES['not_configured'], $isOwner ? 400 : 422);
    $end = $start + $durMin * 60;
  }
  $buf = (int)($a['buffer_min'] ?? 0);
  $override = $isOwner ? trim((string)($d['override_reason'] ?? '')) : '';
  if (mb_strlen($override) > 255) fail('Override reason is too long');

  try {
    return db_tx(function () use ($conn, $d, $actor, $isOwner, $id, $key, $a, $type, $allDay, $start, $end, $buf, $override) {
      db_exec('SELECT id FROM booking_lock WHERE id = 1 FOR UPDATE')->get_result();
      db_exec('UPDATE booking_lock SET touched_at = UTC_TIMESTAMP() WHERE id = 1');
      appt_expire_holds_tx();
      $cur = null;
      if ($id) {
        $cur = db_row('SELECT * FROM appointments WHERE id = ? FOR UPDATE', 'i', $id);
        if (!$cur) tx_fail('Appointment not found', 404);
        if (!in_array($cur['status'], ['requested', 'confirmed'], true)) tx_fail('Only a requested or confirmed appointment can be moved (this one is ' . $cur['status'] . ')', 409);
      }
      $problems = [];
      if (!$allDay) {
        $busy = appt_busy($start - 86400, $end + 86400, $id);
        $blocks = appt_blocks($start - 86400, $end + 86400);
        if ($isOwner) {
          $hasHours = false;
          foreach ((array)$a['weekly'] as $w) if ($w) { $hasHours = true; break; }
          if ($hasHours) {
            $inside = false;
            foreach (slot_windows($a['weekly'], lagos_date_of($start)) as [$ws, $we]) if ($start >= $ws && $end <= $we) { $inside = true; break; }
            if (!$inside) $problems[] = 'outside_hours';
          }
          foreach ($blocks as [$bs, $be]) if (intervals_overlap($start, $end, $bs, $be, 0)) { $problems[] = 'blocked'; break; }
          foreach ($busy as [$bs, $be]) if (intervals_overlap($start, $end, $bs, $be, $buf)) { $problems[] = 'conflict'; break; }
          if ($problems && $override === '') {
            tx_fail('That time clashes with working hours, blocked time or another appointment. Give an override reason to book it anyway.',
              409, ['reason' => $problems[0], 'problems' => $problems, 'can_override' => true]);
          }
        } else {
          $r = slot_check($start, $type, $a, $busy, $blocks, time());
          if ($r !== 'ok') tx_fail(APPT_REASON_MESSAGES[$r] ?? 'That time is not available.', in_array($r, ['conflict', 'blocked'], true) ? 409 : 422, ['reason' => $r]);
        }
      }
      $overrideStored = $problems ? $override : null;
      $actorType = $actor['type'] ?? 'system';
      $actorId = $actor['id'] ?? null;
      if ($cur) {
        $reason = trim((string)($d['reason'] ?? '')) ?: 'Rescheduled';
        db_exec('UPDATE appointments SET starts_at = ?, ends_at = ?, all_day = ?, buffer_min = ?, override_reason = COALESCE(?, override_reason) WHERE id = ?',
          'ssiisi', utc_sql($start), utc_sql($end), (int)$allDay, $buf, $overrideStored, $id);
        appt_event_tx($id, $cur['status'], $cur['status'], $cur['starts_at'], utc_sql($start),
          $reason . ($overrideStored ? ' (override: ' . $overrideStored . ')' : ''), $actorType, $actorId);
        $newId = $id;
      } else {
        $status = ($d['status'] ?? 'confirmed') === 'requested' ? 'requested' : 'confirmed';
        $hold = $status === 'requested' ? utc_sql(time() + max(1, (int)($a['request_hold_hours'] ?? 48)) * 3600) : null;
        $src = in_array($d['source'] ?? '', ['owner', 'public', 'portal', 'migration'], true) ? $d['source'] : 'owner';
        $cust = isset($d['customer_id']) ? (int)$d['customer_id'] ?: null : null;
        $job = isset($d['job_id']) ? (int)$d['job_id'] ?: null : null;
        $enq = isset($d['enquiry_id']) ? (int)$d['enquiry_id'] ?: null : null;
        $cn = $d['contact_name'] ?? null; $cp = $d['contact_phone'] ?? null; $ce = $d['contact_email'] ?? null;
        $ni = $d['notes_internal'] ?? null; $cnote = $d['client_note'] ?? null;
        $by = $actorType === 'owner' ? $actorId : null;
        db_exec('INSERT INTO appointments (type, status, starts_at, ends_at, all_day, buffer_min, customer_id, job_id, enquiry_id,
                   contact_name, contact_phone, contact_email, source, hold_expires_at, override_reason, notes_internal, client_note, request_key, created_by)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', 'ssssiiiiisssssssssi',
          $type, $status, utc_sql($start), utc_sql($end), (int)$allDay, $buf, $cust, $job, $enq,
          $cn, $cp, $ce, $src, $hold, $overrideStored, $ni, $cnote, $key, $by);
        $newId = (int)$conn->insert_id;
        appt_event_tx($newId, null, $status, null, utc_sql($start),
          'Created (' . $src . ')' . ($overrideStored ? ' (override: ' . $overrideStored . ')' : ''), $actorType, $actorId);
      }
      $row = db_row('SELECT * FROM appointments WHERE id = ?', 'i', $newId);
      if ($row['job_id'] && $row['type'] === 'fitting') appt_sync_fitting_date((int)$row['job_id']);
      return ['appointment' => $row, 'duplicate' => false];
    });
  } catch (mysqli_sql_exception $e) {
    if (!is_duplicate_key($e) || $key === null) throw $e;
    return ['appointment' => db_row('SELECT * FROM appointments WHERE request_key = ?', 's', $key), 'duplicate' => true];
  }
}

/**
 * Move an appointment to a new status under the booking lock, with history.
 * Confirming a request whose hold has run out answers 409 (it has expired).
 */
function appt_set_status($id, $to, $reason, array $actor) {
  return db_tx(function () use ($id, $to, $reason, $actor) {
    db_exec('SELECT id FROM booking_lock WHERE id = 1 FOR UPDATE')->get_result();
    appt_expire_holds_tx();
    $cur = db_row('SELECT * FROM appointments WHERE id = ? FOR UPDATE', 'i', (int)$id);
    if (!$cur) tx_fail('Appointment not found', 404);
    if ($cur['status'] === $to) return $cur;
    if (!appointment_transition_ok($cur['status'], $to)) tx_fail('An appointment that is ' . $cur['status'] . ' cannot become ' . $to, 409);
    db_exec('UPDATE appointments SET status = ?, hold_expires_at = IF(? = \'requested\', hold_expires_at, NULL) WHERE id = ?', 'ssi', $to, $to, (int)$id);
    appt_event_tx($id, $cur['status'], $to, null, null, $reason, $actor['type'] ?? 'system', $actor['id'] ?? null);
    $row = db_row('SELECT * FROM appointments WHERE id = ?', 'i', (int)$id);
    if ($row['job_id'] && $row['type'] === 'fitting') appt_sync_fitting_date((int)$row['job_id']);
    return $row;
  });
}

/** Keep tailoring_orders.fitting_date as a cache of the next confirmed fitting (Lagos date), or NULL. */
function appt_sync_fitting_date($jobId) {
  db_exec("UPDATE tailoring_orders SET fitting_date = (
             SELECT MIN(DATE(a.starts_at + INTERVAL 1 HOUR)) FROM appointments a
              WHERE a.job_id = ? AND a.type = 'fitting' AND a.status = 'confirmed' AND DATE(a.starts_at + INTERVAL 1 HOUR) >= ?)
           WHERE id = ?", 'isi', (int)$jobId, lagos_today(), (int)$jobId);
}

/** Appointment row shaped for staff: typed ids and Lagos times beside the UTC ones. */
function appointment_view(array $a) {
  foreach (['id', 'customer_id', 'job_id', 'enquiry_id', 'created_by', 'all_day', 'buffer_min'] as $k) {
    if (array_key_exists($k, $a) && $a[$k] !== null) $a[$k] = (int)$a[$k];
  }
  $a['starts_at_local'] = lagos_iso($a['starts_at']);
  $a['ends_at_local'] = lagos_iso($a['ends_at']);
  $a['hold_expires_at_local'] = lagos_iso($a['hold_expires_at'] ?? null);
  unset($a['request_key']);
  return $a;
}

/* ---- Quotes (shared by quotes.php and the portal) ------------------------- */

function quote_lock($id) {
  return db_row('SELECT * FROM quotes WHERE id = ? FOR UPDATE', 'i', (int)$id);
}

/**
 * Record a customer's acceptance of the current sent quote version. The hash
 * the customer saw must match the frozen one. In one transaction the job takes
 * the price, quote_id and promised date and moves from quote to confirmed.
 * $userId is the staff user recording it (null when the customer accepts in the
 * portal); $customerId, when given, must own the quote.
 * Returns ['job_id' => int, 'already' => bool].
 */
function quote_accept($id, $channel, $note, $hash, $userId, $customerId = null) {
  return db_tx(function () use ($id, $channel, $note, $hash, $userId, $customerId) {
    $q = quote_lock($id);
    if (!$q || ($customerId !== null && (int)$q['customer_id'] !== (int)$customerId)) tx_fail('Quote not found', 404);
    if ($q['status'] === 'accepted') return ['job_id' => (int)$q['job_id'], 'already' => true];
    if ($q['status'] !== 'sent') tx_fail('Only the current sent version can be accepted (this one is ' . $q['status'] . ')', 409);
    if ($q['valid_until'] !== null && $q['valid_until'] < lagos_today()) tx_fail('This quote expired on ' . $q['valid_until'] . '. Revise and send it again.', 409);
    if (!hash_equals((string)$q['content_hash'], (string)$hash)) tx_fail('The quote changed since you loaded it. Reload and check before accepting.', 409);
    $jobId = $q['job_id'] ? (int)$q['job_id'] : null;
    if (!$jobId && $q['enquiry_id']) {
      $e = db_row('SELECT job_id FROM enquiries WHERE id = ?', 'i', (int)$q['enquiry_id']);
      $jobId = $e && $e['job_id'] ? (int)$e['job_id'] : null;
    }
    if (!$jobId) tx_fail('Convert the enquiry to a job before accepting the quote');
    $job = job_lock($jobId);
    if (!$job) tx_fail('Job not found', 404);

    db_exec("UPDATE quotes SET status = 'superseded' WHERE series_id = ? AND id <> ? AND status IN ('sent','accepted')", 'ii', (int)$q['series_id'], $id);
    db_exec("UPDATE quotes SET status = 'accepted', accepted_at = UTC_TIMESTAMP(), accepted_channel = ?, acceptance_note = ?, accepted_recorded_by = ?, job_id = ?
              WHERE id = ?", 'ssiii', $channel, $note, $userId, $jobId, $id);
    if ($q['promised_date'] !== null) {
      db_exec('UPDATE tailoring_orders SET price = ?, quote_id = ?, due_date = ?, lock_version = lock_version + 1 WHERE id = ?', 'sisi', $q['total'], $id, $q['promised_date'], $jobId);
    } else {
      db_exec('UPDATE tailoring_orders SET price = ?, quote_id = ?, lock_version = lock_version + 1 WHERE id = ?', 'sii', $q['total'], $id, $jobId);
    }
    if ($job['job_stage'] === 'quote') {
      job_set_stage_tx($job, 'confirmed', $userId, 'Quote ' . quote_number($q['series_id'], $q['version']) . ' accepted', ['quote_id' => (int)$id]);
    }
    job_event($jobId, 'quote', null, 'Quote ' . quote_number($q['series_id'], $q['version']) . ' accepted (' . $channel . ')',
      ['quote_id' => (int)$id, 'total' => $q['total'], 'money' => true], 0, $userId);
    $enq = $q['enquiry_id'] ?: $job['enquiry_id'];
    if ($enq) db_exec("UPDATE enquiries SET status = 'accepted' WHERE id = ? AND status <> 'closed'", 'i', (int)$enq);
    job_recalc_money($jobId);
    return ['job_id' => $jobId, 'already' => false];
  });
}

/* ---- Handovers (shared by tailoring.php and company_jobs.php) ------------- */

const HANDOVER_CHECKLIST = ['garment_count', 'fit', 'finishing', 'packaging', 'accessories', 'instructions'];

function handover_view(array $h, $isOwner) {
  foreach (['id', 'job_id', 'quantity', 'recorded_by'] as $k) if (isset($h[$k])) $h[$k] = (int)$h[$k];
  $h['checklist'] = $h['checklist'] !== null ? json_decode($h['checklist'], true) : null;
  unset($h['request_key']);
  if (!$isOwner) unset($h['balance_at_handover']);
  return $h;
}

/**
 * Complete a handover under the job lock: snapshot the balance, recount the
 * completed quantity and move the job to handed_over only when every piece is
 * out. Returns [handed_over_qty, quantity, job_stage, balance_minor].
 */
function handover_complete_tx(array $job, $hid, array $b, $user) {
  $t = job_money($job['id'], $job['price']);
  $bal = minor_to_decimal($t['balance']);
  $check = [];
  foreach (HANDOVER_CHECKLIST as $k) if (array_key_exists($k, (array)($b['checklist'] ?? []))) $check[$k] = (bool)$b['checklist'][$k];
  $cj = $check ? json_encode($check) : null;
  $rb = mb_substr(trim((string)($b['received_by'] ?? '')), 0, 120) ?: null;
  $ev = mb_substr(trim((string)($b['evidence_note'] ?? '')), 0, 255) ?: null;
  db_exec("UPDATE job_handovers SET status = 'completed', completed_at = UTC_TIMESTAMP(), received_by = ?, evidence_note = ?,
                  checklist = ?, balance_at_handover = ? WHERE id = ?", 'ssssi', $rb, $ev, $cj, $bal, (int)$hid);
  $done = (int)db_row("SELECT COALESCE(SUM(quantity),0) AS q FROM job_handovers WHERE job_id = ? AND status = 'completed'", 'i', (int)$job['id'])['q'];
  db_exec('UPDATE tailoring_orders SET handed_over_qty = ?, lock_version = lock_version + 1 WHERE id = ?', 'ii', $done, (int)$job['id']);
  $qty = max(1, (int)$job['quantity']);
  $stage = handover_stage_after($job['job_stage'], $qty, $done);
  job_event($job['id'], 'handover', $job['job_stage'], "Handover completed: $done of $qty handed over" . ($t['balance'] > 0 ? ' (balance ₦' . number_format(intdiv($t['balance'], 100)) . ' outstanding)' : ''),
    ['handover_id' => (int)$hid, 'handed_over_qty' => $done, 'quantity' => $qty, 'balance_at_handover' => $bal, 'money' => true], 1, $user['id']);
  if ($stage === 'handed_over' && $job['job_stage'] !== 'handed_over') {
    job_set_stage_tx($job, 'handed_over', $user['id'], 'All pieces handed over', ['handover_id' => (int)$hid]);
  }
  return [$done, $qty, $stage, $t['balance']];
}
