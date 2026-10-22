<?php
/**
 * HeritOS: link previews for crawlers that do not run JavaScript (K-06,
 * BUILD-SPEC 4.6). WhatsApp and Facebook read only the HTML head, so a shared
 * service or portfolio link otherwise shows the site-wide default.
 *
 * Off by default. With SPA_HEAD_INJECTION true in config.php AND the
 * .htaccess fallback pointed here (see the commented rule in php-api/.htaccess),
 * every page that is not a real file is served as index.html with the marked
 * <!--hc:head--> block filled from that page's published content: title,
 * description, canonical URL and photograph. The React app then runs as usual.
 *
 * It only reads published CMS content through the public projection. On any
 * failure (no database, missing table, bad config, even an early exit) it
 * serves plain index.html, so the site never breaks because of this file.
 */
$index = @file_get_contents(__DIR__ . '/index.html');
$done = false;
ob_start();
register_shutdown_function(function () use (&$done, $index) {
  if ($done) return;
  while (ob_get_level() > 0) ob_end_clean();
  if (!headers_sent()) {
    http_response_code($index === false ? 500 : 200);
    header('Content-Type: text/html; charset=UTF-8');
    header('Cache-Control: no-cache');
  }
  echo $index === false ? '' : $index;
});

try {
  if ($index === false) throw new RuntimeException('index.html missing');
  // Match the route first with the pure helpers in _cms.php (no config, no
  // database): a path that previews nothing (the shop, the portal, the admin
  // app) is served as plain index.html without opening a database connection.
  require __DIR__ . '/_cms.php';
  $path = (string)(parse_url((string)($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH) ?? '/');
  $route = spa_route($path);

  $html = $index;
  if ($route) {
    require __DIR__ . '/_lib.php';
    require __DIR__ . '/_jobs.php';
    require __DIR__ . '/_media.php';
    if (cfg('SPA_HEAD_INJECTION', false) && has_table('cms_items')) {
      [$entity, $key] = $route;
      $row = db_row("SELECT id, slug, live, published_at, live_updated_at FROM cms_items
                      WHERE entity = ? AND slug = ? AND status = 'published' AND live IS NOT NULL", 'ss', $entity, $key);
      $p = null;
      if ($row) {
        $data = json_decode((string)$row['live'], true) ?: [];
        $media = has_table('media_assets') ? media_rows(cms_media_refs($data)) : [];
        $p = cms_public($entity, $row, $data, $media, media_base_url());
      }
      $site = rtrim((string)cfg('SITE_URL', 'https://heritclothing.com'), '/');
      $html = spa_inject($index, spa_head_html(spa_meta($entity, $key, $p, $path, $site)));
    }
  }

  $done = true;
  while (ob_get_level() > 0) ob_end_clean();
  http_response_code(200);
  header('Content-Type: text/html; charset=UTF-8');
  header('Cache-Control: no-cache');
  header_remove('Access-Control-Allow-Origin');
  echo $html;
} catch (Throwable $e) {
  // The shutdown handler serves plain index.html.
}
