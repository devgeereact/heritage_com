<?php
/**
 * HeritOS: pure domain helpers for Phase 2 (daily records). No database, no
 * network, no globals, so php-api/tests/run.php can load this file directly.
 *
 * Endpoints `require __DIR__ . '/_domain.php';` after _lib.php. Database helpers
 * that build on these live in _jobs.php.
 *
 * Money is handled as integer minor units (kobo) inside PHP and stored as
 * DECIMAL(12,2) in MySQL. Floats are never used for arithmetic on money.
 */

/* ---- Roles ---------------------------------------------------------------- */

/** Owner roles: money, quotes, payments, Today, settings. */
const ROLES_OWNER = ['super_admin', 'admin', 'manager'];
/** Workshop roles: job read, stage changes, measurement entry. */
const ROLES_WORKSHOP = ['super_admin', 'admin', 'manager', 'tailor'];
/** Front-desk roles that may read and update enquiries (as contact.php). */
const ROLES_ENQUIRY = ['super_admin', 'admin', 'manager', 'employee'];
/** Roles that may use the Clients area (the existing CRM roles). */
const ROLES_CLIENTS = ['super_admin', 'admin', 'manager', 'tailor', 'employee'];

function is_owner_role($role) { return in_array($role, ROLES_OWNER, true); }

/* ---- Time: stored in UTC, shown in Africa/Lagos --------------------------- */

const BUSINESS_TZ = 'Africa/Lagos';

/** Today's date in Lagos as Y-m-d. $nowTs lets tests pin the clock. */
function lagos_today($nowTs = null) {
  $d = new DateTime('@' . ($nowTs ?? time()));
  $d->setTimezone(new DateTimeZone(BUSINESS_TZ));
  return $d->format('Y-m-d');
}

/** Add whole days to a Y-m-d date. */
function date_add_days($ymd, $days) {
  $d = DateTime::createFromFormat('!Y-m-d', $ymd, new DateTimeZone('UTC'));
  if (!$d) return null;
  $d->modify(($days >= 0 ? '+' : '') . (int)$days . ' days');
  return $d->format('Y-m-d');
}

/** A valid Y-m-d date, or null. */
function ymd_or_null($v) {
  $v = trim((string)$v);
  if ($v === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $v)) return null;
  [$y, $m, $d] = array_map('intval', explode('-', $v));
  return checkdate($m, $d, $y) ? $v : null;
}

/**
 * A date-time typed by staff, read as Lagos local time unless it carries its own
 * offset ("Z" or "+01:00"), returned as a UTC "Y-m-d H:i:s" string. Null when
 * blank or unreadable.
 */
function lagos_local_to_utc($v) {
  $v = trim((string)$v);
  if ($v === '') return null;
  if (!preg_match('/^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?(Z|[+-]\d{2}:?\d{2})?$/', $v)) return null;
  try {
    $d = new DateTime($v, new DateTimeZone(BUSINESS_TZ));
  } catch (Exception $e) { return null; }
  $d->setTimezone(new DateTimeZone('UTC'));
  return $d->format('Y-m-d H:i:s');
}

/* ---- Money ---------------------------------------------------------------- */

/**
 * Parse a money amount strictly into minor units. Accepts "12,500.50", "12500",
 * 12500 or 12500.5. Rejects negatives, more than two decimals, NaN and junk.
 * Thousands separators must be well placed ("1,2,3" is rejected).
 */
function money_to_minor($v) {
  if (is_int($v)) return $v >= 0 ? $v * 100 : null;
  if (is_float($v)) {
    if (!is_finite($v) || $v < 0) return null;
    $v = rtrim(rtrim(sprintf('%.6F', $v), '0'), '.');
  }
  if (!is_string($v)) return null;
  $s = trim($v);
  $s = preg_replace('/^(₦|NGN)\s*/u', '', $s);
  if ($s === '') return null;
  if (!preg_match('/^(\d{1,3}(,\d{3})+|\d+)(\.(\d{1,2}))?$/', $s, $m)) return null;
  $whole = str_replace(',', '', $m[1]);
  if (strlen(ltrim($whole, '0')) > 13) return null;               // beyond DECIMAL(12,2)-ish range
  $frac = isset($m[4]) ? str_pad($m[4], 2, '0') : '00';
  return (int)$whole * 100 + (int)$frac;
}

/** Signed DECIMAL value from the database ("-5000.00") into minor units. Trusted input. */
function decimal_to_minor($v) {
  $s = trim((string)$v);
  if ($s === '') return 0;
  $neg = $s[0] === '-';
  $s = ltrim($s, '+-');
  [$whole, $frac] = array_pad(explode('.', $s, 2), 2, '');
  $minor = (int)$whole * 100 + (int)str_pad(substr($frac, 0, 2), 2, '0');
  return $neg ? -$minor : $minor;
}

/** Minor units to a plain decimal string for MySQL and JSON: 1250050 → "12500.50". */
function minor_to_decimal($minor) {
  $minor = (int)$minor;
  $sign = $minor < 0 ? '-' : '';
  $abs = abs($minor);
  return $sign . intdiv($abs, 100) . '.' . str_pad((string)($abs % 100), 2, '0', STR_PAD_LEFT);
}

/* ---- Job stages ----------------------------------------------------------- */

