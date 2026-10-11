<?php
/**
 * HeritOS: website CMS, staff side (Phase 4). Services, portfolio projects,
 * FAQs, policies and pages with draft, preview, publish, unpublish and a
 * one-step rollback; website images; the business profile.
 *
 * Entities (&entity=): service, project, faq, policy, page.
 *
 *   GET  ?action=list&entity=E                 {items:[summary]}
 *   GET  ?action=get&entity=E&id=N             {item} (id, or &key=K for page/policy)
 *   POST ?action=save_draft&entity=E           {id?, key? (page/policy), slug?, sort?, data:{…}} → {item}
 *   GET  ?action=preview&entity=E&id=N         {preview, problems, status, has_draft}
 *   POST ?action=publish&entity=E&id=N         {confirm_leak?} → {item}; 422 {problems}; 409 {warnings}
 *   POST ?action=unpublish|rollback|discard_draft|delete&entity=E&id=N
 *   POST ?action=reorder&entity=E              {ids:[…]}
 *   GET  ?action=media_list                    {items}
 *   POST ?action=media_upload                  multipart: file, alt_text?, caption? → 201 {media}
 *   POST ?action=media_update&id=N             {alt_text?, caption?}
 *   POST ?action=media_delete&id=N             soft delete; 409 while used
 *   GET  ?action=profile_get                   {profile, missing}
 *   POST ?action=profile_save                  {business_name, …, socials:{…}} → {profile}; 400 {errors}
 *
 * Roles: owner roles and editor. Publishing, unpublishing or rolling back a
 * policy, and saving the business profile, are owner roles only. Every write
 * is audited. Drafts never reach site.php.
 */
require __DIR__ . '/_lib.php';
require __DIR__ . '/_jobs.php';
require __DIR__ . '/_cms.php';
require __DIR__ . '/_media.php';
cors();

const ROLES_CMS = ['super_admin', 'admin', 'manager', 'editor'];
$user = require_auth(ROLES_CMS);
$uid = (int)$user['id'];
$isOwner = is_owner_role($user['role']);
$action = $_GET['action'] ?? 'list';
$id = (int)($_GET['id'] ?? 0);

if (!has_table('cms_items') || !has_table('media_assets')) {
  fail('The website tables are not set up yet (import schema_phase26.sql)', 409);
}

const CMS_ERRORS = [
  'nothing_to_publish' => 'There is nothing to publish yet; save a draft first',
  'no_changes' => 'Already published; save a draft with changes first',
  'not_published' => 'This is not published',
  'no_previous_version' => 'There is no earlier version to roll back to',
  'no_draft' => 'There is no draft to discard',
  'published_once' => 'This has been published before, so it is kept; unpublish it instead',
];

/* ---- Helpers ---------------------------------------------------------------- */

function cms_entity_param() {
  $e = $_GET['entity'] ?? '';
  if (!in_array($e, CMS_ENTITIES, true)) fail('Unknown entity (service, project, faq, policy or page)');
  return $e;
}

function cms_decode(array $r) {
  foreach (['live', 'draft', 'prev'] as $k) $r[$k] = $r[$k] === null ? null : (json_decode($r[$k], true) ?: []);
  $r['version'] = (int)$r['version'];
  return $r;
}

function cms_find($entity, $id, $lock = false) {
  $r = db_row('SELECT * FROM cms_items WHERE entity = ? AND id = ?' . ($lock ? ' FOR UPDATE' : ''), 'si', $entity, $id);
  return $r ? cms_decode($r) : null;
}

function cms_title($entity, $d) {
  if (!is_array($d)) return '';
  return (string)($d[['faq' => 'question', 'page' => 'headline'][$entity] ?? 'title'] ?? '');
}

