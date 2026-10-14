<?php
/**
 * HeritOS: pure helpers for the website CMS (Phase 4). No database, no network,
 * no output. Used by cms.php (staff), site.php (public projection), sitemap.php,
 * settings.php and php-api/tests/cms_cases.php.
 *
 * Needs _lib.php loaded first only for sanitize_html() (rich text fields).
 *
 * Model: one row per item in `cms_items` (schema_phase26.sql) holding three JSON
 * copies of the content: `live` (what the public sees while status is
 * published), `draft` (staff edits not yet published) and `prev` (the one
 * earlier live version kept for rollback). Public output is always built by the
 * whitelist projections below, never by returning a stored array.
 */

const CMS_ENTITIES = ['service', 'project', 'faq', 'policy', 'page', 'slide'];
/** Pages and policies are fixed keys; their slug is the key. */
const CMS_PAGE_KEYS = ['home', 'about', 'how_it_works', 'company', 'services_intro', 'contact'];
const CMS_POLICY_KEYS = ['privacy', 'terms'];
/** Entities whose slug the staff choose (and which then never changes once published). */
const CMS_SLUGGED = ['service', 'project'];
const CMS_IMAGE_ROLES = ['front', 'back', 'detail', 'process', 'other'];
/** Fields stored with a project but never projected publicly. */
const CMS_PRIVATE_FIELDS = ['own_work', 'consent_images', 'consent_client', 'consent_note', 'client_id'];

/**
 * Field schema per entity: name => [type, max, required-for-publish].
 * Types: text (plain, one line or short paragraph), html (sanitised rich text),
 * list (array of short strings), media (media_assets id), images (gallery),
 * bool, int, date (Y-m-d), slug.
 */
const CMS_FIELDS = [
  'service' => [
    'title' => ['text', 120, true], 'summary' => ['text', 300, false], 'body' => ['html', 20000, false],
    'includes' => ['list', 12, false], 'price_note' => ['text', 255, false], 'hero_media_id' => ['media', 0, false],
    'seo_title' => ['text', 70, false], 'seo_description' => ['text', 170, false],
  ],
  'project' => [
    'title' => ['text', 120, true], 'summary' => ['text', 300, false], 'body' => ['html', 20000, false],
    'garment' => ['text', 120, false], 'fabric' => ['text', 120, false], 'service_slug' => ['slug', 80, false],
    'cover_media_id' => ['media', 0, false], 'images' => ['images', 24, false], 'featured' => ['bool', 0, false],
    'seo_title' => ['text', 70, false], 'seo_description' => ['text', 170, false],
    // Private (CMS_PRIVATE_FIELDS): consent record and the optional client link.
    'own_work' => ['bool', 0, false], 'consent_images' => ['bool', 0, false], 'consent_client' => ['bool', 0, false],
    'consent_note' => ['text', 255, false], 'client_id' => ['int', 0, false],
  ],
  'faq' => [
    'question' => ['text', 255, true], 'answer' => ['html', 5000, true], 'category' => ['text', 40, false],
    'show_on_home' => ['bool', 0, false],
  ],
  'policy' => [
    'title' => ['text', 120, true], 'body' => ['html', 60000, true], 'effective_date' => ['date', 0, false],
  ],
  'page' => [
    'headline' => ['text', 160, true], 'intro' => ['text', 600, false], 'body' => ['html', 20000, false],
    'hero_media_id' => ['media', 0, false], 'seo_title' => ['text', 70, false], 'seo_description' => ['text', 170, false],
  ],
  // Home hero slides (schema_phase28.sql, D-023). A slide needs a headline and a photograph to go live.
  'slide' => [
    'label' => ['text', 30, false], 'eyebrow' => ['text', 40, false], 'headline' => ['text', 90, true],
    'lead' => ['text', 220, false], 'hero_media_id' => ['media', 0, true],
    'cta_label' => ['text', 40, false], 'cta_path' => ['path', 120, false],
  ],
];

/** Public site paths (React routes) for the sitemap and for the frontend contract. */
const CMS_PAGE_PATHS = ['home' => '/', 'about' => '/about', 'how_it_works' => '/how-it-works',
  'company' => '/company-orders', 'contact' => '/contact', 'services_intro' => '/services'];
const CMS_POLICY_PATHS = ['privacy' => '/privacy', 'terms' => '/terms'];

