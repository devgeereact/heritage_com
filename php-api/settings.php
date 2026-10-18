<?php
/**
 * HeritOS — Platform settings. Key/value store for store config and the
 * channels the brand sells through (Online Store & Channels).
 *
 *   GET  /settings.php                      → { store_name, currency, free_ship_threshold, channels:{}, shop_enabled }
 *   POST /settings.php  { ...keys }         → upsert any of the known keys
 *
 * Admins / managers only.
 */
require __DIR__ . '/_lib.php';
require __DIR__ . '/_cms.php';
require __DIR__ . '/_retention.php';
cors();

$STAFF = ['super_admin', 'admin', 'manager'];
// shop_enabled: '1' shows the retail shop (Shop, Bag, Gifting) in public navigation;
// anything else, or unset, hides it. The shop routes keep working by direct URL.
$KEYS = ['store_name', 'currency', 'free_ship_threshold', 'channels', 'vat_rate', 'socials', 'shop_enabled',
  // Phase 2 (owner decisions, 10 October 2026). Business profile for printed
  // documents; quote defaults start empty so a quote shows only what the owner
  // enters; recheck age defaults to 180 days; cash only is verified on entry.
  'business_phone', 'business_email', 'business_address', 'business_hours_text',
  'quote_default_terms', 'quote_validity_days', 'deposit_policy_text',
  'measurement_recheck_days', 'payment_verified_methods',
  // Phase 3 (owner decisions, 10 October 2026). All portal extras start off;
  // sessions last 7 days; the consent wording starts as proposed text.
  // Availability itself is saved through appointments.php (validated there).
  'public_booking_enabled', 'portal_quote_accept_enabled', 'portal_show_measurements', 'customer_session_days',
  'feedback_publish_wording', 'feedback_photo_wording',
  // Phase 4 business profile (PROFILE_KEYS in _cms.php; all empty by default,
  // empty means hidden on the public site). Validated by profile_clean(), the
  // same rules cms.php?action=profile_save uses.
  'business_name', 'business_whatsapp', 'business_address_public', 'business_area_text', 'journal_enabled',
  // K-18 retention periods in days (schema_phase29.sql); empty or 0 keeps forever.
  // Read by the command-line job retention.php; rules in _retention.php.
  ...retention_keys()];
// keys stored as JSON (object/array) rather than a plain string
$JSON_KEYS = ['channels', 'socials', 'payment_verified_methods', 'availability'];

/** Validate a Phase 2 setting; returns the value to store or fails. */
function setting_validate($k, $val) {
  if (in_array($k, retention_keys(), true)) {
    $cat = array_search($k, array_combine(array_keys(RETENTION_CATEGORIES), retention_keys()), true);
    $p = retention_parse_days($cat, is_int($val) ? (string)$val : $val);
    if ($p['error'] !== null) fail(RETENTION_CATEGORIES[$cat]['label'] . ': ' . $p['error']);
    return $p['days'] === null ? '' : (string)$p['days'];
  }
  if (in_array($k, PROFILE_KEYS, true)) {
    [$clean, $errors] = profile_clean([$k => $val]);
    if ($errors) fail(implode('; ', array_map(fn($f, $m) => "$f: $m", array_keys($errors), $errors)));
    return $clean[$k];
  }
  switch ($k) {
    case 'quote_validity_days':
      if ($val === '' || $val === null) return '';
      if (filter_var($val, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 365]]) === false) fail('Quote validity must be 1 to 365 days, or empty');
      return (string)(int)$val;
    case 'measurement_recheck_days':
      if (filter_var($val, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 3650]]) === false) fail('Recheck age must be 1 to 3650 days');
      return (string)(int)$val;
    case 'payment_verified_methods':
      $ok = ['cash', 'transfer', 'pos_card', 'gateway', 'other'];
      if (!is_array($val) || array_diff($val, $ok)) fail('Verified methods must be a list from: ' . implode(', ', $ok));
      return array_values(array_unique($val));
    case 'public_booking_enabled': case 'portal_quote_accept_enabled': case 'portal_show_measurements':
      return !empty($val) && $val !== '0' ? '1' : '0';
    case 'customer_session_days':
      if (filter_var($val, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 90]]) === false) fail('Session length must be 1 to 90 days');
      return (string)(int)$val;
    case 'feedback_publish_wording': case 'feedback_photo_wording':
      if (mb_strlen(trim((string)$val)) > 1000) fail("$k is too long (1000 characters at most)");
      return trim((string)$val);
    case 'business_email':
      if ($val !== '' && $val !== null && !filter_var($val, FILTER_VALIDATE_EMAIL)) fail('Business email looks wrong');
      return (string)$val;
  }
  if (in_array($k, ['business_phone', 'business_address', 'business_hours_text', 'quote_default_terms', 'deposit_policy_text'], true)
      && mb_strlen((string)$val) > 5000) fail("$k is too long");
  return $val;
}

$user = require_auth($STAFF);

if (method() === 'GET') {
  $out = [];
  $res = $conn->query("SELECT skey, svalue FROM settings");
  while ($res && $row = $res->fetch_assoc()) {
    $v = $row['svalue'];
    // JSON keys (channels, socials) — decode for the client.
    if (in_array($row['skey'], $JSON_KEYS, true)) { $d = json_decode($v, true); $v = is_array($d) ? $d : []; }
    $out[$row['skey']] = $v;
  }
  json($out);
}

if (method() === 'POST') {
  $b = body();
  $stmt = $conn->prepare('INSERT INTO settings (skey, svalue, updated_by) VALUES (?,?,?)
                          ON DUPLICATE KEY UPDATE svalue = VALUES(svalue), updated_by = VALUES(updated_by)');
  $saved = [];
  foreach ($KEYS as $k) {
    if (!array_key_exists($k, $b)) continue;
    $val = setting_validate($k, $b[$k]);
    if (in_array($k, $JSON_KEYS, true) && is_array($val)) $val = json_encode($val);
    else $val = (string)$val;
    $stmt->bind_param('ssi', $k, $val, $user['id']);
    $stmt->execute();
    $saved[] = $k;
  }
  if (array_intersect($saved, PROFILE_KEYS)) {
    // The public site caches on this number (site.php ETag).
    $conn->query("INSERT INTO settings (skey, svalue) VALUES ('site_rev', '1')
                  ON DUPLICATE KEY UPDATE svalue = CAST(svalue AS UNSIGNED) + 1");
  }
  audit($user['id'], 'settings_update', 'settings', null, ['keys' => $saved]);
  json(['ok' => true, 'saved' => $saved]);
}

fail('Method not allowed', 405);
