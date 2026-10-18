<?php
/**
 * HeritOS: Job payment ledger (owner roles only). Append-only: entries are
 * never edited or deleted; mistakes are reversed (BR-21).
 *
 *   GET  ?action=list&job_id=N                         one job's entries + totals
 *   GET  ?action=list[&from=&to=][&verified=0|1]       entries across jobs (received_on, Lagos dates)
 *   GET  ?action=due                                   jobs with a balance to collect
 *   GET  ?action=credits                               jobs paid above the price (credit or refund due)
 *   POST ?action=record    {job_id, amount, method, external_ref?, received_on?, note?, request_key}
 *   POST ?action=verify&id=N                           one-way: unverified to verified
 *   POST ?action=reverse&id=N {reason, request_key}    adds a reversal entry (once per entry)
 *   POST ?action=refund    {job_id, amount, method, note?, request_key, force?, reason?}
 *   POST ?action=recalc_all                            recompute every job's cached money fields
 *
 * Amounts are strings ("20,000" or "20000.50") parsed to kobo. A repeated
 * request_key returns the existing entry with duplicate:true and changes
 * nothing (BR-22). Every write runs under the job's row lock, so two payments
 * recorded at the same moment both count.
 */
require __DIR__ . '/_lib.php';
require __DIR__ . '/_jobs.php';
cors();

$user = require_auth(ROLES_OWNER);
$action = $_GET['action'] ?? 'list';
$id = (int)($_GET['id'] ?? 0);

/** Totals + state for a job after a write, for responses. */
function job_money_out($jobId) {
  $j = db_row('SELECT id, code, price, payment_state, paid_total, lock_version FROM tailoring_orders WHERE id = ?', 'i', (int)$jobId);
  $t = job_money($jobId, $j['price']);
  return ['job_id' => (int)$j['id'], 'code' => $j['code'], 'money' => money_view($t, $j['price'], $j['payment_state']), 'lock_version' => (int)$j['lock_version']];
}

