<?php
/**
 * HeritOS Phase 5: company orders. Pure helpers (no database, no request):
 * quantities, stage rollup, item handover checks, sample transitions, contact
 * permissions and the two portal projections. Tested in tests/company_cases.php.
 *
 * Needs _domain.php (job_public_view, ledger_totals, quote_number, lagos_iso).
 *
 * Privacy rule (BR-28): a company contact sees the job as lines and totals,
 * never a wearer (id, label or name) or a measurement; a wearer sees only their
 * own garment, never the price, the ledger, the company contacts or other
 * wearers. Both views are built from explicit allowlists.
 */
require_once __DIR__ . '/_domain.php';

const ITEM_STAGES = ['pending', 'in_production', 'ready', 'handed_over', 'cancelled'];
const ITEM_STAGE_LABELS = ['pending' => 'Not started', 'in_production' => 'Being made', 'ready' => 'Ready',
  'handed_over' => 'Handed over', 'cancelled' => 'Cancelled'];
const SAMPLE_DECISION_CHANNELS = ['portal', 'in_person', 'whatsapp', 'email', 'phone'];
const MEASUREMENT_METHODS = ['individual', 'sizes', 'mixed'];
const CONTACT_PERMS = ['view_jobs' => 'can_view_jobs', 'approve_samples' => 'can_approve_samples', 'invoice' => 'is_invoice_recipient'];

/** Keys a company contact may see on a job. Tested exactly. */
const COMPANY_JOB_PUBLIC_KEYS = ['ref', 'kind', 'description', 'quantity', 'stage', 'stage_label', 'promised_date', 'po_number',
  'quantity_ready', 'quantity_handed_over', 'lines', 'sample', 'quote', 'payment', 'handovers', 'timeline'];
/** Keys a wearer may see about their own garment. Tested exactly. */
const WEARER_ITEM_PUBLIC_KEYS = ['ref', 'kind', 'item_id', 'description', 'garment_type', 'quantity', 'stage', 'stage_label', 'promised_date'];

/** Items that still count (not cancelled). */
function company_active_items(array $items) {
  return array_values(array_filter($items, fn($i) => ($i['item_stage'] ?? 'pending') !== 'cancelled'));
}

/** Total pieces across items, cancelled ones excluded. tailoring_orders.quantity is kept equal to this. */
function company_items_qty(array $items) {
  $n = 0;
  foreach (company_active_items($items) as $i) $n += max(0, (int)($i['qty'] ?? 0));
  return $n;
}

/** An item's stage implied by its counts; never moves a cancelled item. */
function item_stage_after(array $item) {
  $stage = $item['item_stage'] ?? 'pending';
  if ($stage === 'cancelled') return 'cancelled';
  $qty = max(0, (int)($item['qty'] ?? 0));
  $ready = (int)($item['qty_ready'] ?? 0);
  $out = (int)($item['qty_handed_over'] ?? 0);
  if ($qty > 0 && $out >= $qty) return 'handed_over';
  if ($qty > 0 && $ready >= $qty) return 'ready';
  if ($ready > 0 || $out > 0 || $stage === 'in_production') return 'in_production';
  return 'pending';
}

/**
 * Suggested job stage from its items: handed_over when every active item is
 * fully out, ready when every active item is fully ready, in_production when
 * any work has started; null when there is nothing to suggest.
 */
function job_items_rollup(array $items) {
  $active = company_active_items($items);
  if (!$active) return null;
  $allOut = true; $allReady = true; $started = false;
  foreach ($active as $i) {
    $qty = max(0, (int)($i['qty'] ?? 0));
    $ready = (int)($i['qty_ready'] ?? 0);
    $out = (int)($i['qty_handed_over'] ?? 0);
    if ($out < $qty) $allOut = false;
    if ($ready < $qty) $allReady = false;
    if ($ready > 0 || $out > 0 || in_array($i['item_stage'] ?? '', ['in_production', 'ready', 'handed_over'], true)) $started = true;
  }
  if ($allOut) return 'handed_over';
  if ($allReady) return 'ready';
  return $started ? 'in_production' : null;
}

/**
 * Check an item handover request against the job's items.
 *   $items: id => item row (this job's items only)
 *   $request: [['item_id' => N, 'qty' => N], ...]
 * Returns [ok, errors, lines]: errors keyed "items.N"; lines are the clean
 * [item_id => qty] (same item twice is added together).
 */
function handover_items_ok(array $items, $request) {
  $errors = []; $lines = [];
  if (!is_array($request) || !$request) return [false, ['items' => 'Choose at least one item and quantity'], []];
  foreach (array_values($request) as $n => $r) {
    $id = (int)($r['item_id'] ?? 0);
    $qty = filter_var($r['qty'] ?? null, FILTER_VALIDATE_INT);
    if ($qty === false || $qty < 1) { $errors["items.$n"] = 'Quantity must be a whole number from 1'; continue; }
    if (!isset($items[$id])) { $errors["items.$n"] = 'That item is not on this job'; continue; }
    $lines[$id] = ($lines[$id] ?? 0) + $qty;
  }
  foreach ($lines as $id => $qty) {
    $it = $items[$id];
    if (($it['item_stage'] ?? '') === 'cancelled') { $errors["item.$id"] = 'This item is cancelled'; continue; }
    $left = (int)($it['qty_ready'] ?? 0) - (int)($it['qty_handed_over'] ?? 0);
    if ($qty > $left) $errors["item.$id"] = $left > 0 ? "Only $left ready piece(s) of this item are left to hand over" : 'No ready pieces of this item are left to hand over';
  }
  return [!$errors, $errors, $errors ? [] : $lines];
}

