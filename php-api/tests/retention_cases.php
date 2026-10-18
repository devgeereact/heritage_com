<?php
/**
 * HeritOS: retention plan tests (_retention.php, K-18). Required by run.php,
 * which provides check().
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/../_retention.php';

$now = 1_800_000_000;                       // 2027-01-15 08:00:00 UTC
$steps = fn($plan, $cat) => array_values(array_filter($plan['steps'], fn($s) => $s['category'] === $cat));
$allKeys = array_fill_keys(retention_keys(), '');

/* ---- OFF by default ---------------------------------------------------------- */
$p = retention_plan([], $now);
check('retention: no settings at all plans nothing', [$p['steps'], $p['invalid']], [[], []]);
check('retention: no settings means every category is off', $p['off'], array_keys(RETENTION_CATEGORIES));
check('retention: every key empty plans nothing', retention_plan($allKeys, $now)['steps'], []);
check('retention: 0 is off, not "delete everything"', retention_plan(['retention_whatsapp_log_days' => '0'] + $allKeys, $now)['steps'], []);
check('retention: whitespace only is off', retention_plan(['retention_whatsapp_log_days' => '  '], $now)['steps'], []);
check('retention: unknown keys are ignored', retention_plan(['retention_jobs_days' => '1', 'retention_ledger_days' => '1'], $now)['steps'], []);

/* ---- One category on --------------------------------------------------------- */
$p = retention_plan(['retention_expired_tokens_days' => '30'] + $allKeys, $now);
check('retention: only the category that is on is planned', array_values(array_unique(array_column($p['steps'], 'category'))), ['expired_tokens']);
check('retention: tokens cover staff and legacy portal tokens', array_column($p['steps'], 'table'), ['auth_tokens', 'customer_tokens']);
check('retention: tokens keyed on expiry', array_column($p['steps'], 'column'), ['expires_at', 'expires_at']);
check('retention: cutoff is 30 days before now, UTC', $p['steps'][0]['cutoff'], '2026-12-16 08:00:00');
check('retention: cutoff bound as the only parameter', $p['steps'][0]['params'], ['2026-12-16 08:00:00']);
check('retention: count statement uses a placeholder',
  $p['steps'][0]['count_sql'], 'SELECT COUNT(*) AS n FROM `auth_tokens` WHERE `expires_at` < ?');
check('retention: delete statement is batched',
  $p['steps'][0]['delete_sql'], 'DELETE FROM `auth_tokens` WHERE `expires_at` < ? LIMIT ' . RETENTION_BATCH);
check('retention: no literal date in the SQL', strpos($p['steps'][0]['delete_sql'] . $p['steps'][0]['count_sql'], '2026'), false);

/* ---- Cutoff arithmetic ------------------------------------------------------- */
check('cutoff: 1 day', retention_cutoff($now, 1), '2027-01-14 08:00:00');
check('cutoff: 365 days crosses a year', retention_cutoff($now, 365), '2026-01-15 08:00:00');
check('cutoff: leap year 2028 counted (Mar 1 minus 1 day is Feb 29)', retention_cutoff(gmmktime(12, 0, 0, 3, 1, 2028), 1), '2028-02-29 12:00:00');
check('cutoff: independent of the PHP default time zone', (function () use ($now) {
  $tz = date_default_timezone_get(); date_default_timezone_set('Africa/Lagos');
  $c = retention_cutoff($now, 30); date_default_timezone_set($tz); return $c; })(), '2026-12-16 08:00:00');
check('cutoff: the step carries the days used', retention_plan(['retention_audit_log_days' => '400'], $now)['steps'][0]['days'], 400);