const JOB_STAGES = ['quote', 'confirmed', 'measurements_approved', 'in_production', 'fitting',
  'quality_check', 'ready', 'handed_over', 'cancelled'];

const JOB_STAGE_LABELS = [
  'quote' => 'Quote', 'confirmed' => 'Confirmed', 'measurements_approved' => 'Measurements approved',
  'in_production' => 'Cutting and sewing', 'fitting' => 'Fitting or adjustment',
  'quality_check' => 'Quality check', 'ready' => 'Ready', 'handed_over' => 'Collected or delivered',
  'cancelled' => 'Cancelled',
];

/** Wording a customer may see (Phase 3 portal). */
const JOB_PUBLIC_STAGE_LABELS = [
  'quote' => 'Quote being prepared', 'confirmed' => 'Order confirmed',
  'measurements_approved' => 'Measurements confirmed', 'in_production' => 'Being made',
  'fitting' => 'Fitting', 'quality_check' => 'Final checks', 'ready' => 'Ready',
  'handed_over' => 'Collected or delivered', 'cancelled' => 'Cancelled',
];

const JOB_TRANSITIONS = [
  'quote' => ['confirmed', 'cancelled'],
  'confirmed' => ['measurements_approved', 'cancelled'],
  'measurements_approved' => ['in_production', 'cancelled'],
  'in_production' => ['fitting', 'quality_check', 'cancelled'],
  'fitting' => ['in_production', 'quality_check', 'cancelled'],
  'quality_check' => ['ready', 'in_production'],
  'ready' => ['fitting', 'handed_over'],
  'handed_over' => [],
  'cancelled' => [],
];

/** Stages from which a job counts as in production or later (re-snapshot needs a reason). */
const JOB_STAGES_PRODUCTION_ON = ['in_production', 'fitting', 'quality_check', 'ready', 'handed_over'];

/** Old workshop stages (tailoring_orders.stage) still sent by cached clients. */
const LEGACY_STAGES = ['measure', 'cut', 'sew', 'finish', 'fitting', 'done', 'cancelled'];

/**
 * Legacy stage to [new stage, review flag]. 'done' becomes 'ready' with the
 * review flag set, because the old data does not say whether it was collected
 * (owner decision, 10 October 2026). Unknown values return [null, 0].
 */
function job_stage_from_legacy($s) {
  switch ((string)$s) {
    case 'measure': return ['confirmed', 0];
    case 'cut': case 'sew': case 'finish': return ['in_production', 0];
    case 'fitting': return ['fitting', 0];
    case 'done': return ['ready', 1];
    case 'cancelled': return ['cancelled', 0];
  }
  return [null, 0];
}

/** New stage to the legacy value written alongside it for one release. */
function job_stage_to_legacy($s) {
  switch ((string)$s) {
    case 'quote': case 'confirmed': case 'measurements_approved': return 'measure';
    case 'in_production': return 'sew';
    case 'fitting': return 'fitting';
    case 'quality_check': return 'finish';
    case 'ready': case 'handed_over': return 'done';
    case 'cancelled': return 'cancelled';
  }
  return null;
}

function job_transition_ok($from, $to) {
  return isset(JOB_TRANSITIONS[$from]) && in_array($to, JOB_TRANSITIONS[$from], true);
}

/** Job stage after a handover: handed_over once every piece is out, else unchanged. */
function handover_stage_after($currentStage, $quantity, $handedOverQty) {
  $quantity = max(1, (int)$quantity);
  return (int)$handedOverQty >= $quantity ? 'handed_over' : $currentStage;
}

/* ---- Payment state and ledger totals -------------------------------------- */

const PAYMENT_STATES = ['unpriced', 'unpaid', 'part_paid', 'paid', 'credit', 'refunded'];
const PAYMENT_METHODS = ['cash', 'transfer', 'pos_card', 'gateway', 'other'];

/**
 * Payment state from the agreed price, the net verified amount kept (payments
 * less refunds) and the verified refunds. All in minor units.
 *   refunded: money came in and has all gone back out
 *   unpriced: no price agreed yet (credit and balance need a price)
 *   credit:   more kept than the price (overpaid, never capped: BR-24)
 */
function payment_state($priceMinor, $paidMinor, $refundedMinor) {
  $price = (int)$priceMinor; $paid = (int)$paidMinor; $refunded = (int)$refundedMinor;
  if ($refunded > 0 && $paid <= 0) return 'refunded';
  if ($price <= 0) return 'unpriced';
  if ($paid <= 0) return 'unpaid';
  if ($paid < $price) return 'part_paid';
  if ($paid === $price) return 'paid';
  return 'credit';
}

/**
 * Totals over a job's ledger rows. Each entry: ['id', 'kind', 'amount' (signed
 * decimal string or minor int via 'amount_minor'), 'verified', 'reverses_id'].
 * A reversal and the entry it reverses are both left out, so they net to zero.
 * Unverified entries are reported apart and never count towards paid.
 * Returns minor units: received, refunded, net_verified, unverified, balance, credit.
 */