function cms_staff_view(array $r, $full = true) {
  $cur = $r['draft'] ?? $r['live'];
  $v = ['id' => (int)$r['id'], 'entity' => $r['entity'], 'slug' => $r['slug'], 'status' => $r['status'],
    'sort' => (int)$r['sort'], 'version' => $r['version'], 'title' => cms_title($r['entity'], $cur),
    'has_draft' => $r['draft'] !== null, 'has_prev' => $r['prev'] !== null,
    'slug_locked' => $r['published_at'] !== null || !in_array($r['entity'], CMS_SLUGGED, true),
    'published_at' => $r['published_at'], 'live_updated_at' => $r['live_updated_at'],
    'draft_updated_at' => $r['draft_updated_at'], 'updated_at' => $r['updated_at']];
  if (in_array($r['entity'], ['page', 'policy'], true)) $v['key'] = $r['slug'];
  if ($full) { $v['live'] = $r['live']; $v['draft'] = $r['draft']; $v['editable'] = $cur ?? new stdClass(); }
  return $v;
}

function cms_write(array $r) {
  $enc = fn($x) => $x === null ? null : json_encode($x, JSON_UNESCAPED_UNICODE);
  db_exec('UPDATE cms_items SET status = ?, live = ?, draft = ?, prev = ?, version = ?, published_at = ?,
             live_updated_at = ? WHERE id = ?', 'ssssissi',
    $r['status'], $l = $enc($r['live']), $d = $enc($r['draft']), $p = $enc($r['prev']), $r['version'],
    $r['published_at'], $r['live_updated_at'], $r['id']);
}