/* ---- Invalid values are OFF, with an error ----------------------------------- */
foreach (['-5' => 'negative', 'thirty' => 'text', '12.5' => 'decimal', '1e3' => 'exponent', '99999999' => 'huge',
          '3651' => 'over ten years', '30; DROP TABLE users' => 'injection text'] as $v => $what) {
  $pp = retention_plan(['retention_whatsapp_log_days' => (string)$v], $now);
  check("invalid: $what plans nothing and is reported", [$pp['steps'], isset($pp['invalid']['whatsapp_log'])], [[], true]);
}
check('invalid: an array value is refused', retention_parse_days('whatsapp_log', ['30'])['days'], null);
check('invalid: an array value is reported', retention_parse_days('whatsapp_log', ['30'])['error'] !== null, true);
check('invalid: audit log below its 90-day floor', retention_parse_days('audit_log', '30')['days'], null);
check('invalid: audit log floor message', retention_parse_days('audit_log', '30')['error'], 'must be 90 to 3650 days, or empty to keep forever');
check('valid: audit log at its floor', retention_parse_days('audit_log', '90'), ['days' => 90, 'error' => null]);
check('valid: ten years exactly', retention_parse_days('whatsapp_log', '3650'), ['days' => 3650, 'error' => null]);
check('valid: an integer is accepted', retention_parse_days('waitlist', 30), ['days' => 30, 'error' => null]);
check('valid: surrounding spaces trimmed', retention_parse_days('waitlist', ' 30 '), ['days' => 30, 'error' => null]);
check('invalid: unknown category', retention_parse_days('jobs', '30')['error'], 'unknown category');
$mixed = retention_plan(['retention_waitlist_days' => '-1', 'retention_abandoned_carts_days' => '30'], $now);
check('invalid: one bad value does not stop the others', array_column($mixed['steps'], 'table'), ['abandoned_carts']);

/* ---- Enquiries: only closed, never converted, unreferenced ------------------- */
$e = $steps(retention_plan(['retention_closed_enquiries_days' => '365'], $now), 'closed_enquiries');
check('enquiries: one step on enquiries by last change', [count($e), $e[0]['table'], $e[0]['column']], [1, 'enquiries', 'updated_at']);
foreach (["status = 'closed'", 'job_id IS NULL', 'converted_at IS NULL', 'FROM quotes', 'FROM tailoring_orders', 'FROM appointments'] as $frag) {
  check("enquiries: delete keeps the guard \"$frag\"", strpos($e[0]['delete_sql'], $frag) !== false, true);
}
check('enquiries: count and delete use the same condition',
  substr($e[0]['count_sql'], strpos($e[0]['count_sql'], 'WHERE')), substr($e[0]['delete_sql'], strpos($e[0]['delete_sql'], 'WHERE'), -strlen(' LIMIT ' . RETENTION_BATCH)));

/* ---- Protected tables never appear ------------------------------------------- */
$everything = array_fill_keys(retention_keys(), '3650');
$full = retention_plan($everything, $now);
check('protected: every category on plans every mapped table', count($full['steps']), 9);
check('protected: no step deletes from a protected table',
  array_values(array_intersect(array_column($full['steps'], 'table'), RETENTION_PROTECTED_TABLES)), []);
$deleteTargets = array_map(fn($s) => preg_match('/^DELETE FROM `([a-z_]+)`/', $s['delete_sql'], $m) ? $m[1] : '?', $full['steps']);
check('protected: DELETE targets match the step tables', $deleteTargets, array_column($full['steps'], 'table'));
foreach (['tailoring_orders', 'job_payments', 'payments', 'quotes', 'orders', 'measurement_sets', 'customers'] as $t) {
  check("protected: $t is on the protected list", in_array($t, RETENTION_PROTECTED_TABLES, true), true);
}
check('protected: the map itself names no protected table', array_values(array_filter(
  array_merge(...array_map(fn($c) => array_column($c['steps'], 'table'), array_values(RETENTION_CATEGORIES))),
  fn($t) => in_array($t, RETENTION_PROTECTED_TABLES, true))), []);
check('keys: one settings key per category, all prefixed', count(array_filter(retention_keys(), fn($k) => str_starts_with($k, 'retention_') && str_ends_with($k, '_days'))), count(RETENTION_CATEGORIES));
