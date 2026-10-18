<?php
/**
 * HeritOS: request-level rules (no database): lost races (is_tx_conflict) and
 * wrong-typed fields (in_str and friends in _lib.php, scalar_text in _domain.php).
 * Required by run.php, which defines check(). Not deployed.
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

/* ---- is_tx_conflict: a lost race answers 409, never a 500 ----------------- */
check('tx conflict: 1020 record changed since last read', is_tx_conflict(new mysqli_sql_exception('Record has changed since last read', 1020)), true);
check('tx conflict: 1213 deadlock', is_tx_conflict(new mysqli_sql_exception('Deadlock found', 1213)), true);
check('tx conflict: 1062 duplicate key is not a conflict', is_tx_conflict(new mysqli_sql_exception('Duplicate entry', 1062)), false);
check('tx conflict: 1146 missing table is not a conflict', is_tx_conflict(new mysqli_sql_exception('Table does not exist', 1146)), false);
check('tx conflict: other exception types never count', is_tx_conflict(new RuntimeException('x', 1213)), false);
check('tx conflict: the message is plain', TX_CONFLICT_MESSAGE, 'Someone else changed this at the same time. Reload and try again.');

/* ---- Request fields: a list or object where text belongs answers 400 ------ */
$in = ['name' => 'Ada', 'n' => '12', 'f' => '2.5', 'zero' => 0, 'none' => null, 'yes' => true,
       'list' => ['x'], 'obj' => ['m' => 1], 'empty' => []];
check('in_type_problem: text is fine', in_type_problem($in, 'name'), null);
check('in_type_problem: a number is fine as text', in_type_problem($in, 'zero'), null);
check('in_type_problem: true is fine', in_type_problem($in, 'yes'), null);
check('in_type_problem: missing is fine', in_type_problem($in, 'nope'), null);
check('in_type_problem: null is fine', in_type_problem($in, 'none'), null);
check('in_type_problem: a list is not text', in_type_problem($in, 'list'), 'list must be text');
check('in_type_problem: an object is not text', in_type_problem($in, 'obj'), 'obj must be text');
check('in_type_problem: an empty list is not text', in_type_problem($in, 'empty'), 'empty must be text');
check('in_type_problem: a list is not a number', in_type_problem($in, 'list', 'number'), 'list must be a number');
check('in_type_problem: a list entry that is not an object reads as missing', in_type_problem('abc', 'slug'), null);
check('in_str: text kept as sent (no trim)', in_str(['s' => ' a '], 's'), ' a ');
check('in_str: missing gives the default', in_str($in, 'nope'), '');
check('in_str: null gives the default', in_str($in, 'none', 'd'), 'd');
check('in_str: null default kept', in_str($in, 'nope', null), null);
check('in_str: a number becomes text', in_str($in, 'zero'), '0');
check('in_str: true becomes "1"', in_str($in, 'yes'), '1');
check('in_str: a non-array input gives the default', in_str('abc', 'slug', 'x'), 'x');
check('in_int: numeric text', in_int($in, 'n'), 12);
check('in_int: missing gives the default', in_int($in, 'nope', 7), 7);
check('in_int: non-numeric text casts as before', in_int(['q' => 'abc'], 'q'), 0);
check('in_num: decimal text', in_num($in, 'f'), 2.5);
check('in_num: missing gives the default', in_num($in, 'nope'), 0.0);
check('in_scalar: value kept uncast', in_scalar($in, 'zero'), 0);
check('in_scalar: missing gives null', in_scalar($in, 'nope'), null);
check('scalar_text: list becomes empty text', scalar_text(['x']), '');
check('scalar_text: number becomes text', scalar_text(5), '5');
check('ymd_or_null: a list is not a date', ymd_or_null(['2026-10-18']), null);
check('lagos_local_to_utc: a list is not a time', lagos_local_to_utc(['2026-10-18 10:00']), null);
check('message_body_clean: a list is not a message', message_body_clean(['hi']), null);
check('public_ref_normalise: a list is not a reference', public_ref_normalise(['x']), '');
check('feedback_clean: a list comment is not "Array"', feedback_clean(['comment' => ['x']])['clean']['comment'], null);
check('cms_clean: a list for a FAQ question is refused, not saved as "Array"', cms_clean('faq', ['question' => ['x']])[1], ['question' => 'Must be text']);
check('company_item_clean: a list for the wearer id is refused, not read as client 1', company_item_clean(['description' => 'Shirt', 'qty' => 1, 'wearer_customer_id' => [5]])[1]['wearer_customer_id'] ?? null, 'Must be an id');
check('company_item_clean: a list for the description is refused, not "Array"', company_item_clean(['description' => ['x'], 'qty' => 1])[1]['description'] ?? null, 'Describe the garment');

/* ---- run_logged: a reset failure never changes the answer (K-25) ----------- */
$logFile = tempnam(sys_get_temp_dir(), 'heritos-log-');
$oldLog = ini_set('error_log', $logFile);
$ran = false;
check('run_logged: work that finishes gives true', run_logged(function () use (&$ran) { $ran = true; }, 'x'), true);
check('run_logged: the work really ran', $ran, true);
check('run_logged: a database error is caught, gives false',
  run_logged(function () { throw new mysqli_sql_exception('Deadlock found', 1213); }, 'reset_request'), false);
check('run_logged: any Throwable is caught (TypeError)', run_logged(function () { strlen([]); }, 'reset_request'), false);
check('run_logged: the error is logged with its label', str_contains((string)file_get_contents($logFile), 'reset_request: Deadlock found'), true);
ini_set('error_log', $oldLog === false ? '' : (string)$oldLog);
unlink($logFile);
