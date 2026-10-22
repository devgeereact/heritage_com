<?php
/**
 * Load Herit Clothing's real website content (scripts/content/real-content.php)
 * and the African print images (scripts/content/render-prints.mjs) into a
 * HeritOS site THROUGH ITS PUBLIC API, signed in as the owner: images go up
 * through cms.php media_upload (processed and stored exactly like an owner
 * upload), pages, slides, services and questions through cms.php save_draft
 * and publish, the profile through profile_save, and journal posts through
 * content.php. Nothing touches the database directly.
 *
 *   node scripts/content/render-prints.mjs            # the images, once
 *   HERIT_EMAIL=dev@heritclothing.com HERIT_PASSWORD=… \
 *     php scripts/content/load-real-content.php --base http://127.0.0.1:8089
 *
 * Options:
 *   --base URL        API base (required). Only 127.0.0.1 or localhost unless
 *   --allow-remote    is given, and then only over https (for loading the live
 *                     site later, when the owner chooses).
 *   --images DIR      rendered images and manifest.json (default scripts/content/.out;
 *                     scripts/content/.stock for the stock photographs, D-028)
 *   --update          overwrite items the owner has edited since the last load
 *   --dry-run         sign in and report what would change, without writing
 *
 * The password comes from HERIT_PASSWORD (never an argument, so it stays out of
 * the shell history and process list). Idempotent: a state file per API base
 * (scripts/content/.state/, gitignored) records what was loaded; a second run
 * changes nothing, and an item the owner edited since is kept unless --update.
 */

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

$opt = ['base' => '', 'images' => __DIR__ . '/.out', 'update' => false, 'dry' => false, 'remote' => false];
for ($i = 1; $i < $argc; $i++) {
  $a = $argv[$i];
  if ($a === '--base') $opt['base'] = $argv[++$i] ?? '';
  elseif ($a === '--images') $opt['images'] = $argv[++$i] ?? '';
  elseif ($a === '--update') $opt['update'] = true;
  elseif ($a === '--dry-run') $opt['dry'] = true;
  elseif ($a === '--allow-remote') $opt['remote'] = true;
  else { fwrite(STDERR, "Unknown option $a\n"); exit(2); }
}

/* ---- Target and credentials ------------------------------------------------- */

$base = rtrim($opt['base'], '/');
$u = parse_url($base);
if (!$base || !$u || empty($u['host']) || !in_array($u['scheme'] ?? '', ['http', 'https'], true)) {
  fwrite(STDERR, "Give the API base, for example --base http://127.0.0.1:8089\n"); exit(2);
}
$local = in_array(strtolower($u['host']), ['127.0.0.1', 'localhost', '::1', '[::1]'], true);
if (!$local && !$opt['remote']) {
  fwrite(STDERR, "Refusing {$u['host']}: only 127.0.0.1 or localhost without --allow-remote.\n"); exit(2);
}
if (!$local && $u['scheme'] !== 'https') { fwrite(STDERR, "A remote site must be https.\n"); exit(2); }
$email = getenv('HERIT_EMAIL') ?: '';
$password = getenv('HERIT_PASSWORD') ?: '';
if ($email === '' || $password === '') { fwrite(STDERR, "Set HERIT_EMAIL and HERIT_PASSWORD (the owner account).\n"); exit(2); }

$content = require __DIR__ . '/real-content.php';
$manifestFile = rtrim($opt['images'], '/') . '/manifest.json';
if (!is_file($manifestFile)) { fwrite(STDERR, "No $manifestFile; run node scripts/content/render-prints.mjs first.\n"); exit(2); }
$manifest = [];
foreach (json_decode(file_get_contents($manifestFile), true) ?: [] as $m) $manifest[$m['name']] = $m;

$stateDir = __DIR__ . '/.state';
$stateFile = $stateDir . '/' . preg_replace('/[^a-z0-9]+/i', '-', strtolower($u['host'] . '-' . ($u['port'] ?? '') . ($u['path'] ?? ''))) . '.json';
$state = is_file($stateFile) ? (json_decode(file_get_contents($stateFile), true) ?: []) : [];
$state += ['media' => [], 'items' => []];

$counts = ['created' => 0, 'updated' => 0, 'unchanged' => 0, 'kept' => 0, 'failed' => 0];
$say = function ($what, $msg) use (&$counts) {
  if (isset($counts[$what])) $counts[$what]++;
  printf("  %-9s %s\n", $what, $msg);
};

/* ---- HTTP ------------------------------------------------------------------------ */

$jar = tempnam(sys_get_temp_dir(), 'hc-jar');
register_shutdown_function(fn() => @unlink($jar));
$token = null;

