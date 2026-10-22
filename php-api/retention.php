<?php
/**
 * HeritOS: data retention job (K-18). Command line only; over HTTP it answers 404.
 *
 *   php retention.php            dry run: prints what each category would delete
 *   php retention.php --apply    deletes, in batches of 500, and writes one audit
 *                                entry per category that is on, straight after
 *                                that category's deletes
 *
 * Periods come from the retention_* settings keys (schema_phase30.sql, Settings
 * page). Empty or 0 means keep forever, so with nothing set only expired tokens
 * (30 days past expiry) are ever deleted. The plan and its guards live in
 * _retention.php; jobs, payments, ledger, quotes, orders, measurements and
 * customers are never touched.
 *
 * cPanel cron (Advanced > Cron Jobs), once a day at 03:30 server time. The binary
 * must be the command-line PHP (`/usr/local/bin/php -v` shows "(cli)"); the CGI
 * binary is refused with exit code 1:
 *   30 3 * * * /usr/local/bin/php /home/CPANEL_USER/public_html/retention.php --apply >> /home/CPANEL_USER/retention.log 2>&1
 *
 * Local staging: HERITOS_STAGING=1 php php-api/retention.php makes _lib.php load
 * php-api/config.local.php (the heritos_staging database), the same switch
 * scripts/staging/router.php uses. Without it, config.php is loaded as on the server.
 */
if (PHP_SAPI !== 'cli') {
  // A cron line that calls the CGI binary (php-cgi, or a "php" that is really
  // CGI) has no REQUEST_METHOD: say so and fail, so cron mails the error
  // instead of the job silently doing nothing. A web request still gets 404.
  if (!isset($_SERVER['REQUEST_METHOD'])) {
    $err = defined('STDERR') ? STDERR : fopen('php://stderr', 'w');
    fwrite($err, 'retention: run this with the PHP command-line binary (php -v must show "(cli)"), not ' . PHP_SAPI . ".\n");
    exit(1);
  }
  http_response_code(404);
  exit;
}

$args = array_slice($argv ?? [], 1);
if (array_intersect($args, ['-h', '--help'])) {
  echo "Usage: php retention.php [--apply]\n  Without --apply nothing is deleted (dry run).\n";
  exit(0);
}
$unknown = array_diff($args, ['--apply']);
if ($unknown) { fwrite(STDERR, 'Unknown option: ' . implode(' ', $unknown) . "\n"); exit(2); }
$apply = in_array('--apply', $args, true);

if (getenv('HERITOS_STAGING') === '1' && !defined('HERITOS_STAGING')) define('HERITOS_STAGING', true);
require __DIR__ . '/_lib.php';
require __DIR__ . '/_retention.php';
// _lib.php turns errors into a JSON 500 for browsers; a cron job wants stderr and a failing exit code.
set_exception_handler(function ($e) {
  fwrite(STDERR, 'retention: ' . get_class($e) . ': ' . $e->getMessage() . "\n");
  exit(1);
});

// The server's wall clock, read before the session zone changes: auth_tokens and
// customer_tokens store expires_at from NOW() in this zone (see _retention.php).
$localNow = (string)$conn->query('SELECT NOW() AS t')->fetch_assoc()['t'];
// TIMESTAMP columns then compare in UTC, like the DATETIME columns written with
// UTC_TIMESTAMP() (customer_sessions, customer_access_challenges).
$conn->query("SET time_zone = '+00:00'");
$lock = $conn->query("SELECT GET_LOCK('heritos_retention', 0) AS got")->fetch_assoc();
if ((int)($lock['got'] ?? 0) !== 1) { fwrite(STDERR, "retention: another run is in progress\n"); exit(1); }

$now = (int)$conn->query('SELECT UNIX_TIMESTAMP() AS n')->fetch_assoc()['n'];
$settings = [];
$res = $conn->query("SELECT skey, svalue FROM settings WHERE skey LIKE 'retention\\_%'");
while ($row = $res->fetch_assoc()) $settings[$row['skey']] = $row['svalue'];

$columns = [];
$res = $conn->query('SELECT CONCAT(TABLE_NAME, \'.\', COLUMN_NAME) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()');
while ($row = $res->fetch_assoc()) $columns[$row['c']] = true;

$plan = retention_plan($settings, $now, $localNow);
echo 'HeritOS retention ' . ($apply ? 'APPLY' : 'dry run (nothing is deleted; add --apply)') . ', now ' . gmdate('Y-m-d H:i:s', $now) . " UTC (server clock $localNow)\n";
if (!$settings) echo "No retention settings found: import schema_phase30.sql. Everything is kept.\n";
foreach ($plan['invalid'] as $cat => $err) {
  echo sprintf("  %-18s SKIPPED: %s %s (treated as keep forever)\n", $cat, RETENTION_CATEGORIES[$cat]['key'], $err);
}
foreach ($plan['off'] as $cat) echo sprintf("  %-18s off (keep forever)\n", $cat);

$batchCap = 20000; // 10 million rows a run at most, so a mistake can never loop for ever
$byCat = [];
foreach ($plan['steps'] as $s) $byCat[$s['category']][] = $s;
foreach ($byCat as $cat => $steps) {
  $tables = [];
  $failure = null;
  try {
    foreach ($steps as $s) {
      $missing = array_values(array_filter($s['needs'], fn($c) => !isset($columns[$c])));
      if ($missing) {
        echo sprintf("  %-18s %-28s skipped: missing %s\n", $cat, $s['table'], implode(', ', $missing));
        $tables[$s['table']] = 'missing';
        continue;
      }
      $stmt = $conn->prepare($s['count_sql']);
      $stmt->bind_param('s', ...$s['params']);
      $stmt->execute();
      $count = (int)$stmt->get_result()->fetch_assoc()['n'];
      $stmt->close();
      $deleted = 0;
      if ($apply && $count > 0) {
        $del = $conn->prepare($s['delete_sql']);
        $del->bind_param('s', ...$s['params']);
        for ($i = 0; $i < $batchCap; $i++) {
          $del->execute();
          $n = $del->affected_rows;
          $deleted += $n;
          $tables[$s['table']] = $deleted;   // kept up to date for the audit if a later batch fails
          if ($n < RETENTION_BATCH) break;
        }
        $del->close();
      }
      $tables[$s['table']] = $apply ? $deleted : $count;
      echo sprintf("  %-18s %-28s older than %s %s (%d days): %d %s\n",
        $cat, $s['table'], $s['cutoff'], $s['clock'] === 'local' ? 'server time' : 'UTC', $s['days'],
        $apply ? $deleted : $count, $apply ? 'deleted' : 'would be deleted');
    }
  } catch (Throwable $e) {
    $failure = $e;
  }
  // Audit this category now (also when one of its tables failed part way), so a
  // failure later in the run cannot leave these deletions unrecorded. If the audit
  // fails too, the deletion error is the one rethrown; the audit error goes to STDERR.
  retention_finish_category(function () use ($apply, $cat, $steps, $tables) {
    if (!$apply) return;
    audit(null, 'retention_purge', 'retention', null, [
      'category' => $cat, 'days' => $steps[0]['days'], 'cutoff' => $steps[0]['cutoff'], 'clock' => $steps[0]['clock'],
      'deleted' => array_sum(array_filter($tables, 'is_int')), 'tables' => $tables,
    ]);
  }, $failure, fn($msg) => fwrite(STDERR, $msg . "\n"));
}

$conn->query("DO RELEASE_LOCK('heritos_retention')");
echo "Done.\n";
exit(0);
