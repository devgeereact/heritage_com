<?php
/**
 * HeritOS: release manifest checks (A02). Pure helpers, no database and no I/O.
 * Used by release_check.php (command line only) and php-api/tests/release_cases.php.
 *
 * The manifest is written by scripts/release/manifest.mjs: format 1, a commit,
 * `files` (name, source, deploy 'ci' or 'manual', sha256) and `schemas` (name,
 * sha256, marker). Never served over HTTP: .htaccess denies _*.php.
 */

const RELEASE_MANIFEST_FORMAT = 1;

/**
 * Decode and validate a manifest. Returns ['ok' => true, 'manifest' => array]
 * or ['ok' => false, 'error' => string]. File names must be plain names (no
 * slashes, no '..'), so a tampered manifest can never point outside the folder.
 */
function release_parse_manifest(string $json): array {
  $m = json_decode($json, true);
  if (!is_array($m)) return ['ok' => false, 'error' => 'not valid JSON'];
  if (($m['format'] ?? null) !== RELEASE_MANIFEST_FORMAT) return ['ok' => false, 'error' => 'unknown manifest format'];
  if (!is_string($m['commit'] ?? null) || !preg_match('/^[0-9a-f]{40}$/', $m['commit'])) return ['ok' => false, 'error' => 'missing or malformed commit'];
  if (!is_array($m['files'] ?? null) || !$m['files']) return ['ok' => false, 'error' => 'no files listed'];
  $seen = [];
  foreach ($m['files'] as $i => $f) {
    $name = is_array($f) ? ($f['name'] ?? null) : null;
    if (!is_string($name) || !release_safe_name($name)) return ['ok' => false, 'error' => "file $i: unsafe or missing name"];
    if (!in_array($f['deploy'] ?? null, ['ci', 'manual'], true)) return ['ok' => false, 'error' => "$name: deploy must be ci or manual"];
    if (!is_string($f['sha256'] ?? null) || !preg_match('/^[0-9a-f]{64}$/', $f['sha256'])) return ['ok' => false, 'error' => "$name: malformed sha256"];
    if (isset($seen[$name])) return ['ok' => false, 'error' => "$name: listed twice"];
    $seen[$name] = true;
  }
  $schemas = $m['schemas'] ?? [];
  if (!is_array($schemas)) return ['ok' => false, 'error' => 'schemas must be a list'];
  foreach ($schemas as $i => $s) {
    if (!is_array($s) || !is_string($s['name'] ?? null)) return ['ok' => false, 'error' => "schema $i: missing name"];
    $mk = $s['marker'] ?? null;
    if ($mk !== null && !release_valid_marker($mk)) return ['ok' => false, 'error' => "{$s['name']}: malformed marker"];
  }
  $m['schemas'] = $schemas;
  return ['ok' => true, 'manifest' => $m];
}

/** A plain file name: letters, digits, '_', '-', '.', not starting with '..' or containing a slash. */
function release_safe_name(string $name): bool {
  return (bool) preg_match('/^\.?[A-Za-z0-9_][A-Za-z0-9_.-]*$/', $name) && strpos($name, '..') === false;
}

/** SQL identifier as the markers use them (lower case, digits, underscore). */
function release_ident(string $s): bool {
  return (bool) preg_match('/^[a-z][a-z0-9_]{0,63}$/', $s);
}

function release_valid_marker($mk): bool {
  if (!is_array($mk)) return false;
  if (isset($mk['setting'])) return is_string($mk['setting']) && release_ident($mk['setting']) && count($mk) === 1;
  if (!is_string($mk['table'] ?? null) || !release_ident($mk['table'])) return false;
  if (isset($mk['column']) && (!is_string($mk['column']) || !release_ident($mk['column']))) return false;
  if (isset($mk['type_contains']) && (!is_string($mk['type_contains']) || !isset($mk['column']))) return false;
  return !array_diff(array_keys($mk), ['table', 'column', 'type_contains']);
}

/**
 * Compare manifest files with the server copies. $hashOf(name) returns the
 * SHA-256 of the file next to release_check.php, or null when it is missing.
 * Returns one row per file: name, deploy, status (MATCH, DIFFERENT, MISSING,
 * IGNORED), expected and actual hashes.
 */
