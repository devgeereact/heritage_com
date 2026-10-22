<?php
/**
 * HeritOS: release manifest check tests (_release.php, A02). Required by
 * run.php, which provides check().
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/../_release.php';

$h = fn($c) => str_repeat($c, 64);
$commit = str_repeat('a', 40);
$manifest = fn($over = []) => json_encode(array_merge([
  'format' => 1, 'commit' => $commit, 'branch' => 'main', 'dirty' => false,
  'files' => [
    ['name' => '_lib.php', 'source' => 'php-api/_lib.php', 'deploy' => 'ci', 'sha256' => $h('1')],
    ['name' => 'users.php', 'source' => 'php-api/users.php', 'deploy' => 'manual', 'sha256' => $h('2')],
    ['name' => '.htaccess', 'source' => 'php-api/.htaccess', 'deploy' => 'manual', 'sha256' => $h('3')],
  ],
  'schemas' => [
    ['name' => 'schema.sql', 'sha256' => $h('4'), 'marker' => ['table' => 'users']],
    ['name' => 'schema_modules.sql', 'sha256' => $h('5'), 'marker' => null],
  ],
], $over));

/* ---- Parsing ----------------------------------------------------------------- */
check('release: valid manifest accepted', release_parse_manifest($manifest())['ok'], true);
check('release: not JSON refused', release_parse_manifest('{oops')['error'], 'not valid JSON');
check('release: unknown format refused', release_parse_manifest($manifest(['format' => 2]))['error'], 'unknown manifest format');
check('release: short commit refused', release_parse_manifest($manifest(['commit' => 'abc']))['error'], 'missing or malformed commit');
check('release: empty file list refused', release_parse_manifest($manifest(['files' => []]))['error'], 'no files listed');
$bad = fn($name) => release_parse_manifest($manifest(['files' => [['name' => $name, 'deploy' => 'ci', 'sha256' => $h('1')]]]))['ok'];
check('release: path with a slash refused', $bad('../config.php'), false);
check('release: absolute path refused', $bad('/etc/passwd'), false);
check('release: dot-dot inside a name refused', $bad('a..php'), false);
check('release: subfolder refused', $bad('tests/run.php'), false);
check('release: .htaccess allowed', $bad('.htaccess'), true);
check('release: deploy must be ci or manual',
  release_parse_manifest($manifest(['files' => [['name' => 'a.php', 'deploy' => 'ftp', 'sha256' => $h('1')]]]))['error'], 'a.php: deploy must be ci or manual');
check('release: upper-case or short hash refused',
  release_parse_manifest($manifest(['files' => [['name' => 'a.php', 'deploy' => 'ci', 'sha256' => strtoupper($h('a'))]]]))['error'], 'a.php: malformed sha256');
check('release: duplicate name refused',
  release_parse_manifest($manifest(['files' => [['name' => 'a.php', 'deploy' => 'ci', 'sha256' => $h('1')], ['name' => 'a.php', 'deploy' => 'manual', 'sha256' => $h('1')]]]))['error'], 'a.php: listed twice');
check('release: marker with SQL in it refused',
  release_parse_manifest($manifest(['schemas' => [['name' => 'x.sql', 'marker' => ['table' => 'users; DROP TABLE users']]]]))['error'], 'x.sql: malformed marker');
check('release: marker with an unknown key refused', release_valid_marker(['table' => 'users', 'where' => '1']), false);
check('release: setting marker accepted', release_valid_marker(['setting' => 'retention_expired_tokens_days']), true);
check('release: type_contains needs a column', release_valid_marker(['table' => 'cms_items', 'type_contains' => "'slide'"]), false);

/* ---- Comparison -------------------------------------------------------------- */
$files = release_parse_manifest($manifest())['manifest']['files'];
$server = ['_lib.php' => $h('1'), 'users.php' => $h('2'), '.htaccess' => $h('3')];
$hashOf = fn($srv) => fn($n) => $srv[$n] ?? null;
$rows = release_compare($files, $hashOf($server));
check('release: identical files all MATCH', array_column($rows, 'status'), ['MATCH', 'MATCH', 'MATCH']);
check('release: all MATCH exits 0', release_exit_code($rows), 0);