function ledger_totals(array $entries, $priceMinor = 0) {
  $reversed = [];
  foreach ($entries as $e) {
    if (($e['kind'] ?? '') === 'reversal' && !empty($e['reverses_id'])) $reversed[(string)$e['reverses_id']] = true;
  }
  $received = 0; $refunded = 0; $unverified = 0;
  foreach ($entries as $e) {
    $kind = $e['kind'] ?? '';
    if ($kind === 'reversal') continue;
    if (isset($reversed[(string)($e['id'] ?? '')])) continue;
    $amt = array_key_exists('amount_minor', $e) ? (int)$e['amount_minor'] : decimal_to_minor($e['amount'] ?? 0);
    if (empty($e['verified'])) { $unverified += $amt; continue; }
    if ($amt < 0) $refunded += -$amt; else $received += $amt;
  }
  $net = $received - $refunded;
  $price = (int)$priceMinor;
  return [
    'received' => $received, 'refunded' => $refunded, 'net_verified' => $net, 'unverified' => $unverified,
    'balance' => $price > 0 ? max(0, $price - $net) : 0,
    'credit' => $price > 0 ? max(0, $net - $price) : 0,
  ];
}

/** Is a payment by this method verified the moment it is recorded? Setting-driven (default cash only). */
function payment_verified_on_entry($method, array $verifiedMethods) {
  return in_array($method, $verifiedMethods, true);
}

/* ---- Enquiry pipeline ----------------------------------------------------- */

const ENQUIRY_STATUSES = ['new', 'awaiting_reply', 'quote_sent', 'accepted', 'closed'];

const ENQUIRY_TRANSITIONS = [
  'new' => ['awaiting_reply', 'quote_sent', 'accepted', 'closed'],
  'awaiting_reply' => ['new', 'quote_sent', 'accepted', 'closed'],
  'quote_sent' => ['awaiting_reply', 'accepted', 'closed'],
  'accepted' => ['closed'],
  'closed' => ['new', 'awaiting_reply'],
];

/** 'contacted' is the legacy alias of 'awaiting_reply'. Unknown values give null. */
function enquiry_status_from_legacy($s) {
  if ($s === 'contacted') return 'awaiting_reply';
  return in_array($s, ENQUIRY_STATUSES, true) ? $s : null;
}

/**
 * How many items of a capped Today block are not in its list (K-07): the full
 * count minus the items shown, never negative. The page uses it to say
 * "and N more" and link to the full list.
 */
function today_more($count, $shown) {
  return max(0, (int)$count - (int)$shown);
}

function enquiry_transition_ok($from, $to) {
  $from = enquiry_status_from_legacy($from);
  return $from !== null && isset(ENQUIRY_TRANSITIONS[$from]) && in_array($to, ENQUIRY_TRANSITIONS[$from], true);
}

/* ---- Measurements --------------------------------------------------------- */

const MEASUREMENT_UNITS = ['cm', 'in'];
const MEASUREMENT_SET_STATUSES = ['pending', 'approved', 'superseded', 'rejected', 'imported_unverified'];

/**
 * Soft plausibility ranges in cm (adult menswear). Outside them we warn and keep
 * the value; nothing is blocked by a universal body limit (BR-08).
 */
const MEASURE_RANGES_CM = [
  'neck' => [25, 60], 'chest' => [60, 180], 'waist' => [50, 180], 'seat' => [60, 180], 'hip' => [60, 180],
  'shoulder' => [30, 65], 'shoulder_width' => [30, 65], 'sleeve_length' => [40, 80], 'sleeve' => [40, 80],
  'cuff' => [15, 40], 'shirt_length' => [55, 110], 'thigh' => [35, 100], 'knee' => [30, 70],
  'bottom' => [25, 60], 'outside_leg' => [80, 130], 'inside_leg' => [55, 100], 'back_length' => [55, 100],
  'front_length' => [55, 100], 'top_length' => [55, 130], 'full_length' => [100, 170], 'length' => [50, 170],
  'trouser_length' => [80, 130], 'ankle' => [18, 40],
];

/**
 * Clean measurement values against a template's field list.
 *   $fields: [['key' => 'neck', ...], ...] or plain keys.
 * Keeps template keys only, drops blanks (missing never becomes 0), rejects
 * non-numbers and values of 0 or less, and warns on implausible values.
 * Returns ['clean' => [key => float], 'errors' => [key => msg], 'warnings' => [key => msg]].
 */
function measurement_clean(array $fields, array $values, $unit) {
  $keys = [];
  foreach ($fields as $f) $keys[] = is_array($f) ? (string)($f['key'] ?? '') : (string)$f;
  $clean = []; $errors = []; $warnings = [];
  foreach ($keys as $k) {
    if ($k === '' || !array_key_exists($k, $values)) continue;
    $raw = $values[$k];
    if ($raw === null) continue;
    $s = trim((string)$raw);
    if ($s === '') continue;
    if (!preg_match('/^\d+(\.\d+)?$/', $s) && !preg_match('/^\.\d+$/', $s)) { $errors[$k] = 'Not a number'; continue; }
    $n = (float)$s;
    if ($n <= 0) { $errors[$k] = 'Must be more than 0'; continue; }
    $clean[$k] = $n;
    if (isset(MEASURE_RANGES_CM[$k]) && in_array($unit, MEASUREMENT_UNITS, true)) {
      [$lo, $hi] = MEASURE_RANGES_CM[$k];
      $cm = $unit === 'in' ? $n * 2.54 : $n;
      if ($cm < $lo || $cm > $hi) {
        $warnings[$k] = $unit === 'in'
          ? sprintf('Unusual: expected about %s to %s in', round($lo / 2.54, 1), round($hi / 2.54, 1))
          : sprintf('Unusual: expected about %d to %d cm', $lo, $hi);
      }
    }
  }
  return ['clean' => $clean, 'errors' => $errors, 'warnings' => $warnings];
}

