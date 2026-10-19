<?php
/**
 * HeritOS: the owner's review report (Phase 7, learn and simplify). Read-only.
 *
 *   GET /review.php?action=summary&days=30|90   (super_admin only) → {
 *     days, from, to (Lagos Y-m-d, both included), timezone, generated_at (UTC),
 *     enquiries:     {available, created, converted, rate, median_days_to_convert, timed},
 *     overdue_jobs:  {count, items[<=20]: {id, code, client_name, due_date, days_overdue}, more},
 *     refusals:      {available, total, items: [{action, label, count}]},
 *     notifications: {whatsapp, reminders, email, portal_messages}: each
 *                    {available, sent, failed, other, total, by_status},
 *     usage:         {available, counting_since, sections: [{section, hits, roles}], zero_hit_sections}
 *   }
 *
 * The window is the last `days` Lagos days including today (lagos_today() in
 * PHP, never the database's CURDATE()). TIMESTAMP columns are compared with
 * FROM_UNIXTIME() of the window's start, so the database session zone does not
 * move the window; enquiries.converted_at is a UTC DATETIME and is read as UTC.
 * Every block that needs a table or column from a later schema says
 * available:false instead of failing. Calculations are in _review.php.
 */
require __DIR__ . '/_lib.php';
require __DIR__ . '/_jobs.php';
require __DIR__ . '/_review.php';
cors();

$user = require_auth(['super_admin']);
if (method() !== 'GET') fail('Method not allowed', 405);
$action = $_GET['action'] ?? 'summary';
if ($action !== 'summary') fail('Unknown action', 404);

$days = review_window(isset($_GET['days']) ? in_str($_GET, 'days') : null);
if ($days === null) fail('days must be 30 or 90');

$today = lagos_today();
$from = review_window_start($today, $days);
$startTs = lagos_midnight_ts($from);
$out = ['days' => $days, 'from' => $from, 'to' => $today, 'timezone' => BUSINESS_TZ, 'generated_at' => gmdate('Y-m-d H:i:s')];

