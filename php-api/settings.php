<?php
/**
 * HeritOS — Platform settings. Key/value store for store config and the
 * channels the brand sells through (Online Store & Channels).
 *
 *   GET  /settings.php                      → { store_name, currency, free_ship_threshold, channels:{} }
 *   POST /settings.php  { ...keys }         → upsert any of the known keys
 *
 * Admins / managers only.
 */
require __DIR__ . '/_lib.php';
cors();

$STAFF = ['super_admin', 'admin', 'manager'];
$KEYS = ['store_name', 'currency', 'free_ship_threshold', 'channels', 'vat_rate'];

$user = require_auth($STAFF);

if (method() === 'GET') {
  $out = [];
  $res = $conn->query("SELECT skey, svalue FROM settings");
  while ($res && $row = $res->fetch_assoc()) {
    $v = $row['svalue'];
    // channels is JSON — decode it for the client.
    if ($row['skey'] === 'channels') { $d = json_decode($v, true); $v = is_array($d) ? $d : []; }
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
    $val = $b[$k];
    if ($k === 'channels' && is_array($val)) $val = json_encode($val);
    else $val = (string)$val;
    $stmt->bind_param('ssi', $k, $val, $user['id']);
    $stmt->execute();
    $saved[] = $k;
  }
  audit($user['id'], 'settings_update', 'settings', null, ['keys' => $saved]);
  json(['ok' => true, 'saved' => $saved]);
}

fail('Method not allowed', 405);