/** Explicit unit conversion for display. Rounds to 0.1 cm or 0.125 in. */
function measurement_convert(array $vals, $from, $to) {
  if ($from === $to) return $vals;
  if (!in_array($from, MEASUREMENT_UNITS, true) || !in_array($to, MEASUREMENT_UNITS, true)) return [];
  $out = [];
  foreach ($vals as $k => $v) {
    if (!is_numeric($v)) continue;
    if ($to === 'cm') $out[$k] = round(((float)$v) * 2.54, 1);
    else $out[$k] = round(((float)$v) / 2.54 * 8) / 8;
  }
  return $out;
}

/** A template field list is well formed: [{key, label, guide?, hidden?}], keys unique snake_case. */
function template_fields_ok($fields) {
  if (!is_array($fields) || !$fields) return false;
  $seen = [];
  foreach ($fields as $f) {
    if (!is_array($f)) return false;
    $k = (string)($f['key'] ?? '');
    if (!preg_match('/^[a-z][a-z0-9_]{0,39}$/', $k) || isset($seen[$k])) return false;
    if (trim((string)($f['label'] ?? '')) === '') return false;
    $seen[$k] = true;
  }
  return true;
}

/* ---- Quotes --------------------------------------------------------------- */

/**
 * Line totals and quote totals, all in minor units. Items: ['description',
 * 'garment_type'?, 'qty', 'unit_price_minor']. qty may hold 2 decimals.
 * Returns ['items' => items with line_total_minor, 'subtotal', 'total'].
 * The total never goes below 0.
 */
function quote_totals(array $items, $deliveryMinor, $discountMinor) {
  $sub = 0; $out = [];
  foreach ($items as $it) {
    $qtyHundredths = (int)round(((float)($it['qty'] ?? 1)) * 100);
    $line = intdiv($qtyHundredths * (int)$it['unit_price_minor'] + 50, 100);
    $it['line_total_minor'] = $line;
    $sub += $line;
    $out[] = $it;
  }
  $total = max(0, $sub + (int)$deliveryMinor - (int)$discountMinor);
  return ['items' => $out, 'subtotal' => $sub, 'total' => $total];
}

/** Recursively sort associative keys so the JSON is canonical. Lists keep their order. */
function canonical_sort($v) {
  if (!is_array($v)) return $v;
  $isList = array_keys($v) === range(0, count($v) - 1);
  foreach ($v as $k => $x) $v[$k] = canonical_sort($x);
  if (!$isList) ksort($v);
  return $v;
}

/** sha256 of the canonical JSON of the quote terms and items. */
function quote_content_hash(array $quote, array $items) {
  $json = json_encode(canonical_sort(['quote' => $quote, 'items' => $items]),
    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);
  return hash('sha256', (string)$json);
}

/** Display number for a quote: Q-{series}-v{version}. */
function quote_number($seriesId, $version) {
  return 'Q-' . (int)$seriesId . '-v' . (int)$version;
}

/* ---- Clients, keys and phones --------------------------------------------- */

function client_ref_from_id($id) {
  return 'CL-' . str_pad((string)(int)$id, 5, '0', STR_PAD_LEFT);
}

/** Request (idempotency) key: 16 to 64 characters of [A-Za-z0-9_-]. */
function request_key_ok($k) {
  return is_string($k) && (bool)preg_match('/^[A-Za-z0-9_-]{16,64}$/', $k);
}

/** Last nine digits of a phone, or '' when it has fewer than seven digits. */
function phone_tail9($p) {
  $d = preg_replace('/\D/', '', (string)$p);
  return strlen($d) >= 7 ? substr($d, -9) : '';
}

/** A phone with all but the last three digits hidden: "•••••••0042". */
function phone_masked($p) {
  $d = preg_replace('/\D/', '', (string)$p);
  if ($d === '') return '';
  return str_repeat('•', max(0, strlen($d) - 3)) . substr($d, -3);
}

/** Does a given phone or email match a record? Email case-insensitive, phone by last 9 digits. */
function contact_matches($given, $email, $phone) {
  $g = trim((string)$given);
  if ($g === '') return false;
  if (strpos($g, '@') !== false) return $email !== null && strcasecmp($g, trim((string)$email)) === 0;
  $t = phone_tail9($g);
  return $t !== '' && $t === phone_tail9($phone);
}

/* ==== Phase 3: appointments, customer access, portal ======================= */

/* ---- Time helpers --------------------------------------------------------- */

/** Unix time of 00:00 in Lagos on a Y-m-d date, or null. */
function lagos_midnight_ts($ymd) {
  if (ymd_or_null($ymd) === null) return null;
  $d = DateTime::createFromFormat('!Y-m-d', $ymd, new DateTimeZone(BUSINESS_TZ));
  return $d ? $d->getTimestamp() : null;
}

