<?php
/**
 * HeritOS Phase 5: companies and their contacts (owner roles).
 *
 *   GET  ?action=list[&q=]               {items:[{id, company_ref, name, contacts, jobs}]}
 *   GET  ?action=get&id=N                {company, contacts:[...], jobs:[...]}
 *   GET  ?action=match&name=             {matches:[{id, company_ref, name}]}  duplicate warning, never merges
 *   POST ?action=save                    {id?, name, invoice_name?, invoice_address?, invoice_email?, tax_id?,
 *                                         notes_internal?, confirm_new?} → {company}; 409 {matches} on a similar name
 *   POST ?action=contact_save            {company_id, id? | customer_id | person:{name, phone, email, confirm_new},
 *                                         role_title?, can_view_jobs, can_approve_samples, is_invoice_recipient}
 *                                         → {contact}; 409 {candidates} when the person may already be a client
 *   POST ?action=contact_deactivate&id=N → {contact}; the next portal request no longer sees company jobs
 *
 * Contacts are ordinary clients (customers rows); duplicates are checked with
 * Phase 2's customer_candidates and never merged silently (BR-03). Every write
 * is audited.
 */
require __DIR__ . '/_lib.php';
require __DIR__ . '/_jobs.php';
require_once __DIR__ . '/_company.php';
cors();

$user = require_auth(ROLES_OWNER);
$uid = (int)$user['id'];
$action = $_GET['action'] ?? 'list';
$id = in_int($_GET, 'id');

if (!has_table('companies')) fail('Company orders are not set up yet (import schema_phase27.sql)', 409);

/** Clean company fields; returns [clean, errors]. */
function company_clean(array $b) {
  $c = []; $e = [];
  $lim = ['name' => 160, 'invoice_name' => 160, 'invoice_address' => 2000, 'invoice_email' => 190, 'tax_id' => 40, 'notes_internal' => 5000];
  foreach ($lim as $k => $max) {
    if (!array_key_exists($k, $b)) continue;
    $v = trim(in_str($b, $k));
    if (mb_strlen($v) > $max) $e[$k] = "At most $max characters";
    $c[$k] = $v === '' ? null : $v;
  }
  if (array_key_exists('name', $c) && $c['name'] === null) $e['name'] = 'Enter the company name';
  if (!empty($c['invoice_email']) && !filter_var($c['invoice_email'], FILTER_VALIDATE_EMAIL)) $e['invoice_email'] = 'Email looks wrong';
  return [$c, $e];
}

/** Companies whose name matches closely (case, spaces and common suffixes ignored). */
function company_matches($name, $exceptId = 0) {
  $norm = fn($s) => trim(preg_replace('/\s+/', ' ', preg_replace('/\b(ltd|limited|plc|nig|nigeria|inc|llc|company|co)\b\.?/i', '', strtolower((string)$s))));
  $n = $norm($name);
  if ($n === '') return [];
  $out = [];
  foreach (db_rows('SELECT id, company_ref, name FROM companies WHERE deleted_at IS NULL AND id <> ?', 'i', (int)$exceptId) as $r) {
    $m = $norm($r['name']);
    if ($m === $n || ((str_contains($m, $n) || str_contains($n, $m)) && min(strlen($m), strlen($n)) >= 4)) {
      $out[] = ['id' => (int)$r['id'], 'company_ref' => $r['company_ref'], 'name' => $r['name']];
    }
  }
  return array_slice($out, 0, 5);
}

function contact_view(array $r) {
  return ['id' => (int)$r['id'], 'company_id' => (int)$r['company_id'], 'customer_id' => (int)$r['customer_id'],
    'name' => $r['name'] ?? null, 'client_ref' => $r['client_ref'] ?? null, 'phone_masked' => isset($r['phone']) ? phone_masked($r['phone']) : null,
    'email' => $r['email'] ?? null, 'role_title' => $r['role_title'],
    'can_view_jobs' => (int)$r['can_view_jobs'], 'can_approve_samples' => (int)$r['can_approve_samples'],
    'is_invoice_recipient' => (int)$r['is_invoice_recipient'], 'active' => (int)$r['active']];
}

