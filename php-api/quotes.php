<?php
/**
 * HeritOS: Versioned quotes (owner roles only).
 *
 *   GET  ?action=list&job_id=|enquiry_id=|customer_id=
 *   GET  ?action=get&id=N               quote + items + versions in its series
 *   POST ?action=create                 {job_id?|enquiry_id?|customer_id?, items:[{description, garment_type?, qty, unit_price}],
 *                                        delivery_charge, discount, deposit_required, fabric_responsibility,
 *                                        fitting_allowance, terms, exclusions, valid_until, promised_date, request_key}
 *   POST ?action=save&id=N              same fields; drafts only
 *   POST ?action=send&id=N              {channel}  freezes content_hash; earlier sent versions become superseded
 *   POST ?action=revise&id=N            {request_key} new draft, version + 1, copied from this one
 *   POST ?action=accept&id=N            {channel, note, content_hash} sets job price, quote_id, promised date
 *   POST ?action=decline&id=N | withdraw&id=N   {note}
 *
 * Money in requests is a string like "45,000" or "45000.50"; totals are always
 * recomputed here. Responses carry decimal strings and the display number.
 */
require __DIR__ . '/_lib.php';
require __DIR__ . '/_jobs.php';
cors();

$user = require_auth(ROLES_OWNER);
$action = $_GET['action'] ?? 'list';
$id = (int)($_GET['id'] ?? 0);
const QUOTE_CHANNELS = ['in_person', 'whatsapp', 'email', 'phone', 'portal'];

function quote_items_of($qid) {
  return db_rows('SELECT id, sort, description, garment_type, qty, unit_price, line_total FROM quote_items WHERE quote_id = ? ORDER BY sort, id', 'i', (int)$qid);
}

/** The canonical content a customer agrees to, for the frozen hash. */
function quote_hash_of(array $q) {
  $fields = [];
  foreach (['series_id', 'version', 'customer_id', 'job_id', 'currency', 'subtotal', 'delivery_charge', 'discount', 'total',
            'deposit_required', 'fabric_responsibility', 'fitting_allowance', 'terms', 'exclusions', 'valid_until', 'promised_date'] as $k) {
    $fields[$k] = $q[$k] === null ? null : (string)$q[$k];
  }
  $items = array_map(fn($i) => ['description' => $i['description'], 'garment_type' => $i['garment_type'], 'qty' => (string)$i['qty'],
                                'unit_price' => (string)$i['unit_price'], 'line_total' => (string)$i['line_total']], quote_items_of($q['id']));
  return quote_content_hash($fields, $items);
}

function quote_view(array $q, $withItems = true) {
  foreach (['id', 'series_id', 'version', 'job_id', 'enquiry_id', 'customer_id', 'created_by', 'accepted_recorded_by'] as $k) {
    if (array_key_exists($k, $q) && $q[$k] !== null) $q[$k] = (int)$q[$k];
  }
  $q['number'] = quote_number($q['series_id'], $q['version']);
  $q['is_expired'] = $q['status'] === 'sent' && $q['valid_until'] !== null && $q['valid_until'] < lagos_today();
  unset($q['request_key']);
  if ($withItems) $q['items'] = quote_items_of($q['id']);
  return $q;
}