/* ---- Enquiry conversion ----------------------------------------------------- */
// Enquiries created in the window, and how many of those have become a job so far.
$hasConv = has_column('enquiries', 'converted_at') && has_column('enquiries', 'job_id');
if ($hasConv) {
  $rows = db_rows('SELECT UNIX_TIMESTAMP(e.created_at) AS created_ts, e.converted_at, e.job_id
                     FROM enquiries e WHERE e.created_at >= FROM_UNIXTIME(?)', 'i', $startTs);
  $converted = 0; $durations = [];
  foreach ($rows as $r) {
    if ($r['converted_at'] === null && $r['job_id'] === null) continue;
    $converted++;
    if ($r['converted_at'] !== null) {
      $convTs = strtotime($r['converted_at'] . ' UTC');
      if ($convTs !== false) $durations[] = review_days_between((int)$r['created_ts'], $convTs);
    }
  }
  $out['enquiries'] = ['available' => true, 'created' => count($rows), 'converted' => $converted,
    'rate' => review_rate($converted, count($rows)), 'median_days_to_convert' => review_median($durations),
    'timed' => count($durations)];
} else {
  $created = (int)(db_row('SELECT COUNT(*) AS n FROM enquiries e WHERE e.created_at >= FROM_UNIXTIME(?)', 'i', $startTs)['n'] ?? 0);
  $out['enquiries'] = ['available' => false, 'created' => $created, 'converted' => null, 'rate' => null,
    'median_days_to_convert' => null, 'timed' => 0];
}

/* ---- Overdue jobs now ------------------------------------------------------- */
// Open jobs past their due date today, the same rule as Today's Overdue block.
$OVERDUE = "o.deleted_at IS NULL AND o.job_stage NOT IN ('handed_over','cancelled') AND o.due_date IS NOT NULL AND o.due_date < ?";
$count = (int)(db_row("SELECT COUNT(*) AS n FROM tailoring_orders o WHERE $OVERDUE", 's', $today)['n'] ?? 0);
$items = array_map(fn($r) => [
  'id' => (int)$r['id'], 'code' => $r['code'], 'client_name' => $r['client_name'], 'due_date' => $r['due_date'],
  'days_overdue' => review_overdue_days($r['due_date'], $today),
], db_rows("SELECT o.id, o.code, o.due_date, c.name AS client_name
              FROM tailoring_orders o LEFT JOIN customers c ON c.id = o.customer_id
             WHERE $OVERDUE ORDER BY o.due_date, o.id LIMIT " . REVIEW_LIMIT, 's', $today));
$out['overdue_jobs'] = ['count' => $count, 'items' => $items, 'more' => max(0, $count - count($items))];

/* ---- Refused attempts (from the audit log) ---------------------------------- */
// Only refusals that are audited one row per attempt (REVIEW_REFUSAL_ACTIONS).
$actions = array_keys(REVIEW_REFUSAL_ACTIONS);
$marks = implode(',', array_fill(0, count($actions), '?'));
$counts = [];
foreach (db_rows("SELECT action, COUNT(*) AS n FROM audit_log WHERE created_at >= FROM_UNIXTIME(?) AND action IN ($marks) GROUP BY action",
  'i' . str_repeat('s', count($actions)), $startTs, ...$actions) as $r) $counts[$r['action']] = (int)$r['n'];
$refusals = review_refusals($counts);
$out['refusals'] = ['available' => true, 'total' => array_sum(array_column($refusals, 'count')), 'items' => $refusals];

/* ---- Failed saves (K-31): lost races (409) and server errors (500) ------------ */
// audit_failure() writes one row per failure with the endpoint and its ?action,
// no person. 400 answers (bad input) are not counted: they are the form doing its job.
$rows = db_rows("SELECT action, entity, JSON_UNQUOTE(JSON_EXTRACT(meta, '$.action')) AS sub, COUNT(*) AS n
                   FROM audit_log WHERE created_at >= FROM_UNIXTIME(?) AND action IN ('save_conflict', 'server_error')
                  GROUP BY action, entity, sub", 'i', $startTs);
$out['failed_saves'] = ['available' => true] + review_failed_saves($rows);

/* ---- Notifications sent and failed ------------------------------------------ */
/** {available, sent, failed, other, total, by_status} from status => count rows. */
function review_block(array $rows, array $sent, array $failed) {
  $by = [];
  foreach ($rows as $r) $by[(string)$r['status']] = (int)$r['n'];
  ksort($by);
  return ['available' => true] + review_delivery($by, $sent, $failed) + ['by_status' => (object)$by];
}
$NONE = ['available' => false, 'sent' => 0, 'failed' => 0, 'other' => 0, 'total' => 0, 'by_status' => (object)[]];
$n = [];
if (has_table('whatsapp_messages')) {
  $WA = "FROM whatsapp_messages WHERE direction = 'out' AND created_at >= FROM_UNIXTIME(?)";
  $n['whatsapp'] = review_block(db_rows("SELECT status, COUNT(*) AS n $WA GROUP BY status", 'i', $startTs), REVIEW_WA_SENT, REVIEW_WA_FAILED);
  // Job reminders are WhatsApp messages with this template (tailoring.php?action=remind).
  $n['reminders'] = review_block(db_rows("SELECT status, COUNT(*) AS n $WA AND template = 'tailoring_reminder' GROUP BY status", 'i', $startTs),
    REVIEW_WA_SENT, REVIEW_WA_FAILED);
} else {
  $n['whatsapp'] = $NONE; $n['reminders'] = $NONE;
}
// Email: _mail.php audits every send as mail_send or mail_send_failed.
$n['email'] = review_block(db_rows("SELECT IF(action = 'mail_send', 'sent', 'failed') AS status, COUNT(*) AS n FROM audit_log
                                      WHERE created_at >= FROM_UNIXTIME(?) AND action IN ('mail_send', 'mail_send_failed') GROUP BY status",
  'i', $startTs), ['sent'], ['failed']);
if (has_table('job_messages')) {
  $n['portal_messages'] = review_block(db_rows("SELECT delivery_status AS status, COUNT(*) AS n FROM job_messages
                                                 WHERE author_type = 'owner' AND visibility = 'client' AND delivery_status <> 'na'
                                                   AND created_at >= FROM_UNIXTIME(?) GROUP BY delivery_status", 'i', $startTs),
    REVIEW_MSG_SENT, REVIEW_MSG_FAILED);
} else {
  $n['portal_messages'] = $NONE;
}
$out['notifications'] = $n;

/* ---- Section usage ---------------------------------------------------------- */
if (has_table('usage_daily')) {
  $usage = review_usage_by_section(db_rows('SELECT section, role, SUM(hits) AS hits FROM usage_daily WHERE day >= ? GROUP BY section, role', 's', $from));
  $since = db_row('SELECT MIN(day) AS d FROM usage_daily')['d'] ?? null;
  $out['usage'] = ['available' => true, 'counting_since' => $since, 'sections' => $usage, 'zero_hit_sections' => review_zero_hit_sections($usage)];
} else {
  $out['usage'] = ['available' => false, 'counting_since' => null, 'sections' => [], 'zero_hit_sections' => []];
}

json($out);
