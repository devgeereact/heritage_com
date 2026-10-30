<?php
/**
 * HeritOS: Clerk first-sign-in linking against a THROWAWAY MariaDB (never the live database).
 *   HERIT_TEST_DB_HOST=127.0.0.1 HERIT_TEST_DB_PORT=33078 HERIT_TEST_DB_USER=root HERIT_TEST_DB_NAME=herittest php php-api/tests/clerk_link.php
 * Skips (exit 0) when HERIT_TEST_DB_NAME is unset. Refuses a database name without 'test'.
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
if (!getenv('HERIT_TEST_DB_NAME')) { echo "skipped: HERIT_TEST_DB_NAME not set\n"; exit(0); }
if (!preg_match('/test/i', (string) getenv('HERIT_TEST_DB_NAME'))) { fwrite(STDERR, "refusing: database name must contain 'test'\n"); exit(2); }
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$conn = new mysqli(getenv('HERIT_TEST_DB_HOST') ?: '127.0.0.1', getenv('HERIT_TEST_DB_USER') ?: 'root', getenv('HERIT_TEST_DB_PASS') ?: '', getenv('HERIT_TEST_DB_NAME'), (int) (getenv('HERIT_TEST_DB_PORT') ?: 3306));
$conn->set_charset('utf8mb4');
function cfg($n, $d = '') { return $d; }   // _clerk.php only needs cfg() for the verifier, not for linking
require __DIR__ . '/../_clerk.php';

$conn->query('DROP TABLE IF EXISTS users');
$conn->query("CREATE TABLE users (id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, name VARCHAR(160) NOT NULL, email VARCHAR(190) NOT NULL, password_hash VARCHAR(255) NOT NULL DEFAULT '', role ENUM('super_admin','admin','manager','tailor','editor','seller','employee','customer') NOT NULL DEFAULT 'employee', status ENUM('active','invited','suspended') NOT NULL DEFAULT 'active', deleted_at TIMESTAMP NULL DEFAULT NULL, UNIQUE KEY uniq_email (email)) ENGINE=InnoDB");
$sql = preg_replace('/^\s*--.*$/m', '', (string) file_get_contents(__DIR__ . '/../schema_phase33.sql'));
foreach (array_filter(array_map('trim', explode(';', $sql))) as $st) $conn->query($st);
foreach (array_filter(array_map('trim', explode(';', $sql))) as $st) $conn->query($st); // re-runnable
$conn->query("INSERT INTO users (name,email,role,status) VALUES ('Fran','fran@example.com','super_admin','active'),('Eve','eve@example.com','tailor','active'),('Sus','sus@example.com','manager','suspended'),('Cus','cus@example.com','customer','active'),('Del','del@example.com','admin','active')");
$conn->query("UPDATE users SET deleted_at = NOW() WHERE email='del@example.com'");

$n = 0; $bad = 0;
function ok($c, $w) { global $n, $bad; $n++; if (!$c) { $bad++; echo "FAIL: $w\n"; } }

$u = clerk_resolve_user($conn, ['sub' => 'user_fran', 'email' => 'Fran@Example.com']);
ok($u !== null && $u['role'] === 'super_admin', 'approved email links on first sign-in (case-insensitive) and keeps its role');
ok(array_keys($u ?? []) === ['id', 'name', 'email', 'role'], 'returns the same fields as require_auth');
$u = clerk_resolve_user($conn, ['sub' => 'user_fran']);
ok($u !== null && $u['email'] === 'fran@example.com', 'second sign-in matches on clerk_user_id alone');
ok(clerk_resolve_user($conn, ['sub' => 'user_mallory', 'email' => 'fran@example.com']) === null, 'a different Clerk user cannot take over a linked row');
ok(clerk_resolve_user($conn, ['sub' => 'user_x', 'email' => 'stranger@example.com']) === null, 'unknown email gets no access');
ok($conn->query('SELECT COUNT(*) c FROM users')->fetch_assoc()['c'] == 5, 'sign-in never creates users');
ok(clerk_resolve_user($conn, ['sub' => 'user_sus', 'email' => 'sus@example.com']) === null, 'suspended staff cannot sign in');
ok(clerk_resolve_user($conn, ['sub' => 'user_cus', 'email' => 'cus@example.com']) === null, 'a customer-role row is not staff');
ok(clerk_resolve_user($conn, ['sub' => 'user_del', 'email' => 'del@example.com']) === null, 'deleted staff cannot sign in');
ok(clerk_resolve_user($conn, ['sub' => 'user_nomail']) === null, 'no email claim and unknown sub gives no access');
ok(clerk_resolve_user($conn, ['sub' => 'u', 'email' => 'not-an-email']) === null, 'malformed email claim gives no access');
ok(clerk_resolve_user($conn, ['sub' => str_repeat('a', 65), 'email' => 'eve@example.com']) === null, 'oversized sub rejected');
$conn->query("UPDATE users SET status='suspended' WHERE email='fran@example.com'");
ok(clerk_resolve_user($conn, ['sub' => 'user_fran']) === null, 'suspending a linked user cuts access immediately');
$dup = false; try { $conn->query("UPDATE users SET clerk_user_id='user_fran' WHERE email='eve@example.com'"); } catch (mysqli_sql_exception $e) { $dup = true; }
ok($dup, 'clerk_user_id is unique');
printf("\n  %d checks, %d failed\n", $n, $bad);
exit($bad === 0 ? 0 : 1);