/** Validate the editable quote content from a body. Returns [fields, items] with totals computed. */
function quote_input(array $b) {
  $raw = $b['items'] ?? null;
  if (!is_array($raw) || !$raw) fail('Add at least one line item');
  $items = [];
  foreach (array_values($raw) as $i => $it) {
    $desc = trim((string)($it['description'] ?? ''));
    if ($desc === '' || mb_strlen($desc) > 255) fail('Line ' . ($i + 1) . ': a description is required (up to 255 characters)');
    $qty = (string)($it['qty'] ?? '1');
    if (!preg_match('/^\d{1,5}(\.\d{1,2})?$/', $qty) || (float)$qty <= 0) fail('Line ' . ($i + 1) . ': quantity must be more than 0');
    $price = money_to_minor($it['unit_price'] ?? null);
    if ($price === null) fail('Line ' . ($i + 1) . ': unit price must be an amount like 45000');
    $items[] = ['description' => $desc, 'garment_type' => mb_substr(trim((string)($it['garment_type'] ?? '')), 0, 40) ?: null,
                'qty' => $qty, 'unit_price_minor' => $price];
  }
  $money = function ($k, $nullable = false) use ($b) {
    if (!isset($b[$k]) || $b[$k] === '' || $b[$k] === null) return $nullable ? null : 0;
    $m = money_to_minor($b[$k]);
    if ($m === null) fail("$k must be an amount like 5000");
    return $m;
  };
  $delivery = $money('delivery_charge'); $discount = $money('discount'); $deposit = $money('deposit_required', true);
  $t = quote_totals($items, $delivery, $discount);
  if ($deposit !== null && $deposit > $t['total']) fail('The deposit cannot be more than the quote total');
  $f = [
    'subtotal' => minor_to_decimal($t['subtotal']), 'delivery_charge' => minor_to_decimal($delivery),
    'discount' => minor_to_decimal($discount), 'total' => minor_to_decimal($t['total']),
    'deposit_required' => $deposit === null ? null : minor_to_decimal($deposit),
  ];
  $fr = $b['fabric_responsibility'] ?? null;
  if ($fr !== null && $fr !== '' && !in_array($fr, ['client', 'herit', 'mixed'], true)) fail('Fabric responsibility must be client, herit or mixed');
  $f['fabric_responsibility'] = $fr ?: null;
  foreach (['fitting_allowance' => 255, 'terms' => 5000, 'exclusions' => 5000] as $k => $max) {
    $v = trim((string)($b[$k] ?? ''));
    if (mb_strlen($v) > $max) fail("$k is too long");
    $f[$k] = $v === '' ? null : $v;
  }
  foreach (['valid_until', 'promised_date'] as $k) {
    if (empty($b[$k])) { $f[$k] = null; continue; }
    if (($d = ymd_or_null($b[$k])) === null) fail("Invalid date for $k");
    $f[$k] = $d;
  }
  return [$f, $t['items']];
}

function quote_write_items($qid, array $items) {
  db_exec('DELETE FROM quote_items WHERE quote_id = ?', 'i', (int)$qid);
  foreach ($items as $n => $it) {
    $up = minor_to_decimal($it['unit_price_minor']); $lt = minor_to_decimal($it['line_total_minor']);
    db_exec('INSERT INTO quote_items (quote_id, sort, description, garment_type, qty, unit_price, line_total) VALUES (?,?,?,?,?,?,?)',
      'iisssss', (int)$qid, $n, $it['description'], $it['garment_type'], $it['qty'], $up, $lt);
  }
}

function quote_lock($id) {
  return db_row('SELECT * FROM quotes WHERE id = ? FOR UPDATE', 'i', (int)$id);
}

/* ---- LIST / GET ----------------------------------------------------------- */
if ($action === 'list' && method() === 'GET') {
  foreach (['job_id', 'enquiry_id', 'customer_id'] as $k) {
    if (!empty($_GET[$k])) {
      $rows = db_rows("SELECT * FROM quotes WHERE $k = ? ORDER BY series_id DESC, version DESC", 'i', (int)$_GET[$k]);
      json(array_map(fn($q) => quote_view($q, false), $rows));
    }
  }
  fail('Give job_id, enquiry_id or customer_id');
}

if ($action === 'get' && method() === 'GET') {
  $q = db_row('SELECT q.*, c.name AS client_name, c.client_ref FROM quotes q JOIN customers c ON c.id = q.customer_id WHERE q.id = ?', 'i', $id);
  if (!$q) fail('Quote not found', 404);
  $q = quote_view($q);
  $q['versions'] = array_map(fn($v) => ['id' => (int)$v['id'], 'version' => (int)$v['version'], 'status' => $v['status'], 'total' => $v['total'],
                                        'number' => quote_number($v['series_id'], $v['version']), 'sent_at' => $v['sent_at'], 'accepted_at' => $v['accepted_at']],
    db_rows('SELECT id, series_id, version, status, total, sent_at, accepted_at FROM quotes WHERE series_id = ? ORDER BY version', 'i', $q['series_id']));
  $q['deposit_policy_text'] = setting_get('deposit_policy_text', null);
  json($q);
}