/** Social platforms and the hosts each may point at (https only). */
const SOCIAL_HOSTS = [
  'instagram' => ['instagram.com'],
  'facebook' => ['facebook.com', 'fb.com'],
  'tiktok' => ['tiktok.com'],
  'x' => ['x.com', 'twitter.com'],
  'youtube' => ['youtube.com', 'youtu.be'],
  'linkedin' => ['linkedin.com'],
];

/** Business profile settings keys (all empty by default; empty means hidden). */
const PROFILE_KEYS = ['business_name', 'business_phone', 'business_whatsapp', 'business_email', 'business_address',
  'business_address_public', 'business_area_text', 'business_hours_text', 'socials', 'journal_enabled'];

const UPLOAD_MIME_EXT = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
const IMAGE_TARGET_WIDTHS = [800, 1600];
const IMAGE_MAX_PIXELS = 40000000;

/* ---- Small text helpers --------------------------------------------------- */

/** Trim, drop control characters (keeping newlines and tabs), scrub invalid UTF-8. */
function cms_text($v) {
  $s = (string)$v;
  if (function_exists('mb_scrub')) $s = mb_scrub($s, 'UTF-8');
  $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $s) ?? '';
  return trim($s);
}

function cms_len($s) { return function_exists('mb_strlen') ? mb_strlen($s, 'UTF-8') : strlen($s); }

/** A URL slug: lower-case ASCII letters, digits and single hyphens, at most 80 characters. */
function slug_clean($s) {
  $s = strtolower(cms_text($s));
  if (function_exists('iconv')) { $t = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s); if ($t !== false) $s = strtolower($t); }
  $s = preg_replace('/[^a-z0-9]+/', '-', $s) ?? '';
  $s = trim($s, '-');
  if (strlen($s) > 80) $s = rtrim(substr($s, 0, 80), '-');
  return $s;
}

function slug_ok($s) {
  return is_string($s) && strlen($s) <= 80 && (bool)preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $s);
}

/** Placeholder markers that must never reach the public site. */
function cms_has_placeholder($text) {
  return (bool)preg_match('/\[owner|\{\{|\blorem\b|\bTODO\b|\bTBC\b/i', (string)$text);
}

/**
 * Private details a public text should not carry: Nigerian phone numbers, email
 * addresses and staff codes. Returns the list of kinds found (empty = clean).
 */
function cms_private_leak_check($text) {
  $t = strip_tags((string)$text);
  $found = [];
  if (preg_match('/(?:\+?234|\b0)[789][01]\d[\s.-]?\d{3}[\s.-]?\d{4}\b/', $t)) $found[] = 'phone';
  if (preg_match('/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i', $t)) $found[] = 'email';
  if (preg_match('/\b(?:HC|HCG|ORD|QT|RCT)-\d+/i', $t)) $found[] = 'staff_code';
  return $found;
}

/* ---- Social links and WhatsApp -------------------------------------------- */

/**
 * Is $url an acceptable public link for $platform? https only, no credentials,
 * no port, host on that platform's allowlist (or a subdomain of it), and a path
 * that points at an account rather than the platform's home page.
 */
function social_url_ok($platform, $url) {
  if (!isset(SOCIAL_HOSTS[$platform])) return false;
  $url = (string)$url;
  if ($url === '' || strlen($url) > 300 || preg_match('/[\x00-\x20\x7F"<>\\\\]/', $url)) return false;
  $p = parse_url($url);
  if (!$p || strtolower($p['scheme'] ?? '') !== 'https') return false;
  if (isset($p['user']) || isset($p['pass']) || isset($p['port'])) return false;
  $host = strtolower($p['host'] ?? '');
  if ($host === '') return false;
  $okHost = false;
  foreach (SOCIAL_HOSTS[$platform] as $h) {
    if ($host === $h || str_ends_with($host, '.' . $h)) { $okHost = true; break; }
  }
  if (!$okHost) return false;
  $path = trim($p['path'] ?? '', '/');
  return $path !== '';
}

/** Normalise a WhatsApp number to international digits; '' when empty; null when invalid. */
function wa_number_clean($v) {
  $d = preg_replace('/\D+/', '', (string)$v) ?? '';
  if ($d === '') return '';
  if (strlen($d) === 11 && $d[0] === '0') $d = '234' . substr($d, 1);   // Nigerian local form
  return preg_match('/^[1-9]\d{7,14}$/', $d) ? $d : null;
}

