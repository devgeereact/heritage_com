<?php
/**
 * HeritOS local staging router for PHP's built-in server. Never deployed.
 *
 *   php -S 127.0.0.1:8088 -t php-api scripts/staging/router.php
 *
 * Maps /xyz.php to php-api/xyz.php and defines HERITOS_STAGING, so _lib.php loads
 * php-api/config.local.php (the local staging database) instead of config.php.
 * Shared and secret files (_lib.php, config*.php) are never served.
 */
define('HERITOS_STAGING', true);
$apiDir = realpath(__DIR__ . '/../../php-api');

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$name = preg_match('#^/([a-z][a-z0-9_]*)\.php$#', $path, $m) ? $m[1] : '';
$blocked = $name === '' || str_starts_with($name, 'config');
$file = $blocked ? '' : $apiDir . '/' . $name . '.php';

if ($file !== '' && is_file($file)) {
  chdir($apiDir);
  // Required at the top level (not inside a function) so endpoint globals such
  // as $conn stay global, exactly as they are under Apache.
  require $file;
  return true;
}

http_response_code(404);
header('Content-Type: application/json');
echo json_encode(['error' => 'Not found on local staging', 'path' => $path]);
return true;
