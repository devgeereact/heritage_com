<?php
/**
 * HeritOS: Today. One call returns the owner's daily worklist.
 *
 *   GET /today.php  (owner roles) → {
 *     date (Lagos Y-m-d), generated_at (UTC),
 *     appointments_today, overdue, due_soon, next_actions, ready, enquiries,
 *     balances (+ total_balance), credits (+ total_credit), unverified_payments
 *     (+ total_unverified), stage_review, measurements_pending,
 *     appointment_requests, access_requests, messages_unread, change_requests, feedback_follow_up
 *   }  each block is {count, items[<=20]}
 *
 * appointments_today comes from the appointments table once schema_phase23.sql
 * is imported (items: id, type, status, all_day, starts_at_local, ends_at_local,
 * client_name, job_id, job_code); before that it is the old fitting_date list.
 * The Phase 3 blocks are empty ({count:0, items:[]}) until their schema exists.
 *
 * "Today" is the Africa/Lagos date computed in PHP and passed as a parameter,
 * never the database server's CURDATE().
 */
require __DIR__ . '/_lib.php';
require __DIR__ . '/_jobs.php';
cors();
$user = require_auth(ROLES_OWNER);
if (method() !== 'GET') fail('Method not allowed', 405);

$today = lagos_today();
$week = date_add_days($today, 7);
const TODAY_LIMIT = 20;

