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
 *   }  each block is {count, items[<=20], more}; `more` is count minus the items listed
 *      (never negative), so the page can say "and N more" (K-07)
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
// Order (K-07): a promised follow-up that is due or overdue is a commitment to a
// customer, so it ranks first (most overdue first); then new enquiries; then the rest by
// follow-up date, those without one last. The list is capped, so this decides what drops off.
$EQ_ORDER = "(e.next_follow_up IS NOT NULL AND e.next_follow_up <= ?) DESC,
             CASE WHEN e.next_follow_up IS NOT NULL AND e.next_follow_up <= ? THEN e.next_follow_up END,
             e.status = 'new' DESC, e.next_follow_up IS NULL, e.next_follow_up, e.id DESC";
$EQ = "(e.status = 'new' OR (e.status IN ('awaiting_reply','contacted','quote_sent') AND e.next_follow_up IS NOT NULL AND e.next_follow_up <= ?))";
$out['enquiries'] = [
  'count' => (int)db_row("SELECT COUNT(*) AS n FROM enquiries e WHERE $EQ", 's', $today)['n'],
  'items' => array_map(function ($r) {
    $r['id'] = (int)$r['id'];
    $r['status'] = enquiry_status_from_legacy($r['status']) ?? $r['status'];
    return $r;
  }, db_rows("SELECT e.id, e.name, e.phone, e.email, e.company, e.type, e.interest, e.status, e.next_follow_up, e.desired_date, e.created_at
                FROM enquiries e WHERE $EQ ORDER BY $EQ_ORDER LIMIT " . TODAY_LIMIT, 'sss', $today, $today, $today)),
];

// Payments waiting for the owner to confirm (transfers, by default). Reversed ones drop out.
// Oldest received first, so nothing waits unseen the longest; a newer transfer past the cap
// is reported through `more`.
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

// Phase 3: clients waiting for an invite, unread client messages, open change requests, feedback to follow up.
$out['access_requests'] = has_table('customer_access_challenges') ? [
  'count' => (int)db_row("SELECT COUNT(*) AS n FROM customer_access_challenges WHERE status = 'awaiting_owner' AND expires_at > UTC_TIMESTAMP()")['n'],
  'items' => array_map(fn($r) => ['id' => (int)$r['id'], 'customer_id' => (int)$r['customer_id'], 'client_name' => $r['client_name'], 'created_at' => $r['created_at']],
    db_rows("SELECT ch.id, ch.customer_id, c.name AS client_name, ch.created_at FROM customer_access_challenges ch JOIN customers c ON c.id = ch.customer_id
              WHERE ch.status = 'awaiting_owner' AND ch.expires_at > UTC_TIMESTAMP() ORDER BY ch.id LIMIT " . TODAY_LIMIT)),
] : $EMPTY;
// Unread client messages: the count, the per-job count and the items share one FROM
// and WHERE, so a message on a deleted job (or with no job or client row) is in none
// of them (K-07 L5).
const TODAY_UNREAD_FROM = "FROM job_messages m JOIN tailoring_orders o ON o.id = m.job_id JOIN customers c ON c.id = m.customer_id
                WHERE m.author_type = 'customer' AND m.read_by_owner_at IS NULL AND o.deleted_at IS NULL";
if (has_table('job_messages')) {
  $out['messages_unread'] = [
    'count' => (int)db_row('SELECT COUNT(*) AS n ' . TODAY_UNREAD_FROM)['n'],
    'items' => array_map(fn($r) => ['job_id' => (int)$r['job_id'], 'job_code' => $r['code'], 'client_name' => $r['client_name'], 'unread' => (int)$r['unread'],
      'last_at_local' => lagos_iso($r['last_ts'])],
      db_rows("SELECT m.job_id, o.code, c.name AS client_name, COUNT(*) AS unread, MAX(m.created_at) AS last_at, UNIX_TIMESTAMP(MAX(m.created_at)) AS last_ts
                 " . TODAY_UNREAD_FROM . "
             GROUP BY m.job_id, o.code, c.name ORDER BY last_at LIMIT " . TODAY_LIMIT)),
  ];
  $out['change_requests'] = [
    'count' => (int)db_row("SELECT COUNT(*) AS n FROM job_change_requests WHERE status = 'open'")['n'],
    'items' => array_map(fn($r) => ['id' => (int)$r['id'], 'job_id' => (int)$r['job_id'], 'job_code' => $r['code'], 'client_name' => $r['client_name'],
      'kind' => $r['kind'], 'created_at' => $r['created_at']],
      db_rows("SELECT r.id, r.job_id, o.code, c.name AS client_name, r.kind, r.created_at FROM job_change_requests r
                 JOIN tailoring_orders o ON o.id = r.job_id JOIN customers c ON c.id = r.customer_id
                WHERE r.status = 'open' ORDER BY r.id LIMIT " . TODAY_LIMIT)),
  ];
  $out['feedback_follow_up'] = [
    'count' => (int)db_row("SELECT COUNT(*) AS n FROM job_feedback WHERE follow_up = 'open'")['n'],
    'items' => array_map(fn($r) => ['id' => (int)$r['id'], 'job_id' => (int)$r['job_id'], 'job_code' => $r['code'], 'client_name' => $r['client_name'],
      'rating' => $r['rating'] !== null ? (int)$r['rating'] : null, 'created_at' => $r['created_at']],
      db_rows("SELECT f.id, f.job_id, o.code, c.name AS client_name, f.rating, f.created_at FROM job_feedback f
                 JOIN tailoring_orders o ON o.id = f.job_id JOIN customers c ON c.id = f.customer_id
                WHERE f.follow_up = 'open' ORDER BY f.id LIMIT " . TODAY_LIMIT)),
  ];
} else {
  $out['messages_unread'] = $out['change_requests'] = $out['feedback_follow_up'] = $EMPTY;
}

// Every capped block says how many of its items are not in the list (K-07). The unread
// messages block lists one row per job while its count is of messages, so it is counted by job.
foreach ($out as $k => &$blk) {
  if (is_array($blk) && isset($blk['count'], $blk['items'])) $blk['more'] = today_more($blk['count'], count($blk['items']));
}
unset($blk);
if (has_table('job_messages')) {
  $unreadJobs = (int)db_row('SELECT COUNT(DISTINCT m.job_id) AS n ' . TODAY_UNREAD_FROM)['n'];
  $out['messages_unread']['more'] = today_more($unreadJobs, count($out['messages_unread']['items']));
}

json($out);