/** One API call: [status, decoded body]. $file sends multipart (file + fields). */
function api($method, $path, $body = null, $file = null) {
  global $base, $jar, $token;
  $ch = curl_init($base . '/' . ltrim($path, '/'));
  $headers = ['Accept: application/json'];
  if ($token) $headers[] = 'Authorization: Bearer ' . $token;
  if ($method !== 'GET') {
    // Cookie sessions (STAFF_COOKIE_AUTH) need the CSRF header on writes.
    foreach (@file($jar) ?: [] as $line) {
      $f = explode("\t", trim($line));
      if (count($f) >= 7 && stripos($f[5], 'csrf') !== false) $headers[] = 'X-Herit-CSRF: ' . $f[6];
    }
  }
  $opts = [CURLOPT_RETURNTRANSFER => true, CURLOPT_COOKIEJAR => $jar, CURLOPT_COOKIEFILE => $jar,
    CURLOPT_CUSTOMREQUEST => $method, CURLOPT_TIMEOUT => 120];
  if ($file) {
    $opts[CURLOPT_POSTFIELDS] = $body + ['file' => new CURLFile($file, 'image/jpeg', basename($file))];
  } elseif ($body !== null) {
    $headers[] = 'Content-Type: application/json';
    $opts[CURLOPT_POSTFIELDS] = json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  }
  $opts[CURLOPT_HTTPHEADER] = $headers;
  curl_setopt_array($ch, $opts);
  $raw = curl_exec($ch);
  if ($raw === false) { fwrite(STDERR, "Request failed: $method $path: " . curl_error($ch) . "\n"); exit(1); }
  $code = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
  if (PHP_VERSION_ID < 80000) curl_close($ch);
  return [$code, json_decode($raw, true) ?? ['raw' => substr($raw, 0, 300)]];
}

function must($r, $what) {
  [$code, $b] = $r;
  if ($code >= 200 && $code < 300) return $b;
  fwrite(STDERR, "$what failed ($code): " . json_encode($b, JSON_UNESCAPED_SLASHES) . "\n");
  exit(1);
}