/** A click-to-chat link of the exact form https://wa.me/<international digits>. */
function wa_url_ok($url) {
  return (bool)preg_match('#^https://wa\.me/[1-9]\d{7,14}$#', (string)$url);
}

/** Platform keys accepted in the `socials` setting ('twitter' is read as 'x'). */
const SOCIAL_PLATFORMS = ['instagram', 'facebook', 'tiktok', 'x', 'youtube', 'linkedin', 'whatsapp'];

/** Is $url acceptable for $platform, WhatsApp (wa.me) included? */
function social_link_ok($platform, $url) {
  return $platform === 'whatsapp' ? wa_url_ok($url) : social_url_ok($platform, $url);
}

/**
 * Socials for public use: [{platform, url}] in a fixed order, only links that
 * pass social_link_ok() (stored values are re-checked, so an older unchecked
 * value is simply left out).
 */
function socials_public($socials) {
  $out = [];
  if (!is_array($socials)) return $out;
  foreach (SOCIAL_PLATFORMS as $pf) {
    $u = $socials[$pf] ?? ($pf === 'x' ? ($socials['twitter'] ?? null) : null);
    if (is_array($u)) $u = $u['url'] ?? null;          // tolerate {url: …} shapes
    if (is_string($u) && social_link_ok($pf, $u)) $out[] = ['platform' => $pf, 'url' => $u];
  }
  return $out;
}

/* ---- Business profile ----------------------------------------------------- */

/**
 * Validate the profile keys present in $in. Returns [clean, errors]; clean holds
 * strings ('0'/'1' for flags) and socials as {platform: url}. Empty strings are
 * kept (they clear a value). Unknown keys are ignored.
 */
function profile_clean(array $in) {
  $clean = []; $err = [];
  $text = ['business_name' => 120, 'business_address' => 300, 'business_area_text' => 300, 'business_hours_text' => 300];
  foreach ($in as $k => $v) {
    if (!in_array($k, PROFILE_KEYS, true)) continue;
    if (isset($text[$k])) {
      $s = cms_text($v);
      if (cms_len($s) > $text[$k]) $err[$k] = "At most {$text[$k]} characters";
      elseif (cms_has_placeholder($s)) $err[$k] = 'Remove placeholder text';
      else $clean[$k] = $s;
      continue;
    }
    switch ($k) {
      case 'business_phone':
        $s = cms_text($v);
        if ($s !== '' && !preg_match('/^\+?[0-9][0-9 ()-]{6,24}$/', $s)) $err[$k] = 'Use digits, spaces, brackets or hyphens';
        else $clean[$k] = $s;
        break;
      case 'business_whatsapp':
        $d = wa_number_clean($v);
        if ($d === null) $err[$k] = 'Use the full WhatsApp number, for example 2348012345678';
        else $clean[$k] = $d;
        break;
      case 'business_email':
        $s = cms_text($v);
        if ($s !== '' && (!filter_var($s, FILTER_VALIDATE_EMAIL) || strlen($s) > 190)) $err[$k] = 'Email looks wrong';
        else $clean[$k] = $s;
        break;
      case 'business_address_public': case 'journal_enabled':
        $clean[$k] = (!empty($v) && $v !== '0' && $v !== 'false') ? '1' : '0';
        break;
      case 'socials':
        if ($v === '' || $v === null) { $clean[$k] = []; break; }
        if (!is_array($v)) { $err[$k] = 'Socials must be an object of platform to link'; break; }
        $s = [];
        foreach ($v as $pf => $u) {
          if (is_array($u)) $u = $u['url'] ?? '';
          $u = cms_text($u);
          if ($pf === 'twitter') $pf = 'x';                          // older key for X
          if (!in_array($pf, SOCIAL_PLATFORMS, true)) { $err["socials.$pf"] = 'Unknown platform'; continue; }
          if ($u === '') continue;                                   // empty = not shown
          if ($pf === 'whatsapp' && !str_contains($u, '/')) {         // a bare number becomes a wa.me link
            $d = wa_number_clean($u);
            if ($d) $u = 'https://wa.me/' . $d;
          }
          if (!social_link_ok($pf, $u)) {
            $err["socials.$pf"] = $pf === 'whatsapp' ? 'Use https://wa.me/ followed by the full number, digits only'
              : 'Use the https link to your ' . $pf . ' page';
            continue;
          }
          $s[$pf] = $u;
        }
        $clean[$k] = $s;
        break;
    }
  }
  return [$clean, $err];
}