const CONTACT_SQL = 'SELECT k.*, c.name, c.client_ref, c.phone, c.email FROM company_contacts k JOIN customers c ON c.id = k.customer_id';

function company_row($id) {
  $c = db_row('SELECT * FROM companies WHERE id = ? AND deleted_at IS NULL', 'i', (int)$id);
  if ($c) { $c['id'] = (int)$c['id']; unset($c['deleted_at']); }
  return $c;
}

/* ---- Read ------------------------------------------------------------------ */

if ($action === 'list' && method() === 'GET') {
  $q = trim(in_str($_GET, 'q'));
  $like = '%' . $q . '%';
  $rows = db_rows("SELECT co.id, co.company_ref, co.name, co.invoice_email,
                          (SELECT COUNT(*) FROM company_contacts k WHERE k.company_id = co.id AND k.active = 1) AS contacts,
                          (SELECT COUNT(*) FROM tailoring_orders o WHERE o.company_id = co.id AND o.deleted_at IS NULL) AS jobs
                     FROM companies co WHERE co.deleted_at IS NULL AND (? = '' OR co.name LIKE ? OR co.company_ref LIKE ?)
                 ORDER BY co.name LIMIT 200", 'sss', $q, $like, $like);
  json(['items' => array_map(fn($r) => ['id' => (int)$r['id'], 'company_ref' => $r['company_ref'], 'name' => $r['name'],
    'invoice_email' => $r['invoice_email'], 'contacts' => (int)$r['contacts'], 'jobs' => (int)$r['jobs']], $rows)]);
}

if ($action === 'get' && method() === 'GET') {
  $co = company_row($id);
  if (!$co) fail('Company not found', 404);
  $contacts = array_map('contact_view', db_rows(CONTACT_SQL . ' WHERE k.company_id = ? ORDER BY k.active DESC, c.name', 'i', $id));
  $jobs = db_rows("SELECT o.id, o.code, o.public_ref, o.description, o.quantity, o.job_stage, o.stage, o.due_date, o.po_number, o.sample_status, o.price, o.paid_total
                     FROM tailoring_orders o WHERE o.company_id = ? AND o.deleted_at IS NULL ORDER BY o.id DESC LIMIT 100", 'i', $id);
  json(['company' => $co, 'contacts' => $contacts, 'jobs' => array_map(function ($j) {
    $st = job_stage_of($j);
    return ['id' => (int)$j['id'], 'code' => $j['code'], 'ref' => $j['public_ref'], 'description' => $j['description'], 'quantity' => (int)$j['quantity'],
      'job_stage' => $st, 'stage_label' => JOB_STAGE_LABELS[$st] ?? $st, 'due_date' => $j['due_date'], 'po_number' => $j['po_number'],
      'sample_status' => $j['sample_status'], 'price' => $j['price'], 'paid_total' => $j['paid_total']];
  }, $jobs)]);
}

if ($action === 'match' && method() === 'GET') {
  json(['matches' => company_matches(in_str($_GET, 'name'), $id)]);
}

/* ---- Write ----------------------------------------------------------------- */

if ($action === 'save' && method() === 'POST') {
  $b = body();
  $cid = in_int($b, 'id');
  $created = !$cid;
  [$c, $e] = company_clean($b);
  if ($created && !array_key_exists('name', $c)) $e['name'] = 'Enter the company name';
  if ($e) json(['error' => 'Check the highlighted fields', 'errors' => $e], 400);
  if ($created && empty($b['confirm_new'])) {
    $m = company_matches($c['name']);
    if ($m) json(['error' => 'A company with a similar name already exists. Open it, or confirm this is a different company.', 'matches' => $m], 409);
  }
  if (!$created) {
    if (!company_row($cid)) fail('Company not found', 404);
    if (!$c) fail('Nothing to change');
    $sets = implode(', ', array_map(fn($k) => "$k = ?", array_keys($c)));
    db_exec("UPDATE companies SET $sets WHERE id = ?", str_repeat('s', count($c)) . 'i', ...array_merge(array_values($c), [$cid]));
    audit($uid, 'company_update', 'companies', $cid, ['fields' => array_keys($c)]);
  } else {
    $cols = array_keys($c);
    db_exec('INSERT INTO companies (' . implode(', ', $cols) . ', created_by) VALUES (' . str_repeat('?, ', count($cols)) . '?)',
      str_repeat('s', count($cols)) . 'i', ...array_merge(array_values($c), [$uid]));
    $cid = (int)$conn->insert_id;
    $ref = sprintf('CO-%04d', $cid);
    db_exec('UPDATE companies SET company_ref = ? WHERE id = ?', 'si', $ref, $cid);
    audit($uid, 'company_create', 'companies', $cid);
  }
  json(['ok' => true, 'company' => company_row($cid)], $created ? 201 : 200);
}

if ($action === 'contact_save' && method() === 'POST') {
  $b = body();
  $companyId = in_int($b, 'company_id');
  if (!company_row($companyId)) fail('Company not found', 404);
  $role = mb_substr(trim(in_str($b, 'role_title')), 0, 80) ?: null;
  $flags = [];
  foreach (['can_view_jobs', 'can_approve_samples', 'is_invoice_recipient'] as $k) {
    if (array_key_exists($k, $b)) $flags[$k] = !empty($b[$k]) && $b[$k] !== '0' ? 1 : 0;
  }
  $contactId = in_int($b, 'id');
  [$kid, $created] = db_tx(function () use ($b, $companyId, $contactId, $role, $flags, $uid) {
    global $conn;
    if ($contactId) {
      $k = db_row('SELECT * FROM company_contacts WHERE id = ? AND company_id = ? FOR UPDATE', 'ii', $contactId, $companyId);
      if (!$k) tx_fail('Contact not found', 404);
      db_exec('UPDATE company_contacts SET role_title = ?, active = 1 WHERE id = ?', 'si', $role, $contactId);
      $kid = $contactId; $created = false;
    } else {
      if (!empty($b['customer_id'])) {
        [$custId] = resolve_client(['id' => in_int($b, 'customer_id')], $uid, true);
      } else {
        $p = (array)($b['person'] ?? []);
        in_text_only($p, ['name', 'phone', 'email']);
        if (trim((string)($p['phone'] ?? '')) === '' && trim((string)($p['email'] ?? '')) === '') {
          tx_fail('Give a phone number or an email for the contact', 400, ['errors' => ['person.phone' => 'Phone or email needed']]);
        }
        [$custId] = resolve_client($p, $uid, true);
      }
      $ex = db_row('SELECT id FROM company_contacts WHERE company_id = ? AND customer_id = ? FOR UPDATE', 'ii', $companyId, $custId);
      if ($ex) {
        db_exec('UPDATE company_contacts SET active = 1, role_title = COALESCE(?, role_title) WHERE id = ?', 'si', $role, (int)$ex['id']);
        $kid = (int)$ex['id']; $created = false;
      } else {
        db_exec('INSERT INTO company_contacts (company_id, customer_id, role_title) VALUES (?,?,?)', 'iis', $companyId, $custId, $role);
        $kid = (int)$conn->insert_id; $created = true;
      }
    }
    if ($flags) {
      $sets = implode(', ', array_map(fn($c) => "$c = ?", array_keys($flags)));
      db_exec("UPDATE company_contacts SET $sets WHERE id = ?", str_repeat('i', count($flags)) . 'i', ...array_merge(array_values($flags), [$kid]));
    }
    return [$kid, $created];
  });
  audit($uid, $created ? 'company_contact_add' : 'company_contact_update', 'company_contacts', $kid, ['company_id' => $companyId] + $flags);
  json(['ok' => true, 'contact' => contact_view(db_row(CONTACT_SQL . ' WHERE k.id = ?', 'i', $kid))], $created ? 201 : 200);
}

if ($action === 'contact_deactivate' && method() === 'POST') {
  $k = db_row('SELECT id, company_id FROM company_contacts WHERE id = ?', 'i', $id);
  if (!$k) fail('Contact not found', 404);
  db_exec('UPDATE company_contacts SET active = 0 WHERE id = ?', 'i', $id);
  audit($uid, 'company_contact_deactivate', 'company_contacts', $id, ['company_id' => (int)$k['company_id']]);
  json(['ok' => true, 'contact' => contact_view(db_row(CONTACT_SQL . ' WHERE k.id = ?', 'i', $id))]);
}

fail('Unknown action', 404);