$rows = release_compare($files, $hashOf(['users.php' => $h('9')] + $server));
check('release: changed manual file is DIFFERENT', $rows[1]['status'], 'DIFFERENT');
check('release: changed manual file exits 1', release_exit_code($rows), 1);

$rows = release_compare($files, $hashOf(['_lib.php' => $h('1'), '.htaccess' => $h('3')]));
check('release: absent manual file is MISSING', $rows[1]['status'], 'MISSING');
check('release: missing manual file exits 1', release_exit_code($rows), 1);

$rows = release_compare($files, $hashOf(['_lib.php' => $h('8')] + $server));
check('release: changed ci file is DIFFERENT', $rows[0]['status'], 'DIFFERENT');
check('release: changed ci file alone exits 0 (the deploy owns it)', release_exit_code($rows), 0);
check('release: changed ci file exits 1 with --strict', release_exit_code($rows, true), 1);

$rows = release_compare($files, $hashOf(['.htaccess' => $h('7')] + $server), ['.htaccess']);
check('release: ignored file is not compared', $rows[2]['status'], 'IGNORED');
check('release: ignored file does not fail', release_exit_code($rows), 0);
check('release: summary counts by kind and status',
  release_summary(release_compare($files, $hashOf(['users.php' => $h('9')] + $server))),
  ['ci' => ['MATCH' => 1], 'manual' => ['DIFFERENT' => 1, 'MATCH' => 1]]);

/* ---- Schema markers ---------------------------------------------------------- */
$schemas = [
  ['name' => 'schema.sql', 'marker' => ['table' => 'users']],
  ['name' => 'schema_modules.sql', 'marker' => null],
  ['name' => 'schema_phase12.sql', 'marker' => ['table' => 'users', 'column' => 'pin_hash']],
  ['name' => 'schema_phase28.sql', 'marker' => ['table' => 'cms_items', 'column' => 'entity', 'type_contains' => "'slide'"]],
  ['name' => 'schema_phase30.sql', 'marker' => ['setting' => 'retention_expired_tokens_days']],
];
$st = release_schema_status($schemas,
  ['users' => true, 'cms_items' => true, 'settings' => true],
  ['users.pin_hash' => 'varchar(255)', 'cms_items.entity' => "enum('service','project','faq','policy','page','slide')"],
  ['retention_expired_tokens_days' => true]);
check('release: every marker present', $st, [
  'schema.sql' => 'PRESENT', 'schema_modules.sql' => 'NO MARKER', 'schema_phase12.sql' => 'PRESENT',
  'schema_phase28.sql' => 'PRESENT', 'schema_phase30.sql' => 'PRESENT']);
$st = release_schema_status($schemas,
  ['users' => true, 'cms_items' => true],
  ['cms_items.entity' => "enum('service','project','faq','policy','page')"], null);
check('release: missing column is ABSENT', $st['schema_phase12.sql'], 'ABSENT');
check('release: enum without the new value is ABSENT', $st['schema_phase28.sql'], 'ABSENT');
check('release: unreadable settings means the setting marker is ABSENT', $st['schema_phase30.sql'], 'ABSENT');
check('release: missing table is ABSENT', release_schema_status([$schemas[0]], [], [], [])['schema.sql'], 'ABSENT');

/* ---- Options ----------------------------------------------------------------- */
$o = release_parse_args(['--manifest', '/home/u/m.json', '--db', '--ignore', '.htaccess', '--ignore', 'x.php', '--strict'], '/doc');
check('release args: all options read', [$o['ok'], $o['manifest'], $o['root'], $o['db'], $o['strict'], $o['ignore']],
  [true, '/home/u/m.json', '/doc', true, true, ['.htaccess', 'x.php']]);
check('release args: manifest is required', release_parse_args([], '/doc')['error'], '--manifest FILE is required');
check('release args: help needs no manifest', release_parse_args(['--help'], '/doc')['help'], true);
check('release args: unknown option refused', release_parse_args(['--manifest', 'm', '--apply'], '/doc')['error'], 'Unknown option: --apply');
check('release args: option without a value refused', release_parse_args(['--manifest', '--db'], '/doc')['error'], '--manifest needs a value');
check('release args: --root overrides the folder', release_parse_args(['--manifest', 'm', '--root', '/tmp/x'], '/doc')['root'], '/tmp/x');
