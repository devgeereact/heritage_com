<?php
/**
 * HeritOS: Measurement sets and templates.
 *
 *   GET  ?action=templates[&all=1]            templates (all=1 adds hidden/inactive, owner roles)
 *   POST ?action=template_save   (owner)      {tkey, label, fields:[{key,label,guide,hidden?}], active, sort, proposed, note}
 *   GET  ?action=list&customer_id=N           a client's sets, newest first
 *   GET  ?action=get&id=N                     one set
 *   POST ?action=create                       {customer_id, template_key, unit, vals, fit_preference, notes, taken_at, request_key}
 *   POST ?action=approve&id=N    (owner)      {unit?} unit is required when the set's unit is 'unknown'
 *   POST ?action=reject&id=N     (owner)      {reason}
 *   GET  ?action=convert_preview&id=N&to=cm|in   converted values for display only (never stored)
 *
 * Values are immutable: there is no update action; a correction is a new set.
 * A set entered by an owner role is approved at once and supersedes the previous
 * approved set for that client and template; a tailor's set is pending.
 * Workshop roles (owner roles plus tailor).
 */
require __DIR__ . '/_lib.php';
require __DIR__ . '/_jobs.php';
cors();

$user = require_auth(ROLES_WORKSHOP);
$isOwner = is_owner_role($user['role']);
$action = $_GET['action'] ?? '';
$id = in_int($_GET, 'id');

/** Field keys already used by any set of this template (they cannot be removed or renamed). */
function template_used_keys($tkey) {
  $used = [];
  foreach (db_rows('SELECT vals FROM measurement_sets WHERE template_key = ?', 's', $tkey) as $r) {
    foreach (array_keys(json_decode($r['vals'], true) ?: []) as $k) $used[$k] = true;
  }
  return array_keys($used);
}

function template_view(array $t) {
  $t['id'] = (int)$t['id'];
  $t['fields'] = is_array($t['fields']) ? $t['fields'] : (json_decode($t['fields'], true) ?: []);
  $t['active'] = (int)$t['active'];
  $t['proposed'] = (int)$t['proposed'];
  $t['sort'] = (int)$t['sort'];
  return $t;
}

/** Set row plus template label and recheck flag. */
function set_view_full(array $s) {
  static $recheck = null, $labels = [];
  if ($recheck === null) $recheck = (int)setting_get('measurement_recheck_days', 180);
  $s = measurement_set_view($s);
  if (!array_key_exists($s['template_key'], $labels)) {
    $t = db_row('SELECT label FROM measurement_templates WHERE tkey = ?', 's', $s['template_key']);
    $labels[$s['template_key']] = $t ? $t['label'] : $s['template_key'];
  }
  $s['template_label'] = $labels[$s['template_key']];
  $s['recheck_due'] = $s['status'] === 'approved' && !empty($s['taken_at']) && $s['taken_at'] < date_add_days(lagos_today(), -$recheck);
  $s['needs_unit'] = $s['unit'] === 'unknown';
  unset($s['request_key']);
  return $s;
}

/* ---- TEMPLATES ------------------------------------------------------------ */
if ($action === 'templates' && method() === 'GET') {
  $all = $isOwner && !empty($_GET['all']);
  $rows = db_rows('SELECT * FROM measurement_templates' . ($all ? '' : ' WHERE active = 1') . ' ORDER BY sort, id');
  json(array_map('template_view', $rows));
}

