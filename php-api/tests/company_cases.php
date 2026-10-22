<?php
/**
 * HeritOS: Phase 5 company order helper tests (_company.php). Required by
 * run.php, which provides check() and has loaded _lib.php and _domain.php.
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/../_company.php';

$item = fn($id, $qty, $ready = 0, $out = 0, $stage = 'pending', $extra = []) =>
  array_merge(['id' => $id, 'description' => 'Senator, navy', 'qty' => $qty, 'qty_ready' => $ready, 'qty_handed_over' => $out, 'item_stage' => $stage], $extra);

/* ---- quantities ---------------------------------------------------------------- */
check('company qty: sums active items', company_items_qty([$item(1, 3), $item(2, 2)]), 5);
check('company qty: cancelled items excluded', company_items_qty([$item(1, 3), $item(2, 2, 0, 0, 'cancelled')]), 3);
check('company qty: empty is 0', company_items_qty([]), 0);

/* ---- item stage ------------------------------------------------------------------ */
check('item stage: nothing started stays pending', item_stage_after($item(1, 2)), 'pending');
check('item stage: some ready is in production', item_stage_after($item(1, 2, 1)), 'in_production');
check('item stage: all ready', item_stage_after($item(1, 2, 2)), 'ready');
check('item stage: all out', item_stage_after($item(1, 2, 2, 2)), 'handed_over');
check('item stage: cancelled never moves', item_stage_after($item(1, 2, 2, 2, 'cancelled')), 'cancelled');

/* ---- rollup ---------------------------------------------------------------------- */
check('rollup: nothing started suggests nothing', job_items_rollup([$item(1, 2), $item(2, 3)]), null);
check('rollup: one started is in production', job_items_rollup([$item(1, 2, 1), $item(2, 3)]), 'in_production');
check('rollup: all ready', job_items_rollup([$item(1, 2, 2), $item(2, 3, 3)]), 'ready');
check('rollup: 2 of 5 out stays ready', job_items_rollup([$item(1, 2, 2, 2), $item(2, 3, 3, 0)]), 'ready');
check('rollup: all out is handed over', job_items_rollup([$item(1, 2, 2, 2), $item(2, 3, 3, 3)]), 'handed_over');
check('rollup: cancelled items ignored', job_items_rollup([$item(1, 2, 2, 2), $item(2, 3, 0, 0, 'cancelled')]), 'handed_over');
check('rollup: no active items', job_items_rollup([$item(1, 2, 0, 0, 'cancelled')]), null);

/* ---- handover checks ------------------------------------------------------------- */
$items = [10 => $item(10, 3, 3, 1), 11 => $item(11, 2, 1, 0), 12 => $item(12, 1, 1, 0, 'cancelled')];
[$ok, $err, $lines] = handover_items_ok($items, [['item_id' => 10, 'qty' => 2], ['item_id' => 11, 'qty' => 1]]);
check('handover: within ready and not yet out', [$ok, $lines], [true, [10 => 2, 11 => 1]]);
[$ok, $err] = handover_items_ok($items, [['item_id' => 10, 'qty' => 3]]);
check('handover: more than ready minus out refused', [$ok, isset($err['item.10'])], [false, true]);
[$ok, $err] = handover_items_ok($items, [['item_id' => 10, 'qty' => 0]]);
check('handover: zero refused', [$ok, isset($err['items.0'])], [false, true]);
[$ok, $err] = handover_items_ok($items, [['item_id' => 99, 'qty' => 1]]);
check('handover: foreign item refused', [$ok, isset($err['items.0'])], [false, true]);
[$ok, $err] = handover_items_ok($items, [['item_id' => 12, 'qty' => 1]]);
check('handover: cancelled item refused', $ok, false);
[$ok, $err] = handover_items_ok($items, [['item_id' => 10, 'qty' => 1], ['item_id' => 10, 'qty' => 2]]);
check('handover: same item twice is added up before the check', [$ok, isset($err['item.10'])], [false, true]);
check('handover: empty request refused', handover_items_ok($items, [])[0], false);
check('handover: non-array request refused', handover_items_ok($items, 'x')[0], false);

/* ---- samples and permissions ----------------------------------------------------- */
check('sample: submitted to approved', sample_transition_ok('submitted', 'approved'), true);
check('sample: submitted to changes', sample_transition_ok('submitted', 'changes_requested'), true);
check('sample: approved is final', [sample_transition_ok('approved', 'changes_requested'), sample_transition_ok('approved', 'submitted')], [false, false]);
check('sample: job status follows', [job_sample_status_for('approved'), job_sample_status_for('withdrawn')], ['approved', 'pending']);
$contact = ['active' => 1, 'can_view_jobs' => 1, 'can_approve_samples' => 0, 'is_invoice_recipient' => 1];
check('contact: may view, may not approve', [contact_can($contact, 'view_jobs'), contact_can($contact, 'approve_samples')], [true, false]);
check('contact: inactive may do nothing', contact_can(['active' => 0] + $contact, 'view_jobs'), false);
check('contact: unknown permission refused', contact_can($contact, 'pay'), false);

