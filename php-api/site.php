<?php
/**
 * HeritOS: public website projection (Phase 4). GET only, no sign-in.
 *
 *   ?action=config                business facts that are set, checked social links,
 *                                 navigation flags, booking switch, JSON-LD, site URL
 *   ?action=home                  home page plus up to 6 services, 6 projects (featured
 *                                 first) and 4 home FAQs
 *   ?action=page&key=K            one published page (home, about, how_it_works,
 *                                 company, services_intro, contact)
 *   ?action=services              published services (and the services_intro page)
 *   ?action=service&slug=S        one service and its published projects
 *   ?action=work[&service=S]      published portfolio projects
 *   ?action=work_item&slug=S      one project
 *   ?action=faqs[&home=1]         published FAQs
 *   ?action=policy&key=K          privacy or terms
 *   ?action=journal               published journal posts while journal_enabled is on
 *   ?action=journal_post&slug=S   one post
 *
 * Only published content leaves this file, and only through the whitelist
 * projections in _cms.php: no drafts, earlier versions, consent records, client
 * links or staff fields. Rich text is sanitised again on the way out. Missing or
 * unpublished items answer a JSON 404. Responses carry a content ETag and may be
 * cached for 60 seconds, so an unpublish can take up to a minute to disappear.
 */
require __DIR__ . '/_lib.php';
require __DIR__ . '/_jobs.php';
require __DIR__ . '/_cms.php';
require __DIR__ . '/_media.php';
cors();

if (method() !== 'GET') fail('Method not allowed', 405);
$action = $_GET['action'] ?? 'config';
$cmsReady = has_table('cms_items') && has_table('media_assets');

/** Send a public JSON answer with a content ETag; 304 when the client has it. */
function site_json($data, $code = 200) {
  $body = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  if ($code === 200) {
    $etag = '"' . substr(sha1($body), 0, 20) . '"';
    header('ETag: ' . $etag);
    header('Cache-Control: public, max-age=60, stale-while-revalidate=300');
    if (trim((string)($_SERVER['HTTP_IF_NONE_MATCH'] ?? '')) === $etag) { http_response_code(304); exit; }
  } else {
    header('Cache-Control: no-store');
  }
  http_response_code($code);
  // JSON, never HTML: the browser must not sniff it as a page.
  header('Content-Type: application/json; charset=utf-8');
  header('X-Content-Type-Options: nosniff');
  echo $body;
  exit;
}

function site_404($what = 'Not found') { site_json(['error' => $what], 404); }

