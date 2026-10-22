<?php
/**
 * HeritOS: Clients (CRM). One record per person or company; measurement sets,
 * jobs and payments hang off it.
 *
 *   GET  ?action=list[&q=]            clients + job summary (money for owner roles only)
 *   GET  ?action=get&id=N             client + jobs + measurement set summary + payments summary
 *   GET  ?action=match&phone=&email=  up to 5 existing clients sharing that phone or email
 *   POST ?action=create  {name, phone, email, notes, company_name, preferred_contact, comm_notes,
 *                         confirm_new?, measurements?}   409 {candidates} on a phone/email match
 *   POST ?action=update&id=N {name, phone, email, notes, tags, segment, birthday, company_name,
 *                             preferred_contact, comm_notes}
 *   POST ?action=measure&id=N {measurements}   legacy form; now creates a measurement set
 *
 * The client reference (CL-00042) is a staff locator, never an access credential.
 * Phone is never the key and duplicates only warn (BR-03).
 */
require __DIR__ . '/_lib.php';
require __DIR__ . '/_jobs.php';
cors();

$user = require_auth(ROLES_CLIENTS);
$isOwner = is_owner_role($user['role']);
$action = $_GET['action'] ?? 'list';
$id = in_int($_GET, 'id');

/** Optional client fields from a body, validated. */
function client_fields(array $b) {
  $f = [];
  foreach (['phone' => 40, 'email' => 190, 'notes' => 5000, 'tags' => 255, 'segment' => 60, 'company_name' => 160, 'comm_notes' => 255] as $k => $max) {
    if (!array_key_exists($k, $b)) continue;
    $v = trim(in_str($b, $k));
    if (mb_strlen($v) > $max) fail("$k is too long");
    $f[$k] = $v;
  }
  if (isset($f['email']) && $f['email'] !== '' && !filter_var($f['email'], FILTER_VALIDATE_EMAIL)) fail('That email address looks wrong');
  if (array_key_exists('preferred_contact', $b)) {
    $p = $b['preferred_contact'];
    if ($p === null || $p === '') $f['preferred_contact'] = null;
    elseif (!in_array($p, ['whatsapp', 'phone', 'email'], true)) fail('Preferred contact must be whatsapp, phone or email');
    else $f['preferred_contact'] = $p;
  }
  return $f;
}

