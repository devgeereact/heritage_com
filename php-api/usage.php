<?php
/**
 * HeritOS: section usage counting (Phase 7, learn and simplify).
 *
 *   POST /usage.php?action=hit  {section}   (any signed-in staff) → {ok:true}
 *
 * Adds one to today's count (Africa/Lagos date) for that section and the
 * caller's role in usage_daily (schema_phase31.sql). The section must be on
 * USAGE_SECTIONS in _review.php, the menu's own keys; anything else answers 400.
 * Nothing about the person is stored: no user id, no IP address, no path.
 * The admin app sends at most one hit per section per browser per day.
 *
 * Before schema_phase31.sql is imported the hit answers {ok:true, counted:false}
 * so the app never shows an error for it.
 */
require __DIR__ . '/_lib.php';
require __DIR__ . '/_jobs.php';
require __DIR__ . '/_review.php';
cors();

$user = require_auth(USAGE_ROLES);
$action = $_GET['action'] ?? '';
if ($action !== 'hit') fail('Unknown action', 404);
if (method() !== 'POST') fail('Method not allowed', 405);

$b = body();
$section = in_str($b, 'section');
if (!usage_section_ok($section)) fail('Unknown section');
$role = usage_role($user['role']);
if ($role === null) fail('Forbidden', 403);

if (!has_table('usage_daily')) json(['ok' => true, 'counted' => false]);
// The browser sends one hit per section per role per day, so a team this size
// never comes near USAGE_DAILY_CAP; the cap stops a looping client (or a staff
// member posting by hand) from turning one row into a misleading number.
db_exec('INSERT INTO usage_daily (day, section, role, hits) VALUES (?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE hits = LEAST(hits + 1, ' . USAGE_DAILY_CAP . ')', 'sss', lagos_today(), $section, $role);
json(['ok' => true, 'counted' => true]);
