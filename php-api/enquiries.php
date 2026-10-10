<?php
/**
 * HeritOS: Enquiry pipeline (staff side). The public form still posts to
 * contact.php; this endpoint works the pipeline and converts enquiries.
 *
 *   GET  ?action=list[&status=][&q=]      {items, counts}
 *   GET  ?action=get&id=N                 enquiry + client/job links + matching clients
 *   POST ?action=create                   staff-entered enquiry {name, phone, email, ..., request_key?}
 *   POST ?action=update&id=N              {status, next_follow_up, owner_notes, company, quantity,
 *                                          desired_date, closed_reason, interest, type}
 *   POST ?action=link_client&id=N         {client_id}
 *   POST ?action=convert&id=N   (owner)   {request_key, client:{id}|{name,phone,email,confirm_new},
 *                                          job:{garment_type, description, quantity, event_date, due_date, ...}}
 *
 * Statuses: new, awaiting_reply, quote_sent, accepted, closed. 'contacted' is a
 * legacy alias of awaiting_reply and is mapped on every write. quote_sent and
 * accepted are also set automatically by quotes.php.
 */
require __DIR__ . '/_lib.php';
require __DIR__ . '/_jobs.php';
cors();

$TYPES = ['fitting', 'bespoke', 'wholesale', 'general'];
$GARMENTS = ['agbada', 'kaftan', 'senator', 'suit', 'shirt', 'trouser', 'other'];
$user = require_auth(ROLES_ENQUIRY);
$isOwner = is_owner_role($user['role']);
$action = $_GET['action'] ?? 'list';
$id = (int)($_GET['id'] ?? 0);

function enquiry_view(array $e) {
  foreach (['id', 'quantity', 'client_id', 'job_id', 'converted_by'] as $k) {
    if (array_key_exists($k, $e) && $e[$k] !== null) $e[$k] = (int)$e[$k];
  }
  $e['status'] = enquiry_status_from_legacy($e['status']) ?? $e['status'];
  unset($e['conversion_key'], $e['request_key']);
  return $e;
}

const ENQ_COLS = 'e.id, e.name, e.phone, e.email, e.company, e.type, e.interest, e.quantity, e.desired_date, e.message,
  e.status, e.next_follow_up, e.closed_reason, e.owner_notes, e.client_id, e.job_id, e.converted_at, e.converted_by,
  e.source, e.created_at, e.updated_at';

/** Validated optional fields shared by create and update. */
function enquiry_fields(array $b, array $types) {
  $f = [];
  foreach (['company' => 160, 'interest' => 120, 'closed_reason' => 120, 'owner_notes' => 5000] as $k => $max) {
    if (!array_key_exists($k, $b)) continue;
    $v = trim((string)$b[$k]);
    if (mb_strlen($v) > $max) fail("$k is too long");
    $f[$k] = $v === '' ? null : $v;
  }
  foreach (['desired_date', 'next_follow_up'] as $k) {
    if (!array_key_exists($k, $b)) continue;
    if ($b[$k] === null || $b[$k] === '') { $f[$k] = null; continue; }
    if (($d = ymd_or_null($b[$k])) === null) fail("Invalid date for $k (use YYYY-MM-DD)");
    $f[$k] = $d;
  }
  if (array_key_exists('quantity', $b)) {
    if ($b['quantity'] === null || $b['quantity'] === '') $f['quantity'] = null;
    else {
      $q = filter_var($b['quantity'], FILTER_VALIDATE_INT);
      if ($q === false || $q < 1 || $q > 9999) fail('Quantity must be a whole number from 1');
      $f['quantity'] = $q;
    }
  }
  if (array_key_exists('type', $b)) {
    if (!in_array($b['type'], $types, true)) fail('Unknown enquiry type');
    $f['type'] = $b['type'];
  }
  return $f;
}

