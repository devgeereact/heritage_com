<?php
/**
 * HeritOS: request-level rules from _lib.php (no database). Required by run.php,
 * which defines check(). Not deployed.
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

/* ---- is_tx_conflict: a lost race answers 409, never a 500 ----------------- */
check('tx conflict: 1020 record changed since last read', is_tx_conflict(new mysqli_sql_exception('Record has changed since last read', 1020)), true);
check('tx conflict: 1213 deadlock', is_tx_conflict(new mysqli_sql_exception('Deadlock found', 1213)), true);
check('tx conflict: 1062 duplicate key is not a conflict', is_tx_conflict(new mysqli_sql_exception('Duplicate entry', 1062)), false);
check('tx conflict: 1146 missing table is not a conflict', is_tx_conflict(new mysqli_sql_exception('Table does not exist', 1146)), false);
check('tx conflict: other exception types never count', is_tx_conflict(new RuntimeException('x', 1213)), false);
check('tx conflict: the message is plain', TX_CONFLICT_MESSAGE, 'Someone else changed this at the same time. Reload and try again.');