/* ---- LIST ---------------------------------------------------------------- */
if ($action === 'list' && method() === 'GET') {
  $where = 'c.deleted_at IS NULL'; $types = ''; $args = [];
  $q = trim(in_str($_GET, 'q'));
  if ($q !== '') {
    $like = '%' . $q . '%';
    $tail = phone_tail9($q);
    $where .= ' AND (c.name LIKE ? OR c.client_ref LIKE ? OR c.company_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?'
            . ($tail !== '' ? ' OR c.phone_tail9 = ?' : '') . ')';
    $types .= 'sssss'; array_push($args, $like, $like, $like, $like, $like);
    if ($tail !== '') { $types .= 's'; $args[] = $tail; }
  }
  $rows = db_rows(
    "SELECT c.id, c.client_ref, c.name, c.phone, c.email, c.company_name, c.preferred_contact, c.tags, c.segment, c.loyalty_points,
            COUNT(o.id) AS order_count,
            COALESCE(SUM(o.job_stage NOT IN ('handed_over','cancelled')), 0) AS active_orders,
            COALESCE(SUM(o.price), 0) AS ordered_value,
            COALESCE(SUM(CASE WHEN o.job_stage NOT IN ('quote','cancelled') AND o.price > o.paid_total THEN o.price - o.paid_total ELSE 0 END), 0) AS balance_due
       FROM customers c
  LEFT JOIN tailoring_orders o ON o.customer_id = c.id AND o.deleted_at IS NULL
      WHERE $where
   GROUP BY c.id
   ORDER BY c.name LIMIT 1000", $types, ...$args);
  foreach ($rows as &$r) {
    $r['id'] = (int)$r['id']; $r['order_count'] = (int)$r['order_count']; $r['active_orders'] = (int)$r['active_orders'];
    $r['job_count'] = $r['order_count']; $r['active_jobs'] = $r['active_orders'];
    if (!$isOwner) unset($r['ordered_value'], $r['balance_due']);
  }
  json($rows);
}

/* ---- MATCH (duplicate warning before create) ------------------------------ */
if ($action === 'match' && method() === 'GET') {
  json(['candidates' => customer_candidates(in_str($_GET, 'phone'), in_str($_GET, 'email'), in_int($_GET, 'exclude_id'))]);
}

/* ---- GET ONE ------------------------------------------------------------- */
if ($action === 'get' && method() === 'GET') {
  $customer = db_row('SELECT * FROM customers WHERE id = ? AND deleted_at IS NULL', 'i', $id);
  if (!$customer) fail('Customer not found', 404);
  $customer['id'] = (int)$customer['id'];
  $customer['measurements'] = $customer['measurements'] !== null ? json_decode($customer['measurements'], true) : null;  // legacy, read-only
  unset($customer['phone_tail9']);

  $jobs = db_rows(
    "SELECT id, code, garment_type, quantity, description, fabric, stage, job_stage, stage_review, payment_state, price, paid_total,
            due_date, event_date, next_action_date, handed_over_qty
       FROM tailoring_orders WHERE customer_id = ? AND deleted_at IS NULL ORDER BY id DESC", 'i', $id);
  $sum = ['paid' => 0, 'balance' => 0, 'credit' => 0];
  foreach ($jobs as &$j) {
    $j['id'] = (int)$j['id'];
    $j['job_stage'] = job_stage_of($j);
    $j['stage_label'] = JOB_STAGE_LABELS[$j['job_stage']] ?? null;
    $pm = decimal_to_minor($j['price']); $paid = decimal_to_minor($j['paid_total']);
    $j['balance'] = minor_to_decimal(max(0, $pm - $paid));
    $sum['paid'] += $paid;
    if ($j['job_stage'] !== 'cancelled' && $j['job_stage'] !== 'quote') $sum['balance'] += max(0, $pm - $paid);
    if ($pm > 0) $sum['credit'] += max(0, $paid - $pm);
    if (!$isOwner) $j = job_strip_money($j);
  }
  unset($j);
  $customer['jobs'] = $jobs;
  $customer['orders'] = $jobs;                      // old screen reads `orders`

  $recheck = (int)setting_get('measurement_recheck_days', 180);
  $sets = db_rows(
    "SELECT s.id, s.template_key, t.label AS template_label, s.unit, s.status, s.source, s.fit_preference, s.taken_at,
            s.approved_at, s.created_at, s.supersedes_id
       FROM measurement_sets s LEFT JOIN measurement_templates t ON t.tkey = s.template_key
      WHERE s.customer_id = ? ORDER BY s.id DESC", 'i', $id);
  $cut = date_add_days(lagos_today(), -$recheck);
  foreach ($sets as &$s) {
    $s['id'] = (int)$s['id'];
    $s['recheck_due'] = $s['status'] === 'approved' && $s['taken_at'] !== null && $s['taken_at'] < $cut;
  }
  unset($s);
  $customer['measurement_sets'] = $sets;
  $customer['measurement_recheck_days'] = $recheck;

  if ($isOwner) {
    $uv = db_row("SELECT COUNT(*) AS n, COALESCE(SUM(p.amount),0) AS t FROM job_payments p JOIN tailoring_orders o ON o.id = p.job_id
                   WHERE o.customer_id = ? AND p.verified = 0 AND p.kind <> 'reversal'
                     AND NOT EXISTS (SELECT 1 FROM job_payments r WHERE r.reverses_id = p.id)", 'i', $id);
    $customer['payments_summary'] = [
      'paid_verified' => minor_to_decimal($sum['paid']), 'balance_due' => minor_to_decimal($sum['balance']),
      'credit' => minor_to_decimal($sum['credit']), 'unverified_count' => (int)$uv['n'],
      'unverified_total' => minor_to_decimal(decimal_to_minor($uv['t'])),
    ];
  }
  json($customer);
}

/* ---- CREATE -------------------------------------------------------------- */
if ($action === 'create' && method() === 'POST') {
  $b = body();
  $name = trim(in_str($b, 'name'));
  if ($name === '') fail('Customer name is required');
  if (mb_strlen($name) > 160) fail('Name is too long');
  $f = client_fields($b);
  if (empty($b['confirm_new'])) {
    $cands = customer_candidates($f['phone'] ?? '', $f['email'] ?? '');
    if ($cands) json(['error' => 'A client with this phone or email already exists. Open it, or confirm this is a new client.', 'candidates' => $cands], 409);
  }
  $newId = customer_insert($f + ['name' => $name], $user['id']);
  $extra = client_after_create($newId, $b, $user);
  audit($user['id'], 'customer_create', 'customer', $newId, ['name' => $name]);
  json(['id' => $newId, 'client_ref' => client_ref_from_id($newId)] + $extra, 201);
}

/** After a client is created: measurements from the old form become a set (never fatal). */
function client_after_create($customerId, array $b, $user) {
  if (!is_array($b['measurements'] ?? null) || !$b['measurements']) return [];
  $r = legacy_measure_to_set($customerId, $b['measurements'], in_str($b, 'unit', 'in'), 'owner', is_owner_role($user['role']), $user['id']);
  // Mirror the old JSON column for this release so the old client screen still shows it.
  db_exec('UPDATE customers SET measurements = ? WHERE id = ?', 'si', json_encode($b['measurements']), $customerId);
  return array_filter(['measurement_set_id' => $r['set']['id'] ?? null, 'measurement_errors' => $r['errors'] ?: null,
                       'measurement_warnings' => $r['warnings'] ?: null]);
}

/* ---- UPDATE -------------------------------------------------------------- */
if ($action === 'update' && method() === 'POST') {
  $b = body();
  $name = trim(in_str($b, 'name'));
  if ($name === '') fail('Customer name is required');
  $f = client_fields($b);
  $f['name'] = $name;
  if (array_key_exists('birthday', $b)) {
    $f['birthday'] = ($b['birthday'] === '' || $b['birthday'] === null) ? null : ymd_or_null($b['birthday']);
    if ($b['birthday'] && $f['birthday'] === null) fail('Invalid birthday (use YYYY-MM-DD)');
  }
  if (array_key_exists('phone', $f)) $f['phone_tail9'] = phone_tail9($f['phone']) ?: null;
  $sets = []; $types = ''; $args = [];
  foreach ($f as $col => $val) { $sets[] = "`$col` = ?"; $types .= 's'; $args[] = $val; }
  $types .= 'i'; $args[] = $id;
  db_exec('UPDATE customers SET ' . implode(', ', $sets) . ' WHERE id = ? AND deleted_at IS NULL', $types, ...$args);
  audit($user['id'], 'customer_update', 'customer', $id, ['fields' => array_keys($f)]);
  // Duplicates only warn; nothing is merged.
  json(['ok' => true, 'candidates' => customer_candidates($f['phone'] ?? '', $f['email'] ?? '', $id)]);
}

/* ---- UPCOMING BIRTHDAYS (gifting prompts) -------------------------------- */
if ($action === 'birthdays' && method() === 'GET') {
  $rows = [];
  // Next 30 days, ignoring year (month/day window).
  $res = $conn->query(
    "SELECT id, name, phone, birthday,
            DATE_FORMAT(birthday, '%m-%d') AS md
       FROM customers
      WHERE deleted_at IS NULL AND birthday IS NOT NULL
        AND (
          (DAYOFYEAR(birthday) - DAYOFYEAR(CURDATE()) + 366) % 366 <= 30
        )
   ORDER BY (DAYOFYEAR(birthday) - DAYOFYEAR(CURDATE()) + 366) % 366 ASC
      LIMIT 20"
  );
  while ($res && $row = $res->fetch_assoc()) $rows[] = $row;
  json($rows);
}

/* ---- MEASUREMENTS (legacy form, kept for cached screens) ----------------- */
/* {measurements, unit?}. Creates a measurement set (template 'legacy', inches as
 * the old form states): approved for owner roles, pending otherwise. The old
 * JSON column is mirrored for this release.                                 */
if ($action === 'measure' && method() === 'POST') {
  $b = body();
  $vals = is_array($b['measurements'] ?? null) ? $b['measurements'] : [];
  if (!db_row('SELECT id FROM customers WHERE id = ? AND deleted_at IS NULL', 'i', $id)) fail('Customer not found', 404);
  $key = isset($b['request_key']) && $b['request_key'] !== '' ? body_request_key($b) : null;
  $r = legacy_measure_to_set($id, $vals, in_str($b, 'unit', 'in'), 'owner', $isOwner, $user['id'], $key);
  if ($r['errors']) json(['error' => 'Some measurements need fixing', 'errors' => $r['errors']], 400);
  db_exec('UPDATE customers SET measurements = ? WHERE id = ? AND deleted_at IS NULL', 'si', $vals ? json_encode($vals) : null, $id);
  audit($user['id'], 'customer_measure', 'customer', $id, ['set_id' => $r['set']['id'] ?? null]);
  json(['ok' => true, 'set_id' => $r['set']['id'] ?? null, 'set_status' => $r['set']['status'] ?? null, 'warnings' => $r['warnings']]);
}

fail('Unknown action', 404);