function site_rev_bump() {
  global $conn;
  $conn->query("INSERT INTO settings (skey, svalue) VALUES ('site_rev', '1')
                ON DUPLICATE KEY UPDATE svalue = CAST(svalue AS UNSIGNED) + 1");
}

function cms_slug_taken($entity, $slug, $exceptId = 0) {
  return (bool)db_row('SELECT id FROM cms_items WHERE entity = ? AND slug = ? AND id <> ?', 'ssi', $entity, $slug, $exceptId);
}

/** Media ids referenced by any item's live or draft content (prev is not counted). */
function media_in_use() {
  $used = [];
  foreach (db_rows('SELECT live, draft FROM cms_items') as $r) {
    foreach (['live', 'draft'] as $k) {
      $d = $r[$k] === null ? null : json_decode($r[$k], true);
      if (is_array($d)) foreach (cms_media_refs($d) as $mid) $used[$mid] = true;
    }
  }
  return $used;
}

function profile_all() {
  $out = [];
  foreach (PROFILE_KEYS as $k) $out[$k] = $k === 'socials' ? new stdClass() : '';
  $in = "'" . implode("','", PROFILE_KEYS) . "'";
  foreach (db_rows("SELECT skey, svalue FROM settings WHERE skey IN ($in)") as $r) {
    if ($r['skey'] === 'socials') { $d = json_decode((string)$r['svalue'], true); $out['socials'] = is_array($d) && $d ? $d : new stdClass(); }
    else $out[$r['skey']] = (string)$r['svalue'];
  }
  if (!in_array($out['business_address_public'], ['0', '1'], true)) $out['business_address_public'] = '0';
  if (!in_array($out['journal_enabled'], ['0', '1'], true)) $out['journal_enabled'] = '0';
  return $out;
}

/* ---- Business profile -------------------------------------------------------- */

if ($action === 'profile_get' && method() === 'GET') {
  $p = profile_all();
  $missing = [];
  foreach (['business_name', 'business_phone', 'business_whatsapp', 'business_email', 'business_area_text', 'business_hours_text'] as $k) {
    if ($p[$k] === '') $missing[] = $k;
  }
  if (!socials_public((array)$p['socials'])) $missing[] = 'socials';
  json(['profile' => $p, 'missing' => $missing]);
}

if ($action === 'profile_save' && method() === 'POST') {
  if (!$isOwner) fail('Only the owner can change the business profile', 403);
  [$clean, $errors] = profile_clean(body());
  if ($errors) json(['error' => 'Check the highlighted fields', 'errors' => $errors], 400);
  foreach ($clean as $k => $v) {
    $val = $k === 'socials' ? json_encode($v ?: new stdClass(), JSON_UNESCAPED_SLASHES) : (string)$v;
    db_exec('INSERT INTO settings (skey, svalue, updated_by) VALUES (?,?,?)
             ON DUPLICATE KEY UPDATE svalue = VALUES(svalue), updated_by = VALUES(updated_by)', 'ssi', $k, $val, $uid);
  }
  if ($clean) site_rev_bump();
  audit($uid, 'website_profile_save', 'settings', null, ['keys' => array_keys($clean)]);
  json(['ok' => true, 'saved' => array_keys($clean), 'profile' => profile_all()]);
}

/* ---- Media ------------------------------------------------------------------- */

if ($action === 'media_list' && method() === 'GET') {
  $used = media_in_use();
  $items = [];
  foreach (db_rows('SELECT * FROM media_assets WHERE deleted_at IS NULL ORDER BY id DESC LIMIT 300') as $m) {
    $items[] = media_staff_view($m) + ['in_use' => isset($used[(int)$m['id']])];
  }
  json(['items' => $items, 'max_mb' => (float)cfg('MEDIA_MAX_MB', 8)]);
}

if ($action === 'media_upload' && method() === 'POST') {
  $f = $_FILES['file'] ?? null;
  media_check_upload_error($f);
  [$mid, $dup] = media_ingest($f['tmp_name'], $uid, $_POST['alt_text'] ?? '', $_POST['caption'] ?? '');
  $m = db_row('SELECT * FROM media_assets WHERE id = ?', 'i', $mid);
  if (!$dup) audit($uid, 'website_media_upload', 'media_assets', $mid);
  json(['ok' => true, 'duplicate' => $dup, 'media' => media_staff_view($m)], $dup ? 200 : 201);
}

if ($action === 'media_update' && method() === 'POST') {
  $m = db_row('SELECT * FROM media_assets WHERE id = ? AND deleted_at IS NULL', 'i', $id);
  if (!$m) fail('Image not found', 404);
  $b = body();
  $alt = array_key_exists('alt_text', $b) ? cms_text($b['alt_text']) : (string)$m['alt_text'];
  $cap = array_key_exists('caption', $b) ? cms_text($b['caption']) : (string)$m['caption'];
  $errors = [];
  if (cms_len($alt) > 250) $errors['alt_text'] = 'At most 250 characters';
  if (cms_len($cap) > 250) $errors['caption'] = 'At most 250 characters';
  if ($errors) json(['error' => 'Check the highlighted fields', 'errors' => $errors], 400);
  db_exec('UPDATE media_assets SET alt_text = ?, caption = ? WHERE id = ?', 'ssi', $alt, $cap, $id);
  site_rev_bump();
  audit($uid, 'website_media_update', 'media_assets', $id);
  json(['ok' => true, 'media' => media_staff_view(db_row('SELECT * FROM media_assets WHERE id = ?', 'i', $id))]);
}

if ($action === 'media_delete' && method() === 'POST') {
  $m = db_row('SELECT id FROM media_assets WHERE id = ? AND deleted_at IS NULL', 'i', $id);
  if (!$m) fail('Image not found', 404);
  if (isset(media_in_use()[$id])) fail('This image is used on the website; remove it from those items first', 409);
  db_exec('UPDATE media_assets SET deleted_at = UTC_TIMESTAMP() WHERE id = ?', 'i', $id);
  audit($uid, 'website_media_delete', 'media_assets', $id);
  json(['ok' => true]);
}

/* ---- Content items ------------------------------------------------------------ */

if ($action === 'list' && method() === 'GET') {
  $entity = cms_entity_param();
  $items = array_map(fn($r) => cms_staff_view(cms_decode($r), false),
    db_rows('SELECT * FROM cms_items WHERE entity = ? ORDER BY sort, id', 's', $entity));
  $out = ['items' => $items];
  if ($entity === 'page') $out['keys'] = CMS_PAGE_KEYS;
  if ($entity === 'policy') $out['keys'] = CMS_POLICY_KEYS;
  json($out);
}

if ($action === 'get' && method() === 'GET') {
  $entity = cms_entity_param();
  $key = $_GET['key'] ?? '';
  $r = $key !== '' ? db_row('SELECT * FROM cms_items WHERE entity = ? AND slug = ?', 'ss', $entity, $key) : null;
  $r = $r ? cms_decode($r) : ($id ? cms_find($entity, $id) : null);
  if (!$r) fail('Not found', 404);
  json(['item' => cms_staff_view($r)]);
}

if ($action === 'save_draft' && method() === 'POST') {
  $entity = cms_entity_param();
  $b = body();
  if (!is_array($b['data'] ?? null)) fail('Send the content as data:{…}');
  [$clean, $errors] = cms_clean($entity, $b['data']);
  if ($errors) json(['error' => 'Check the highlighted fields', 'errors' => $errors], 400);
  $now = gmdate('Y-m-d H:i:s');
  $draftJson = json_encode($clean, JSON_UNESCAPED_UNICODE);
  $rowId = (int)($b['id'] ?? 0);

  $saved = db_tx(function () use ($entity, $b, $clean, $draftJson, $rowId, $now, $uid) {
    $keyed = in_array($entity, ['page', 'policy'], true);
    if (!$rowId && $keyed) {
      $key = (string)($b['key'] ?? '');
      if (!in_array($key, $entity === 'page' ? CMS_PAGE_KEYS : CMS_POLICY_KEYS, true)) tx_fail('Unknown ' . $entity . ' key');
      $ex = db_row('SELECT id FROM cms_items WHERE entity = ? AND slug = ? FOR UPDATE', 'ss', $entity, $key);
      if ($ex) $rowId = (int)$ex['id'];
      else {
        db_exec("INSERT INTO cms_items (entity, slug, status, draft, draft_updated_at, draft_updated_by, created_by)
                 VALUES (?, ?, 'draft', ?, ?, ?, ?)", 'ssssii', $entity, $key, $draftJson, $now, $uid, $uid);
        return [(int)$GLOBALS['conn']->insert_id, true];
      }
    }
    if (!$rowId) {
      if (in_array($entity, CMS_SLUGGED, true)) {
        $slug = slug_clean((string)(($b['slug'] ?? '') !== '' ? $b['slug'] : ($clean['title'] ?? '')));
        if ($slug === '') tx_fail('Give a title or a slug first', 400, ['errors' => ['slug' => 'Required']]);
        if (cms_slug_taken($entity, $slug)) tx_fail('That web address is already used', 409, ['errors' => ['slug' => 'Already used'], 'code' => 'slug_taken']);
      } else {
        $slug = $entity . '-' . bin2hex(random_bytes(5));
      }
      $sort = (int)($b['sort'] ?? ((int)(db_row('SELECT COALESCE(MAX(sort), 0) AS m FROM cms_items WHERE entity = ?', 's', $entity)['m']) + 10));
      db_exec("INSERT INTO cms_items (entity, slug, status, sort, draft, draft_updated_at, draft_updated_by, created_by)
               VALUES (?, ?, 'draft', ?, ?, ?, ?, ?)", 'ssissii', $entity, $slug, $sort, $draftJson, $now, $uid, $uid);
      return [(int)$GLOBALS['conn']->insert_id, true];
    }
    $r = cms_find($entity, $rowId, true);
    if (!$r) tx_fail('Not found', 404);
    if (in_array($entity, CMS_SLUGGED, true) && isset($b['slug']) && $b['slug'] !== '') {
      $slug = slug_clean((string)$b['slug']);
      if ($slug === '') tx_fail('Not a valid web address', 400, ['errors' => ['slug' => 'Not valid']]);
      if ($slug !== $r['slug']) {
        if ($r['published_at'] !== null) tx_fail('The web address cannot change once published', 409, ['errors' => ['slug' => 'Locked'], 'code' => 'slug_locked']);
        if (cms_slug_taken($entity, $slug, $rowId)) tx_fail('That web address is already used', 409, ['errors' => ['slug' => 'Already used'], 'code' => 'slug_taken']);
        db_exec('UPDATE cms_items SET slug = ? WHERE id = ?', 'si', $slug, $rowId);
      }
    }
    if (isset($b['sort'])) db_exec('UPDATE cms_items SET sort = ? WHERE id = ?', 'ii', $s = (int)$b['sort'], $rowId);
    db_exec('UPDATE cms_items SET draft = ?, draft_updated_at = ?, draft_updated_by = ? WHERE id = ?', 'ssii', $draftJson, $now, $uid, $rowId);
    return [$rowId, false];
  });
  [$rowId, $created] = $saved;
  audit($uid, $created ? 'website_create' : 'website_save_draft', 'cms_items', $rowId, ['entity' => $entity]);
  json(['ok' => true, 'item' => cms_staff_view(cms_find($entity, $rowId))], $created ? 201 : 200);
}

if ($action === 'preview' && method() === 'GET') {
  $entity = cms_entity_param();
  $r = cms_find($entity, $id);
  if (!$r) fail('Not found', 404);
  $data = $r['draft'] ?? $r['live'] ?? [];
  $media = media_rows(cms_media_refs($data));
  json(['entity' => $entity, 'status' => $r['status'], 'has_draft' => $r['draft'] !== null,
    'preview' => cms_public($entity, $r, $data, $media, media_base_url()),
    'problems' => (object)cms_publish_problems($entity, $data, $media)]);
}

if (in_array($action, ['publish', 'unpublish', 'rollback', 'discard_draft', 'delete'], true) && method() === 'POST') {
  $entity = cms_entity_param();
  if ($entity === 'policy' && $action !== 'discard_draft' && !$isOwner) fail('Only the owner can publish, unpublish or roll back a policy', 403);
  $b = body();
  $result = db_tx(function () use ($entity, $id, $action, $b) {
    $r = cms_find($entity, $id, true);
    if (!$r) tx_fail('Not found', 404);
    if ($action === 'publish') {
      $data = $r['draft'] ?? $r['live'];
      if ($data !== null) {
        $problems = cms_publish_problems($entity, $data, media_rows(cms_media_refs($data)));
        if ($problems) tx_fail('Not ready to publish', 422, ['problems' => $problems]);
        if ($entity === 'project' && empty($b['confirm_leak'])) {
          $leaks = cms_private_leak_check(cms_public_text($entity, $data));
          if ($leaks) tx_fail('The text looks like it contains private details; check it, then publish with confirm_leak', 409, ['warnings' => $leaks]);
        }
      }
    }
    $now = gmdate('Y-m-d H:i:s');
    [$new, $err] = cms_transition($r, $action, $now);
    if ($err) tx_fail(CMS_ERRORS[$err] ?? $err, 409, ['code' => $err]);
    if ($action === 'delete') { db_exec('DELETE FROM cms_items WHERE id = ?', 'i', $id); return null; }
    if ($new['live'] !== $r['live']) $new['live_updated_at'] = $now;
    cms_write($new);
    return $new;
  });
  if ($action !== 'discard_draft') site_rev_bump();
  audit($uid, 'website_' . $action, 'cms_items', $id, ['entity' => $entity, 'version' => $result['version'] ?? null]);
  json($result === null ? ['ok' => true] : ['ok' => true, 'item' => cms_staff_view(cms_find($entity, $id))]);
}

if ($action === 'reorder' && method() === 'POST') {
  $entity = cms_entity_param();
  $ids = array_values(array_filter(array_map('intval', (array)(body()['ids'] ?? []))));
  if (!$ids) fail('Send ids in the new order');
  db_tx(function () use ($entity, $ids) {
    foreach ($ids as $i => $rid) db_exec('UPDATE cms_items SET sort = ? WHERE id = ? AND entity = ?', 'iis', $s = ($i + 1) * 10, $rid, $entity);
  });
  site_rev_bump();
  audit($uid, 'website_reorder', 'cms_items', null, ['entity' => $entity, 'ids' => $ids]);
  json(['ok' => true]);
}

fail('Unknown action', 404);
