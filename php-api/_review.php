<?php
/**
 * HeritOS: Phase 7 "learn and simplify". Pure helpers, no database and no I/O.
 *
 * - The section allowlist for usage counting (usage.php): the first URL segment
 *   of every admin menu item in src/assets/data/menu-items.js. A frontend test
 *   (src/__tests__/usage.test.js) reads this file and checks the two lists match.
 * - The calculations behind the owner's review report (review.php): rates,
 *   medians, overdue days, delivery summaries and the zero-hit section list.
 *
 * Usage counting stores day, section, role and a count. No user id, no IP, no
 * path beyond the section key (docs/DATA-PRIVACY.md).
 */

/** Admin menu sections that may be counted, in menu order. */
const USAGE_SECTIONS = [
  'today', 'enquiries', 'appointments', 'messages', 'clients', 'jobs', 'payments', 'website',
  'settings',
  'reports', 'finance', 'catalogue', 'sales', 'pos', 'stock', 'suppliers', 'marketing', 'studio',
  'analytics', 'engage', 'loyalty', 'coupons', 'reviews', 'content', 'inbox', 'whatsapp', 'weather',
  'team', 'permissions', 'channels', 'profile',
];

/** Staff roles a usage row may carry (users.php $ROLES). */
const USAGE_ROLES = ['super_admin', 'admin', 'manager', 'tailor', 'editor', 'seller', 'employee'];

/** The windows the review report offers, in days. */
const REVIEW_WINDOWS = [30, 90];

/** Rows listed in a capped block (overdue jobs). */
const REVIEW_LIMIT = 20;

/**
 * Audit actions that record a refused attempt, one row per attempt. Where a
 * refusal writes two rows (staff sign-in writes login_fail_ip and
 * login_fail_acct), only one of them is listed, so nothing is counted twice.
 * These are refused sign-ins and checks, not failed saves: HeritOS does not
 * audit a save that answers 400, 409 or 500 (docs/API-SPEC.md, Phase 7).
 */
const REVIEW_REFUSAL_ACTIONS = [
  'login_fail_ip' => 'Staff sign-in refused (wrong email or password)',
  'pin_login_fail' => 'Staff PIN sign-in refused',
  'reset_fail_ip' => 'Password reset link refused (used, expired or unknown)',
  'set_pin_taken' => 'New PIN refused (already in use)',
  'access_verify_fail_ip' => 'Client access code or invite refused',
  'cust_login_fail_ip' => 'Legacy client sign-in refused',
  'track_fail_ip' => 'Order tracking lookup refused',
  'gift_check_fail' => 'Gift card check refused',
  'mail_send_failed' => 'Email not sent',
];

/** WhatsApp statuses (whatsapp_messages.status) counted as sent by the system. */
const REVIEW_WA_SENT = ['sent', 'delivered', 'read'];
/** WhatsApp statuses counted as failed. */
const REVIEW_WA_FAILED = ['failed'];
/** Job message delivery statuses (job_messages.delivery_status) counted as sent and failed. */
const REVIEW_MSG_SENT = ['sent'];
const REVIEW_MSG_FAILED = ['failed'];

/** True when $section is a countable menu section. */
function usage_section_ok($section) {
  return is_string($section) && in_array($section, USAGE_SECTIONS, true);
}

/** The role stored on a usage row: the staff role, or null when it is not one. */
function usage_role($role) {
  return is_string($role) && in_array($role, USAGE_ROLES, true) ? $role : null;
}

/**
 * The window asked for: null or '' gives the default (30); 30 and 90 are
 * accepted as a number or digits; anything else is null (the endpoint answers 400).
 */
function review_window($value) {
  if ($value === null || $value === '') return REVIEW_WINDOWS[0];
  if (is_int($value)) $value = (string)$value;
  if (!is_string($value) || !preg_match('/^[0-9]{1,3}$/', $value)) return null;
  return in_array((int)$value, REVIEW_WINDOWS, true) ? (int)$value : null;
}

/** First Lagos day of a window of $days that ends on (and includes) $todayYmd. Null on a bad date. */
function review_window_start($todayYmd, $days) {
  $d = DateTimeImmutable::createFromFormat('!Y-m-d', (string)$todayYmd, new DateTimeZone('UTC'));
  if (!$d || $d->format('Y-m-d') !== $todayYmd || (int)$days < 1) return null;
  return $d->modify('-' . ((int)$days - 1) . ' days')->format('Y-m-d');
}