/** Public business block: only non-empty facts; address only when marked public. */
function business_public(array $p) {
  $out = [];
  $map = ['name' => 'business_name', 'phone' => 'business_phone', 'email' => 'business_email',
    'area' => 'business_area_text', 'hours_text' => 'business_hours_text'];
  foreach ($map as $out_k => $k) {
    $v = cms_text($p[$k] ?? '');
    if ($v !== '') $out[$out_k] = $v;
  }
  if (($p['business_address_public'] ?? '0') === '1' && cms_text($p['business_address'] ?? '') !== '') {
    $out['address'] = cms_text($p['business_address']);
  }
  $wa = wa_number_clean($p['business_whatsapp'] ?? '');
  if ($wa) { $out['whatsapp'] = $wa; $out['whatsapp_url'] = 'https://wa.me/' . $wa; }
  return $out;
}

/**
 * schema.org LocalBusiness built only from facts that are set. Null without a
 * business name. Never carries ratings or reviews.
 */
function jsonld_local_business(array $business, array $socials, $siteUrl) {
  if (($business['name'] ?? '') === '') return null;
  $site = rtrim((string)$siteUrl, '/');
  $ld = ['@context' => 'https://schema.org', '@type' => 'LocalBusiness', '@id' => $site . '/#business',
    'name' => $business['name'], 'url' => $site . '/'];
  if (!empty($business['phone'])) $ld['telephone'] = $business['phone'];
  if (!empty($business['email'])) $ld['email'] = $business['email'];
  if (!empty($business['address'])) $ld['address'] = ['@type' => 'PostalAddress', 'streetAddress' => $business['address']];
  if (!empty($business['area'])) $ld['areaServed'] = $business['area'];
  $same = array_column($socials, 'url');
  if ($same) $ld['sameAs'] = $same;
  return $ld;
}

/* ---- Content validation ---------------------------------------------------- */

/**
 * Clean one entity's content. Returns [clean, errors]. Unknown fields are
 * dropped; HTML goes through sanitize_html(); length limits are enforced.
 * Required fields are checked at publish time, so a partial draft can be saved.
 */
function cms_clean($entity, array $in) {
  $fields = CMS_FIELDS[$entity] ?? null;
  if ($fields === null) return [[], ['entity' => 'Unknown entity']];
  $clean = []; $err = [];
  foreach ($fields as $f => [$type, $max]) {
    if (!array_key_exists($f, $in)) continue;
    $v = $in[$f];
    switch ($type) {
      case 'text':
        $s = cms_text($v);
        if (cms_len($s) > $max) $err[$f] = "At most $max characters"; else $clean[$f] = $s;
        break;
      case 'html':
        $s = sanitize_html((string)$v);
        if (cms_len(strip_tags($s)) > $max) $err[$f] = "At most $max characters"; else $clean[$f] = $s;
        break;
      case 'list':
        if ($v === null || $v === '') { $clean[$f] = []; break; }
        if (!is_array($v)) { $err[$f] = 'Must be a list'; break; }
        $items = [];
        foreach ($v as $item) { $s = cms_text($item); if ($s !== '') $items[] = $s; }
        if (count($items) > $max) $err[$f] = "At most $max items";
        elseif (array_filter($items, fn($s) => cms_len($s) > 160)) $err[$f] = 'Each item at most 160 characters';
        else $clean[$f] = $items;
        break;
      case 'media': case 'int':
        if ($v === null || $v === '' || $v === 0 || $v === '0') { $clean[$f] = null; break; }
        if (filter_var($v, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) === false) $err[$f] = 'Must be an id';
        else $clean[$f] = (int)$v;
        break;
      case 'bool':
        $clean[$f] = !empty($v) && $v !== '0' && $v !== 'false';
        break;
      case 'date':
        $s = cms_text($v);
        if ($s === '') { $clean[$f] = null; break; }
        $d = DateTime::createFromFormat('!Y-m-d', $s);
        if (!$d || $d->format('Y-m-d') !== $s) $err[$f] = 'Use YYYY-MM-DD'; else $clean[$f] = $s;
        break;
      case 'slug':
        $s = cms_text($v);
        if ($s === '') { $clean[$f] = null; break; }
        if (!slug_ok($s)) $err[$f] = 'Not a valid slug'; else $clean[$f] = $s;
        break;
      case 'path':
        $s = cms_text($v);
        if ($s === '') { $clean[$f] = ''; break; }
        if (!cms_path_ok($s, $max)) $err[$f] = 'Use a page of this website, starting with / (for example /services)';
        else $clean[$f] = $s;
        break;
      case 'images':
        if ($v === null || $v === '') { $clean[$f] = []; break; }
        if (!is_array($v)) { $err[$f] = 'Must be a list'; break; }
        if (count($v) > $max) { $err[$f] = "At most $max images"; break; }
        $imgs = []; $seen = [];
        foreach (array_values($v) as $i => $img) {
          $id = is_array($img) ? ($img['media_id'] ?? null) : $img;
          if (filter_var($id, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) === false) { $err["$f.$i"] = 'Missing image'; continue; }
          $id = (int)$id;
          if (isset($seen[$id])) continue;
          $seen[$id] = true;
          $alt = cms_text(is_array($img) ? ($img['alt'] ?? '') : '');
          $role = is_array($img) ? ($img['role'] ?? 'other') : 'other';
          if (!in_array($role, CMS_IMAGE_ROLES, true)) $role = 'other';
          if (cms_len($alt) > 250) { $err["$f.$i"] = 'Alt text at most 250 characters'; continue; }
          $imgs[] = ['media_id' => $id, 'alt' => $alt, 'role' => $role];
        }
        $clean[$f] = $imgs;
        break;
    }
  }
  return [$clean, $err];
}

