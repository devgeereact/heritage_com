<?php
/**
 * HeritOS: Phase 7 tests (_review.php): the usage allowlist and the review
 * report calculations. Required by run.php, which provides check().
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/../_review.php';

/* ---- Usage: section allowlist and role --------------------------------------- */
check('usage: a menu section is accepted', usage_section_ok('jobs'), true);
check('usage: today is accepted', usage_section_ok('today'), true);
foreach (['', 'Jobs', 'jobs/12', '/jobs', 'print', 'auth', 'apps', 'jobs ', 'x' . str_repeat('y', 50)] as $bad) {
  check('usage: ' . var_export($bad, true) . ' is refused', usage_section_ok($bad), false);
}
foreach ([null, 7, ['jobs'], true] as $bad) {
  check('usage: non-text ' . gettype($bad) . ' is refused', usage_section_ok($bad), false);
}
check('usage: no duplicate sections', count(USAGE_SECTIONS), count(array_unique(USAGE_SECTIONS)));
check('usage: every section fits VARCHAR(40)', max(array_map('strlen', USAGE_SECTIONS)) <= 40, true);
check('usage: every section is a lower-case key', count(array_filter(USAGE_SECTIONS, fn($s) => preg_match('/^[a-z_]+$/', $s))), count(USAGE_SECTIONS));
check('usage: a staff role is kept', usage_role('tailor'), 'tailor');
check('usage: customer is not a staff role', usage_role('customer'), null);
check('usage: an empty role is refused', usage_role(''), null);
check('usage: every role fits VARCHAR(20)', max(array_map('strlen', USAGE_ROLES)) <= 20, true);

/* ---- Review window ------------------------------------------------------------ */
check('window: default is 30 days', review_window(null), 30);
check('window: empty is the default', review_window(''), 30);
check('window: 30 as text', review_window('30'), 30);
check('window: 90 as a number', review_window(90), 90);
foreach (['7', '365', '0', '-30', '30.5', ' 30', 'abc', '3e1'] as $bad) {
  check('window: ' . var_export($bad, true) . ' is refused', review_window($bad), null);
}
check('window: a list is refused', review_window(['30']), null);
check('window start: 30 days ends today, so it starts 29 days back', review_window_start('2026-10-19', 30), '2026-09-20');
check('window start: 90 days crosses months', review_window_start('2026-10-19', 90), '2026-07-22');
check('window start: 1 day is today', review_window_start('2026-10-19', 1), '2026-10-19');
check('window start: crosses a leap day', review_window_start('2028-03-01', 2), '2028-02-29');
check('window start: a bad date is null', review_window_start('2026-02-30', 30), null);

/* ---- Rate and median ------------------------------------------------------------ */
check('rate: 3 of 12', review_rate(3, 12), 0.25);
check('rate: rounded to three places', review_rate(1, 3), 0.333);
check('rate: none created is no rate, not 0', review_rate(0, 0), null);
check('rate: none converted is 0', review_rate(0, 5), 0.0);
check('rate: all converted is 1', review_rate(4, 4), 1.0);
check('median: empty is null', review_median([]), null);
check('median: one value', review_median([2.5]), 2.5);
check('median: odd count, unsorted', review_median([9, 1, 4]), 4.0);
check('median: even count averages the middle two', review_median([1, 2, 3, 10]), 2.5);
check('median: rounded to one place', review_median([1.04, 1.06]), 1.1);
check('median: non-numbers are ignored', review_median([3, 'x', null, 5]), 4.0);
check('days between: one and a half days', review_days_between(1_800_000_000, 1_800_000_000 + 129600), 1.5);
check('days between: same moment is 0', review_days_between(1_800_000_000, 1_800_000_000), 0.0);
check('days between: never negative (clock skew)', review_days_between(1_800_000_100, 1_800_000_000), 0.0);
check('days between: missing value is null', review_days_between(null, 1_800_000_000), null);

/* ---- Overdue days --------------------------------------------------------------- */
check('overdue: due yesterday is 1 day late', review_overdue_days('2026-10-18', '2026-10-19'), 1);
check('overdue: due today is not late', review_overdue_days('2026-10-19', '2026-10-19'), 0);
check('overdue: due in future is not late', review_overdue_days('2026-11-01', '2026-10-19'), 0);
check('overdue: across a year', review_overdue_days('2025-10-19', '2026-10-19'), 365);
check('overdue: across a leap year', review_overdue_days('2028-02-28', '2028-03-01'), 2);
check('overdue: independent of the PHP default time zone', (function () {
  $tz = date_default_timezone_get(); date_default_timezone_set('Africa/Lagos');
  $d = review_overdue_days('2026-03-28', '2026-03-30'); date_default_timezone_set($tz); return $d; })(), 2);