/** A UTC "Y-m-d H:i:s" (or Unix time) as ISO 8601 in Lagos: 2026-10-12T10:00:00+01:00. Null stays null. */
function lagos_iso($v) {
  if ($v === null || $v === '') return null;
  // Unix time (int or digit string, e.g. from UNIX_TIMESTAMP()) or a UTC "Y-m-d H:i:s".
  $ts = (is_int($v) || ctype_digit((string)$v)) ? (int)$v : strtotime($v . ' UTC');
  if ($ts === false) return null;
  $d = new DateTime('@' . $ts);
  $d->setTimezone(new DateTimeZone(BUSINESS_TZ));
  return $d->format('Y-m-d\TH:i:sP');
}

/** Unix time to a UTC "Y-m-d H:i:s" for MySQL. */
function utc_sql($ts) { return gmdate('Y-m-d H:i:s', (int)$ts); }

/** Lagos Y-m-d of a Unix time. */
function lagos_date_of($ts) { return lagos_today((int)$ts); }

/* ---- Appointments --------------------------------------------------------- */

const APPOINTMENT_TYPES = ['consultation', 'fitting', 'collection'];
const APPOINTMENT_STATUSES = ['requested', 'confirmed', 'completed', 'cancelled', 'no_show', 'expired'];
/** Durations the owner may choose from (owner decision, 10 October 2026: 30, 45 or 60 minutes offered). */
const APPOINTMENT_DURATIONS = [30, 45, 60];
/** Slot grid in minutes; 15 when not set (a grid detail, not a business fact). */
const APPOINTMENT_STEPS = [15, 30, 60];
const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const APPOINTMENT_TRANSITIONS = [
  'requested' => ['confirmed', 'cancelled', 'expired'],
  'confirmed' => ['completed', 'cancelled', 'no_show'],
  'completed' => [], 'cancelled' => [], 'no_show' => [], 'expired' => [],
];

function appointment_transition_ok($from, $to) {
  return isset(APPOINTMENT_TRANSITIONS[$from]) && in_array($to, APPOINTMENT_TRANSITIONS[$from], true);
}

/** "HH:MM" to minutes after midnight, or null. */
function hhmm_minutes($s) {
  if (!is_string($s) || !preg_match('/^([01]\d|2[0-3]):([0-5]\d)$/', $s, $m)) {
    return $s === '24:00' ? 1440 : null;
  }
  return (int)$m[1] * 60 + (int)$m[2];
}

/**
 * Validate availability settings from the owner. Every field may be left empty;
 * empty means "not set", never a guessed default (owner decision, 10 October 2026).
 * Shape: {weekly:{mon:[["09:00","13:00"],["14:00","18:00"]], ...}, buffer_min, min_notice_hours,
 *         horizon_days, step_min, durations:{consultation, fitting, collection}, request_hold_hours}
 * Breaks are the gaps between a day's windows. Returns ['clean' => array, 'errors' => [field => msg]].
 */
function availability_clean($in) {
  $in = is_array($in) ? $in : [];
  $errors = []; $out = ['weekly' => [], 'durations' => []];
  $weekly = is_array($in['weekly'] ?? null) ? $in['weekly'] : [];
  foreach (WEEKDAYS as $day) {
    $wins = $weekly[$day] ?? [];
    if (!is_array($wins)) { $errors["weekly.$day"] = 'Must be a list of [start, end] times'; continue; }
    $clean = [];
    foreach ($wins as $w) {
      $s = is_array($w) ? hhmm_minutes($w[0] ?? null) : null;
      $e = is_array($w) ? hhmm_minutes($w[1] ?? null) : null;
      if ($s === null || $e === null || $e <= $s) { $errors["weekly.$day"] = 'Each window needs a start before its end (HH:MM)'; continue 2; }
      $clean[] = [$s, $e];
    }
    usort($clean, fn($a, $b) => $a[0] <=> $b[0]);
    for ($i = 1; $i < count($clean); $i++) {
      if ($clean[$i][0] < $clean[$i - 1][1]) { $errors["weekly.$day"] = 'Windows on one day must not overlap'; continue 2; }
    }
    $out['weekly'][$day] = array_map(fn($p) => [sprintf('%02d:%02d', intdiv($p[0], 60), $p[0] % 60),
                                                 $p[1] === 1440 ? '24:00' : sprintf('%02d:%02d', intdiv($p[1], 60), $p[1] % 60)], $clean);
  }
  $ints = ['buffer_min' => [0, 240], 'min_notice_hours' => [0, 720], 'horizon_days' => [1, 365], 'request_hold_hours' => [1, 336]];
  foreach ($ints as $k => [$lo, $hi]) {
    $v = $in[$k] ?? null;
    if ($v === null || $v === '') { $out[$k] = null; continue; }
    $n = filter_var($v, FILTER_VALIDATE_INT, ['options' => ['min_range' => $lo, 'max_range' => $hi]]);
    if ($n === false) { $errors[$k] = "Must be a whole number from $lo to $hi, or empty"; continue; }
    $out[$k] = $n;
  }
  $step = $in['step_min'] ?? null;
  if ($step === null || $step === '') $out['step_min'] = null;
  elseif (!in_array(filter_var($step, FILTER_VALIDATE_INT), APPOINTMENT_STEPS, true)) $errors['step_min'] = 'Must be 15, 30 or 60, or empty';
  else $out['step_min'] = (int)$step;
  $durs = is_array($in['durations'] ?? null) ? $in['durations'] : [];
  foreach (APPOINTMENT_TYPES as $t) {
    $v = $durs[$t] ?? null;
    if ($v === null || $v === '') continue;
    if (!in_array(filter_var($v, FILTER_VALIDATE_INT), APPOINTMENT_DURATIONS, true)) { $errors["durations.$t"] = 'Must be 30, 45 or 60 minutes, or empty'; continue; }
    $out['durations'][$t] = (int)$v;
  }
  return ['clean' => $out, 'errors' => $errors];
}