/** A stable fingerprint of item content (key order and whitespace ignored). */
function fp($v) {
  $norm = function ($x) use (&$norm) {
    if (is_array($x)) { if (array_keys($x) !== range(0, count($x) - 1)) ksort($x); return array_map($norm, $x); }
    return is_string($x) ? preg_replace('/\s+/u', ' ', trim($x)) : $x;
  };
  return sha1(json_encode($norm($v), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
}

/* ---- Sign in ----------------------------------------------------------------- */

echo "HeritOS content loader: $base" . ($opt['dry'] ? ' (dry run)' : '') . "\n";
$login = must(api('POST', 'auth.php?action=login', ['email' => $email, 'password' => $password]), 'Sign-in');
$token = $login['token'] ?? null;
$role = $login['user']['role'] ?? '';
if (!in_array($role, ['super_admin', 'admin', 'manager'], true)) { fwrite(STDERR, "Signed in as $role; the profile and journal need an owner role.\n"); exit(1); }
echo "Signed in as {$login['user']['email']} ($role)\n";

/* ---- Images ------------------------------------------------------------------ */

echo "Images\n";
$mediaIds = [];
$existing = [];
foreach ((must(api('GET', 'cms.php?action=media_list'), 'Image list')['items'] ?? []) as $m) $existing[(int)$m['id']] = $m;
foreach ($manifest as $name => $m) {
  $path = rtrim($opt['images'], '/') . '/' . $m['file'];
  // Stock photographs (scripts/content/stock-manifest.mjs) carry their own credit caption.
  $cap = $m['caption'] ?? $content['caption'];
  $sha = hash_file('sha256', $path);
  $known = $state['media'][$name] ?? null;
  if ($known && $known['sha'] === $sha && isset($existing[$known['id']])) {
    $mediaIds[$name] = $known['id'];
    $cur = $existing[$known['id']];
    if ($cur['alt_text'] === $m['alt'] && $cur['caption'] === $cap) { $say('unchanged', "image $name (#{$known['id']})"); continue; }
    if ($cur['alt_text'] !== ($known['alt'] ?? null) && !$opt['update']) { $say('kept', "image $name: alt text edited by the owner"); continue; }
    if (!$opt['dry']) must(api('POST', "cms.php?action=media_update&id={$known['id']}", ['alt_text' => $m['alt'], 'caption' => $cap]), "Alt text for $name");
    $state['media'][$name]['alt'] = $m['alt'];
    $say('updated', "image $name alt text");
    continue;
  }
  if ($opt['dry']) { $say('created', "image $name (would upload {$m['file']})"); continue; }
  [$code, $b] = api('POST', 'cms.php?action=media_upload', ['alt_text' => $m['alt'], 'caption' => $cap], $path);
  if ($code !== 200 && $code !== 201) { $say('failed', "image $name ($code): " . ($b['error'] ?? '')); continue; }
  $id = (int)$b['media']['id'];
  if (!empty($b['duplicate']) && $b['media']['alt_text'] === '') {
    must(api('POST', "cms.php?action=media_update&id=$id", ['alt_text' => $m['alt'], 'caption' => $cap]), "Alt text for $name");
  }
  $mediaIds[$name] = $id;
  $state['media'][$name] = ['id' => $id, 'sha' => $sha, 'alt' => $m['alt']];
  $say(!empty($b['duplicate']) ? 'unchanged' : 'created', "image $name (#$id, {$m['role']})");
}

/* ---- Business profile ---------------------------------------------------------- */

echo "Business details\n";
$profile = must(api('GET', 'cms.php?action=profile_get'), 'Profile')['profile'] ?? [];
$send = [];
foreach ($content['profile'] as $k => $v) {
  // Socials are an object: compare and store them as sorted JSON, merged over
  // what the owner already has so a link they added is kept.
  if (is_array($v)) {
    $have = (array)($profile[$k] ?? []);
    $v = array_merge($have, $v);
    ksort($v); ksort($have);
    $cur = json_encode($have, JSON_UNESCAPED_SLASHES);
    if ($cur === json_encode($v, JSON_UNESCAPED_SLASHES)) continue;
    $send[$k] = $v;
    continue;
  }
  $cur = (string)($profile[$k] ?? '');
  if ($cur === (string)$v) continue;
  $mine = ($state['profile'][$k] ?? null) === $cur;
  // Flags default to '0', which counts as unset until this loader has written them once.
  $flag = in_array($k, ['business_address_public', 'journal_enabled'], true);
  $empty = $cur === '' || ($flag && $cur === '0' && !isset($state['profile'][$k]));
  if ($empty || $mine || $opt['update']) $send[$k] = $v;
  else $say('kept', "profile $k: set by the owner");
}
if ($send) {
  if (!$opt['dry']) must(api('POST', 'cms.php?action=profile_save', $send), 'Profile save');
  foreach ($send as $k => $v) $state['profile'][$k] = is_array($v) ? json_encode($v, JSON_UNESCAPED_SLASHES) : (string)$v;
  $say('updated', 'profile: ' . implode(', ', array_keys($send)));
} else {
  $say('unchanged', 'profile');
}

/* ---- CMS items ------------------------------------------------------------------- */

/** Content with image names swapped for media ids. */
function with_media(array $d, array $ids) {
  if (isset($d['image'])) { $d['hero_media_id'] = $ids[$d['image']] ?? null; unset($d['image']); }
  return $d;
}

/**
 * Create or update one item and publish it. $find locates an existing item in
 * the list when the state file does not know it (page key, service slug or
 * the question or headline text).
 */
function load_item($entity, $key, array $data, $sort, array $list, callable $find, array $extra = []) {
  global $state, $opt, $say;
  $sk = "$entity:$key";
  $src = fp($data);
  $known = $state['items'][$sk] ?? null;
  $row = null;
  if ($known) foreach ($list as $it) if ((int)$it['id'] === (int)$known['id']) $row = $it;
  if (!$row) foreach ($list as $it) if ($find($it)) $row = $it;

  if ($row) {
    $full = must(api('GET', "cms.php?action=get&entity=$entity&id={$row['id']}"), "Read $sk")['item'];
    $cur = fp($full['editable'] ?? []);
    $ownerEdited = $known ? $cur !== $known['server'] : true;
    if (!$ownerEdited && $known['source'] === $src) {
      if ($full['status'] !== 'published' && !$full['has_draft']) { $say('kept', "$sk: unpublished by the owner"); return; }
      $say('unchanged', $sk); return;
    }
    if ($ownerEdited && !$opt['update']) { $say('kept', "$sk: edited on the site; --update overwrites"); return; }
  }
  if ($opt['dry']) { $say($row ? 'updated' : 'created', "$sk (dry run)"); return; }

  [$code, $b] = api('POST', "cms.php?action=save_draft&entity=$entity", array_filter($extra + ['id' => $row['id'] ?? null, 'sort' => $sort, 'data' => $data], fn($v) => $v !== null));
  if ($code !== 200 && $code !== 201) { $say('failed', "$sk save ($code): " . json_encode($b['errors'] ?? $b['error'] ?? $b, JSON_UNESCAPED_SLASHES)); return; }
  $id = (int)$b['item']['id'];
  [$code, $p] = api('POST', "cms.php?action=publish&entity=$entity&id=$id", []);
  if ($code !== 200 && !($code === 409 && ($p['code'] ?? '') === 'no_changes')) {
    $say('failed', "$sk publish ($code): " . json_encode($p['problems'] ?? $p['error'] ?? $p, JSON_UNESCAPED_SLASHES)); return;
  }
  $after = must(api('GET', "cms.php?action=get&entity=$entity&id=$id"), "Read $sk")['item'];
  $state['items'][$sk] = ['id' => $id, 'source' => $src, 'server' => fp($after['editable'] ?? [])];
  $say($row ? 'updated' : 'created', "$sk (#$id, published)");
}

$lists = [];
foreach (['page', 'slide', 'service', 'faq'] as $e) $lists[$e] = must(api('GET', "cms.php?action=list&entity=$e"), "List $e")['items'] ?? [];
$norm = fn($s) => strtolower(preg_replace('/\s+/', ' ', trim((string)$s)));

echo "Pages\n";
foreach ($content['pages'] as $key => $d) {
  load_item('page', $key, with_media($d, $mediaIds), 0, $lists['page'], fn($it) => ($it['key'] ?? '') === $key, ['key' => $key]);
}
echo "Hero slides\n";
$n = 0;
foreach ($content['slides'] as $key => $d) {
  $n += 10;
  load_item('slide', $key, with_media($d, $mediaIds), $n, $lists['slide'], fn($it) => $norm($it['title']) === $norm($d['headline']));
}
echo "Services\n";
$n = 0;
foreach ($content['services'] as $slug => $d) {
  $n += 10;
  load_item('service', $slug, with_media($d, $mediaIds), $n, $lists['service'], fn($it) => $it['slug'] === $slug, ['slug' => $slug]);
}
echo "Questions\n";
$n = 0;
foreach ($content['faqs'] as $key => $d) {
  $n += 10;
  load_item('faq', $key, $d + ['show_on_home' => true], $n, $lists['faq'], fn($it) => $norm($it['title']) === $norm($d['question']));
}

/* ---- Journal ------------------------------------------------------------------- */

echo "Journal\n";
$posts = must(api('GET', 'content.php?action=blog_list'), 'Journal list')['posts'] ?? [];
foreach ($content['journal'] as $slug => $d) {
  $sk = "post:$slug";
  $data = $d + ['slug' => $slug, 'status' => 'published', 'author' => 'Herit Clothing'];
  $src = fp($data);
  $known = $state['items'][$sk] ?? null;
  $row = null;
  foreach ($posts as $p) if ($p['slug'] === $slug || ($known && (int)$p['id'] === (int)$known['id'])) $row = $p;
  $serverFp = function ($id) {
    $g = must(api('GET', "content.php?action=blog_get&id=$id"), 'Read post');
    return fp(array_intersect_key($g, array_flip(['slug', 'title', 'excerpt', 'body', 'category', 'tile', 'status', 'author'])));
  };
  if ($row) {
    $cur = $serverFp($row['id']);
    $ownerEdited = $known ? $cur !== $known['server'] : true;
    if (!$ownerEdited && $known['source'] === $src) { $say('unchanged', $sk); continue; }
    if ($ownerEdited && !$opt['update']) { $say('kept', "$sk: edited on the site; --update overwrites"); continue; }
  }
  if ($opt['dry']) { $say($row ? 'updated' : 'created', "$sk (dry run)"); continue; }
  $b = must(api('POST', 'content.php?action=blog_save', $data + ($row ? ['id' => (int)$row['id']] : [])), "Save $sk");
  $id = (int)($b['id'] ?? $row['id']);
  $state['items'][$sk] = ['id' => $id, 'source' => $src, 'server' => $serverFp($id)];
  $say($row ? 'updated' : 'created', "$sk (#$id, published)");
}

/* ---- Done ------------------------------------------------------------------------- */

if (!$opt['dry']) {
  if (!is_dir($stateDir)) mkdir($stateDir, 0700, true);
  file_put_contents($stateFile, json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
}
api('POST', 'auth.php?action=logout', []);
printf("Done: %d created, %d updated, %d unchanged, %d kept (owner edits), %d failed\n",
  $counts['created'], $counts['updated'], $counts['unchanged'], $counts['kept'], $counts['failed']);
exit($counts['failed'] ? 1 : 0);
