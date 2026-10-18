<?php
/**
 * HeritOS Phase 5: company jobs. One tailoring_orders row (job_kind='company')
 * with job_items where garments or wearers differ (BR-28), sample versions and
 * handovers by item. Workshop roles; money, contacts and company fields are
 * owner-only, and tailors get the items without them.
 *
 *   POST ?action=create                     {company_id, contact_id, description?, po_number?, measurement_method?,
 *                                            sample_required?, due_date?, items:[item], request_key} → 201 {job}
 *   GET  ?action=job&job_id=N               {job, items, samples, handovers, company?, contacts?, bill_to?, suggested_stage}
 *   POST ?action=set&job_id=N               {po_number?, invoice_contact_id?, measurement_method?} (owner)
 *   POST ?action=item_save&job_id=N         {item_id?, description, qty, garment_type?, size_label?, wearer_customer_id?,
 *                                            wearer_label?, effect_note?} ; after production starts an edit needs
 *                                            effect_note (BR-30), else 409 {code:'effect_required'}
 *   POST ?action=item_cancel&job_id=N       {item_id, reason}
 *   POST ?action=item_progress&job_id=N     {item_id, qty_ready}   (tailors too)
 *   POST ?action=item_attach_measurement&job_id=N {item_id, measurement_set_id}: an approved set of the item's wearer
 *   POST ?action=wearer_invite&job_id=N     {item_id} → single-use link for the wearer's own customer row
 *   POST ?action=sample_submit&job_id=N     {description, item_id?, request_key}
 *   POST ?action=sample_record_decision&job_id=N {sample_id, decision: approve|changes, channel, note?, contact_id?}
 *   POST ?action=handover&job_id=N          {items:[{item_id, qty}], method, received_by?, evidence_note?, request_key}
 *
 * Every mutation runs under job_lock and writes a job_event; create, samples
 * and handovers are idempotent by request_key.
 */
require __DIR__ . '/_lib.php';
require __DIR__ . '/_jobs.php';
require __DIR__ . '/_portal.php';
require_once __DIR__ . '/_company.php';
cors();

$user = require_auth(ROLES_WORKSHOP);
$uid = (int)$user['id'];
$isOwner = is_owner_role($user['role']);
$action = $_GET['action'] ?? 'job';
$jobId = in_int($_GET, 'job_id');

if (!has_table('job_items')) fail('Company orders are not set up yet (import schema_phase27.sql)', 409);

const OWNER_ONLY_ACTIONS = ['create', 'set', 'item_save', 'item_cancel', 'item_attach_measurement', 'wearer_invite', 'sample_submit', 'sample_record_decision', 'handover'];
if (in_array($action, OWNER_ONLY_ACTIONS, true) && !$isOwner) fail('Only the owner can do this', 403);

/* ---- Helpers ------------------------------------------------------------------ */

function cj_items($jobId, $lock = false) {
  return db_rows('SELECT * FROM job_items WHERE job_id = ? ORDER BY sort, id' . ($lock ? ' FOR UPDATE' : ''), 'i', (int)$jobId);
}

/** Lock the company job or answer 404 (inside a transaction). */
function cj_lock($jobId) {
  $job = job_lock($jobId);
  if (!$job || ($job['job_kind'] ?? '') !== 'company') tx_fail('Company job not found', 404);
  return $job;
}

/** Keep tailoring_orders.quantity equal to the active items' total; refresh item stages. */
function cj_recount($jobId) {
  $items = cj_items($jobId);
  foreach ($items as $i) {
    $st = item_stage_after($i);
    if ($st !== $i['item_stage']) db_exec('UPDATE job_items SET item_stage = ?, lock_version = lock_version + 1 WHERE id = ?', 'si', $st, (int)$i['id']);
  }
  $qty = max(1, company_items_qty($items));
  db_exec('UPDATE tailoring_orders SET quantity = ?, lock_version = lock_version + 1 WHERE id = ?', 'ii', $qty, (int)$jobId);
  return $qty;
}