function release_compare(array $files, callable $hashOf, array $ignore = []): array {
  $rows = [];
  foreach ($files as $f) {
    $name = $f['name'];
    if (in_array($name, $ignore, true)) {
      $rows[] = ['name' => $name, 'deploy' => $f['deploy'], 'status' => 'IGNORED', 'expected' => $f['sha256'], 'actual' => null];
      continue;
    }
    $actual = $hashOf($name);
    $status = $actual === null ? 'MISSING' : (hash_equals($f['sha256'], $actual) ? 'MATCH' : 'DIFFERENT');
    $rows[] = ['name' => $name, 'deploy' => $f['deploy'], 'status' => $status, 'expected' => $f['sha256'], 'actual' => $actual];
  }
  return $rows;
}

/** Counts per deploy kind and status, e.g. ['manual' => ['MATCH' => 20, 'DIFFERENT' => 1]]. */
function release_summary(array $rows): array {
  $sum = ['ci' => [], 'manual' => []];
  foreach ($rows as $r) $sum[$r['deploy']][$r['status']] = ($sum[$r['deploy']][$r['status']] ?? 0) + 1;
  return $sum;
}

/**
 * Exit code: 1 when any manual file is DIFFERENT or MISSING (the owner has an
 * upload to make), also for ci files with $strict; otherwise 0. CI files are
 * reported but do not fail by default, because the deploy job owns them and a
 * difference there usually means the deploy has not finished yet.
 */
function release_exit_code(array $rows, bool $strict = false): int {
  foreach ($rows as $r) {
    if (!in_array($r['status'], ['DIFFERENT', 'MISSING'], true)) continue;
    if ($r['deploy'] === 'manual' || $strict) return 1;
  }
  return 0;
}

/**
 * Which schema files the database has, from read-only information_schema data.
 * $tables: table name => true. $columns: "table.column" => column type (e.g.
 * "enum('a','slide')"). $settings: settings keys present => true, or null when
 * the settings table could not be read. Returns name => PRESENT, ABSENT or
 * NO MARKER for each schema.
 */
function release_schema_status(array $schemas, array $tables, array $columns, ?array $settings): array {
  $out = [];
  foreach ($schemas as $s) {
    $mk = $s['marker'] ?? null;
    if ($mk === null) { $out[$s['name']] = 'NO MARKER'; continue; }
    if (isset($mk['setting'])) {
      $out[$s['name']] = ($settings !== null && isset($settings[$mk['setting']])) ? 'PRESENT' : 'ABSENT';
      continue;
    }
    if (!isset($tables[$mk['table']])) { $out[$s['name']] = 'ABSENT'; continue; }
    if (!isset($mk['column'])) { $out[$s['name']] = 'PRESENT'; continue; }
    $key = $mk['table'] . '.' . $mk['column'];
    if (!isset($columns[$key])) { $out[$s['name']] = 'ABSENT'; continue; }
    if (isset($mk['type_contains']) && stripos($columns[$key], $mk['type_contains']) === false) { $out[$s['name']] = 'ABSENT'; continue; }
    $out[$s['name']] = 'PRESENT';
  }
  return $out;
}

/**
 * Option parsing for release_check.php. Returns ['ok' => true, ...options] or
 * ['ok' => false, 'error' => string]. Pure so the tests can cover it.
 */
function release_parse_args(array $args, string $defaultRoot): array {
  $o = ['ok' => true, 'manifest' => null, 'root' => $defaultRoot, 'db' => false, 'strict' => false, 'ignore' => [], 'help' => false];
  for ($i = 0; $i < count($args); $i++) {
    $a = $args[$i];
    if ($a === '-h' || $a === '--help') { $o['help'] = true; continue; }
    if ($a === '--db') { $o['db'] = true; continue; }
    if ($a === '--strict') { $o['strict'] = true; continue; }
    if (in_array($a, ['--manifest', '--root', '--ignore'], true)) {
      if (!isset($args[$i + 1]) || $args[$i + 1] === '' || str_starts_with($args[$i + 1], '--')) return ['ok' => false, 'error' => "$a needs a value"];
      $v = $args[++$i];
      if ($a === '--manifest') $o['manifest'] = $v;
      elseif ($a === '--root') $o['root'] = $v;
      else $o['ignore'][] = $v;
      continue;
    }
    return ['ok' => false, 'error' => "Unknown option: $a"];
  }
  if (!$o['help'] && $o['manifest'] === null) return ['ok' => false, 'error' => '--manifest FILE is required'];
  return $o;
}