/**
 * Can clients request this appointment type? Needs at least one working window,
 * a duration for the type, a horizon, a minimum notice, a buffer and a hold time.
 */
function availability_ready(array $a, $type) {
  $hasWindow = false;
  foreach ((array)($a['weekly'] ?? []) as $wins) if (!empty($wins)) { $hasWindow = true; break; }
  return $hasWindow && !empty($a['durations'][$type]) && !empty($a['horizon_days'])
    && isset($a['min_notice_hours']) && $a['min_notice_hours'] !== null
    && isset($a['buffer_min']) && $a['buffer_min'] !== null && !empty($a['request_hold_hours']);
}

/** Working windows on a Lagos date as UTC Unix [start, end] pairs. A day with no windows is closed. */
function slot_windows(array $weekly, $dateLagos) {
  $mid = lagos_midnight_ts($dateLagos);
  if ($mid === null) return [];
  $day = strtolower((new DateTime('@' . $mid))->setTimezone(new DateTimeZone(BUSINESS_TZ))->format('D'));
  $out = [];
  foreach ((array)($weekly[$day] ?? []) as $w) {
    $s = hhmm_minutes($w[0] ?? null); $e = hhmm_minutes($w[1] ?? null);
    if ($s === null || $e === null || $e <= $s) continue;
    $out[] = [$mid + $s * 60, $mid + $e * 60];
  }
  return $out;
}

/** Do [aS, aE) and [bS, bE) overlap once each side keeps $bufferSec clear? Touching with no buffer is not an overlap. */
function intervals_overlap($aS, $aE, $bS, $bE, $bufferSec = 0) {
  $buf = max(0, (int)$bufferSec);
  return $aS < $bE + $buf && $bS < $aE + $buf;
}

/**
 * Free start times inside the windows. $busy are reservations (kept $bufSec
 * apart), $blocks are closed times (no buffer). A slot must start on the step
 * grid from its window start, end inside the window, start at or after
 * $earliestTs (minimum notice) and no later than $latestTs (horizon).
 * Returns [[start, end], ...] in Unix time.
 */
function free_slots(array $windows, array $busy, array $blocks, $durSec, $bufSec, $stepSec, $earliestTs, $latestTs) {
  $durSec = (int)$durSec; $stepSec = max(60, (int)$stepSec);
  $out = [];
  if ($durSec <= 0) return [];
  foreach ($windows as [$ws, $we]) {
    for ($s = $ws; $s + $durSec <= $we; $s += $stepSec) {
      if ($s < $earliestTs || $s > $latestTs) continue;
      $e = $s + $durSec;
      foreach ($busy as [$bs, $be]) if (intervals_overlap($s, $e, $bs, $be, $bufSec)) continue 2;
      foreach ($blocks as [$bs, $be]) if (intervals_overlap($s, $e, $bs, $be, 0)) continue 2;
      $out[] = [$s, $e];
    }
  }
  return $out;
}

/**
 * Why a requested start can or cannot be booked, with the same rules as
 * free_slots. Returns 'ok', 'not_configured', 'outside_hours' (not inside a
 * window or off the grid), 'too_soon', 'too_far', 'blocked' or 'conflict'.
 * $a is clean availability; $nowTs pins the clock for tests.
 */
function slot_check($startTs, $type, array $a, array $busy, array $blocks, $nowTs) {
  if (!availability_ready($a, $type)) return 'not_configured';
  $dur = (int)$a['durations'][$type] * 60;
  $step = (int)($a['step_min'] ?? 15) * 60;
  $buf = (int)$a['buffer_min'] * 60;
  $end = $startTs + $dur;
  $inWindow = false;
  foreach (slot_windows($a['weekly'], lagos_date_of($startTs)) as [$ws, $we]) {
    if ($startTs >= $ws && $end <= $we && (($startTs - $ws) % $step) === 0) { $inWindow = true; break; }
  }
  if (!$inWindow) return 'outside_hours';
  if ($startTs < $nowTs + (int)$a['min_notice_hours'] * 3600) return 'too_soon';
  if ($startTs > $nowTs + (int)$a['horizon_days'] * 86400) return 'too_far';
  foreach ($blocks as [$bs, $be]) if (intervals_overlap($startTs, $end, $bs, $be, 0)) return 'blocked';
  foreach ($busy as [$bs, $be]) if (intervals_overlap($startTs, $end, $bs, $be, $buf)) return 'conflict';
  return 'ok';
}

/* ---- Customer access ------------------------------------------------------ */