/* ---- CREATE --------------------------------------------------------------- */
if ($action === 'create' && method() === 'POST') {
  $b = body();
  $key = body_request_key($b);
  if ($ex = db_row('SELECT id FROM quotes WHERE request_key = ?', 's', $key)) json(['duplicate' => true] + quote_view(db_row('SELECT * FROM quotes WHERE id = ?', 'i', $ex['id'])));
  [$f, $items] = quote_input($b);

  $jobId = !empty($b['job_id']) ? (int)$b['job_id'] : null;
  $enqId = !empty($b['enquiry_id']) ? (int)$b['enquiry_id'] : null;
  $customerId = !empty($b['customer_id']) ? (int)$b['customer_id'] : null;
  if ($jobId) {
    $job = db_row('SELECT id, customer_id, enquiry_id, job_stage FROM tailoring_orders WHERE id = ? AND deleted_at IS NULL', 'i', $jobId);
    if (!$job) fail('Job not found', 404);
    $customerId = (int)$job['customer_id'];
    $enqId = $enqId ?: ($job['enquiry_id'] ? (int)$job['enquiry_id'] : null);
  } elseif ($enqId) {
    $e = db_row('SELECT id, client_id, job_id FROM enquiries WHERE id = ?', 'i', $enqId);
    if (!$e) fail('Enquiry not found', 404);
    if ($e['job_id']) $jobId = (int)$e['job_id'];
    $customerId = $customerId ?: ($e['client_id'] ? (int)$e['client_id'] : null);
    if (!$customerId) fail('Link or convert this enquiry to a client before quoting');
  }
  if (!$customerId || !db_row('SELECT id FROM customers WHERE id = ? AND deleted_at IS NULL', 'i', $customerId)) fail('Client not found', 404);
  if ($f['terms'] === null) $f['terms'] = setting_get('quote_default_terms', null);

  try {
    $qid = db_tx(function () use ($conn, $f, $items, $jobId, $enqId, $customerId, $key, $user) {
      db_exec('INSERT INTO quotes (version, job_id, enquiry_id, customer_id, status, subtotal, delivery_charge, discount, total, deposit_required,
                                   fabric_responsibility, fitting_allowance, terms, exclusions, valid_until, promised_date, request_key, created_by)
               VALUES (1,?,?,?, \'draft\', ?,?,?,?,?,?,?,?,?,?,?,?,?)', 'iiissssssssssssi',
        $jobId, $enqId, $customerId, $f['subtotal'], $f['delivery_charge'], $f['discount'], $f['total'], $f['deposit_required'],
        $f['fabric_responsibility'], $f['fitting_allowance'], $f['terms'], $f['exclusions'], $f['valid_until'], $f['promised_date'], $key, $user['id']);
      $qid = (int)$conn->insert_id;
      db_exec('UPDATE quotes SET series_id = id WHERE id = ?', 'i', $qid);
      quote_write_items($qid, $items);
      return $qid;
    });
  } catch (mysqli_sql_exception $e) {
    if (!is_duplicate_key($e)) throw $e;
    json(['duplicate' => true] + quote_view(db_row('SELECT * FROM quotes WHERE request_key = ?', 's', $key)));
  }
  audit($user['id'], 'quote_create', 'quote', $qid, ['job_id' => $jobId, 'enquiry_id' => $enqId]);
  json(['duplicate' => false] + quote_view(db_row('SELECT * FROM quotes WHERE id = ?', 'i', $qid)), 201);
}

/* ---- SAVE (drafts only) --------------------------------------------------- */
if ($action === 'save' && method() === 'POST') {
  $b = body();
  [$f, $items] = quote_input($b);
  db_tx(function () use ($id, $f, $items) {
    $q = quote_lock($id);
    if (!$q) tx_fail('Quote not found', 404);
    if ($q['status'] !== 'draft') tx_fail('Only a draft can be edited. Revise it to make a new version.', 409);
    db_exec('UPDATE quotes SET subtotal = ?, delivery_charge = ?, discount = ?, total = ?, deposit_required = ?, fabric_responsibility = ?,
                    fitting_allowance = ?, terms = ?, exclusions = ?, valid_until = ?, promised_date = ? WHERE id = ?', 'sssssssssssi',
      $f['subtotal'], $f['delivery_charge'], $f['discount'], $f['total'], $f['deposit_required'], $f['fabric_responsibility'],
      $f['fitting_allowance'], $f['terms'], $f['exclusions'], $f['valid_until'], $f['promised_date'], $id);
    quote_write_items($id, $items);
  });
  audit($user['id'], 'quote_save', 'quote', $id);
  json(quote_view(db_row('SELECT * FROM quotes WHERE id = ?', 'i', $id)));
}