/** An internal site path for a button: starts with one "/", no scheme, no "//", safe characters only. */
function cms_path_ok($s, $max = 120) {
  $s = (string)$s;
  return $s !== '' && cms_len($s) <= $max && preg_match('~^/(?!/)[A-Za-z0-9/_\-.?=&#%]*$~', $s) === 1 && strpos($s, '..') === false;
}

/** Every media id an entity's content refers to. */
function cms_media_refs(array $data) {
  $ids = [];
  foreach (['hero_media_id', 'cover_media_id'] as $f) if (!empty($data[$f])) $ids[] = (int)$data[$f];
  foreach (($data['images'] ?? []) as $img) if (!empty($img['media_id'])) $ids[] = (int)$img['media_id'];
  return array_values(array_unique($ids));
}

/** May this project go public? Consent for the images, and from the client unless it is own work. */
function project_consent_ok(array $d) {
  return !empty($d['consent_images']) && (!empty($d['own_work']) || !empty($d['consent_client']));
}

/**
 * Reasons $data may not be published, as field => message (empty = publishable).
 * $media maps id => media row (alt_text, deleted_at) for every id referenced.
 */
function cms_publish_problems($entity, array $data, array $media) {
  $p = [];
  foreach (CMS_FIELDS[$entity] ?? [] as $f => [$type, $max, $req]) {
    if (!$req) continue;
    $v = $data[$f] ?? null;
    $empty = $type === 'html' ? trim(strip_tags((string)$v)) === '' : ($v === null || $v === '' || $v === []);
    if ($empty) $p[$f] = 'Required before publishing';
  }
  $public = cms_public_text($entity, $data);
  if (cms_has_placeholder($public)) $p['placeholder'] = 'Remove placeholder text ([owner …], {{ }}, lorem, TODO, TBC) before publishing';
  // Images: each must exist, not be deleted, and have alt text of 5+ characters.
  $alts = [];
  foreach (['hero_media_id', 'cover_media_id'] as $f) if (!empty($data[$f])) $alts[(int)$data[$f]] = '';
  foreach (($data['images'] ?? []) as $img) $alts[(int)$img['media_id']] = (string)($img['alt'] ?? '');
  foreach ($alts as $id => $override) {
    $m = $media[$id] ?? null;
    if (!$m || !empty($m['deleted_at'])) { $p["media.$id"] = 'Image no longer exists'; continue; }
    $alt = $override !== '' ? $override : (string)($m['alt_text'] ?? '');
    if (cms_len(trim($alt)) < 5) $p["media.$id"] = 'Image needs alt text (5 characters or more)';
  }
  if ($entity === 'project') {
    if (!project_consent_ok($data)) $p['consent'] = 'Record image consent, and client consent unless this is your own work';
    if (empty($data['cover_media_id']) && empty($data['images'])) $p['images'] = 'Add at least one image';
  }
  return $p;
}