/** A new six-digit code, zero-padded. */
function access_code_new() { return str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT); }

/** HMAC of an access code with the server secret; only this is stored. */
function access_code_hash($code, $secret) { return hash_hmac('sha256', (string)$code, (string)$secret); }

/** Is a typed code the right one? Constant-time; non-digits never match. */
function access_code_ok($given, $storedHash, $secret) {
  $g = preg_replace('/\s+/', '', (string)$given);
  if (!preg_match('/^\d{6}$/', $g) || !is_string($storedHash) || $storedHash === '') return false;
  return hash_equals($storedHash, access_code_hash($g, $secret));
}

/** sha256 of a bearer token, challenge or invite; the raw value is never stored. */
function token_hash($t) { return hash('sha256', (string)$t); }

const ACCESS_CODE_MAX_ATTEMPTS = 5;

/**
 * Can this challenge still be verified? Pure. $row: customer_id, channel, status,
 * expires_at (UTC "Y-m-d H:i:s"), used_at, attempts. Returns 'ok', 'decoy',
 * 'used', 'expired', 'locked' or 'pending_owner'. The caller answers every
 * failure with the same generic message.
 */
function challenge_state(array $row, $nowTs, $maxAttempts = ACCESS_CODE_MAX_ATTEMPTS) {
  if (empty($row['customer_id'])) return 'decoy';
  if (!empty($row['used_at']) || ($row['status'] ?? '') === 'used') return 'used';
  if (($row['status'] ?? '') === 'locked' || (int)($row['attempts'] ?? 0) >= $maxAttempts) return 'locked';
  if (($row['status'] ?? '') === 'awaiting_owner') return 'pending_owner';
  if (($row['status'] ?? '') !== 'pending') return 'expired';
  $exp = strtotime(($row['expires_at'] ?? '') . ' UTC');
  if ($exp === false || $exp <= $nowTs) return 'expired';
  return 'ok';
}

/* ---- Portal projection (whitelist; nothing private leaves the admin side) -- */

/** Keys a customer may see on a job. Anything else is dropped. Tested exactly. */
const JOB_PUBLIC_KEYS = ['ref', 'description', 'garment_type', 'quantity', 'stage', 'stage_label', 'promised_date',
  'event_date', 'quantity_handed_over', 'appointments', 'quote', 'payment', 'handovers', 'timeline'];

/**
 * The customer's view of a job. Inputs are raw rows; output is built from an
 * explicit allowlist, so notes, notes_internal, costs, the assigned tailor, the
 * HC code, unverified payments, internal messages, owner notes and lock_version
 * can never appear, whatever the rows hold.
 *   $job: tailoring_orders row (+ job_stage); $quote: quote row with 'items' or null;
 *   $ledger: job_payments rows; $handovers: job_handovers rows; $appts: appointments rows;
 *   $events: tailoring_events rows (only public=1 are used, and only their stage and date).
 */
function job_public_view(array $job, $quote, array $ledger, array $handovers, array $appts, array $events) {
  $stage = $job['job_stage'] ?? null;
  $priceMinor = decimal_to_minor($job['price'] ?? 0);
  $t = ledger_totals($ledger, $priceMinor);
  $reversed = [];
  foreach ($ledger as $e) if (($e['kind'] ?? '') === 'reversal' && !empty($e['reverses_id'])) $reversed[(string)$e['reverses_id']] = true;
  $receipts = [];
  foreach ($ledger as $e) {
    $kind = $e['kind'] ?? '';
    if ($kind === 'reversal' || empty($e['verified']) || isset($reversed[(string)($e['id'] ?? '')])) continue;
    $receipts[] = ['receipt_no' => 'RCT-' . (int)$e['id'], 'kind' => $kind === 'refund' ? 'refund' : 'payment',
                   'amount' => minor_to_decimal(abs(decimal_to_minor($e['amount'] ?? 0))),
                   'method' => (string)($e['method'] ?? ''), 'received_on' => $e['received_on'] ?? null];
  }
  $q = null;
  if (is_array($quote)) {
    $q = [
      'id' => (int)$quote['id'], 'number' => quote_number($quote['series_id'] ?? 0, $quote['version'] ?? 1),
      'status' => $quote['status'], 'currency' => $quote['currency'] ?? 'NGN',
      'items' => array_map(fn($i) => ['description' => $i['description'], 'garment_type' => $i['garment_type'] ?? null,
        'qty' => (string)$i['qty'], 'unit_price' => (string)$i['unit_price'], 'line_total' => (string)$i['line_total']], (array)($quote['items'] ?? [])),
      'subtotal' => (string)$quote['subtotal'], 'delivery_charge' => (string)$quote['delivery_charge'],
      'discount' => (string)$quote['discount'], 'total' => (string)$quote['total'],
      'deposit_required' => $quote['deposit_required'] ?? null, 'fabric_responsibility' => $quote['fabric_responsibility'] ?? null,
      'fitting_allowance' => $quote['fitting_allowance'] ?? null, 'terms' => $quote['terms'] ?? null,
      'exclusions' => $quote['exclusions'] ?? null, 'valid_until' => $quote['valid_until'] ?? null,
      'promised_date' => $quote['promised_date'] ?? null, 'accepted_at' => lagos_iso($quote['accepted_at'] ?? null),
    ];
  }
  return [
    'ref' => $job['public_ref'] ?? null,
    'description' => $job['description'] ?? null,
    'garment_type' => $job['garment_type'] ?? null,
    'quantity' => (int)($job['quantity'] ?? 1),
    'stage' => $stage,
    'stage_label' => JOB_PUBLIC_STAGE_LABELS[$stage] ?? null,
    'promised_date' => $job['due_date'] ?? null,
    'event_date' => $job['event_date'] ?? null,
    'quantity_handed_over' => (int)($job['handed_over_qty'] ?? 0),
    'appointments' => array_values(array_map('appointment_public_view', array_filter($appts,
      fn($a) => in_array($a['status'] ?? '', ['requested', 'confirmed', 'completed'], true)))),
    'quote' => $q,
    'payment' => [
      'agreed' => $priceMinor > 0 ? minor_to_decimal($priceMinor) : null,
      'paid_verified' => minor_to_decimal($t['net_verified']),
      'balance' => minor_to_decimal($t['balance']),
      'credit' => minor_to_decimal($t['credit']),
      'receipts' => $receipts,
    ],
    'handovers' => array_map(fn($h) => ['method' => $h['method'], 'status' => $h['status'], 'quantity' => (int)$h['quantity'],
      'planned_for' => lagos_iso($h['planned_for'] ?? null), 'completed_at' => lagos_iso($h['completed_at'] ?? null),
      'courier' => $h['courier'] ?? null, 'tracking_url' => $h['tracking_url'] ?? null], $handovers),
    'timeline' => array_values(array_map(fn($e) => ['stage' => $e['stage'], 'label' => JOB_PUBLIC_STAGE_LABELS[$e['stage']] ?? null,
      'at' => lagos_iso($e['created_at'] ?? null)], array_filter($events,
      fn($e) => (int)($e['public'] ?? 0) === 1 && ($e['kind'] ?? 'stage') === 'stage' && isset(JOB_PUBLIC_STAGE_LABELS[$e['stage'] ?? ''])))),
  ];
}