/* ---- projections ----------------------------------------------------------------- */
$job = ['id' => 7, 'public_ref' => 'HJ-ABC123', 'code' => 'HC-0042', 'description' => 'Staff uniforms', 'quantity' => 5,
  'job_stage' => 'in_production', 'due_date' => '2026-12-01', 'price' => '500000.00', 'notes' => 'internal note',
  'notes_internal' => 'secret', 'fabric_cost' => '1000', 'customer_id' => 3, 'company_id' => 2, 'po_number' => 'PO-77',
  'measurement_method' => 'sizes', 'handed_over_qty' => 2, 'invoice_contact_id' => 9];
$wearItems = [
  $item(1, 2, 2, 2, 'handed_over', ['size_label' => 'M', 'wearer_customer_id' => 31, 'wearer_label' => 'Driver 1', 'measurement_set_id' => 5]),
  $item(2, 3, 1, 0, 'in_production', ['size_label' => 'L', 'wearer_customer_id' => 32, 'wearer_label' => 'Driver 2']),
  $item(3, 1, 0, 0, 'cancelled', ['description' => 'Cap']),
];
$samples = [['id' => 1, 'version' => 1, 'description' => 'First', 'status' => 'changes_requested', 'decided_at' => null],
            ['id' => 2, 'version' => 2, 'description' => 'Second', 'status' => 'submitted', 'decided_at' => null, 'decision_note' => 'x']];
$ledger = [['id' => 1, 'kind' => 'payment', 'amount' => '100000.00', 'verified' => 1, 'method' => 'transfer', 'received_on' => '2026-10-01']];
$v = company_job_public_view($job, $wearItems, $samples, null, $ledger, [], []);
check('company view: exact key set', array_keys($v), COMPANY_JOB_PUBLIC_KEYS);
$bad = [];
$scan = function ($x, $path = '') use (&$scan, &$bad) {
  if (!is_array($x)) return;
  foreach ($x as $k => $val) {
    if (is_string($k) && preg_match('/wearer|measure|customer_id|notes|cost/i', $k)) $bad[] = $path . $k;
    $scan($val, $path . $k . '.');
  }
};
$scan($v);
check('company view: no wearer, measurement, customer, notes or cost keys anywhere', $bad, []);
check('company view: no internal values leak', [str_contains(json_encode($v), 'Driver'), str_contains(json_encode($v), 'HC-0042'), str_contains(json_encode($v), 'secret')], [false, false, false]);
check('company view: lines aggregated, cancelled dropped', [count($v['lines']), $v['lines'][0]['qty'], $v['lines'][0]['qty_ready'], $v['lines'][0]['qty_handed_over']], [1, 5, 3, 2]);
check('company view: sizes counted when measuring by size', $v['lines'][0]['sizes'], ['M' => 2, 'L' => 3]);
check('company view: latest sample only, without the note', [$v['sample']['version'], isset($v['sample']['decision_note'])], [2, false]);
check('company view: quantity is the active item total', [$v['quantity'], $v['quantity_ready']], [5, 3]);
$v2 = company_job_public_view(['measurement_method' => 'individual'] + $job, $wearItems, [], null, [], []);
check('company view: no sizes when measured individually', isset($v2['lines'][0]['sizes']), false);

$w = wearer_item_public_view($wearItems[1], $job);
check('wearer view: exact key set', array_keys($w), WEARER_ITEM_PUBLIC_KEYS);
check('wearer view: no price, company or other wearer', [str_contains(json_encode($w), '500000'), str_contains(json_encode($w), 'PO-77'), str_contains(json_encode($w), 'Driver')], [false, false, false]);
check('wearer view: own garment stage', [$w['stage'], $w['quantity']], ['in_production', 3]);

/* ---- item input ------------------------------------------------------------------ */
[$c, $e] = company_item_clean(['description' => ' Kaftan ', 'qty' => '2', 'size_label' => 'XL', 'wearer_customer_id' => '0']);
check('item clean: trims, casts, empty wearer is null', [$c['description'], $c['qty'], $c['size_label'], $c['wearer_customer_id'], $e], ['Kaftan', 2, 'XL', null, []]);
[, $e] = company_item_clean(['description' => '', 'qty' => 0]);
check('item clean: description and quantity required', array_keys($e), ['description', 'qty']);