/** All publicly shown text of an item, for placeholder and leak checks. */
function cms_public_text($entity, array $data) {
  $parts = [];
  foreach (CMS_FIELDS[$entity] ?? [] as $f => [$type]) {
    if (in_array($f, CMS_PRIVATE_FIELDS, true)) continue;
    $v = $data[$f] ?? null;
    if (is_string($v)) $parts[] = $v;
    elseif ($type === 'list' && is_array($v)) $parts[] = implode("\n", $v);
    elseif ($type === 'images' && is_array($v)) foreach ($v as $img) $parts[] = (string)($img['alt'] ?? '');
  }
  return implode("\n", $parts);
}

/* ---- Draft, publish, unpublish, rollback ---------------------------------- */

/**
 * The pure state machine. $row: status, live, draft, prev (arrays or null),
 * version (int), published_at (string or null). Returns [newRow, error code or
 * null]. One earlier version is kept: publishing moves live to prev; rolling
 * back swaps live and prev, so a second rollback undoes the first.
 */
function cms_transition(array $row, $action, $now = null) {
  $now = $now ?? gmdate('Y-m-d H:i:s');
  $r = $row;
  switch ($action) {
    case 'publish':
      if ($row['draft'] === null) {
        if ($row['live'] === null) return [$row, 'nothing_to_publish'];
        if ($row['status'] === 'published') return [$row, 'no_changes'];
        $r['status'] = 'published';                                // republish unchanged content
        return [$r, null];
      }
      if ($row['live'] !== null) $r['prev'] = $row['live'];
      $r['live'] = $row['draft'];
      $r['draft'] = null;
      $r['version'] = (int)$row['version'] + 1;
      $r['status'] = 'published';
      $r['published_at'] = $row['published_at'] ?? $now;
      return [$r, null];
    case 'unpublish':
      if ($row['status'] !== 'published') return [$row, 'not_published'];
      $r['status'] = 'unpublished';
      return [$r, null];
    case 'rollback':
      if ($row['prev'] === null || $row['live'] === null) return [$row, 'no_previous_version'];
      $r['live'] = $row['prev'];
      $r['prev'] = $row['live'];
      $r['version'] = (int)$row['version'] + 1;
      return [$r, null];
    case 'discard_draft':
      if ($row['draft'] === null) return [$row, 'no_draft'];
      $r['draft'] = null;
      return [$r, null];
    case 'delete':
      if ($row['published_at'] !== null) return [$row, 'published_once'];
      return [$r, null];
  }
  return [$row, 'unknown_action'];
}

/* ---- Public projections (whitelists) --------------------------------------- */

/** Public form of a media row: root-relative URLs, srcset widths, alt and size. */
function media_public(array $m, $baseUrl, $altOverride = '') {
  $v = is_array($m['variants'] ?? null) ? $m['variants'] : (json_decode((string)($m['variants'] ?? ''), true) ?: []);
  $base = rtrim((string)$baseUrl, '/');
  $srcset = [];
  foreach (($v['webp'] ?? []) as $w => $name) $srcset[] = ['url' => "$base/$name", 'width' => (int)$w, 'type' => 'image/webp'];
  $fallback = null;
  foreach (($v['jpg'] ?? []) as $w => $name) $fallback = ['url' => "$base/$name", 'width' => (int)$w, 'type' => 'image/jpeg'];
  usort($srcset, fn($a, $b) => $a['width'] <=> $b['width']);
  $largest = $srcset ? end($srcset) : $fallback;
  $alt = trim((string)$altOverride) !== '' ? trim((string)$altOverride) : (string)($m['alt_text'] ?? '');
  $out = ['url' => $fallback['url'] ?? ($largest['url'] ?? null), 'srcset' => $srcset,
    'width' => (int)($m['width'] ?? 0), 'height' => (int)($m['height'] ?? 0), 'alt' => $alt];
  if (!empty($m['caption'])) $out['caption'] = (string)$m['caption'];
  return $out;
}

/**
 * The public projection of one item's content. $media maps id => media row;
 * $baseUrl is the uploads URL. Only the listed keys ever leave the server.
 */
