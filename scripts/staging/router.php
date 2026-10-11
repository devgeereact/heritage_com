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

// Phase 4 public files, as Apache serves them in production:
//   /sitemap.xml   -> sitemap.php (the .htaccess rewrite)
//   /robots.txt    -> public/robots.txt (shipped in the build)
//   /uploads/site/ -> website images from the staging upload folder, image names
//                     only; nothing under /uploads is ever executed (the
//                     production public/uploads/.htaccess does the same).
if ($path === '/sitemap.xml') { chdir($apiDir); require $apiDir . '/sitemap.php'; return true; }
if ($path === '/robots.txt') {
  header('Content-Type: text/plain; charset=utf-8');
  readfile(__DIR__ . '/../../public/robots.txt');
  return true;
}
if (str_starts_with($path, '/uploads/')) {
  $uploads = __DIR__ . '/.uploads/site';
  if (preg_match('#^/uploads/site/([a-f0-9]{32}-w[0-9]{1,5}\.(webp|jpg|png))$#', $path, $um) && is_file("$uploads/{$um[1]}")) {
    header('Content-Type: ' . ['webp' => 'image/webp', 'jpg' => 'image/jpeg', 'png' => 'image/png'][$um[2]]);
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: public, max-age=31536000, immutable');
    readfile("$uploads/{$um[1]}");
    return true;
  }
  http_response_code(404);
  header('Content-Type: text/plain');
  echo 'Not found';
  return true;
}
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