/** Item for staff: wearer name and measurement state (owners and tailors make the garments, so both see wearers). */
function cj_item_view(array $i) {
  foreach (['id', 'job_id', 'sort', 'qty', 'qty_ready', 'qty_handed_over', 'wearer_customer_id', 'measurement_set_id', 'lock_version'] as $k) {
    if ($i[$k] !== null) $i[$k] = (int)$i[$k];
  }
  $i['stage_label'] = ITEM_STAGE_LABELS[$i['item_stage']] ?? $i['item_stage'];
  $i['measurement_state'] = $i['measurement_set_id'] ? 'attached' : ($i['wearer_customer_id'] ? 'missing' : 'not_needed');
  if ($i['wearer_customer_id'] && !$i['measurement_set_id']) {
    $p = db_row('SELECT status FROM measurement_sets WHERE customer_id = ? ORDER BY id DESC LIMIT 1', 'i', $i['wearer_customer_id']);
    if ($p && in_array($p['status'], ['pending', 'imported_unverified'], true)) $i['measurement_state'] = 'pending';
    elseif ($p && $p['status'] === 'approved') $i['measurement_state'] = 'available';
  }
  unset($i['request_key']);
  return $i;
}

function cj_items_view($jobId) {
  $rows = db_rows('SELECT i.*, c.name AS wearer_name, c.client_ref AS wearer_ref FROM job_items i
                    LEFT JOIN customers c ON c.id = i.wearer_customer_id WHERE i.job_id = ? ORDER BY i.sort, i.id', 'i', (int)$jobId);
  return array_map('cj_item_view', $rows);
}

function cj_sample_view(array $s) {
  foreach (['id', 'job_id', 'item_id', 'version', 'decided_contact_id', 'decided_by_user'] as $k) if ($s[$k] !== null) $s[$k] = (int)$s[$k];
  unset($s['request_key']);
  return $s;
}

/** Clean item fields for an insert or update; checks a wearer exists. */
function cj_item_from_body(array $b) {
  [$c, $e] = company_item_clean($b);
  if ($e) json(['error' => 'Check the highlighted fields', 'errors' => $e], 400);
  if ($c['wearer_customer_id'] && !db_row('SELECT id FROM customers WHERE id = ? AND deleted_at IS NULL', 'i', $c['wearer_customer_id'])) {
    json(['error' => 'Wearer not found', 'errors' => ['wearer_customer_id' => 'Not found']], 400);
  }
  return $c;
}

function cj_insert_item($jobId, array $c, $sort, $key = null) {
  global $conn;
  db_exec('INSERT INTO job_items (job_id, sort, description, garment_type, service_key, qty, size_label, wearer_customer_id, wearer_label, request_key)
           VALUES (?,?,?,?,?,?,?,?,?,?)', 'iisssisiss',
    (int)$jobId, (int)$sort, $c['description'], $c['garment_type'], $c['service_key'], $c['qty'], $c['size_label'], $c['wearer_customer_id'], $c['wearer_label'], $key);
  return (int)$conn->insert_id;
}

/** The full staff answer for one company job. */
function cj_job_answer($jobId, $isOwner) {
  $j = db_row('SELECT o.*, c.name AS client_name, c.client_ref FROM tailoring_orders o JOIN customers c ON c.id = o.customer_id
                WHERE o.id = ? AND o.deleted_at IS NULL', 'i', (int)$jobId);
  if (!$j || $j['job_kind'] !== 'company') fail('Company job not found', 404);
  $stage = job_stage_of($j);
  $items = cj_items_view($jobId);
  $out = [
    'job' => ['id' => (int)$j['id'], 'code' => $j['code'], 'ref' => $j['public_ref'], 'description' => $j['description'],
      'quantity' => (int)$j['quantity'], 'handed_over_qty' => (int)$j['handed_over_qty'], 'job_stage' => $stage,
      'stage_label' => JOB_STAGE_LABELS[$stage] ?? $stage, 'due_date' => $j['due_date'], 'measurement_method' => $j['measurement_method'],
      'sample_status' => $j['sample_status'], 'lock_version' => (int)$j['lock_version'],
      'progress' => (int)$j['handed_over_qty'] . ' of ' . (int)$j['quantity'] . ' handed over'],
    'items' => $items,
    'samples' => array_map('cj_sample_view', db_rows('SELECT * FROM job_samples WHERE job_id = ? ORDER BY version', 'i', (int)$jobId)),
    'handovers' => array_map(function ($h) use ($isOwner) {
      $v = handover_view($h, $isOwner);
      $v['items'] = array_map(fn($r) => ['item_id' => (int)$r['item_id'], 'qty' => (int)$r['qty'], 'description' => $r['description']],
        db_rows('SELECT hi.item_id, hi.qty, i.description FROM job_handover_items hi JOIN job_items i ON i.id = hi.item_id WHERE hi.handover_id = ?', 'i', (int)$h['id']));
      return $v;
    }, db_rows('SELECT * FROM job_handovers WHERE job_id = ? ORDER BY id', 'i', (int)$jobId)),
    'suggested_stage' => job_items_rollup($items),
  ];
  if ($isOwner) {
    $out['job'] += ['po_number' => $j['po_number'], 'invoice_contact_id' => $j['invoice_contact_id'] !== null ? (int)$j['invoice_contact_id'] : null,
      'company_id' => (int)$j['company_id'], 'primary_contact' => ['customer_id' => (int)$j['customer_id'], 'name' => $j['client_name'], 'client_ref' => $j['client_ref']],
      'price' => $j['price'], 'paid_total' => $j['paid_total'], 'payment_state' => $j['payment_state']];
    $out['company'] = db_row('SELECT id, company_ref, name, invoice_name, invoice_address, invoice_email, tax_id FROM companies WHERE id = ?', 'i', (int)$j['company_id']);
    $out['contacts'] = array_map(fn($r) => ['id' => (int)$r['id'], 'name' => $r['name'], 'role_title' => $r['role_title'], 'active' => (int)$r['active'],
      'can_approve_samples' => (int)$r['can_approve_samples'], 'is_invoice_recipient' => (int)$r['is_invoice_recipient']],
      db_rows('SELECT k.*, c.name FROM company_contacts k JOIN customers c ON c.id = k.customer_id WHERE k.company_id = ? ORDER BY k.active DESC, c.name', 'i', (int)$j['company_id']));
    $out['bill_to'] = company_bill_to_snapshot($jobId);
  }
  return $out;
}

/* ---- Create ------------------------------------------------------------------- */

if ($action === 'create' && method() === 'POST') {
  $b = body();
  $key = body_request_key($b);
  $companyId = in_int($b, 'company_id');
  $contactId = in_int($b, 'contact_id');
  $method = $b['measurement_method'] ?? 'individual';
  if (!in_array($method, MEASUREMENT_METHODS, true)) fail('measurement_method must be individual, sizes or mixed');
  $po = mb_substr(trim(in_str($b, 'po_number')), 0, 60) ?: null;
  $due = null;
  if (!empty($b['due_date'])) { $due = ymd_or_null($b['due_date']); if ($due === null) fail('Invalid due_date (use YYYY-MM-DD)'); }
  $desc = mb_substr(trim(in_str($b, 'description')), 0, 255);
  $rawItems = is_array($b['items'] ?? null) ? $b['items'] : [];
  if (!$rawItems) fail('Add at least one item');
  if (count($rawItems) > 200) fail('At most 200 items per job');
  $items = []; $errs = [];
  foreach ($rawItems as $n => $it) {
    [$c, $e] = company_item_clean((array)$it);
    foreach ($e as $k => $m) $errs["items.$n.$k"] = $m;
    $items[] = $c;
  }
  if ($errs) json(['error' => 'Check the highlighted fields', 'errors' => $errs], 400);

  [$newId, $created] = db_tx(function () use ($key, $companyId, $contactId, $method, $po, $due, $desc, $items, $b, $uid) {
    // Idempotent: the first item carries the request key.
    $ex = db_row('SELECT job_id FROM job_items WHERE request_key = ?', 's', $key);
    if ($ex) return [(int)$ex['job_id'], false];
    $co = db_row('SELECT id, name FROM companies WHERE id = ? AND deleted_at IS NULL', 'i', $companyId);
    if (!$co) tx_fail('Company not found', 404);
    $k = db_row('SELECT * FROM company_contacts WHERE id = ? AND company_id = ? AND active = 1', 'ii', $contactId, $companyId);
    if (!$k) tx_fail('Choose an active contact of this company', 400, ['errors' => ['contact_id' => 'Required']]);
    foreach ($items as $c) {
      if ($c['wearer_customer_id'] && !db_row('SELECT id FROM customers WHERE id = ? AND deleted_at IS NULL', 'i', $c['wearer_customer_id'])) tx_fail('A wearer was not found', 400);
    }
    [$id] = job_insert(['customer_id' => (int)$k['customer_id'], 'garment_type' => 'other', 'quantity' => max(1, company_items_qty($items)),
      'description' => $desc !== '' ? $desc : ($co['name'] . ' order'), 'due_date' => $due, 'job_stage' => 'quote', 'price' => '0.00'], $uid);
    $invoice = !empty($k['is_invoice_recipient']) ? (int)$k['id'] : null;
    $sample = !empty($b['sample_required']) ? 'pending' : 'not_required';
    db_exec("UPDATE tailoring_orders SET job_kind = 'company', company_id = ?, po_number = ?, invoice_contact_id = ?, measurement_method = ?, sample_status = ? WHERE id = ?",
      'isissi', $companyId, $po, $invoice, $method, $sample, $id);
    foreach ($items as $n => $c) cj_insert_item($id, $c, ($n + 1) * 10, $n === 0 ? $key : null);
    job_event($id, 'created', 'quote', 'Company job created for ' . $co['name'] . ' with ' . count($items) . ' item(s)', ['company_id' => $companyId], 0, $uid);
    return [$id, true];
  });
  if ($created) audit($uid, 'company_job_create', 'tailoring_order', $newId, ['company_id' => $companyId]);
  json(cj_job_answer($newId, true), $created ? 201 : 200);
}

/* ---- Read --------------------------------------------------------------------- */

if ($action === 'job' && method() === 'GET') {
  json(cj_job_answer($jobId, $isOwner));
}

/* ---- Job-level settings (Company tab) ------------------------------------------- */

if ($action === 'set' && method() === 'POST') {
  $b = body();
  db_tx(function () use ($jobId, $b, $uid) {
    $job = cj_lock($jobId);
    $f = [];
    if (array_key_exists('po_number', $b)) $f['po_number'] = mb_substr(trim(in_str($b, 'po_number')), 0, 60) ?: null;
    if (array_key_exists('measurement_method', $b)) {
      if (!in_array($b['measurement_method'], MEASUREMENT_METHODS, true)) tx_fail('measurement_method must be individual, sizes or mixed');
      $f['measurement_method'] = $b['measurement_method'];
    }
    if (array_key_exists('invoice_contact_id', $b)) {
      $cid = in_int($b, 'invoice_contact_id');
      if ($cid && !db_row('SELECT id FROM company_contacts WHERE id = ? AND company_id = ?', 'ii', $cid, (int)$job['company_id'])) tx_fail('That contact is not with this company', 400);
      $f['invoice_contact_id'] = $cid ?: null;
    }
    if (!$f) tx_fail('Nothing to change');
    $sets = implode(', ', array_map(fn($k) => "$k = ?", array_keys($f)));
    db_exec("UPDATE tailoring_orders SET $sets, lock_version = lock_version + 1 WHERE id = ?", str_repeat('s', count($f)) . 'i',
      ...array_merge(array_map(fn($v) => $v === null ? null : (string)$v, array_values($f)), [$jobId]));
    job_event($jobId, 'company', null, 'Company details changed', ['fields' => array_keys($f)], 0, $uid);
  });
  audit($uid, 'company_job_set', 'tailoring_order', $jobId);
  json(cj_job_answer($jobId, true));
}

/* ---- Items ----------------------------------------------------------------------- */

if ($action === 'item_save' && method() === 'POST') {
  $b = body();
  $c = cj_item_from_body($b);
  $itemId = in_int($b, 'item_id');
  $effect = mb_substr(trim(in_str($b, 'effect_note')), 0, 255);
  db_tx(function () use ($jobId, $itemId, $c, $effect, $uid) {
    $job = cj_lock($jobId);
    if (in_array($job['job_stage'], ['handed_over', 'cancelled'], true)) tx_fail('This job is closed', 409);
    if ($itemId) {
      $it = db_row('SELECT * FROM job_items WHERE id = ? AND job_id = ? FOR UPDATE', 'ii', $itemId, $jobId);
      if (!$it) tx_fail('Item not found', 404);
      if ($it['item_stage'] === 'cancelled') tx_fail('This item is cancelled', 409);
      if ($c['qty'] < (int)$it['qty_handed_over']) tx_fail('Quantity cannot be below what is already handed over', 409);
      // BR-30: once work has started, a change needs the owner to state its price or date effect.
      if ($it['item_stage'] !== 'pending' && $effect === '') {
        tx_fail('This item is already in production. Say what the change does to the price or date first.', 409, ['code' => 'effect_required']);
      }
      db_exec('UPDATE job_items SET description = ?, garment_type = ?, service_key = ?, qty = ?, size_label = ?, wearer_customer_id = ?, wearer_label = ?,
                      qty_ready = LEAST(qty_ready, ?), lock_version = lock_version + 1 WHERE id = ?', 'sssisisii',
        $c['description'], $c['garment_type'], $c['service_key'], $c['qty'], $c['size_label'], $c['wearer_customer_id'], $c['wearer_label'], $c['qty'], $itemId);
      if ((int)$it['wearer_customer_id'] !== (int)$c['wearer_customer_id']) db_exec('UPDATE job_items SET measurement_set_id = NULL, wearer_consent_at = NULL WHERE id = ?', 'i', $itemId);
      job_event($jobId, 'item', null, 'Item changed: ' . $c['description'] . ($effect !== '' ? ' (effect: ' . $effect . ')' : ''), ['item_id' => $itemId, 'effect' => $effect ?: null], 0, $uid);
    } else {
      $sort = (int)(db_row('SELECT COALESCE(MAX(sort), 0) AS m FROM job_items WHERE job_id = ?', 'i', $jobId)['m']) + 10;
      $newId = cj_insert_item($jobId, $c, $sort);
      job_event($jobId, 'item', null, 'Item added: ' . $c['qty'] . ' x ' . $c['description'], ['item_id' => $newId], 0, $uid);
    }
    cj_recount($jobId);
  });
  audit($uid, 'company_job_item_save', 'tailoring_order', $jobId, ['item_id' => $itemId ?: null]);
  json(cj_job_answer($jobId, true));
}

if ($action === 'item_cancel' && method() === 'POST') {
  $b = body();
  $itemId = in_int($b, 'item_id');
  $reason = mb_substr(trim(in_str($b, 'reason')), 0, 200);
  if ($reason === '') fail('Give a reason for cancelling the item');
  db_tx(function () use ($jobId, $itemId, $reason, $uid) {
    cj_lock($jobId);
    $it = db_row('SELECT * FROM job_items WHERE id = ? AND job_id = ? FOR UPDATE', 'ii', $itemId, $jobId);
    if (!$it) tx_fail('Item not found', 404);
    if ((int)$it['qty_handed_over'] > 0) tx_fail('Part of this item is already handed over; it cannot be cancelled', 409);
    db_exec("UPDATE job_items SET item_stage = 'cancelled', lock_version = lock_version + 1 WHERE id = ?", 'i', $itemId);
    job_event($jobId, 'item', null, 'Item cancelled: ' . $it['description'] . ' (' . $reason . ')', ['item_id' => $itemId], 0, $uid);
    cj_recount($jobId);
  });
  audit($uid, 'company_job_item_cancel', 'tailoring_order', $jobId, ['item_id' => $itemId]);
  json(cj_job_answer($jobId, true));
}

if ($action === 'item_progress' && method() === 'POST') {
  $b = body();
  $itemId = in_int($b, 'item_id');
  $ready = filter_var($b['qty_ready'] ?? null, FILTER_VALIDATE_INT);
  if ($ready === false || $ready < 0) fail('Ready quantity must be a whole number from 0');
  db_tx(function () use ($jobId, $itemId, $ready, $uid) {
    $job = cj_lock($jobId);
    if (in_array($job['job_stage'], ['quote', 'cancelled'], true)) tx_fail('Work has not started on this job', 409);
    $it = db_row('SELECT * FROM job_items WHERE id = ? AND job_id = ? FOR UPDATE', 'ii', $itemId, $jobId);
    if (!$it) tx_fail('Item not found', 404);
    if ($it['item_stage'] === 'cancelled') tx_fail('This item is cancelled', 409);
    if ($ready > (int)$it['qty']) tx_fail('Ready cannot be more than the item quantity (' . (int)$it['qty'] . ')', 409);
    if ($ready < (int)$it['qty_handed_over']) tx_fail('Ready cannot be below what is already handed over', 409);
    $stage = item_stage_after(['qty_ready' => $ready] + $it);
    db_exec('UPDATE job_items SET qty_ready = ?, item_stage = ?, lock_version = lock_version + 1 WHERE id = ?', 'isi', $ready, $stage, $itemId);
    job_event($jobId, 'item', null, $it['description'] . ': ' . $ready . ' of ' . (int)$it['qty'] . ' ready', ['item_id' => $itemId, 'qty_ready' => $ready], 0, $uid);
  });
  json(cj_job_answer($jobId, $isOwner));
}

if ($action === 'item_attach_measurement' && method() === 'POST') {
  $b = body();
  $itemId = in_int($b, 'item_id');
  $setId = in_int($b, 'measurement_set_id');
  db_tx(function () use ($jobId, $itemId, $setId, $uid) {
    cj_lock($jobId);
    $it = db_row('SELECT * FROM job_items WHERE id = ? AND job_id = ? FOR UPDATE', 'ii', $itemId, $jobId);
    if (!$it) tx_fail('Item not found', 404);
    if (!$it['wearer_customer_id']) tx_fail('Choose the wearer first', 409);
    $set = db_row('SELECT id, customer_id, status FROM measurement_sets WHERE id = ?', 'i', $setId);
    if (!$set || (int)$set['customer_id'] !== (int)$it['wearer_customer_id']) tx_fail('That measurement set does not belong to this wearer', 409);
    if ($set['status'] !== 'approved') tx_fail('Only approved measurements can be attached', 409);
    db_exec('UPDATE job_items SET measurement_set_id = ?, lock_version = lock_version + 1 WHERE id = ?', 'ii', $setId, $itemId);
    job_event($jobId, 'measurements', null, 'Measurements attached to ' . $it['description'], ['item_id' => $itemId, 'set_id' => $setId], 0, $uid);
  });
  json(cj_job_answer($jobId, true));
}

if ($action === 'wearer_invite' && method() === 'POST') {
  $b = body();
  $it = db_row('SELECT i.id, i.wearer_customer_id FROM job_items i JOIN tailoring_orders o ON o.id = i.job_id
                 WHERE i.id = ? AND i.job_id = ? AND o.job_kind = ?', 'iis', in_int($b, 'item_id'), $jobId, 'company');
  if (!$it) fail('Item not found', 404);
  if (!$it['wearer_customer_id']) fail('Choose the wearer first', 409);
  $c = db_row('SELECT id, name, phone FROM customers WHERE id = ? AND deleted_at IS NULL', 'i', (int)$it['wearer_customer_id']);
  if (!$c) fail('Wearer not found', 404);
  $out = customer_invite_create($c, $uid);
  job_event($jobId, 'access', null, 'Invite link made for a wearer', ['item_id' => (int)$it['id']], 0, $uid);
  json($out, 201);
}

/* ---- Samples ---------------------------------------------------------------------- */

if ($action === 'sample_submit' && method() === 'POST') {
  $b = body();
  $key = body_request_key($b);
  $desc = mb_substr(trim(in_str($b, 'description')), 0, 255);
  if ($desc === '') fail('Describe the sample');
  $itemId = in_int($b, 'item_id') ?: null;
  db_tx(function () use ($jobId, $key, $desc, $itemId, $uid) {
    global $conn;
    cj_lock($jobId);
    if (db_row('SELECT id FROM job_samples WHERE request_key = ?', 's', $key)) return;
    if ($itemId && !db_row('SELECT id FROM job_items WHERE id = ? AND job_id = ?', 'ii', $itemId, $jobId)) tx_fail('Item not found', 404);
    // A newer version replaces any version still waiting for a decision.
    db_exec("UPDATE job_samples SET status = 'withdrawn' WHERE job_id = ? AND status = 'submitted'", 'i', $jobId);
    $v = (int)(db_row('SELECT COALESCE(MAX(version), 0) AS v FROM job_samples WHERE job_id = ?', 'i', $jobId)['v']) + 1;
    db_exec("INSERT INTO job_samples (job_id, item_id, version, description, status, request_key) VALUES (?,?,?,?, 'submitted', ?)", 'iiiss', $jobId, $itemId, $v, $desc, $key);
    $sid = (int)$conn->insert_id;
    db_exec("UPDATE tailoring_orders SET sample_status = 'submitted', lock_version = lock_version + 1 WHERE id = ?", 'i', $jobId);
    job_event($jobId, 'sample', null, "Sample version $v submitted for approval", ['sample_id' => $sid, 'version' => $v], 1, $uid);
  });
  audit($uid, 'company_sample_submit', 'tailoring_order', $jobId);
  json(cj_job_answer($jobId, true), 201);
}

if ($action === 'sample_record_decision' && method() === 'POST') {
  $b = body();
  $sid = in_int($b, 'sample_id');
  $to = ['approve' => 'approved', 'changes' => 'changes_requested'][in_str($b, 'decision')] ?? null;
  if (!$to) fail('decision must be approve or changes');
  $channel = in_str($b, 'channel');
  if (!in_array($channel, array_diff(SAMPLE_DECISION_CHANNELS, ['portal']), true)) fail('channel must be in_person, whatsapp, email or phone');
  $note = mb_substr(trim(in_str($b, 'note')), 0, 500) ?: null;
  $contactId = in_int($b, 'contact_id') ?: null;
  db_tx(function () use ($jobId, $sid, $to, $channel, $note, $contactId, $uid) {
    $job = cj_lock($jobId);
    $s = db_row('SELECT * FROM job_samples WHERE id = ? AND job_id = ? FOR UPDATE', 'ii', $sid, $jobId);
    if (!$s) tx_fail('Sample not found', 404);
    if (!sample_transition_ok($s['status'], $to)) tx_fail('This sample version has already been decided', 409);
    if ($contactId && !db_row('SELECT id FROM company_contacts WHERE id = ? AND company_id = ?', 'ii', $contactId, (int)$job['company_id'])) tx_fail('That contact is not with this company', 400);
    db_exec('UPDATE job_samples SET status = ?, decided_channel = ?, decided_contact_id = ?, decided_by_user = ?, decision_note = ?, decided_at = UTC_TIMESTAMP() WHERE id = ?',
      'ssiisi', $to, $channel, $contactId, $uid, $note, $sid);
    db_exec('UPDATE tailoring_orders SET sample_status = ?, lock_version = lock_version + 1 WHERE id = ?', 'si', job_sample_status_for($to), $jobId);
    job_event($jobId, 'sample', null, 'Sample version ' . (int)$s['version'] . ($to === 'approved' ? ' approved' : ': changes requested') . ' (' . str_replace('_', ' ', $channel) . ')',
      ['sample_id' => $sid, 'decision' => $to, 'channel' => $channel], 1, $uid);
  });
  audit($uid, 'company_sample_decision', 'tailoring_order', $jobId, ['sample_id' => $sid, 'decision' => $to, 'channel' => $channel]);
  json(cj_job_answer($jobId, true));
}

/* ---- Handover by item ----------------------------------------------------------- */

if ($action === 'handover' && method() === 'POST') {
  $b = body();
  $key = body_request_key($b);
  $method = in_str($b, 'method');
  if (!in_array($method, ['collection', 'delivery'], true)) fail('Method must be collection or delivery');
  $res = db_tx(function () use ($jobId, $key, $method, $b, $user) {
    global $conn;
    $job = cj_lock($jobId);
    $ex = db_row('SELECT id FROM job_handovers WHERE request_key = ?', 's', $key);
    if ($ex) return ['hid' => (int)$ex['id'], 'already' => true, 'balance' => 0];
    if (in_array($job['job_stage'], ['quote', 'cancelled', 'handed_over'], true)) {
      tx_fail('This job cannot be handed over at stage ' . (JOB_STAGE_LABELS[$job['job_stage']] ?? $job['job_stage']), 409);
    }
    $items = [];
    foreach (cj_items($jobId, true) as $i) $items[(int)$i['id']] = $i;
    [$ok, $errors, $lines] = handover_items_ok($items, $b['items'] ?? null);
    if (!$ok) tx_fail('Check the quantities', 422, ['errors' => $errors]);
    $qty = array_sum($lines);
    db_exec("INSERT INTO job_handovers (job_id, method, status, quantity, request_key, recorded_by) VALUES (?,?, 'planned', ?,?,?)",
      'isisi', $jobId, $method, $qty, $key, (int)$user['id']);
    $hid = (int)$conn->insert_id;
    foreach ($lines as $itemId => $n) {
      db_exec('INSERT INTO job_handover_items (handover_id, item_id, qty) VALUES (?,?,?)', 'iii', $hid, $itemId, $n);
      db_exec('UPDATE job_items SET qty_handed_over = qty_handed_over + ?, lock_version = lock_version + 1 WHERE id = ?', 'ii', $n, $itemId);
    }
    cj_recount($jobId);
    $job = cj_lock($jobId);   // re-read under the same lock: quantity is now the item total
    [, , , $bal] = handover_complete_tx($job, $hid, $b, $user);
    return ['hid' => $hid, 'already' => false, 'balance' => $bal];
  });
  if (!$res['already']) audit($uid, 'company_job_handover', 'tailoring_order', $jobId, ['handover_id' => $res['hid']]);
  $out = cj_job_answer($jobId, true);
  $out['already_recorded'] = $res['already'];
  if (!$res['already'] && $res['balance'] > 0) $out['warning'] = 'Handed over with ₦' . number_format(intdiv($res['balance'], 100)) . ' still to pay';
  json($out, $res['already'] ? 200 : 201);
}

fail('Unknown action', 404);
