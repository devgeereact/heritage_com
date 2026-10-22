<?php
/**
 * HeritOS: release check (A02). Command line only; over HTTP it answers 404.
 *
 * Compares the files in the document root with a release manifest written by
 * scripts/release/manifest.mjs (npm run release:manifest) and prints MATCH,
 * DIFFERENT or MISSING for each. It only reads files; with --db it also reads
 * information_schema and the settings keys (SELECT only) to show which schema
 * files the database has. It never writes anything.
 *
 *   php release_check.php --manifest ~/release-manifest.json
 *   php release_check.php --manifest ~/release-manifest.json --db
 *
 * Options:
 *   --manifest FILE  the manifest (keep it outside the document root)
 *   --root DIR       folder holding the deployed files (default: this file's folder)
 *   --db             also report schema markers from the database (needs config.php)
 *   --ignore NAME    leave one file out of the comparison (repeatable)
 *   --strict         a DIFFERENT or MISSING ci file also fails
 *
 * Exit codes: 0 every manual file matches; 1 a manual file is DIFFERENT or
 * MISSING (or a ci file with --strict), or the database could not be read;
 * 2 bad options or an unreadable manifest.
 *
 * In cPanel Terminal check `php -v` shows "(cli)": the CGI binary is refused
 * with exit code 1. Local staging: HERITOS_STAGING=1 makes --db use
 * config.local.php, the same switch retention.php uses.
 */
if (PHP_SAPI !== 'cli') {
  // Same guard as retention.php: the CGI binary has no REQUEST_METHOD, so say
  // so on stderr and fail; a web request gets a plain 404.
  if (!isset($_SERVER['REQUEST_METHOD'])) {
    $err = defined('STDERR') ? STDERR : fopen('php://stderr', 'w');
    fwrite($err, 'release_check: run this with the PHP command-line binary (php -v must show "(cli)"), not ' . PHP_SAPI . ".\n");
    exit(1);
  }
  http_response_code(404);
  exit;
}

require __DIR__ . '/_release.php';

$usage = "Usage: php release_check.php --manifest FILE [--root DIR] [--db] [--ignore NAME]... [--strict]\n";
$opt = release_parse_args(array_slice($argv ?? [], 1), __DIR__);
if (!$opt['ok']) { fwrite(STDERR, $opt['error'] . "\n" . $usage); exit(2); }
if ($opt['help']) { echo $usage; exit(0); }

$raw = @file_get_contents($opt['manifest']);
if ($raw === false) { fwrite(STDERR, "release_check: cannot read {$opt['manifest']}\n"); exit(2); }
$parsed = release_parse_manifest($raw);
if (!$parsed['ok']) { fwrite(STDERR, "release_check: manifest refused: {$parsed['error']}\n"); exit(2); }
$m = $parsed['manifest'];

$root = realpath($opt['root']);
if ($root === false || !is_dir($root)) { fwrite(STDERR, "release_check: no such folder {$opt['root']}\n"); exit(2); }
$manifestReal = realpath($opt['manifest']);
if ($manifestReal !== false && str_starts_with($manifestReal, $root . DIRECTORY_SEPARATOR)) {
  echo "Warning: the manifest is inside the checked folder. Keep it outside the document root.\n";
}

echo "HeritOS release check (read-only)\n";
echo "  manifest commit {$m['commit']}" . (isset($m['branch']) ? " ({$m['branch']})" : '') . (!empty($m['dirty']) ? ', built WITH UNCOMMITTED CHANGES' : '') . "\n";
echo "  generated " . ($m['generated'] ?? 'unknown') . "\n";
echo "  checking  $root\n\n";

$rows = release_compare($m['files'], function ($name) use ($root) {
  $path = $root . DIRECTORY_SEPARATOR . $name;
  return is_file($path) ? hash_file('sha256', $path) : null;
}, $opt['ignore']);

foreach ($rows as $r) {
  $note = '';
  if ($r['status'] === 'DIFFERENT') $note = '  server ' . substr($r['actual'], 0, 12) . ', manifest ' . substr($r['expected'], 0, 12);
  printf("  %-9s %-6s %s%s\n", $r['status'], $r['deploy'], $r['name'], $note);
}

$sum = release_summary($rows);
echo "\n";
foreach (['manual', 'ci'] as $kind) {
  $parts = [];
  foreach ($sum[$kind] as $status => $n) $parts[] = "$n $status";
  echo sprintf("  %-6s %s\n", $kind, $parts ? implode(', ', $parts) : 'none');
}
$code = release_exit_code($rows, $opt['strict']);
if (($sum['ci']['DIFFERENT'] ?? 0) + ($sum['ci']['MISSING'] ?? 0) > 0) {
  echo "  Note: ci files are uploaded by the deploy job. A difference usually means the deploy has not finished or the manifest is for another commit.\n";
}

if ($opt['db']) {
  echo "\nSchema markers (information_schema, read-only):\n";
  if (getenv('HERITOS_STAGING') === '1' && !defined('HERITOS_STAGING')) define('HERITOS_STAGING', true);
  // _lib.php loads config.php (config.local.php under HERITOS_STAGING) and gives $conn.
  require __DIR__ . '/_lib.php';
  set_exception_handler(function ($e) {
    fwrite(STDERR, 'release_check: ' . get_class($e) . ': ' . $e->getMessage() . "\n");
    exit(1);
  });
  $tables = []; $columns = []; $settings = null;
  $res = $conn->query("SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()");
  if (!$res) { fwrite(STDERR, "release_check: cannot read information_schema.TABLES\n"); exit(1); }
  while ($row = $res->fetch_assoc()) $tables[strtolower($row['t'])] = true;
  $res = $conn->query("SELECT TABLE_NAME AS t, COLUMN_NAME AS c, COLUMN_TYPE AS ty FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()");
  if (!$res) { fwrite(STDERR, "release_check: cannot read information_schema.COLUMNS\n"); exit(1); }
  while ($row = $res->fetch_assoc()) $columns[strtolower($row['t']) . '.' . strtolower($row['c'])] = (string)$row['ty'];
  if (isset($tables['settings'])) {
    $settings = [];
    $res = $conn->query('SELECT skey FROM settings');
    if ($res) while ($row = $res->fetch_assoc()) $settings[$row['skey']] = true;
  }
  $status = release_schema_status($m['schemas'], $tables, $columns, $settings);
  $last = null;
  foreach ($m['schemas'] as $s) {
    $mk = $s['marker'];
    $what = $mk === null ? '' : (isset($mk['setting']) ? "settings key {$mk['setting']}" : $mk['table'] . (isset($mk['column']) ? ".{$mk['column']}" : '') . (isset($mk['type_contains']) ? " has {$mk['type_contains']}" : ''));
    printf("  %-9s %-20s %s\n", $status[$s['name']], $s['name'], $what);
    if ($status[$s['name']] === 'PRESENT') $last = $s['name'];
  }
  $gaps = [];
  $seenLast = false;
  foreach (array_reverse($m['schemas']) as $s) {
    if ($s['name'] === $last) $seenLast = true;
    elseif ($seenLast && $status[$s['name']] === 'ABSENT') $gaps[] = $s['name'];
  }
  echo "\n  Latest schema with its marker present: " . ($last ?? 'none') . "\n";
  if ($gaps) echo '  Earlier schema files whose marker is ABSENT: ' . implode(', ', array_reverse($gaps)) . "\n";
  echo "  A marker shows a file was imported at some point; it does not prove every statement in it ran.\n";
}

echo $code === 0 ? "\nResult: every manual file matches.\n" : "\nResult: FAIL. Upload or restore the files marked above, then run this again.\n";
exit($code);
