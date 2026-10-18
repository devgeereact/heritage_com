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