/* ---- LIST ----------------------------------------------------------------- */
if ($action === 'list' && method() === 'GET') {
  if (!empty($_GET['job_id'])) {
    $jid = (int)$_GET['job_id'];
    if (!db_row('SELECT id FROM tailoring_orders WHERE id = ? AND deleted_at IS NULL', 'i', $jid)) fail('Job not found', 404);
    json(['entries' => array_map('ledger_row_view', job_ledger($jid))] + job_money_out($jid));
  }
  $where = '1'; $types = ''; $args = [];
  foreach (['from' => '>=', 'to' => '<='] as $k => $op) {
    if (!empty($_GET[$k])) {
      if (($d = ymd_or_null($_GET[$k])) === null) fail("Invalid $k date");
      $where .= " AND p.received_on $op ?"; $types .= 's'; $args[] = $d;
    }
  }
  if (isset($_GET['verified']) && $_GET['verified'] !== '') {
    $where .= ' AND p.verified = ? AND p.kind <> \'reversal\' AND NOT EXISTS (SELECT 1 FROM job_payments r WHERE r.reverses_id = p.id)';
    $types .= 'i'; $args[] = (int)!empty($_GET['verified']);
  }
  $rows = db_rows("SELECT p.*, o.code, c.name AS client_name, u.name AS recorded_by_name,
                          (SELECT r.id FROM job_payments r WHERE r.reverses_id = p.id) AS reversed_by_id
                     FROM job_payments p JOIN tailoring_orders o ON o.id = p.job_id JOIN customers c ON c.id = o.customer_id
                LEFT JOIN users u ON u.id = p.recorded_by
                    WHERE $where ORDER BY p.received_on DESC, p.id DESC LIMIT 500", $types, ...$args);
  $sum = 0;
  foreach ($rows as $r) if ((int)$r['verified'] === 1) $sum += decimal_to_minor($r['amount']);
  json(['entries' => array_map('ledger_row_view', $rows), 'verified_net' => minor_to_decimal($sum), 'today' => lagos_today()]);
}

/* ---- DUE BALANCES / CREDITS ---------------------------------------------- */
if (($action === 'due' || $action === 'credits') && method() === 'GET') {
  $where = $action === 'due'
    ? "o.payment_state IN ('unpaid','part_paid') AND o.job_stage NOT IN ('quote','cancelled')"
    : "o.payment_state = 'credit'";
  $rows = db_rows("SELECT o.id, o.code, o.customer_id, c.name AS client_name, c.client_ref, c.phone, o.garment_type, o.job_stage,
                          o.price, o.paid_total, o.payment_state, o.due_date
                     FROM tailoring_orders o JOIN customers c ON c.id = o.customer_id
                    WHERE o.deleted_at IS NULL AND $where ORDER BY o.due_date IS NULL, o.due_date, o.id");
  $total = 0;
  foreach ($rows as &$r) {
    $p = decimal_to_minor($r['price']); $paid = decimal_to_minor($r['paid_total']);
    $amt = $action === 'due' ? max(0, $p - $paid) : max(0, $paid - $p);
    $r[$action === 'due' ? 'balance' : 'credit'] = minor_to_decimal($amt);
    $r['id'] = (int)$r['id']; $r['customer_id'] = (int)$r['customer_id'];
    $total += $amt;
  }
  json(['items' => $rows, 'total' => minor_to_decimal($total)]);
}

/* ---- RECORD A PAYMENT ----------------------------------------------------- */
if ($action === 'record' && method() === 'POST') {
  $b = body();
  $key = body_request_key($b);
  $jobId = (int)($b['job_id'] ?? 0);
  $minor = money_to_minor($b['amount'] ?? null);
  if ($minor === null || $minor <= 0) fail('Amount must be more than 0, like 20000 or 20,000.00');
  $method = (string)($b['method'] ?? '');
  if (!in_array($method, PAYMENT_METHODS, true)) fail('Method must be one of: ' . implode(', ', PAYMENT_METHODS));
  if (!empty($b['received_on']) && ymd_or_null($b['received_on']) === null) fail('Invalid received_on date');
  if (!empty($b['received_on']) && $b['received_on'] > lagos_today()) fail('The payment date cannot be in the future');

  [$row, $dup] = db_tx(function () use ($jobId, $minor, $method, $b, $key, $user) {
    if (!job_lock($jobId)) tx_fail('Job not found', 404);
    $r = ledger_insert_tx($jobId, [
      'kind' => 'payment', 'amount_minor' => $minor, 'method' => $method, 'external_ref' => $b['external_ref'] ?? null,
      'received_on' => $b['received_on'] ?? null, 'note' => $b['note'] ?? null, 'request_key' => $key,
      'verified' => payment_verified_on_entry($method, verified_methods()),
    ], $user['id']);
    if (!$r[1]) {
      job_recalc_money($jobId);
      job_event($jobId, 'payment', null, 'Payment ₦' . number_format(intdiv($minor, 100)) . ' recorded (' . $method . ($r[0]['verified'] ? '' : ', awaiting verification') . ')',
        ['payment_id' => (int)$r[0]['id'], 'money' => true], 0, $user['id']);
    }
    return $r;
  });
  if (!$dup) audit($user['id'], 'ledger_record', 'job_payment', (int)$row['id'], ['job_id' => $jobId, 'amount' => $row['amount'], 'method' => $method]);
  json(['entry' => ledger_row_view($row), 'duplicate' => $dup] + job_money_out($jobId), $dup ? 200 : 201);
}

/* ---- VERIFY (one-way) ----------------------------------------------------- */
if ($action === 'verify' && method() === 'POST') {
  // An entry's job_id never changes, so it is read before the transaction. No
  // plain read may run inside it before job_lock(): under MariaDB snapshot
  // isolation that read fixes the snapshot, and the loser of a race then gets
  // "Record has changed since last read" instead of a clean answer.
  $owner = db_row('SELECT job_id FROM job_payments WHERE id = ?', 'i', $id);
  if (!$owner) fail('Entry not found', 404);
  $jobId = db_tx(function () use ($id, $user, $owner) {
    job_lock((int)$owner['job_id']);
    $p = db_row('SELECT * FROM job_payments WHERE id = ? FOR UPDATE', 'i', $id);
    if (!$p) tx_fail('Entry not found', 404);
    if ((int)$p['verified'] === 1) return (int)$p['job_id'];                    // already verified: no change
    if ($p['kind'] === 'reversal' || db_row('SELECT id FROM job_payments WHERE reverses_id = ?', 'i', $id)) tx_fail('A reversed entry cannot be verified', 409);
    db_exec('UPDATE job_payments SET verified = 1, verified_by = ?, verified_at = UTC_TIMESTAMP() WHERE id = ? AND verified = 0', 'ii', $user['id'], $id);
    job_recalc_money((int)$p['job_id']);
    job_event((int)$p['job_id'], 'payment', null, 'Payment RCT-' . $id . ' verified', ['payment_id' => $id, 'money' => true], 0, $user['id']);
    return (int)$p['job_id'];
  });
  audit($user['id'], 'ledger_verify', 'job_payment', $id);
  json(['entry' => ledger_row_view(db_row('SELECT * FROM job_payments WHERE id = ?', 'i', $id))] + job_money_out($jobId));
}

/* ---- REVERSE -------------------------------------------------------------- */
if ($action === 'reverse' && method() === 'POST') {
  $b = body();
  $key = body_request_key($b);
  $reason = mb_substr(trim((string)($b['reason'] ?? '')), 0, 200);
  if (mb_strlen($reason) < 3) fail('Give a reason for the reversal');
  // Lock first, then read (see VERIFY): the job_id is read outside the transaction.
  $owner = db_row('SELECT job_id FROM job_payments WHERE id = ?', 'i', $id);
  if (!$owner) fail('Entry not found', 404);
  [$row, $dup, $jobId] = db_tx(function () use ($id, $key, $reason, $user, $owner) {
    job_lock((int)$owner['job_id']);
    $p = db_row('SELECT * FROM job_payments WHERE id = ? FOR UPDATE', 'i', $id);
    if (!$p) tx_fail('Entry not found', 404);
    $mine = db_row('SELECT * FROM job_payments WHERE request_key = ?', 's', $key);
    if ($mine) return [$mine, true, (int)$p['job_id']];
    if ($p['kind'] === 'reversal') tx_fail('A reversal cannot itself be reversed; record a new entry instead', 409);
    if (db_row('SELECT id FROM job_payments WHERE reverses_id = ?', 'i', $id)) tx_fail('That entry has already been reversed', 409);
    [$r, $d] = ledger_insert_tx((int)$p['job_id'], [
      'kind' => 'reversal', 'amount_minor' => -decimal_to_minor($p['amount']), 'method' => $p['method'],
      'received_on' => lagos_today(), 'note' => 'Reversal of RCT-' . $id . ': ' . $reason, 'request_key' => $key,
      'verified' => (int)$p['verified'], 'reverses_id' => $id,
    ], $user['id']);
    job_recalc_money((int)$p['job_id']);
    job_event((int)$p['job_id'], 'payment', null, 'Entry RCT-' . $id . ' reversed: ' . $reason, ['payment_id' => $id, 'reversal_id' => (int)$r['id'], 'money' => true], 0, $user['id']);
    return [$r, $d, (int)$p['job_id']];
  });
  if (!$dup) audit($user['id'], 'ledger_reverse', 'job_payment', $id, ['reason' => $reason, 'reversal_id' => (int)$row['id']]);
  json(['entry' => ledger_row_view($row), 'duplicate' => $dup] + job_money_out($jobId), $dup ? 200 : 201);
}

/* ---- REFUND --------------------------------------------------------------- */
/* Money paid back to the client. Allowed up to the job's verified credit; more
 * than that needs force plus a reason (for example a cancelled job).         */
if ($action === 'refund' && method() === 'POST') {
  $b = body();
  $key = body_request_key($b);
  $jobId = (int)($b['job_id'] ?? 0);
  $minor = money_to_minor($b['amount'] ?? null);
  if ($minor === null || $minor <= 0) fail('Amount must be more than 0');
  $method = (string)($b['method'] ?? '');
  if (!in_array($method, PAYMENT_METHODS, true)) fail('Method must be one of: ' . implode(', ', PAYMENT_METHODS));
  $force = !empty($b['force']);
  $reason = trim((string)($b['reason'] ?? ''));
  [$row, $dup] = db_tx(function () use ($jobId, $minor, $method, $b, $key, $force, $reason, $user) {
    $job = job_lock($jobId);
    if (!$job) tx_fail('Job not found', 404);
    if ($ex = db_row('SELECT * FROM job_payments WHERE request_key = ?', 's', $key)) return [$ex, true];
    $t = job_money($jobId, $job['price']);
    $limit = decimal_to_minor($job['price']) > 0 ? $t['credit'] : $t['net_verified'];
    if ($minor > $limit && !($force && mb_strlen($reason) >= 5)) {
      tx_fail('The refund is more than the credit on this job (₦' . number_format(intdiv($limit, 100)) . '). Send force with a reason to refund more.', 409, ['credit' => minor_to_decimal($limit)]);
    }
    $note = trim((string)($b['note'] ?? '')) . ($force && $minor > $limit ? ' [forced: ' . $reason . ']' : '');
    $r = ledger_insert_tx($jobId, [
      'kind' => 'refund', 'amount_minor' => -$minor, 'method' => $method, 'external_ref' => $b['external_ref'] ?? null,
      'received_on' => $b['received_on'] ?? null, 'note' => $note, 'request_key' => $key, 'verified' => 1,
    ], $user['id']);
    job_recalc_money($jobId);
    job_event($jobId, 'payment', null, 'Refund ₦' . number_format(intdiv($minor, 100)) . ' recorded', ['payment_id' => (int)$r[0]['id'], 'money' => true], 0, $user['id']);
    return $r;
  });
  if (!$dup) audit($user['id'], 'ledger_refund', 'job_payment', (int)$row['id'], ['job_id' => $jobId, 'amount' => $row['amount'], 'forced' => $force]);
  json(['entry' => ledger_row_view($row), 'duplicate' => $dup] + job_money_out($jobId), $dup ? 200 : 201);
}

/* ---- RECALCULATE ALL (one-off after the migration) ------------------------ */
if ($action === 'recalc_all' && method() === 'POST') {
  $n = 0;
  foreach (db_rows('SELECT id FROM tailoring_orders WHERE deleted_at IS NULL') as $r) {
    db_tx(function () use ($r) { job_lock((int)$r['id']); job_recalc_money((int)$r['id']); });
    $n++;
  }
  audit($user['id'], 'ledger_recalc_all', 'tailoring_order', null, ['jobs' => $n]);
  json(['ok' => true, 'jobs' => $n]);
}

fail('Unknown action', 404);
