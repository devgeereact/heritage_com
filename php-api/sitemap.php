<?php
/**
 * HeritOS: XML sitemap of the public website (Phase 4). GET, no sign-in.
 * Served at /sitemap.xml through the .htaccess rewrite (and by the staging
 * router locally); robots.txt points here.
 *
 * Lists only what the public can open: the home page, the contact page, the
 * booking page while public requests are on, each published page and policy,
 * the services and work indexes when something is published under them, every
 * published service and project, and the journal and its published posts while
 * journal_enabled is on, and the shop, gifting and published products while
 * shop_enabled is on. Drafts, unpublished items, admin and portal paths are
 * never listed. Paths are the React routes in CMS_PAGE_PATHS (_cms.php).
 */
require __DIR__ . '/_lib.php';
require __DIR__ . '/_jobs.php';
require __DIR__ . '/_cms.php';

$site = rtrim((string)cfg('SITE_URL', 'https://heritclothing.com'), '/');
$urls = [['loc' => $site . '/']];
$add = function ($path, $lastmod = null) use (&$urls, $site) {
  foreach ($urls as $u) if ($u['loc'] === $site . $path) return;
  $urls[] = ['loc' => $site . $path, 'lastmod' => $lastmod];
};

$add('/contact');
if (has_table('appointments') && setting_flag('public_booking_enabled', false) && availability_ready(availability_get(), 'consultation')) {
  $add('/book');
}

if (has_table('cms_items')) {
  $rows = db_rows("SELECT entity, slug, published_at, live_updated_at FROM cms_items
                    WHERE status = 'published' AND live IS NOT NULL ORDER BY entity, sort, id");
  $has = [];
  foreach ($rows as $r) $has[$r['entity']] = true;
  if (!empty($has['service'])) $add('/services');
  if (!empty($has['project'])) $add('/work');
  if (!empty($has['faq'])) $add('/faqs');
  foreach ($rows as $r) {
    $mod = $r['live_updated_at'] ?? $r['published_at'];
    switch ($r['entity']) {
      case 'page':
        if (isset(CMS_PAGE_PATHS[$r['slug']])) $add(CMS_PAGE_PATHS[$r['slug']], $mod);
        break;
      case 'policy':
        if (isset(CMS_POLICY_PATHS[$r['slug']])) $add(CMS_POLICY_PATHS[$r['slug']], $mod);
        break;
      case 'service': $add('/services/' . rawurlencode($r['slug']), $mod); break;
      case 'project': $add('/work/' . rawurlencode($r['slug']), $mod); break;
    }
  }
}

if (setting_flag('journal_enabled', false) && has_table('blog_posts')) {
  $posts = db_rows("SELECT slug, published_at, updated_at FROM blog_posts WHERE status = 'published' ORDER BY published_at DESC LIMIT 1000");
  if ($posts) $add('/journal');
  foreach ($posts as $p) $add('/journal/' . rawurlencode($p['slug']), $p['updated_at'] ?? $p['published_at']);
}

// The retail shop only while an admin has switched it on (the pages are a
// not-found page for visitors otherwise): the shop, gifting and published products.
if (setting_flag('shop_enabled', false) && has_table('products')) {
  $add('/shop');
  $add('/gifting');
  $products = db_rows("SELECT slug, updated_at FROM products
                        WHERE deleted_at IS NULL AND published = 1 AND status = 'active' AND slug IS NOT NULL AND slug <> ''
                        ORDER BY id LIMIT 1000");
  foreach ($products as $p) $add('/shop/' . rawurlencode($p['slug']), $p['updated_at'] ?? null);
}

header('Content-Type: application/xml; charset=utf-8');
header('Cache-Control: public, max-age=300');
header('X-Content-Type-Options: nosniff');
echo sitemap_xml($urls);