if ($action === 'template_save' && method() === 'POST') {
  if (!$isOwner) fail('Forbidden', 403);
  $b = body();
  $tkey = in_str($b, 'tkey');
  if (!preg_match('/^[a-z][a-z0-9_]{1,39}$/', $tkey)) fail('Template key: lower-case letters, digits and _ only');
  if ($tkey === 'legacy') fail('The legacy template cannot be edited');
  $label = trim(in_str($b, 'label'));
  if ($label === '' || mb_strlen($label) > 80) fail('Template label is required (up to 80 characters)');
  $fields = $b['fields'] ?? null;
  if (!template_fields_ok($fields)) fail('Fields must be a list of {key, label} with unique lower_case keys');
  $clean = [];
  foreach ($fields as $f) {
    $row = ['key' => $f['key'], 'label' => mb_substr(trim((string)$f['label']), 0, 60), 'guide' => mb_substr(trim((string)($f['guide'] ?? '')), 0, 300)];
    if (!empty($f['hidden'])) $row['hidden'] = true;
    $clean[] = $row;
  }
  $existing = db_row('SELECT * FROM measurement_templates WHERE tkey = ?', 's', $tkey);
  if ($existing) {
    $newKeys = array_column($clean, 'key');
    $missing = array_values(array_diff(template_used_keys($tkey), $newKeys));
    if ($missing) json(['error' => 'These fields are already used by saved measurements. Hide them instead of removing or renaming: ' . implode(', ', $missing), 'used_keys' => $missing], 409);
  }
  $active = array_key_exists('active', $b) ? (int)!empty($b['active']) : ($existing ? (int)$existing['active'] : 1);
  $proposed = array_key_exists('proposed', $b) ? (int)!empty($b['proposed']) : ($existing ? (int)$existing['proposed'] : 0);
  $sort = isset($b['sort']) ? in_int($b, 'sort') : ($existing ? (int)$existing['sort'] : 100);
  $note = array_key_exists('note', $b) ? (mb_substr(trim(in_str($b, 'note')), 0, 255) ?: null) : ($existing['note'] ?? null);
  $json = json_encode($clean, JSON_UNESCAPED_UNICODE);
  db_exec('INSERT INTO measurement_templates (tkey, label, fields, active, proposed, note, sort, updated_by) VALUES (?,?,?,?,?,?,?,?)
           ON DUPLICATE KEY UPDATE label = VALUES(label), fields = VALUES(fields), active = VALUES(active), proposed = VALUES(proposed),
                                   note = VALUES(note), sort = VALUES(sort), updated_by = VALUES(updated_by)',
    'sssiisii', $tkey, $label, $json, $active, $proposed, $note, $sort, $user['id']);
  audit($user['id'], 'measurement_template_save', 'measurement_template', null, ['tkey' => $tkey, 'fields' => array_column($clean, 'key'), 'proposed' => $proposed]);
  json(template_view(db_row('SELECT * FROM measurement_templates WHERE tkey = ?', 's', $tkey)));
}

/* ---- LIST / GET ----------------------------------------------------------- */
if ($action === 'list' && method() === 'GET') {
  $cid = in_int($_GET, 'customer_id');
  if (!$cid) fail('customer_id is required');
  json(array_map('set_view_full', db_rows('SELECT * FROM measurement_sets WHERE customer_id = ? ORDER BY id DESC', 'i', $cid)));
}

if ($action === 'get' && method() === 'GET') {
  $s = db_row('SELECT s.*, c.name AS client_name, c.client_ref FROM measurement_sets s JOIN customers c ON c.id = s.customer_id WHERE s.id = ?', 'i', $id);
  if (!$s) fail('Measurement set not found', 404);
  $s = set_view_full($s);
  $tpl = measurement_template($s['template_key']);
  $s['fields'] = $tpl ? $tpl['fields'] : [];
  $s['jobs'] = db_rows('SELECT id, code, job_stage FROM tailoring_orders WHERE measurement_set_id = ? AND deleted_at IS NULL', 'i', $id);
  json($s);
}

