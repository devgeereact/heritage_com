<?php
/**
 * HeritOS — Weather & Ops. Lagos weather drives the day: rain empties the
 * market floor and threatens deliveries; hot/dry days shift what to push.
 *
 * Pulls a 5-day forecast for Lagos from Open-Meteo (free, no API key), maps
 * WMO weather codes to plain labels, and turns the conditions into brand-
 * specific operational nudges.
 *
 *   GET /weather.php  → { current, daily:[5], ops:[...], fetched_at }
 *
 * Staff-only. No new schema; no secret required.
 */
require __DIR__ . '/_lib.php';
cors();

$STAFF = ['super_admin', 'admin', 'manager', 'seller', 'employee'];
require_auth($STAFF);

// Ajuwon Market / Lagos.
$LAT = 6.5244; $LON = 3.3792;

$url = 'https://api.open-meteo.com/v1/forecast'
  . '?latitude=' . $LAT . '&longitude=' . $LON
  . '&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m'
  . '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'
  . '&timezone=Africa%2FLagos&forecast_days=5';

$ch = curl_init($url);
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT => 15,
  CURLOPT_USERAGENT => 'HeritOS/1.0 (+https://heritclothing.com)',
]);
$resp = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
if ($resp === false) fail('The weather service could not be reached.' . (cfg('GK_DEBUG', false) ? ' (' . curl_error($ch) . ')' : ''), 502);
curl_close($ch);
if ($httpCode >= 400) fail('Weather service error', 502);

$d = json_decode($resp, true);
if (!is_array($d) || !isset($d['current'])) fail('Unexpected weather response', 502);

/* WMO weather code → plain label + icon (iconify solar set). */
function wx_meta($code) {
  $code = (int)$code;
  if ($code === 0) return ['Clear sky', 'solar:sun-bold', 'clear'];
  if (in_array($code, [1, 2])) return ['Partly cloudy', 'solar:cloud-sun-bold', 'clear'];
  if ($code === 3) return ['Overcast', 'solar:cloudy-bold', 'cloud'];
  if (in_array($code, [45, 48])) return ['Fog / haze', 'solar:fog-bold', 'haze'];
  if (in_array($code, [51, 53, 55, 56, 57])) return ['Drizzle', 'solar:cloud-drizzle-bold', 'rain'];
  if (in_array($code, [61, 63, 65, 66, 67])) return ['Rain', 'solar:cloud-rain-bold', 'rain'];
  if (in_array($code, [80, 81, 82])) return ['Rain showers', 'solar:cloud-rain-bold', 'rain'];
  if (in_array($code, [95, 96, 99])) return ['Thunderstorm', 'solar:cloud-bolt-bold', 'storm'];
  return ['Mixed', 'solar:cloud-bold', 'cloud'];
}

$c = $d['current'];
[$curLabel, $curIcon, $curKind] = wx_meta($c['weather_code'] ?? 0);
$current = [
  'temp' => round((float)($c['temperature_2m'] ?? 0)),
  'humidity' => (int)($c['relative_humidity_2m'] ?? 0),
  'precip' => (float)($c['precipitation'] ?? 0),
  'wind' => round((float)($c['wind_speed_10m'] ?? 0)),
  'code' => (int)($c['weather_code'] ?? 0),
  'label' => $curLabel, 'icon' => $curIcon, 'kind' => $curKind,
];

$daily = [];
$dy = $d['daily'] ?? [];
$days = $dy['time'] ?? [];
for ($i = 0; $i < count($days); $i++) {
  [$lab, $ico, $kind] = wx_meta($dy['weather_code'][$i] ?? 0);
  $daily[] = [
    'date' => $days[$i],
    'max' => round((float)($dy['temperature_2m_max'][$i] ?? 0)),
    'min' => round((float)($dy['temperature_2m_min'][$i] ?? 0)),
    'precip_prob' => (int)($dy['precipitation_probability_max'][$i] ?? 0),
    'label' => $lab, 'icon' => $ico, 'kind' => $kind,
  ];
}

/* ---- Brand operational nudges ------------------------------------------- */
$ops = [];
$todayProb = $daily[0]['precip_prob'] ?? 0;
$todayMax = $daily[0]['max'] ?? $current['temp'];
$rainSoon = in_array($current['kind'], ['rain', 'storm'], true) || $todayProb >= 60;
$month = (int)date('n');
$harmattan = in_array($month, [11, 12, 1, 2], true);

if ($rainSoon) {
  $ops[] = ['tone' => 'warning', 'icon' => 'solar:cloud-rain-bold',
    'title' => 'Rain likely today',
    'tip' => 'Expect a quieter market floor — lean into the online store and WhatsApp. Use waterproof packaging on deliveries and confirm dispatch riders early.'];
} else {
  $ops[] = ['tone' => 'success', 'icon' => 'solar:shop-bold',
    'title' => 'Good day for the market floor',
    'tip' => 'Dry conditions — expect healthy in-person footfall at Ajuwon. A good window for content shoots too.'];
}

if ($current['kind'] === 'storm') {
  $ops[] = ['tone' => 'danger', 'icon' => 'solar:bolt-bold',
    'title' => 'Storms — protect dispatch',
    'tip' => 'Hold or double-wrap outbound parcels; warn customers of possible delivery delays.'];
}

if ($todayMax >= 32) {
  $ops[] = ['tone' => 'info', 'icon' => 'solar:sun-bold',
    'title' => 'Hot day',
    'tip' => 'Lead with lightweight everyday Ankara & Adire pieces — breathable, wear-now.'];
}

if ($harmattan) {
  $ops[] = ['tone' => 'secondary', 'icon' => 'solar:wind-bold',
    'title' => 'Harmattan season',
    'tip' => 'Push heavier Aso-Oke sets and gifting — the owambe and festive run.'];
}

json([
  'location' => 'Lagos, Nigeria',
  'current' => $current,
  'daily' => $daily,
  'ops' => $ops,
  'fetched_at' => date('c'),
]);