check('overdue: a bad date is null', review_overdue_days('2026-13-01', '2026-10-19'), null);
check('overdue: a datetime is not a date', review_overdue_days('2026-10-18 10:00:00', '2026-10-19'), null);

/* ---- Delivery summaries --------------------------------------------------------- */
check('delivery: WhatsApp sent, delivered and read count as sent; manual and queued are other',
  review_delivery(['sent' => 2, 'delivered' => 3, 'read' => 1, 'failed' => 2, 'manual' => 4, 'queued' => 1], REVIEW_WA_SENT, REVIEW_WA_FAILED),
  ['sent' => 6, 'failed' => 2, 'other' => 5, 'total' => 13]);
check('delivery: nothing sent is all zero', review_delivery([], REVIEW_WA_SENT, REVIEW_WA_FAILED), ['sent' => 0, 'failed' => 0, 'other' => 0, 'total' => 0]);
check('delivery: negative counts are treated as 0', review_delivery(['sent' => -3, 'failed' => 1], ['sent'], ['failed']), ['sent' => 0, 'failed' => 1, 'other' => 0, 'total' => 1]);

/* ---- Usage by section and zero-hit sections ------------------------------------- */
$u = review_usage_by_section([
  ['section' => 'jobs', 'role' => 'tailor', 'hits' => 5],
  ['section' => 'jobs', 'role' => 'super_admin', 'hits' => '2'],
  ['section' => 'today', 'role' => 'super_admin', 'hits' => 7],
  ['section' => 'clients', 'role' => 'manager', 'hits' => 7],
  ['section' => 'hacked', 'role' => 'tailor', 'hits' => 99],
  ['section' => 'stock', 'role' => 'employee', 'hits' => 0],
]);
check('usage table: most used first, ties in menu order', array_column($u, 'section'), ['today', 'clients', 'jobs']);
check('usage table: hits summed over roles', array_column($u, 'hits'), [7, 7, 7]);
check('usage table: per role counts, roles sorted', $u[2]['roles'], ['super_admin' => 2, 'tailor' => 5]);
check('usage table: a section off the allowlist is left out', in_array('hacked', array_column($u, 'section'), true), false);
check('usage table: a section with 0 hits is left out', in_array('stock', array_column($u, 'section'), true), false);
$z = review_zero_hit_sections($u);
check('zero hits: every allowlisted section not used', count($z), count(USAGE_SECTIONS) - 3);
check('zero hits: used sections are not listed', array_values(array_intersect($z, ['today', 'clients', 'jobs'])), []);
check('zero hits: a 0-hit row still counts as unused', in_array('stock', $z, true), true);
check('zero hits: menu order kept', $z, array_values(array_diff(USAGE_SECTIONS, ['today', 'clients', 'jobs'])));
check('zero hits: nothing counted means every section', review_zero_hit_sections([]), USAGE_SECTIONS);

/* ---- Refusals --------------------------------------------------------------------- */
$r = review_refusals(['login_fail_ip' => 3, 'track_fail_ip' => '2', 'login_fail_acct' => 3, 'mail_send_failed' => 4, 'something_else' => 9]);
check('refusals: every listed action appears, zeros kept', count($r), count(REVIEW_REFUSAL_ACTIONS));
check('refusals: counts are read', array_column($r, 'count', 'action')['login_fail_ip'], 3);
check('refusals: text counts become numbers', array_column($r, 'count', 'action')['track_fail_ip'], 2);
check('refusals: email failures belong to the Email card, not here', array_key_exists('mail_send_failed', array_column($r, 'count', 'action')), false);
check('refusals: the second row of a staff sign-in refusal is not counted', array_key_exists('login_fail_acct', array_column($r, 'count', 'action')), false);
check('refusals: unlisted actions are ignored', array_sum(array_column($r, 'count')), 5);
check('refusals: each has a plain label', count(array_filter($r, fn($x) => is_string($x['label']) && $x['label'] !== '')), count($r));