/** $part / $whole rounded to three places, or null when $whole is 0 (no rate, not 0 %). */
function review_rate($part, $whole) {
  $part = (int)$part; $whole = (int)$whole;
  if ($whole <= 0) return null;
  return round(max(0, $part) / $whole, 3);
}

/** Median of a list of numbers, rounded to one place, or null for an empty list. */
function review_median(array $values) {
  $v = array_values(array_map('floatval', array_filter($values, 'is_numeric')));
  $n = count($v);
  if ($n === 0) return null;
  sort($v);
  $mid = intdiv($n, 2);
  $m = $n % 2 ? $v[$mid] : ($v[$mid - 1] + $v[$mid]) / 2;
  return round($m, 1);
}

/** Days from Unix time $fromTs to $toTs, one decimal place, never negative. Null if either is missing. */
function review_days_between($fromTs, $toTs) {
  if (!is_numeric($fromTs) || !is_numeric($toTs)) return null;
  return round(max(0, (int)$toTs - (int)$fromTs) / 86400, 1);
}

/** Whole days a due date is past today (both Lagos Y-m-d): 0 when not late, null on a bad date. */
function review_overdue_days($dueYmd, $todayYmd) {
  $tz = new DateTimeZone('UTC');
  $due = DateTimeImmutable::createFromFormat('!Y-m-d', (string)$dueYmd, $tz);
  $today = DateTimeImmutable::createFromFormat('!Y-m-d', (string)$todayYmd, $tz);
  if (!$due || !$today || $due->format('Y-m-d') !== $dueYmd || $today->format('Y-m-d') !== $todayYmd) return null;
  $days = intdiv($today->getTimestamp() - $due->getTimestamp(), 86400);
  return max(0, $days);
}

/**
 * Sum counts by status into {sent, failed, other, total}. $counts is
 * status => count; statuses in neither list (queued, manual links) are "other".
 */
function review_delivery(array $counts, array $sentStatuses, array $failedStatuses) {
  $out = ['sent' => 0, 'failed' => 0, 'other' => 0, 'total' => 0];
  foreach ($counts as $status => $n) {
    $n = max(0, (int)$n);
    $bucket = in_array($status, $sentStatuses, true) ? 'sent' : (in_array($status, $failedStatuses, true) ? 'failed' : 'other');
    $out[$bucket] += $n;
    $out['total'] += $n;
  }
  return $out;
}

/**
 * Usage rows [{section, role, hits}] grouped per section:
 * [{section, hits, roles: {role: hits}}], most used first, ties in menu order.
 * Rows for a section that is not on the allowlist are left out.
 */
function review_usage_by_section(array $rows) {
  $by = [];
  foreach ($rows as $r) {
    $s = $r['section'] ?? null; $role = (string)($r['role'] ?? '');
    if (!usage_section_ok($s)) continue;
    $n = max(0, (int)($r['hits'] ?? 0));
    if (!isset($by[$s])) $by[$s] = ['section' => $s, 'hits' => 0, 'roles' => []];
    $by[$s]['hits'] += $n;
    $by[$s]['roles'][$role] = ($by[$s]['roles'][$role] ?? 0) + $n;
  }
  $order = array_flip(USAGE_SECTIONS);
  $out = array_values(array_filter($by, fn($x) => $x['hits'] > 0));
  usort($out, fn($a, $b) => [$b['hits'], $order[$a['section']]] <=> [$a['hits'], $order[$b['section']]]);
  foreach ($out as &$x) ksort($x['roles']);
  return $out;
}

/** Allowlisted sections with no hits in $usage (the output of review_usage_by_section), in menu order. */
function review_zero_hit_sections(array $usage) {
  $used = [];
  foreach ($usage as $u) if (($u['hits'] ?? 0) > 0) $used[$u['section']] = true;
  return array_values(array_filter(USAGE_SECTIONS, fn($s) => !isset($used[$s])));
}

/** Refusal counts by action (action => count) as [{action, label, count}] in REVIEW_REFUSAL_ACTIONS order, zeros kept. */
function review_refusals(array $counts) {
  $out = [];
  foreach (REVIEW_REFUSAL_ACTIONS as $action => $label) {
    $out[] = ['action' => $action, 'label' => $label, 'count' => max(0, (int)($counts[$action] ?? 0))];
  }
  return $out;
}