/** The customer's view of an appointment: type, status and Lagos times only. */
function appointment_public_view(array $a) {
  return ['id' => (int)$a['id'], 'type' => $a['type'], 'status' => $a['status'], 'all_day' => (int)($a['all_day'] ?? 0),
          'starts_at' => lagos_iso($a['starts_at']), 'ends_at' => lagos_iso($a['ends_at'])];
}

/* ---- Messages, change requests and feedback -------------------------------- */

const MESSAGE_CHANNELS = ['portal', 'whatsapp', 'email', 'phone', 'in_person', 'note'];
const CHANGE_KINDS = ['reschedule', 'address', 'measurement', 'garment', 'other'];
/** Change kinds that, after cutting starts, need a stated price or date effect (BR-30). */
const CHANGE_KINDS_NEED_EFFECT = ['measurement', 'garment'];
const PUBLISH_CONSENTS = ['no', 'anonymous', 'first_name'];

/** Plain-text body: control characters removed (newlines and tabs kept), trimmed, at most $max characters. Null when empty or too long. */
function message_body_clean($s, $max = 2000) {
  $s = preg_replace('/[^\P{C}\n\t]/u', '', (string)$s);
  if ($s === null) return null;
  $s = trim($s);
  if ($s === '' || mb_strlen($s) > $max) return null;
  return $s;
}

/**
 * Validate customer feedback. Rating is optional (1 to 5); consents are explicit
 * and separate. Returns ['clean' => [...], 'errors' => [...]].
 */
function feedback_clean(array $b) {
  $errors = []; $c = [];
  $r = $b['rating'] ?? null;
  if ($r === null || $r === '') $c['rating'] = null;
  elseif (($n = filter_var($r, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 5]])) === false) { $errors['rating'] = 'Rating must be 1 to 5, or left out'; $c['rating'] = null; }
  else $c['rating'] = $n;
  $comment = trim((string)($b['comment'] ?? ''));
  if (mb_strlen($comment) > 2000) $errors['comment'] = 'Comment is too long (2000 characters at most)';
  $c['comment'] = $comment === '' ? null : message_body_clean($comment);
  if ($c['rating'] === null && $c['comment'] === null && !$errors) $errors['comment'] = 'Give a rating or a comment';
  $c['contact_ok'] = !empty($b['contact_ok']) ? 1 : 0;
  $pc = $b['publish_consent'] ?? 'no';
  if (!in_array($pc, PUBLISH_CONSENTS, true)) $errors['publish_consent'] = 'Choose no, anonymous or first_name';
  $c['publish_consent'] = in_array($pc, PUBLISH_CONSENTS, true) ? $pc : 'no';
  $c['photo_consent'] = !empty($b['photo_consent']) ? 1 : 0;
  return ['clean' => $c, 'errors' => $errors];
}

/** Name shown on a published testimonial, from the consent given. Null means do not publish. */
function testimonial_name($consent, $fullName) {
  if ($consent === 'anonymous') return 'Herit client';
  if ($consent === 'first_name') {
    $first = trim(explode(' ', trim((string)$fullName))[0] ?? '');
    return $first !== '' ? $first : 'Herit client';
  }
  return null;
}
