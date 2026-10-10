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