/** {count, items} for a job query. $where is trusted SQL with ? placeholders. */
function job_block($where, $types, array $args, $order) {
  $count = (int)(db_row("SELECT COUNT(*) AS n FROM tailoring_orders o WHERE o.deleted_at IS NULL AND $where", $types, ...$args)['n'] ?? 0);
  $items = db_rows(
    "SELECT o.id, o.code, o.customer_id, c.name AS client_name, c.client_ref, o.garment_type, o.quantity, o.description,
            o.job_stage, o.stage, o.due_date, o.event_date, o.fitting_date, o.next_action, o.next_action_date,
            o.handed_over_qty, o.price, o.paid_total, o.payment_state
       FROM tailoring_orders o JOIN customers c ON c.id = o.customer_id
      WHERE o.deleted_at IS NULL AND $where ORDER BY $order LIMIT " . TODAY_LIMIT, $types, ...$args);
  foreach ($items as &$r) {
    $r['job_stage'] = job_stage_of($r);
    $r['stage_label'] = JOB_STAGE_LABELS[$r['job_stage']] ?? null;
    $pm = decimal_to_minor($r['price']); $paid = decimal_to_minor($r['paid_total']);
    $r['balance'] = minor_to_decimal(max(0, $pm - $paid));
    $r['credit'] = minor_to_decimal($pm > 0 ? max(0, $paid - $pm) : 0);
    foreach (['id', 'customer_id', 'quantity', 'handed_over_qty'] as $k) $r[$k] = (int)$r[$k];
    unset($r['stage']);
  }
  return ['count' => $count, 'items' => $items];
}

$OPEN = "o.job_stage NOT IN ('handed_over','cancelled')";
$out = ['date' => $today, 'timezone' => BUSINESS_TZ, 'generated_at' => gmdate('Y-m-d H:i:s')];

$EMPTY = ['count' => 0, 'items' => []];
if (has_table('appointments')) {
  // Today's Lagos day in UTC; all-day appointments for today are included.
  $dayStart = utc_sql(lagos_midnight_ts($today)); $dayEnd = utc_sql(lagos_midnight_ts($today) + 86400);
  $ACTIVE = "a.starts_at < ? AND a.ends_at > ? AND (a.status = 'confirmed' OR (a.status = 'requested' AND a.hold_expires_at > UTC_TIMESTAMP()))";
  $appt = fn($r) => ['id' => (int)$r['id'], 'type' => $r['type'], 'status' => $r['status'], 'all_day' => (int)$r['all_day'],
    'starts_at_local' => lagos_iso($r['starts_at']), 'ends_at_local' => lagos_iso($r['ends_at']), 'client_name' => $r['client_name'] ?? $r['contact_name'],
    'job_id' => $r['job_id'] !== null ? (int)$r['job_id'] : null, 'job_code' => $r['job_code'], 'source' => $r['source']];
  $SEL = 'SELECT a.*, c.name AS client_name, o.code AS job_code FROM appointments a
            LEFT JOIN customers c ON c.id = a.customer_id LEFT JOIN tailoring_orders o ON o.id = a.job_id';
  $out['appointments_today'] = [
    'count' => (int)db_row("SELECT COUNT(*) AS n FROM appointments a WHERE $ACTIVE", 'ss', $dayEnd, $dayStart)['n'],
    'items' => array_map($appt, db_rows("$SEL WHERE $ACTIVE ORDER BY a.all_day DESC, a.starts_at LIMIT " . TODAY_LIMIT, 'ss', $dayEnd, $dayStart)),
  ];
  $REQ = "a.status = 'requested' AND a.hold_expires_at > UTC_TIMESTAMP()";
  $out['appointment_requests'] = [
    'count' => (int)db_row("SELECT COUNT(*) AS n FROM appointments a WHERE $REQ")['n'],
    'items' => array_map($appt, db_rows("$SEL WHERE $REQ ORDER BY a.hold_expires_at LIMIT " . TODAY_LIMIT)),
  ];
} else {
  // Before schema_phase23.sql: fittings dated today, as in Phase 2.
  $out['appointments_today'] = job_block("$OPEN AND o.fitting_date = ?", 's', [$today], 'o.id');
  $out['appointment_requests'] = $EMPTY;
}
$out['overdue'] = job_block("$OPEN AND o.due_date IS NOT NULL AND o.due_date < ?", 's', [$today], 'o.due_date, o.id');
$out['due_soon'] = job_block("$OPEN AND o.due_date BETWEEN ? AND ?", 'ss', [$today, $week], 'o.due_date, o.id');
$out['next_actions'] = job_block("$OPEN AND o.next_action_date IS NOT NULL AND o.next_action_date <= ?", 's', [$today], 'o.next_action_date, o.id');
$out['ready'] = job_block("o.job_stage = 'ready' AND o.handed_over_qty < o.quantity", '', [], 'o.due_date IS NULL, o.due_date, o.id');
$out['balances'] = job_block("o.payment_state IN ('unpaid','part_paid') AND o.job_stage NOT IN ('quote','cancelled')", '', [], 'o.due_date IS NULL, o.due_date, o.id');
$out['balances']['total_balance'] = minor_to_decimal(decimal_to_minor(db_row(
  "SELECT COALESCE(SUM(price - paid_total), 0) AS t FROM tailoring_orders o
    WHERE o.deleted_at IS NULL AND o.payment_state IN ('unpaid','part_paid') AND o.job_stage NOT IN ('quote','cancelled')")['t']));
$out['credits'] = job_block("o.payment_state = 'credit'", '', [], 'o.id');
$out['credits']['total_credit'] = minor_to_decimal(decimal_to_minor(db_row(
  "SELECT COALESCE(SUM(paid_total - price), 0) AS t FROM tailoring_orders o WHERE o.deleted_at IS NULL AND o.payment_state = 'credit'")['t']));
$out['stage_review'] = job_block('o.stage_review = 1', '', [], 'o.id');

// Enquiries: new ones, plus follow-ups that have come due. 'contacted' is the legacy alias.
$EQ = "(e.status = 'new' OR (e.status IN ('awaiting_reply','contacted','quote_sent') AND e.next_follow_up IS NOT NULL AND e.next_follow_up <= ?))";
$out['enquiries'] = [
  'count' => (int)db_row("SELECT COUNT(*) AS n FROM enquiries e WHERE $EQ", 's', $today)['n'],
  'items' => array_map(function ($r) {
    $r['id'] = (int)$r['id'];
    $r['status'] = enquiry_status_from_legacy($r['status']) ?? $r['status'];
    return $r;
  }, db_rows("SELECT e.id, e.name, e.phone, e.email, e.company, e.type, e.interest, e.status, e.next_follow_up, e.desired_date, e.created_at
                FROM enquiries e WHERE $EQ ORDER BY e.status = 'new' DESC, e.next_follow_up, e.id DESC LIMIT " . TODAY_LIMIT, 's', $today)),
];

// Payments waiting for the owner to confirm (transfers, by default). Reversed ones drop out.
$UV = "p.verified = 0 AND p.kind <> 'reversal' AND NOT EXISTS (SELECT 1 FROM job_payments r WHERE r.reverses_id = p.id)";
$out['unverified_payments'] = [
  'count' => (int)db_row("SELECT COUNT(*) AS n FROM job_payments p WHERE $UV")['n'],
  'total_unverified' => minor_to_decimal(decimal_to_minor(db_row("SELECT COALESCE(SUM(p.amount),0) AS t FROM job_payments p WHERE $UV")['t'])),
  'items' => array_map(function ($r) {
    foreach (['id', 'job_id'] as $k) $r[$k] = (int)$r[$k];
    return $r;
  }, db_rows("SELECT p.id, p.job_id, o.code, c.name AS client_name, p.kind, p.amount, p.method, p.external_ref, p.received_on, p.created_at
                FROM job_payments p JOIN tailoring_orders o ON o.id = p.job_id JOIN customers c ON c.id = o.customer_id
               WHERE $UV ORDER BY p.received_on, p.id LIMIT " . TODAY_LIMIT)),
];

// Measurement sets waiting for the owner (entered by a tailor or proposed by a client).
$out['measurements_pending'] = [
  'count' => (int)db_row("SELECT COUNT(*) AS n FROM measurement_sets WHERE status = 'pending'")['n'],
  'imported_unverified' => (int)db_row("SELECT COUNT(*) AS n FROM measurement_sets WHERE status = 'imported_unverified'")['n'],
  'items' => array_map(function ($r) {
    foreach (['id', 'customer_id'] as $k) $r[$k] = (int)$r[$k];
    return $r;
  }, db_rows("SELECT s.id, s.customer_id, c.name AS client_name, s.template_key, s.unit, s.source, s.taken_at, s.created_at
                FROM measurement_sets s JOIN customers c ON c.id = s.customer_id
               WHERE s.status = 'pending' ORDER BY s.id LIMIT " . TODAY_LIMIT)),
];

json($out);