/* ---- SEND ----------------------------------------------------------------- */
if ($action === 'send' && method() === 'POST') {
  $b = body();
  $channel = (string)($b['channel'] ?? '');
  if (!in_array($channel, QUOTE_CHANNELS, true)) fail('Channel must be one of: ' . implode(', ', QUOTE_CHANNELS));
  db_tx(function () use ($id, $channel, $user) {
    $q = quote_lock($id);
    if (!$q) tx_fail('Quote not found', 404);
    if ($q['status'] !== 'draft') tx_fail('Only a draft can be sent', 409);
    if ($q['valid_until'] === null && ($days = (int)setting_get('quote_validity_days', 0)) > 0) {
      $vu = date_add_days(lagos_today(), $days);
      db_exec('UPDATE quotes SET valid_until = ? WHERE id = ?', 'si', $vu, $id);
      $q['valid_until'] = $vu;
    }
    db_exec("UPDATE quotes SET status = 'superseded' WHERE series_id = ? AND id <> ? AND status = 'sent'", 'ii', (int)$q['series_id'], $id);
    $hash = quote_hash_of($q);
    db_exec("UPDATE quotes SET status = 'sent', content_hash = ?, sent_at = UTC_TIMESTAMP(), sent_channel = ? WHERE id = ?", 'ssi', $hash, $channel, $id);
    if ($q['enquiry_id']) {
      db_exec("UPDATE enquiries SET status = 'quote_sent' WHERE id = ? AND status IN ('new','contacted','awaiting_reply')", 'i', (int)$q['enquiry_id']);
    }
    if ($q['job_id']) job_event($q['job_id'], 'quote', null, 'Quote ' . quote_number($q['series_id'], $q['version']) . ' sent by ' . $channel, ['quote_id' => (int)$id, 'money' => true], 0, $user['id']);
  });
  audit($user['id'], 'quote_send', 'quote', $id, ['channel' => $channel]);
  json(quote_view(db_row('SELECT * FROM quotes WHERE id = ?', 'i', $id)));
}