/* ---- CREATE --------------------------------------------------------------- */
if ($action === 'create' && method() === 'POST') {
  $b = body();
  $key = body_request_key($b);
  $r = measurement_create([
    'customer_id' => in_int($b, 'customer_id'), 'template_key' => in_str($b, 'template_key'),
    'unit' => in_str($b, 'unit'), 'vals' => $b['vals'] ?? [], 'fit_preference' => in_str($b, 'fit_preference', null),
    'notes' => in_str($b, 'notes', null), 'taken_at' => in_str($b, 'taken_at', null), 'request_key' => $key,
    'source' => 'owner', 'approve' => $isOwner,
  ], $user['id']);
  if (!$r['duplicate']) {
    audit($user['id'], 'measurement_create', 'measurement_set', $r['set']['id'], ['customer_id' => $r['set']['customer_id'], 'status' => $r['set']['status']]);
  }
  json(['set' => set_view_full($r['set']), 'warnings' => $r['warnings'], 'duplicate' => $r['duplicate']], $r['duplicate'] ? 200 : 201);
}

/* ---- APPROVE / REJECT ----------------------------------------------------- */
if ($action === 'approve' && method() === 'POST') {
  if (!$isOwner) fail('Forbidden', 403);
  $b = body();
  $warnings = db_tx(function () use ($id, $b, $user) {
    $s = db_row('SELECT * FROM measurement_sets WHERE id = ? FOR UPDATE', 'i', $id);
    if (!$s) tx_fail('Measurement set not found', 404);
    if (!in_array($s['status'], ['pending', 'imported_unverified'], true)) tx_fail('Only a pending or imported set can be approved (this one is ' . $s['status'] . ')', 409);
    $unit = $s['unit'];
    if ($unit === 'unknown') {
      $unit = in_str($b, 'unit');
      if (!in_array($unit, MEASUREMENT_UNITS, true)) tx_fail('Confirm the unit (cm or in) before approving imported measurements', 400, ['needs_unit' => true]);
      db_exec('UPDATE measurement_sets SET unit = ? WHERE id = ?', 'si', $unit, $id);
    }
    measurement_approve_tx($id, (int)$s['customer_id'], $s['template_key'], $user['id']);
    $tpl = measurement_template($s['template_key']);
    return measurement_clean($tpl ? $tpl['fields'] : [], json_decode($s['vals'], true) ?: [], $unit)['warnings'];
  });
  audit($user['id'], 'measurement_approve', 'measurement_set', $id);
  json(['set' => set_view_full(db_row('SELECT * FROM measurement_sets WHERE id = ?', 'i', $id)), 'warnings' => $warnings]);
}

if ($action === 'reject' && method() === 'POST') {
  if (!$isOwner) fail('Forbidden', 403);
  $b = body();
  $reason = mb_substr(trim(in_str($b, 'reason')), 0, 255);
  if (mb_strlen($reason) < 3) fail('Give a short reason');
  $stmt = db_exec("UPDATE measurement_sets SET status = 'rejected', rejected_by = ?, rejected_at = UTC_TIMESTAMP(), reject_reason = ?
                    WHERE id = ? AND status IN ('pending','imported_unverified')", 'isi', $user['id'], $reason, $id);
  if ($stmt->affected_rows === 0) {
    if (!db_row('SELECT id FROM measurement_sets WHERE id = ?', 'i', $id)) fail('Measurement set not found', 404);
    fail('Only a pending or imported set can be rejected', 409);
  }
  audit($user['id'], 'measurement_reject', 'measurement_set', $id, ['reason' => $reason]);
  json(['set' => set_view_full(db_row('SELECT * FROM measurement_sets WHERE id = ?', 'i', $id))]);
}

/* ---- CONVERT PREVIEW (display only) -------------------------------------- */
if ($action === 'convert_preview' && method() === 'GET') {
  $to = in_str($_GET, 'to');
  if (!in_array($to, MEASUREMENT_UNITS, true)) fail('to must be cm or in');
  $s = db_row('SELECT * FROM measurement_sets WHERE id = ?', 'i', $id);
  if (!$s) fail('Measurement set not found', 404);
  if ($s['unit'] === 'unknown') fail('Confirm this set\'s unit before converting', 409);
  json(['set_id' => $id, 'from' => $s['unit'], 'to' => $to, 'vals' => measurement_convert(json_decode($s['vals'], true) ?: [], $s['unit'], $to), 'stored' => false]);
}

fail('Unknown action', 404);