/* ---- LIST ---------------------------------------------------------------- */
if ($action === 'list' && method() === 'GET') {
  $where = '1'; $types = ''; $args = [];
  if (!empty($_GET['status'])) {
    $st = enquiry_status_from_legacy($_GET['status']);
    if ($st === null) fail('Unknown status');
    if ($st === 'awaiting_reply') $where .= " AND e.status IN ('awaiting_reply','contacted')";
    else { $where .= ' AND e.status = ?'; $types .= 's'; $args[] = $st; }
  }
  if (trim($_GET['q'] ?? '') !== '') {
    $q = '%' . trim($_GET['q']) . '%';
    $where .= ' AND (e.name LIKE ? OR e.phone LIKE ? OR e.email LIKE ? OR e.company LIKE ?)';
    $types .= 'ssss'; array_push($args, $q, $q, $q, $q);
  }
  $items = array_map('enquiry_view', db_rows('SELECT ' . ENQ_COLS . " FROM enquiries e WHERE $where
    ORDER BY e.next_follow_up IS NULL, e.next_follow_up, e.id DESC LIMIT 500", $types, ...$args));
  $counts = array_fill_keys(ENQUIRY_STATUSES, 0);
  foreach (db_rows('SELECT status, COUNT(*) AS n FROM enquiries GROUP BY status') as $r) {
    $s = enquiry_status_from_legacy($r['status']);
    if ($s !== null) $counts[$s] += (int)$r['n'];
  }
  json(['items' => $items, 'counts' => $counts, 'today' => lagos_today()]);
}

/* ---- GET ONE ------------------------------------------------------------- */
if ($action === 'get' && method() === 'GET') {
  $e = db_row('SELECT ' . ENQ_COLS . ' FROM enquiries e WHERE e.id = ?', 'i', $id);
  if (!$e) fail('Enquiry not found', 404);
  $e = enquiry_view($e);
  $e['client'] = $e['client_id'] ? db_row('SELECT id, client_ref, name, phone, email FROM customers WHERE id = ?', 'i', $e['client_id']) : null;
  $e['job'] = $e['job_id'] ? db_row('SELECT id, code, job_stage, due_date, event_date FROM tailoring_orders WHERE id = ?', 'i', $e['job_id']) : null;
  $e['candidates'] = $e['client_id'] ? [] : customer_candidates($e['phone'], $e['email']);
  if ($isOwner) {
    $e['quotes'] = db_rows("SELECT id, series_id, version, status, total, sent_at, accepted_at FROM quotes
                             WHERE enquiry_id = ? OR (job_id IS NOT NULL AND job_id = ?) ORDER BY id DESC", 'ii', $id, (int)$e['job_id']);
  }
  json($e);
}

/* ---- CREATE (staff-entered: phone call, walk-in, WhatsApp) ---------------- */
if ($action === 'create' && method() === 'POST') {
  $b = body();
  $key = isset($b['request_key']) && $b['request_key'] !== '' ? body_request_key($b) : null;
  if ($key !== null && ($ex = db_row('SELECT id FROM enquiries WHERE request_key = ?', 's', $key))) {
    json(['id' => (int)$ex['id'], 'duplicate' => true]);
  }
  $name = trim((string)($b['name'] ?? ''));
  $phone = trim((string)($b['phone'] ?? ''));
  $email = trim((string)($b['email'] ?? ''));
  if ($name === '') fail('Name is required');
  if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) fail('That email address looks wrong');
  $f = enquiry_fields($b, $TYPES);
  $type = $f['type'] ?? 'general';
  $message = trim((string)($b['message'] ?? ''));
  $source = preg_match('/^[a-z_]{1,40}$/', (string)($b['source'] ?? '')) ? $b['source'] : 'staff';
  try {
    db_exec('INSERT INTO enquiries (name, phone, email, company, type, interest, quantity, desired_date, message, status,
                                    next_follow_up, owner_notes, source, request_key)
             VALUES (?,?,?,?,?,?,?,?,?, \'new\', ?,?,?,?)', 'ssssssissssss',
      $name, $phone, $email, $f['company'] ?? null, $type, $f['interest'] ?? null, $f['quantity'] ?? null,
      $f['desired_date'] ?? null, $message, $f['next_follow_up'] ?? null, $f['owner_notes'] ?? null, $source, $key);
  } catch (mysqli_sql_exception $e) {
    if (!is_duplicate_key($e) || $key === null) throw $e;
    json(['id' => (int)db_row('SELECT id FROM enquiries WHERE request_key = ?', 's', $key)['id'], 'duplicate' => true]);
  }
  $newId = (int)$conn->insert_id;
  audit($user['id'], 'enquiry_create', 'enquiry', $newId, ['source' => $source]);
  json(['id' => $newId, 'duplicate' => false], 201);
}

/* ---- UPDATE -------------------------------------------------------------- */
if ($action === 'update' && method() === 'POST') {
  $b = body();
  $f = enquiry_fields($b, $TYPES);
  $out = db_tx(function () use ($id, $b, $f, $user) {
    $e = db_row('SELECT id, status FROM enquiries WHERE id = ? FOR UPDATE', 'i', $id);
    if (!$e) tx_fail('Enquiry not found', 404);
    if (array_key_exists('status', $b)) {
      $to = enquiry_status_from_legacy((string)$b['status']);
      if ($to === null) tx_fail('Unknown status');
      $from = enquiry_status_from_legacy($e['status']);
      if ($to !== $from) {
        if (!enquiry_transition_ok($from, $to)) tx_fail("Cannot move an enquiry from $from to $to", 409, ['allowed' => ENQUIRY_TRANSITIONS[$from] ?? []]);
        $f['status'] = $to;
      } elseif ($e['status'] === 'contacted') {
        $f['status'] = 'awaiting_reply';                               // tidy the legacy alias
      }
    }
    if (!$f) tx_fail('Nothing to update');
    $sets = []; $types = ''; $args = [];
    foreach ($f as $col => $val) { $sets[] = "`$col` = ?"; $types .= $col === 'quantity' ? 'i' : 's'; $args[] = $val; }
    $types .= 'i'; $args[] = $id;
    db_exec('UPDATE enquiries SET ' . implode(', ', $sets) . ' WHERE id = ?', $types, ...$args);
    return $f;
  });
  audit($user['id'], 'enquiry_update', 'enquiry', $id, ['fields' => array_keys($out), 'status' => $out['status'] ?? null]);
  json(['ok' => true] + enquiry_view(db_row('SELECT ' . ENQ_COLS . ' FROM enquiries e WHERE e.id = ?', 'i', $id)));
}

/* ---- LINK TO AN EXISTING CLIENT ------------------------------------------ */
if ($action === 'link_client' && method() === 'POST') {
  $b = body();
  $cid = (int)($b['client_id'] ?? 0);
  if (!db_row('SELECT id FROM customers WHERE id = ? AND deleted_at IS NULL', 'i', $cid)) fail('Client not found', 404);
  $e = db_row('SELECT id, job_id FROM enquiries WHERE id = ?', 'i', $id);
  if (!$e) fail('Enquiry not found', 404);
  if ($e['job_id']) fail('This enquiry is already converted to a job', 409);
  db_exec('UPDATE enquiries SET client_id = ? WHERE id = ?', 'ii', $cid, $id);
  audit($user['id'], 'enquiry_link_client', 'enquiry', $id, ['client_id' => $cid]);
  json(['ok' => true, 'client_id' => $cid]);
}

/* ---- CONVERT TO CLIENT + JOB (idempotent, BR-02) -------------------------- */
/* One transaction under a row lock on the enquiry. Retrying with any key after a
 * successful conversion returns the same client and job with duplicate:true.
 * A matching phone or email answers 409 {candidates} unless client.id or
 * client.confirm_new is sent (BR-03: never merge silently).                  */
if ($action === 'convert' && method() === 'POST') {
  if (!$isOwner) fail('Forbidden', 403);
  $b = body();
  $key = body_request_key($b);
  $c = is_array($b['client'] ?? null) ? $b['client'] : [];
  $j = is_array($b['job'] ?? null) ? $b['job'] : [];

  $garment = $j['garment_type'] ?? 'other';
  if (!in_array($garment, $GARMENTS, true)) fail('Unknown garment type');
  $jf = ['garment_type' => $garment];
  foreach (['event_date', 'due_date', 'next_action_date'] as $k) {
    if (!empty($j[$k])) { if (($d = ymd_or_null($j[$k])) === null) fail("Invalid date for $k"); $jf[$k] = $d; }
  }
  if (isset($j['quantity']) && $j['quantity'] !== '') {
    $q = filter_var($j['quantity'], FILTER_VALIDATE_INT);
    if ($q === false || $q < 1) fail('Quantity must be a whole number from 1');
    $jf['quantity'] = $q;
  }
  if (isset($j['description'])) $jf['description'] = mb_substr(trim((string)$j['description']), 0, 255) ?: null;
  if (isset($j['next_action'])) $jf['next_action'] = mb_substr(trim((string)$j['next_action']), 0, 160) ?: null;
  if (!empty($j['fabric_source'])) {
    if (!in_array($j['fabric_source'], ['client', 'herit', 'mixed'], true)) fail('Fabric source must be client, herit or mixed');
    $jf['fabric_source'] = $j['fabric_source'];
  }

  $res = db_tx(function () use ($id, $key, $c, $jf, $user) {
    $e = db_row('SELECT * FROM enquiries WHERE id = ? FOR UPDATE', 'i', $id);
    if (!$e) tx_fail('Enquiry not found', 404);
    if ($e['job_id']) return ['client_id' => (int)$e['client_id'], 'job_id' => (int)$e['job_id'], 'duplicate' => true];
    $other = db_row('SELECT id FROM enquiries WHERE conversion_key = ? AND id <> ?', 'si', $key, $id);
    if ($other) tx_fail('That request key was already used for another enquiry', 409);

    $client = $c + ['name' => $e['name'], 'phone' => $e['phone'], 'email' => $e['email']];
    if (empty($client['id']) && empty($client['company_name']) && !empty($e['company'])) $client['company_name'] = $e['company'];
    if (empty($client['id']) && !empty($e['client_id'])) $client['id'] = (int)$e['client_id'];
    [$clientId, $created] = resolve_client($client, $user['id'], true);

    $fields = $jf + ['customer_id' => $clientId, 'job_stage' => 'quote', 'enquiry_id' => $id,
                     'quantity' => $jf['quantity'] ?? ($e['quantity'] ?: 1),
                     'description' => $jf['description'] ?? ($e['interest'] ?: null)];
    [$jobId, $code] = job_insert($fields, $user['id']);
    job_event($jobId, 'stage', 'quote', 'Job created from enquiry #' . $id, ['to' => 'quote', 'enquiry_id' => $id], 1, $user['id']);

    $status = enquiry_status_from_legacy($e['status']) === 'new' ? 'awaiting_reply' : enquiry_status_from_legacy($e['status']);
    db_exec('UPDATE enquiries SET client_id = ?, job_id = ?, conversion_key = ?, converted_at = UTC_TIMESTAMP(), converted_by = ?, status = ?
              WHERE id = ?', 'iisisi', $clientId, $jobId, $key, $user['id'], $status, $id);
    audit($user['id'], 'enquiry_convert', 'enquiry', $id, ['client_id' => $clientId, 'job_id' => $jobId, 'new_client' => $created]);
    return ['client_id' => $clientId, 'job_id' => $jobId, 'job_code' => $code, 'client_created' => $created, 'duplicate' => false];
  });
  json($res, $res['duplicate'] ? 200 : 201);
}

fail('Unknown action', 404);