/** Published rows of one entity, in display order, content decoded. */
function site_rows($entity) {
  global $cmsReady;
  if (!$cmsReady) return [];
  $out = [];
  foreach (db_rows("SELECT id, slug, live, published_at, live_updated_at FROM cms_items
                     WHERE entity = ? AND status = 'published' AND live IS NOT NULL ORDER BY sort, id", 's', $entity) as $r) {
    $r['data'] = json_decode($r['live'], true) ?: [];
    unset($r['live']);
    $out[] = $r;
  }
  return $out;
}

function site_row($entity, $slug) {
  foreach (site_rows($entity) as $r) if ($r['slug'] === $slug) return $r;
  return null;
}

/** Public projections of rows, with every referenced image loaded in one query. */
function site_project($entity, array $rows) {
  $ids = [];
  foreach ($rows as $r) $ids = array_merge($ids, cms_media_refs($r['data']));
  $media = media_rows($ids);
  return array_map(function ($r) use ($entity, $media) {
    $p = cms_public($entity, $r, $r['data'], $media, media_base_url());
    // Rich text was cleaned on save; clean it again on the way out (defence in depth).
    foreach (['body', 'answer'] as $k) if (isset($p[$k]) && $p[$k] !== '') $p[$k] = sanitize_html($p[$k]);
    return $p;
  }, $rows);
}

function site_page($key) {
  $r = site_row('page', $key);
  return $r ? site_project('page', [$r])[0] : null;
}

function site_profile() {
  $p = [];
  $in = "'" . implode("','", PROFILE_KEYS) . "'";
  foreach (db_rows("SELECT skey, svalue FROM settings WHERE skey IN ($in)") as $r) $p[$r['skey']] = (string)$r['svalue'];
  return $p;
}

function site_url() { return rtrim((string)cfg('SITE_URL', 'https://heritclothing.com'), '/'); }

function journal_on() { return setting_flag('journal_enabled', false) && has_table('blog_posts'); }

/* ---- Actions ------------------------------------------------------------------ */

if ($action === 'config') {
  $p = site_profile();
  $business = business_public($p);
  $socials = socials_public(json_decode($p['socials'] ?? '', true) ?: []);
  $pages = [];
  foreach (site_rows('page') as $r) $pages[$r['slug']] = true;
  $policies = [];
  foreach (site_rows('policy') as $r) $policies[$r['slug']] = true;
  $journal = journal_on() && db_row("SELECT 1 AS x FROM blog_posts WHERE status = 'published' LIMIT 1");
  $booking = has_table('appointments') && setting_flag('public_booking_enabled', false)
    && availability_ready(availability_get(), 'consultation');
  site_json([
    'business' => (object)$business,
    'socials' => $socials,
    'nav' => [
      'services' => (bool)site_rows('service'), 'work' => (bool)site_rows('project'), 'faqs' => (bool)site_rows('faq'),
      'about' => isset($pages['about']), 'how_it_works' => isset($pages['how_it_works']),
      'company' => isset($pages['company']), 'contact' => true, 'journal' => (bool)$journal,
      'privacy' => isset($policies['privacy']), 'terms' => isset($policies['terms']), 'book' => (bool)$booking,
      'shop' => setting_flag('shop_enabled', false),
    ],
    'pages' => array_keys($pages),
    'booking_enabled' => (bool)$booking,
    'site_url' => site_url(),
    'jsonld' => jsonld_local_business($business, $socials, site_url()),
    'rev' => (int)setting_get('site_rev', '0'),
  ]);
}

if ($action === 'home') {
  $work = site_project('project', site_rows('project'));
  usort($work, fn($a, $b) => (int)$b['featured'] <=> (int)$a['featured']);   // stable since PHP 8
  $faqs = array_values(array_filter(site_project('faq', site_rows('faq')), fn($f) => $f['show_on_home']));
  // Hero slides (D-023): published ones with a photograph, in the staff order; empty before schema_phase28.sql.
  $slides = array_values(array_filter(site_project('slide', site_rows('slide')), fn($s) => !empty($s['hero'])));
  site_json(['page' => site_page('home'), 'services' => array_slice(site_project('service', site_rows('service')), 0, 6),
    'work' => array_slice($work, 0, 6), 'faqs' => array_slice($faqs, 0, 4), 'slides' => array_slice($slides, 0, 6)]);
}

if ($action === 'page') {
  $key = in_str($_GET, 'key');
  if (!in_array($key, CMS_PAGE_KEYS, true)) site_404();
  $page = site_page($key);
  if (!$page) site_404();
  site_json(['page' => $page]);
}

if ($action === 'services') {
  site_json(['intro' => site_page('services_intro'), 'items' => site_project('service', site_rows('service'))]);
}

if ($action === 'service') {
  $r = site_row('service', in_str($_GET, 'slug'));
  if (!$r) site_404('Service not found');
  $work = array_values(array_filter(site_rows('project'), fn($p) => ($p['data']['service_slug'] ?? null) === $r['slug']));
  site_json(['service' => site_project('service', [$r])[0], 'work' => array_slice(site_project('project', $work), 0, 6)]);
}

if ($action === 'work') {
  $rows = site_rows('project');
  $svc = in_str($_GET, 'service');
  if ($svc !== '') $rows = array_values(array_filter($rows, fn($p) => ($p['data']['service_slug'] ?? null) === $svc));
  site_json(['items' => site_project('project', $rows)]);
}

if ($action === 'work_item') {
  $r = site_row('project', in_str($_GET, 'slug'));
  if (!$r) site_404('Project not found');
  site_json(['item' => site_project('project', [$r])[0]]);
}

if ($action === 'faqs') {
  $items = site_project('faq', site_rows('faq'));
  if (!empty($_GET['home'])) $items = array_values(array_filter($items, fn($f) => $f['show_on_home']));
  site_json(['items' => $items]);
}

if ($action === 'policy') {
  $key = in_str($_GET, 'key');
  $r = in_array($key, CMS_POLICY_KEYS, true) ? site_row('policy', $key) : null;
  if (!$r) site_404('Policy not found');
  site_json(['policy' => site_project('policy', [$r])[0]]);
}

if ($action === 'journal') {
  $items = [];
  if (journal_on()) {
    foreach (db_rows("SELECT slug, title, excerpt, category, author, published_at FROM blog_posts
                       WHERE status = 'published' ORDER BY published_at DESC LIMIT 50") as $p) {
      $items[] = ['slug' => $p['slug'], 'title' => $p['title'], 'excerpt' => (string)$p['excerpt'],
        'category' => (string)$p['category'], 'author' => (string)$p['author'], 'published_at' => $p['published_at']];
    }
  }
  site_json(['enabled' => journal_on(), 'items' => $items]);
}

if ($action === 'journal_post') {
  if (!journal_on()) site_404('Post not found');
  $p = db_row("SELECT slug, title, excerpt, body, category, author, published_at FROM blog_posts
                WHERE slug = ? AND status = 'published' LIMIT 1", 's', in_str($_GET, 'slug'));
  if (!$p) site_404('Post not found');
  $p['body'] = sanitize_html($p['body'] ?? '');
  site_json(['post' => $p]);
}

site_404('Unknown action');