/** Sample status changes: a submitted version is approved, sent back or withdrawn; nothing else moves. */
function sample_transition_ok($from, $to) {
  return $from === 'submitted' && in_array($to, ['approved', 'changes_requested', 'withdrawn'], true);
}

/** Job sample_status after a sample row moves to $to. */
function job_sample_status_for($sampleStatus) {
  return ['submitted' => 'submitted', 'approved' => 'approved', 'changes_requested' => 'changes_requested', 'withdrawn' => 'pending'][$sampleStatus] ?? 'pending';
}

/** May this company contact do $perm (view_jobs, approve_samples, invoice)? Inactive contacts may do nothing. */
function contact_can($contact, $perm) {
  if (!is_array($contact) || empty($contact['active'])) return false;
  $col = CONTACT_PERMS[$perm] ?? null;
  return $col !== null && !empty($contact[$col]);
}

/**
 * A company contact's view of a company job. Lines aggregate items by
 * description (sizes counted only when the job measures by size), so no item
 * id, wearer or measurement can appear. Quote, payment, handovers and the
 * public timeline come from job_public_view and are then filtered to the
 * allowlist; appointments are left out because they belong to wearers.
 */
function company_job_public_view(array $job, array $items, array $samples, $quote, array $ledger, array $handovers, array $events = []) {
  $base = job_public_view($job, $quote, $ledger, $handovers, [], $events);
  $bySize = ($job['measurement_method'] ?? null) === 'sizes';
  $lines = []; $readyTotal = 0;
  foreach (company_active_items($items) as $i) {
    $d = trim((string)($i['description'] ?? ''));
    if (!isset($lines[$d])) $lines[$d] = ['description' => $d, 'qty' => 0, 'qty_ready' => 0, 'qty_handed_over' => 0];
    $q = max(0, (int)($i['qty'] ?? 0));
    $r = min($q, (int)($i['qty_ready'] ?? 0));
    $lines[$d]['qty'] += $q;
    $lines[$d]['qty_ready'] += $r;
    $lines[$d]['qty_handed_over'] += min($q, (int)($i['qty_handed_over'] ?? 0));
    $readyTotal += $r;
    if ($bySize && ($i['size_label'] ?? '') !== '') {
      $s = (string)$i['size_label'];
      $lines[$d]['sizes'][$s] = ($lines[$d]['sizes'][$s] ?? 0) + $q;
    }
  }
  $latest = null;
  foreach ($samples as $s) if (!$latest || (int)$s['version'] > (int)$latest['version']) $latest = $s;
  $sample = $latest ? [
    'id' => (int)$latest['id'], 'version' => (int)$latest['version'], 'description' => (string)$latest['description'],
    'status' => $latest['status'], 'decided_at' => lagos_iso($latest['decided_at'] ?? null),
  ] : null;
  $out = [
    'ref' => $base['ref'], 'kind' => 'company', 'description' => $base['description'],
    'quantity' => company_items_qty($items) ?: $base['quantity'], 'stage' => $base['stage'], 'stage_label' => $base['stage_label'],
    'promised_date' => $base['promised_date'], 'po_number' => ($job['po_number'] ?? '') !== '' ? (string)$job['po_number'] : null,
    'quantity_ready' => $readyTotal, 'quantity_handed_over' => $base['quantity_handed_over'],
    'lines' => array_values($lines), 'sample' => $sample, 'quote' => $base['quote'], 'payment' => $base['payment'],
    'handovers' => $base['handovers'], 'timeline' => $base['timeline'],
  ];
  return array_intersect_key($out, array_flip(COMPANY_JOB_PUBLIC_KEYS));
}

/** A wearer's view of their own garment on a company job: no price, ledger, company or other wearers. */
function wearer_item_public_view(array $item, array $job) {
  $stage = item_stage_after($item);
  $out = [
    'ref' => $job['public_ref'] ?? null, 'kind' => 'wearer', 'item_id' => (int)$item['id'],
    'description' => (string)($item['description'] ?? ''), 'garment_type' => $item['garment_type'] ?? null,
    'quantity' => max(1, (int)($item['qty'] ?? 1)), 'stage' => $stage, 'stage_label' => ITEM_STAGE_LABELS[$stage] ?? null,
    'promised_date' => $job['due_date'] ?? null,
  ];
  return array_intersect_key($out, array_flip(WEARER_ITEM_PUBLIC_KEYS));
}

/** Clean one item from a request body. Returns [clean, errors]. */
function company_item_clean(array $in) {
  $err = []; $c = [];
  $d = trim((string)($in['description'] ?? ''));
  if ($d === '') $err['description'] = 'Describe the garment';
  elseif (mb_strlen($d) > 160) $err['description'] = 'At most 160 characters';
  $c['description'] = $d;
  $q = filter_var($in['qty'] ?? 1, FILTER_VALIDATE_INT);
  if ($q === false || $q < 1 || $q > 999) $err['qty'] = 'Quantity must be a whole number from 1 to 999';
  $c['qty'] = (int)$q;
  foreach (['garment_type' => 40, 'service_key' => 40, 'size_label' => 20, 'wearer_label' => 80] as $k => $max) {
    $v = trim((string)($in[$k] ?? ''));
    if (mb_strlen($v) > $max) $err[$k] = "At most $max characters";
    $c[$k] = $v === '' ? null : $v;
  }
  $w = $in['wearer_customer_id'] ?? null;
  $c['wearer_customer_id'] = ($w === null || $w === '' || (int)$w === 0) ? null : (int)$w;
  return [$c, $err];
}