function cms_public($entity, array $item, array $data, array $media, $baseUrl) {
  $m = function ($id, $alt = '') use ($media, $baseUrl) {
    $id = (int)$id;
    if (!$id || !isset($media[$id]) || !empty($media[$id]['deleted_at'])) return null;
    return media_public($media[$id], $baseUrl, $alt);
  };
  $s = fn($k) => (string)($data[$k] ?? '');
  $published = $item['published_at'] ?? null;
  switch ($entity) {
    case 'service':
      return ['slug' => $item['slug'], 'title' => $s('title'), 'summary' => $s('summary'), 'body' => $s('body'),
        'includes' => array_values($data['includes'] ?? []), 'price_note' => $s('price_note'),
        'hero' => $m($data['hero_media_id'] ?? null), 'seo_title' => $s('seo_title'),
        'seo_description' => $s('seo_description'), 'published_at' => $published, 'updated_at' => $item['live_updated_at'] ?? $published];
    case 'project':
      $imgs = [];
      foreach (($data['images'] ?? []) as $img) {
        $pm = $m($img['media_id'] ?? null, $img['alt'] ?? '');
        if ($pm) $imgs[] = $pm + ['role' => in_array($img['role'] ?? '', CMS_IMAGE_ROLES, true) ? $img['role'] : 'other'];
      }
      return ['slug' => $item['slug'], 'title' => $s('title'), 'summary' => $s('summary'), 'body' => $s('body'),
        'garment' => $s('garment'), 'fabric' => $s('fabric'), 'service_slug' => $data['service_slug'] ?? null,
        'cover' => $m($data['cover_media_id'] ?? null) ?? ($imgs[0] ?? null), 'images' => $imgs,
        'featured' => !empty($data['featured']), 'seo_title' => $s('seo_title'), 'seo_description' => $s('seo_description'),
        'published_at' => $published, 'updated_at' => $item['live_updated_at'] ?? $published];
    case 'faq':
      return ['id' => (int)$item['id'], 'question' => $s('question'), 'answer' => $s('answer'),
        'category' => $s('category'), 'show_on_home' => !empty($data['show_on_home'])];
    case 'policy':
      return ['key' => $item['slug'], 'title' => $s('title'), 'body' => $s('body'),
        'effective_date' => $data['effective_date'] ?? null, 'updated_at' => $item['live_updated_at'] ?? $published];
    case 'page':
      return ['key' => $item['slug'], 'headline' => $s('headline'), 'intro' => $s('intro'), 'body' => $s('body'),
        'hero' => $m($data['hero_media_id'] ?? null), 'seo_title' => $s('seo_title'),
        'seo_description' => $s('seo_description'), 'updated_at' => $item['live_updated_at'] ?? $published];
    case 'slide':
      $path = $s('cta_path');
      return ['id' => (int)$item['id'], 'label' => $s('label'), 'eyebrow' => $s('eyebrow'), 'headline' => $s('headline'),
        'lead' => $s('lead'), 'hero' => $m($data['hero_media_id'] ?? null),
        'cta_label' => $s('cta_label'), 'cta_path' => cms_path_ok($path) ? $path : ''];
  }
  return null;
}

/* ---- Sitemap ----------------------------------------------------------------- */

/** XML sitemap from [{loc, lastmod?}]; loc is absolute. Escapes &, <, > and quotes. */
function sitemap_xml(array $urls) {
  $x = '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
  foreach ($urls as $u) {
    $x .= '  <url><loc>' . htmlspecialchars((string)$u['loc'], ENT_XML1 | ENT_QUOTES, 'UTF-8') . '</loc>';
    if (!empty($u['lastmod'])) {
      $t = strtotime($u['lastmod'] . ' UTC');
      if ($t) $x .= '<lastmod>' . gmdate('Y-m-d', $t) . '</lastmod>';
    }
    $x .= "</url>\n";
  }
  return $x . "</urlset>\n";
}

/* ---- Uploads ------------------------------------------------------------------ */

/** Extension for an allowed upload MIME type (from finfo), else null. */
function upload_mime_ok($mime) { return UPLOAD_MIME_EXT[strtolower((string)$mime)] ?? null; }

/** Output widths for an image $w pixels wide: 800 and 1600, never upscaled. */
function image_variant_plan($w) {
  $w = (int)$w;
  if ($w <= 0) return [];
  $out = [];
  foreach (IMAGE_TARGET_WIDTHS as $t) if ($t < $w) $out[] = $t;
  $top = min($w, max(IMAGE_TARGET_WIDTHS));
  if (!in_array($top, $out, true)) $out[] = $top;
  sort($out);
  return $out;
}