/* ---- REVISE (new version) ------------------------------------------------- */
if ($action === 'revise' && method() === 'POST') {
  $b = body();
  $key = body_request_key($b);
  if ($ex = db_row('SELECT id FROM quotes WHERE request_key = ?', 's', $key)) json(['duplicate' => true] + quote_view(db_row('SELECT * FROM quotes WHERE id = ?', 'i', $ex['id'])));
  $newId = db_tx(function () use ($conn, $id, $key, $user) {
    $q = quote_lock($id);
    if (!$q) tx_fail('Quote not found', 404);
    $draft = db_row("SELECT id FROM quotes WHERE series_id = ? AND status = 'draft' LIMIT 1", 'i', (int)$q['series_id']);
    if ($draft) tx_fail('This quote already has a draft version; edit that one', 409, ['draft_id' => (int)$draft['id']]);
    db_exec('SELECT id FROM quotes WHERE series_id = ? FOR UPDATE', 'i', (int)$q['series_id'])->get_result();
    $v = (int)db_row('SELECT MAX(version) AS v FROM quotes WHERE series_id = ?', 'i', (int)$q['series_id'])['v'] + 1;
    db_exec("INSERT INTO quotes (series_id, version, job_id, enquiry_id, customer_id, status, currency, subtotal, delivery_charge, discount, total,
                                 deposit_required, fabric_responsibility, fitting_allowance, terms, exclusions, valid_until, promised_date, request_key, created_by)
             SELECT series_id, ?, job_id, enquiry_id, customer_id, 'draft', currency, subtotal, delivery_charge, discount, total,
                    deposit_required, fabric_responsibility, fitting_allowance, terms, exclusions, NULL, promised_date, ?, ?
               FROM quotes WHERE id = ?", 'isii', $v, $key, $user['id'], $id);
    $newId = (int)$conn->insert_id;
    db_exec('INSERT INTO quote_items (quote_id, sort, description, garment_type, qty, unit_price, line_total)
             SELECT ?, sort, description, garment_type, qty, unit_price, line_total FROM quote_items WHERE quote_id = ?', 'ii', $newId, $id);
    return $newId;
  });
  audit($user['id'], 'quote_revise', 'quote', $newId, ['from' => $id]);
  json(['duplicate' => false] + quote_view(db_row('SELECT * FROM quotes WHERE id = ?', 'i', $newId)), 201);
}

/* ---- ACCEPT --------------------------------------------------------------- */
/* Records the customer's acceptance (time, channel, note). The hash the owner
 * saw must match the frozen one. In one transaction the job takes the price,
 * quote_id and promised date and moves from quote to confirmed.              */
if ($action === 'accept' && method() === 'POST') {
  $b = body();
  $channel = (string)($b['channel'] ?? '');
  if (!in_array($channel, QUOTE_CHANNELS, true)) fail('Channel must be one of: ' . implode(', ', QUOTE_CHANNELS));
  $note = mb_substr(trim((string)($b['note'] ?? '')), 0, 255) ?: null;
  $hash = (string)($b['content_hash'] ?? '');
  $res = db_tx(function () use ($id, $channel, $note, $hash, $user) {
    $q = quote_lock($id);
    if (!$q) tx_fail('Quote not found', 404);
    if ($q['status'] === 'accepted') return ['job_id' => (int)$q['job_id'], 'already' => true];
    if ($q['status'] !== 'sent') tx_fail('Only the current sent version can be accepted (this one is ' . $q['status'] . ')', 409);
    if ($q['valid_until'] !== null && $q['valid_until'] < lagos_today()) tx_fail('This quote expired on ' . $q['valid_until'] . '. Revise and send it again.', 409);
    if (!hash_equals((string)$q['content_hash'], $hash)) tx_fail('The quote changed since you loaded it. Reload and check before accepting.', 409);
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
              WHERE id = ?", 'ssiii', $channel, $note, $user['id'], $jobId, $id);
    if ($q['promised_date'] !== null) {
      db_exec('UPDATE tailoring_orders SET price = ?, quote_id = ?, due_date = ?, lock_version = lock_version + 1 WHERE id = ?', 'sisi', $q['total'], $id, $q['promised_date'], $jobId);
    } else {
      db_exec('UPDATE tailoring_orders SET price = ?, quote_id = ?, lock_version = lock_version + 1 WHERE id = ?', 'sii', $q['total'], $id, $jobId);
    }
    if ($job['job_stage'] === 'quote') {
      job_set_stage_tx($job, 'confirmed', $user['id'], 'Quote ' . quote_number($q['series_id'], $q['version']) . ' accepted', ['quote_id' => (int)$id]);
    }
    job_event($jobId, 'quote', null, 'Quote ' . quote_number($q['series_id'], $q['version']) . ' accepted (' . $channel . ')',
      ['quote_id' => (int)$id, 'total' => $q['total'], 'money' => true], 0, $user['id']);
    $enq = $q['enquiry_id'] ?: $job['enquiry_id'];
    if ($enq) db_exec("UPDATE enquiries SET status = 'accepted' WHERE id = ? AND status <> 'closed'", 'i', (int)$enq);
    job_recalc_money($jobId);
    return ['job_id' => $jobId, 'already' => false];
  });
  if (!$res['already']) audit($user['id'], 'quote_accept', 'quote', $id, ['channel' => $channel, 'job_id' => $res['job_id']]);
  json(quote_view(db_row('SELECT * FROM quotes WHERE id = ?', 'i', $id)) + ['job_id' => $res['job_id']]);
}

/* ---- DECLINE / WITHDRAW --------------------------------------------------- */
if (($action === 'decline' || $action === 'withdraw') && method() === 'POST') {
  $b = body();
  $note = mb_substr(trim((string)($b['note'] ?? '')), 0, 255) ?: null;
  $to = $action === 'decline' ? 'declined' : 'withdrawn';
  $from = $action === 'decline' ? "('sent')" : "('draft','sent')";
  $stmt = db_exec("UPDATE quotes SET status = ?, closed_note = ? WHERE id = ? AND status IN $from", 'ssi', $to, $note, $id);
  if ($stmt->affected_rows === 0) {
    if (!db_row('SELECT id FROM quotes WHERE id = ?', 'i', $id)) fail('Quote not found', 404);
    fail($action === 'decline' ? 'Only a sent quote can be declined' : 'Only a draft or sent quote can be withdrawn', 409);
  }
  audit($user['id'], 'quote_' . $action, 'quote', $id, ['note' => $note]);
  json(quote_view(db_row('SELECT * FROM quotes WHERE id = ?', 'i', $id)));
}

fail('Unknown action', 404);
