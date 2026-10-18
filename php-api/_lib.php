<?php
/**
 * HeritOS — shared API helpers. Every endpoint does `require '_lib.php';`
 * (which itself requires config.php and gives us $conn).
 */
// Local staging only: scripts/staging/router.php defines HERITOS_STAGING and
// scripts/staging/setup.sh writes php-api/config.local.php (gitignored). The live
// server never defines the constant, so it always loads config.php as before.
require __DIR__ . ((defined('HERITOS_STAGING') && is_file(__DIR__ . '/config.local.php')) ? '/config.local.php' : '/config.php');

// config.php connected with mysqli exceptions OFF (so a bad connection returns
// clean JSON, not a fatal). Now that we're connected, turn them ON so any
// query/prepare error THROWS instead of silently returning false — a missing
// table or bad column then surfaces as a clean 500, never an empty [] or a
// raw fatal with a stack trace.
if (function_exists('mysqli_report')) {
  mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
}

$__debug = defined('GK_DEBUG') && GK_DEBUG;

// Emit CORS headers RIGHT NOW, before any query can fail. Previously these were
// only sent when an endpoint called cors() — so a server-side 500 (thrown by the
// exception handler below) carried no Access-Control-Allow-Origin, and the
// browser reported a generic "Failed to fetch" instead of the real JSON error.
// Sending them up front means even a 500 is readable cross-origin.
cors_headers();

// Any uncaught error/exception (including "prepare() returned false" Errors)
// becomes a clean JSON 500. Detail is only included when GK_DEBUG is on.
set_exception_handler(function ($e) use ($__debug) {
  cors_headers(); // safe to re-call; header() just overwrites
  if (!headers_sent()) {
    http_response_code(500);
    header('Content-Type: application/json');
  }
  echo json_encode([
    'error' => 'Server error',
    'detail' => $__debug ? ($e->getMessage()) : null,
  ]);
  exit;
});

/**
 * May this Origin read our responses? Pure, no I/O. The configured CORS_ORIGIN
 * always may. Any localhost/127.0.0.1 port (Vite auto-port) may only when
 * $allowLocalhost is true, because otherwise any page on a visitor's own machine
 * could call the live API with their credentials.
 */
function cors_origin_allowed($origin, $corsOrigin, $allowLocalhost) {
  $origin = (string)$origin;
  if ($origin === '') return false;
  if ($origin === (string)$corsOrigin) return true;
  return (bool)$allowLocalhost && (bool) preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#', $origin);
}

/** Emit just the CORS response headers (no OPTIONS short-circuit). */
function cors_headers() {
  if (headers_sent()) return;
  // Production is same-origin (no Origin header). Localhost origins are only
  // reflected while ALLOW_LOCALHOST_CORS is switched on in config.php (local
  // `npm run dev` against the live API); unset means off.
  $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
  $allowed = cors_origin_allowed($origin, CORS_ORIGIN, cfg('ALLOW_LOCALHOST_CORS', false));
  header('Access-Control-Allow-Origin: ' . ($allowed ? $origin : CORS_ORIGIN));
  header('Vary: Origin');
  header('Access-Control-Allow-Credentials: true');
  header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Herit-CSRF');
  header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
}

/** Emit CORS headers and short-circuit pre-flight OPTIONS. */
function cors() {
  cors_headers();
  if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
}

/** Send a JSON response and stop. */
function json($data, $code = 200) {
  http_response_code($code);
  header('Content-Type: application/json');
  echo json_encode($data);
  exit;
}

function fail($msg, $code = 400) { json(['error' => $msg], $code); }

/** Microseconds still to wait so that an answer leaves no sooner than $minMs after
 * $startedAt (both Unix seconds as floats). 0 when that time has passed (K-25). */
function min_duration_wait_us($startedAt, $now, $minMs) {
  $left = (float)$startedAt + max(0, (int)$minMs) / 1000 - (float)$now;
  return $left > 0 ? (int) ceil($left * 1000000) : 0;
}

/** Sleep until $minMs have passed since $startedAt (default: the request start). */
function wait_min_duration($minMs, $startedAt = null) {
  $start = $startedAt ?? (float)($_SERVER['REQUEST_TIME_FLOAT'] ?? microtime(true));
  $us = min_duration_wait_us($start, microtime(true), $minMs);
  if ($us > 0) usleep($us);
}

/** The SAPI function that ends the response early, or null where there is none. */
function json_send_early_finisher() {
  if (function_exists('fastcgi_finish_request')) return 'fastcgi_finish_request';
  if (function_exists('litespeed_finish_request')) return 'litespeed_finish_request';
  return null;
}

/**
 * Send a JSON answer to the client now and keep the script running, so slow work
 * after it (database writes, email) cannot be seen in the response time (K-25).
 * Needs PHP-FPM (fastcgi_finish_request) or LiteSpeed (litespeed_finish_request);
 * returns false, having sent nothing, where neither exists (the PHP CLI server,
 * mod_php). The caller then does the work and answers with json() as usual.
 */
function json_send_early($data, $code = 200) {
  $finish = json_send_early_finisher();
  if ($finish === null) return false;
  ignore_user_abort(true);
  http_response_code($code);
  header('Content-Type: application/json');
  echo json_encode($data);
  while (ob_get_level() > 0) ob_end_flush();
  flush();
  $finish();
  return true;
}

/* ---- Request fields: text and numbers only where text and numbers belong ----
 * JSON lets a caller send an array or object where the form sends text, and a
 * query string can too (?q[]=x). Read such fields through these helpers, never
 * with trim() or a cast on the raw value: an array would otherwise be a 500
 * (TypeError) or be stored as the text "Array". Fields that really are lists or
 * maps (items, settings, data) are read as arrays by their own code.          */

/** Pure: why $in[$key] cannot be read as $kind ('text' or 'number'), or null if it can.
 *  $in may be anything: a list entry that is not an object reads as missing. */
function in_type_problem($in, $key, $kind = 'text') {
  $v = is_array($in) ? ($in[$key] ?? null) : null;
  if ($v === null || is_scalar($v)) return null;
  return $key . ($kind === 'number' ? ' must be a number' : ' must be text');
}

/** Answer 400 with $msg, rolling back first in case a transaction is open. */
function bad_input($msg) {
  global $conn;
  if (isset($conn) && $conn instanceof mysqli) { try { $conn->rollback(); } catch (Throwable $e) { /* nothing open */ } }
  fail($msg, 400);
}

/** A text field: $default when missing or null, else the value as a string; 400 for a list or object. */
function in_str($in, $key, $default = '') {
  if (!is_array($in) || !isset($in[$key])) return $default;
  if ($p = in_type_problem($in, $key)) bad_input($p);
  return (string)$in[$key];
}

/** A whole-number field: $default when missing or null, else (int) of the value; 400 for a list or object. */
function in_int($in, $key, $default = 0) {
  if (!is_array($in) || !isset($in[$key])) return $default;
  if ($p = in_type_problem($in, $key, 'number')) bad_input($p);
  return (int)$in[$key];
}

/** A decimal field: $default when missing or null, else (float) of the value; 400 for a list or object. */
function in_num($in, $key, $default = 0.0) {
  if (!is_array($in) || !isset($in[$key])) return $default;
  if ($p = in_type_problem($in, $key, 'number')) bad_input($p);
  return (float)$in[$key];
}

/** A field kept as sent (no cast) but required to be a scalar or null: 400 for a list or object. */
function in_scalar($in, $key, $default = null) {
  if (!is_array($in) || !isset($in[$key])) return $default;
  if ($p = in_type_problem($in, $key)) bad_input($p);
  return $in[$key];
}

/** Refuse (400) any of $keys in $in that holds a list or object. For fields handed on to a helper. */
function in_text_only($in, array $keys) {
  foreach ($keys as $k) if ($p = in_type_problem($in, $k)) bad_input($p);
}

/** Decode the JSON request body to an associative array. */
function body() {
  $raw = file_get_contents('php://input');
  $d = json_decode($raw, true);
  return is_array($d) ? $d : [];
}

function method() { return $_SERVER['REQUEST_METHOD']; }

/**
 * Read a config value that may be defined either as a constant (define('SMTP_HOST',…))
 * or as a plain global variable ($SMTP_HOST = …) in config.php — so both styles work.
 * Returns $default when neither is set or the value is an empty string.
 */
function cfg($name, $default = '') {
  if (defined($name)) { $v = constant($name); return ($v === '' || $v === null) ? $default : $v; }
  if (array_key_exists($name, $GLOBALS)) { $v = $GLOBALS[$name]; return ($v === '' || $v === null) ? $default : $v; }
  return $default;
}

/**
 * Staff tokens are stored as SHA-256 (K-15), as customer sessions already are;
 * a database or backup leak then exposes no usable session. Tokens issued
 * before this change were stored as issued and stay valid until they expire
 * (TOKEN_TTL_DAYS); remove the plain fallback after that window.
 */
function staff_token_hash($t) { return hash('sha256', (string)$t); }

/**
 * One bcrypt cost for every staff password and PIN (A15 review, K-23). Email
 * sign-in checks STAFF_DUMMY_HASH when no account matches, so a stored hash at
 * a lower cost (PHP before 8.4 defaults to 10) would answer faster and show
 * which emails exist. Older hashes still verify, because password_verify reads
 * the cost from the hash; sign-in upgrades them (staff_secret_needs_rehash).
 */
const STAFF_HASH_COST = 12;
const STAFF_DUMMY_HASH = '$2y$12$2HDF/gO2EmxrmeT1t9ZYo.YSyrW/ZXeeYtBTCYYzGA4z76AkayD.K';

/** Hash a staff password or PIN at STAFF_HASH_COST. */
function staff_secret_hash($plain) { return password_hash((string)$plain, PASSWORD_BCRYPT, ['cost' => STAFF_HASH_COST]); }

/** Is this stored hash older or cheaper than staff_secret_hash() would make now? */
function staff_secret_needs_rehash($hash) { return password_needs_rehash((string)$hash, PASSWORD_BCRYPT, ['cost' => STAFF_HASH_COST]); }

/** Read the Bearer token from the Authorization header. */
function bearer() {
  $h = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
  if (preg_match('/Bearer\s+(.+)/i', $h, $m)) return trim($m[1]);
  return null;
}

/* ---- STAFF SESSION COOKIE (A15) ------------------------------------------ */
/* With STAFF_COOKIE_AUTH on in config.php, staff sign-in sets the token in an
 * HttpOnly cookie that page scripts cannot read, plus a readable CSRF cookie
 * (__Host-herit_staff and __Host-herit_csrf on the live site, staff_cookie_names).
 * Every cookie-authenticated write must echo the CSRF cookie in X-Herit-CSRF
 * (double submit). The Bearer header keeps working either way, so the e2e
 * scripts and any client still holding a token are unaffected. Off by default. */

/**
 * The two staff cookie names for this context. Pure. On the live site they
 * carry the __Host- prefix, so the browser only accepts them when Secure,
 * Path=/ and without Domain, and a sibling subdomain or plain-http page cannot
 * plant or shadow them. Plain http on the laptop (request_is_local_http) cannot
 * set a Secure cookie, so local staging keeps the bare names. Reading uses the
 * same names, so a bare cookie is never trusted on the live site.
 * Returns ['session' => …, 'csrf' => …].
 */
function staff_cookie_names($localHttp) {
  return $localHttp
    ? ['session' => 'herit_staff', 'csrf' => 'herit_csrf']
    : ['session' => '__Host-herit_staff', 'csrf' => '__Host-herit_csrf'];
}

/** The staff cookie names for the current request. */
function staff_cookie_names_now() { return staff_cookie_names(request_is_local_http($_SERVER)); }

function staff_cookie_auth_on() { return (bool) cfg('STAFF_COOKIE_AUTH', false); }

/** Session tokens and CSRF values are both 32 random bytes as hex. */
function staff_hex64_ok($v) { return is_string($v) && (bool) preg_match('/^[0-9a-f]{64}$/', $v); }

/**
 * Which staff credential does this request carry? Pure. A Bearer header wins;
 * the cookie counts only while cookie auth is on and it looks like a token.
 * Returns ['token' => …, 'source' => 'bearer'|'cookie'] or null.
 */
function staff_credential_pick($authHeader, $cookieValue, $cookieAuthOn) {
  if (preg_match('/Bearer\s+(.+)/i', (string)$authHeader, $m) && trim($m[1]) !== '') {
    return ['token' => trim($m[1]), 'source' => 'bearer'];
  }
  if ($cookieAuthOn && staff_hex64_ok($cookieValue)) return ['token' => $cookieValue, 'source' => 'cookie'];
  return null;
}

/** The staff credential on the current request (see staff_credential_pick). */
function staff_credential() {
  $h = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
  return staff_credential_pick($h, $_COOKIE[staff_cookie_names_now()['session']] ?? null, staff_cookie_auth_on());
}

/** The staff token on the current request, from the header or the cookie, or null. */
function staff_token() {
  $c = staff_credential();
  return $c ? $c['token'] : null;
}

/**
 * May this request go ahead under the CSRF rule? Pure. Only a cookie credential
 * on a method other than GET, HEAD or OPTIONS needs the check: the header must
 * equal the CSRF cookie, compared in constant time.
 */
function staff_csrf_ok($method, $source, $headerValue, $cookieValue) {
  if ($source !== 'cookie') return true;
  if (in_array(strtoupper((string)$method), ['GET', 'HEAD', 'OPTIONS'], true)) return true;
  if (!staff_hex64_ok($cookieValue) || !is_string($headerValue)) return false;
  return hash_equals($cookieValue, $headerValue);
}

/** Send 403 unless the current request passes staff_csrf_ok(). */
function staff_csrf_enforce($source) {
  $ok = staff_csrf_ok(method(), $source, $_SERVER['HTTP_X_HERIT_CSRF'] ?? null, $_COOKIE[staff_cookie_names_now()['csrf']] ?? null);
  if (!$ok) fail('Security check failed. Reload the page and try again.', 403);
}

/**
 * May this sign-in request go ahead (A15 login CSRF)? Pure. body() reads the
 * raw input whatever the Content-Type, so a foreign page could post a
 * JSON-shaped text/plain form to login or pin_login and plant its own session
 * in the visitor's browser. A sign-in must therefore be application/json (a
 * cross-site form cannot send that without a CORS pre-flight) and must not
 * come from a foreign origin: an Origin header, when sent, must be this site
 * itself or one cors_origin_allowed() accepts; with no Origin, a
 * Sec-Fetch-Site of cross-site is refused. curl and the e2e scripts send JSON
 * and no Origin, so they pass. Returns null when allowed, else [status, message].
 */
function staff_login_request_check($contentType, $secFetchSite, $origin, $selfOrigin, $corsOrigin, $allowLocalhost) {
  $type = strtolower(trim(explode(';', (string)$contentType, 2)[0]));
  if ($type !== 'application/json') return [415, 'Sign-in requests must be sent as JSON.'];
  $origin = (string)$origin;
  if ($origin !== '') {
    if ($origin === (string)$selfOrigin || cors_origin_allowed($origin, $corsOrigin, $allowLocalhost)) return null;
    return [403, 'Sign-in from another website is not allowed.'];
  }
  if (strtolower(trim((string)$secFetchSite)) === 'cross-site') return [403, 'Sign-in from another website is not allowed.'];
  return null;
}

/** Refuse the current sign-in request unless staff_login_request_check() allows it. */
function staff_login_request_enforce() {
  $https = strtolower((string)($_SERVER['HTTPS'] ?? ''));
  $self = (($https !== '' && $https !== 'off') ? 'https' : 'http') . '://' . (string)($_SERVER['HTTP_HOST'] ?? '');
  $bad = staff_login_request_check(
    $_SERVER['CONTENT_TYPE'] ?? ($_SERVER['HTTP_CONTENT_TYPE'] ?? ''),
    $_SERVER['HTTP_SEC_FETCH_SITE'] ?? '',
    $_SERVER['HTTP_ORIGIN'] ?? '',
    $self, CORS_ORIGIN, cfg('ALLOW_LOCALHOST_CORS', false)
  );
  if ($bad) fail($bad[1], $bad[0]);
}

/**
 * Plain http on the laptop (local staging), where a Secure cookie would not
 * stick? Pure. Needs no HTTPS, a localhost or 127.0.0.1 Host and a loopback
 * client, so a forged Host header alone never drops Secure on the live site.
 */
function request_is_local_http(array $server) {
  $https = strtolower((string)($server['HTTPS'] ?? ''));
  if ($https !== '' && $https !== 'off') return false;
  $host = strtolower((string) preg_replace('/:\d+$/', '', (string)($server['HTTP_HOST'] ?? '')));
  $remote = (string)($server['REMOTE_ADDR'] ?? '');
  return in_array($host, ['localhost', '127.0.0.1'], true) && in_array($remote, ['127.0.0.1', '::1'], true);
}

/**
 * One Set-Cookie value for the staff session cookies. Pure. Path=/ and
 * SameSite=Strict always; Max-Age 0 clears the cookie.
 */
function staff_cookie_header($name, $value, $maxAge, $secure, $httpOnly) {
  $parts = [$name . '=' . rawurlencode((string)$value), 'Max-Age=' . max(0, (int)$maxAge), 'Path=/'];
  if ($secure) $parts[] = 'Secure';
  if ($httpOnly) $parts[] = 'HttpOnly';
  $parts[] = 'SameSite=Strict';
  return implode('; ', $parts);
}

/** Set the session and CSRF cookies for a newly issued staff token. */
function staff_session_cookies_set($token) {
  $local = request_is_local_http($_SERVER);
  $n = staff_cookie_names($local);
  $ttl = (int) TOKEN_TTL_DAYS * 86400;
  header('Set-Cookie: ' . staff_cookie_header($n['session'], $token, $ttl, !$local, true), false);
  header('Set-Cookie: ' . staff_cookie_header($n['csrf'], bin2hex(random_bytes(32)), $ttl, !$local, false), false);
}

/**
 * Clear both staff cookies (sign-out). Harmless when they were never set. On
 * the live site the bare names are cleared too, in case a build from before
 * the __Host- prefix ever set them.
 */
function staff_session_cookies_clear() {
  $local = request_is_local_http($_SERVER);
  $sets = [staff_cookie_names($local)];
  if (!$local) $sets[] = staff_cookie_names(true);
  foreach ($sets as $n) {
    header('Set-Cookie: ' . staff_cookie_header($n['session'], '', 0, !$local, true), false);
    header('Set-Cookie: ' . staff_cookie_header($n['csrf'], '', 0, !$local, false), false);
  }
}

/**
 * Require a valid session token; returns the user row (id, name, email, role).
 * Pass a list of allowed roles to gate by role (server-side, never trust client).
 * The token comes from the Bearer header or, with STAFF_COOKIE_AUTH on, the
 * session cookie; a cookie-authenticated write must also pass the CSRF check.
 */
function require_auth($roles = null) {
  global $conn;
  $cred = staff_credential();
  if (!$cred) fail('Not authenticated', 401);
  $tok = $cred['token'];
  $stmt = $conn->prepare(
    "SELECT u.id, u.name, u.email, u.role
       FROM auth_tokens t JOIN users u ON u.id = t.user_id
      WHERE t.token IN (?, ?) AND t.expires_at > NOW() AND u.deleted_at IS NULL
        AND (u.status IS NULL OR u.status <> 'suspended')"
  );
  $hash = staff_token_hash($tok);
  $stmt->bind_param('ss', $hash, $tok);
  $stmt->execute();
  $res = $stmt->get_result();
  $user = $res->fetch_assoc();
  if (!$user) fail('Session expired', 401);
  staff_csrf_enforce($cred['source']);
  if ($roles && !in_array($user['role'], (array)$roles, true)) fail('Forbidden', 403);
  return $user;
}

/* ---- WhatsApp (shared so any endpoint can fire a notification) ------------ */

/** Normalise a phone to digits in international form. NG local 0XXXXXXXXXX and
 * bare 10-digit numbers are assumed Nigerian (+234). */
function wa_normalize_phone($p) {
  $d = preg_replace('/\D/', '', (string)$p);
  if ($d === '') return '';
  if (strlen($d) === 11 && $d[0] === '0') $d = '234' . substr($d, 1);
  elseif (strlen($d) === 10)             $d = '234' . $d;
  return $d;
}

/** POST a plain-text message via the Meta WhatsApp Cloud API. Returns decoded JSON or null. */
function wa_cloud_send($phoneId, $token, $to, $body) {
  $url = 'https://graph.facebook.com/v21.0/' . $phoneId . '/messages';
  $payload = json_encode([
    'messaging_product' => 'whatsapp', 'to' => $to, 'type' => 'text',
    'text' => ['preview_url' => true, 'body' => $body],
  ]);
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_POSTFIELDS => $payload,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token, 'Content-Type: application/json'],
    CURLOPT_TIMEOUT => 20,
  ]);
  $raw = curl_exec($ch);
  curl_close($ch);
  return $raw ? json_decode($raw, true) : null;
}

/**
 * Send (or queue) a WhatsApp message and log it. Cloud API when configured,
 * otherwise a 'manual' log row + a wa.me click-to-send link. Best-effort and
 * non-fatal: a missing token, dead network or absent table never breaks the
 * caller (so order/checkout flows stay safe to notify from).
 */
function wa_dispatch($phone, $body, $customerId = null, $template = null, $createdBy = null) {
  global $conn;
  $to = wa_normalize_phone($phone);
  if ($to === '' || trim((string)$body) === '') return ['ok' => false, 'error' => 'no phone or body'];

  $token = cfg('WHATSAPP_TOKEN');
  $phoneId = cfg('WHATSAPP_PHONE_ID');
  $status = 'manual'; $waId = null; $error = null; $ok = false;

  if ($token && $phoneId) {
    try {
      $resp = wa_cloud_send($phoneId, $token, $to, $body);
      if ($resp && !empty($resp['messages'][0]['id'])) { $status = 'sent'; $waId = $resp['messages'][0]['id']; $ok = true; }
      else { $status = 'failed'; $error = substr(is_array($resp) ? json_encode($resp['error'] ?? $resp) : 'send failed', 0, 240); }
    } catch (\Throwable $e) { $status = 'failed'; $error = substr($e->getMessage(), 0, 240); }
  }

  try {
    $dir = 'out';
    $stmt = $conn->prepare(
      'INSERT INTO whatsapp_messages (customer_id, phone, direction, body, template, status, wa_message_id, error, created_by)
       VALUES (?,?,?,?,?,?,?,?,?)'
    );
    $stmt->bind_param('isssssssi', $customerId, $to, $dir, $body, $template, $status, $waId, $error, $createdBy);
    $stmt->execute();
  } catch (\Throwable $e) { /* table may not exist yet — logging is best-effort */ }

  return ['ok' => $ok, 'status' => $status, 'wa_message_id' => $waId, 'phone' => $to,
          'wa_link' => 'https://wa.me/' . $to . '?text=' . rawurlencode($body)];
}

/* ---- Coupons (shared by coupons.php validate + store.php checkout) -------- */

/**
 * Evaluate a coupon code against a goods subtotal + shipping. Single source of
 * truth so the storefront's live quote and the server's authoritative checkout
 * price can never disagree. Returns:
 *   ['ok'=>true, 'coupon_id', 'code', 'type', 'value', 'discount', 'free_ship', 'description']
 *   ['ok'=>false, 'error'=>'…']
 * discount is the ₦ taken off goods (free_ship returns discount=0, free_ship=true).
 */
function coupon_eval($code, $subtotal, $shipping = 0) {
  global $conn;
  $code = is_scalar($code) ? strtoupper(trim((string)$code)) : '';
  if ($code === '') return ['ok' => false, 'error' => 'Enter a code'];

  $stmt = $conn->prepare('SELECT * FROM coupons WHERE UPPER(code) = ? LIMIT 1');
  $stmt->bind_param('s', $code);
  $stmt->execute();
  $c = $stmt->get_result()->fetch_assoc();
  if (!$c) return ['ok' => false, 'error' => 'That code is not valid'];
  if (!(int)$c['active']) return ['ok' => false, 'error' => 'That code is no longer active'];

  $today = date('Y-m-d');
  if (!empty($c['starts_at']) && $today < $c['starts_at']) return ['ok' => false, 'error' => 'That code is not active yet'];
  if (!empty($c['expires_at']) && $today > $c['expires_at']) return ['ok' => false, 'error' => 'That code has expired'];
  if ((int)$c['usage_limit'] > 0 && (int)$c['used'] >= (int)$c['usage_limit']) return ['ok' => false, 'error' => 'That code has been fully used'];

  $subtotal = (float)$subtotal;
  if ($subtotal < (float)$c['min_spend']) {
    return ['ok' => false, 'error' => 'Spend ₦' . number_format((float)$c['min_spend']) . ' to use this code'];
  }

  $discount = 0; $freeShip = false;
  if ($c['type'] === 'percent')        $discount = round($subtotal * ((float)$c['value']) / 100, 2);
  elseif ($c['type'] === 'fixed')      $discount = min((float)$c['value'], $subtotal);
  elseif ($c['type'] === 'free_ship') { $freeShip = true; $discount = 0; }

  return [
    'ok' => true, 'coupon_id' => (int)$c['id'], 'code' => $c['code'], 'type' => $c['type'],
    'value' => (float)$c['value'], 'discount' => $discount, 'free_ship' => $freeShip,
    'description' => $c['description'], 'shipping_saved' => $freeShip ? (float)$shipping : 0,
  ];
}

/* ---- Store credit (loyalty / refunds-as-credit / goodwill) ---------------- */

/** A customer's store-credit balance = SUM of their ledger deltas. */
function credit_balance($customerId) {
  global $conn;
  $customerId = (int)$customerId;
  if (!$customerId) return 0.0;
  $row = $conn->query('SELECT COALESCE(SUM(delta),0) AS bal FROM store_credit WHERE customer_id = ' . $customerId)->fetch_assoc();
  return (float)($row['bal'] ?? 0);
}

/** Append a ledger row (positive = earn, negative = redeem). Best-effort. */
function credit_add($customerId, $delta, $reason = 'adjust', $ref = null, $note = null, $createdBy = null) {
  global $conn;
  $customerId = (int)$customerId;
  if (!$customerId || (float)$delta === 0.0) return false;
  try {
    $stmt = $conn->prepare('INSERT INTO store_credit (customer_id, delta, reason, ref, note, created_by) VALUES (?,?,?,?,?,?)');
    $d = (float)$delta;
    $stmt->bind_param('idsssi', $customerId, $d, $reason, $ref, $note, $createdBy);
    $stmt->execute();
    return true;
  } catch (\Throwable $e) { return false; }
}

/** Find a customer id by phone (last-9-digit match). 0 if none. */
function customer_id_by_phone($phone) {
  global $conn;
  $norm = preg_replace('/\D/', '', (string)$phone);
  if ($norm === '') return 0;
  $stmt = $conn->prepare("SELECT id FROM customers WHERE deleted_at IS NULL AND RIGHT(REGEXP_REPLACE(phone,'[^0-9]',''),9) = RIGHT(?,9) LIMIT 1");
  $stmt->bind_param('s', $norm);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();
  return $row ? (int)$row['id'] : 0;
}

/* ---- Referrals ("give ₦, get ₦") ----------------------------------------- */

/** Get a customer's referral code, generating + persisting one if absent. */
function ensure_referral_code($customerId) {
  global $conn;
  $customerId = (int)$customerId;
  if (!$customerId) return null;
  $row = $conn->query('SELECT name, referral_code FROM customers WHERE id = ' . $customerId)->fetch_assoc();
  if (!$row) return null;
  if (!empty($row['referral_code'])) return $row['referral_code'];

  // Base on the first name + a short random tail; retry on collision.
  $base = strtoupper(preg_replace('/[^A-Za-z]/', '', explode(' ', trim($row['name']))[0] ?? 'HERIT'));
  $base = substr($base ?: 'HERIT', 0, 8);
  for ($i = 0; $i < 6; $i++) {
    $code = $base . strtoupper(bin2hex(random_bytes(2)));   // e.g. ADAOKAFOR + 4 hex
    $stmt = $conn->prepare('UPDATE customers SET referral_code = ? WHERE id = ? AND (referral_code IS NULL OR referral_code = "")');
    $stmt->bind_param('si', $code, $customerId);
    try { $stmt->execute(); if ($stmt->affected_rows > 0) return $code; }
    catch (\Throwable $e) { /* unique collision — try another tail */ }
    // Re-read in case a concurrent call set it.
    $r2 = $conn->query('SELECT referral_code FROM customers WHERE id = ' . $customerId)->fetch_assoc();
    if (!empty($r2['referral_code'])) return $r2['referral_code'];
  }
  return null;
}

/** Find the customer who owns a referral code. 0 if none. */
function referrer_by_code($code) {
  global $conn;
  $code = strtoupper(trim((string)$code));
  if ($code === '') return 0;
  $stmt = $conn->prepare('SELECT id FROM customers WHERE UPPER(referral_code) = ? AND deleted_at IS NULL LIMIT 1');
  $stmt->bind_param('s', $code);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();
  return $row ? (int)$row['id'] : 0;
}

/**
 * Settle a referral once its order is genuinely paid: credit both the referrer
 * and the new customer, then mark it settled so it can never double-pay. Safe to
 * call repeatedly (idempotent via referral_settled). Returns true if it paid out.
 */
function referral_settle($orderId) {
  global $conn;
  $orderId = (int)$orderId;
  $reward = (float)cfg('REFERRAL_REWARD', 0);
  if (!$orderId || $reward <= 0) return false;

  $o = $conn->query("SELECT id, code, customer_id, referrer_id, referral_settled FROM orders WHERE id = $orderId AND deleted_at IS NULL")->fetch_assoc();
  if (!$o || (int)$o['referral_settled'] || !$o['referrer_id'] || !$o['customer_id']) return false;
  if ((int)$o['referrer_id'] === (int)$o['customer_id']) return false;

  // Mark settled FIRST (and only if still unsettled) to avoid a double payout
  // under concurrent calls; only credit if we actually flipped it.
  $upd = $conn->query("UPDATE orders SET referral_settled = 1 WHERE id = $orderId AND referral_settled = 0");
  if ($conn->affected_rows < 1) return false;

  credit_add((int)$o['referrer_id'], $reward, 'referral', $o['code'], 'Referral reward — friend ordered');
  credit_add((int)$o['customer_id'], $reward, 'referral', $o['code'], 'Welcome referral credit');
  return true;
}

/** Write a row to the audit log. */
function audit($userId, $action, $entity = null, $entityId = null, $meta = null) {
  global $conn;
  $m = $meta ? json_encode($meta) : null;
  $stmt = $conn->prepare(
    'INSERT INTO audit_log (user_id, action, entity, entity_id, meta) VALUES (?,?,?,?,?)'
  );
  $stmt->bind_param('issis', $userId, $action, $entity, $entityId, $m);
  $stmt->execute();
}

/* ---- Login throttling (pure decision; auth.php supplies the counts) ------- */

/**
 * Sliding-window throttle. $times are the Unix timestamps of the most recent
 * failures inside the window (at most $limit of them, any order). Returns 0 if
 * another attempt is allowed, otherwise the seconds until the oldest of those
 * failures leaves the window. A $limit of 0 or less disables the check.
 */
function throttle_retry_after(array $times, $limit, $window, $now) {
  $limit = (int)$limit; $window = (int)$window; $now = (int)$now;
  if ($limit <= 0 || $window <= 0 || count($times) < $limit) return 0;
  $times = array_map('intval', $times);
  rsort($times);                                   // newest first
  $oldest = $times[$limit - 1];                    // the $limit-th newest failure
  $wait = $oldest + $window - $now;
  return $wait > 0 ? $wait : 0;
}

/* ---- Throttling with audit_log as the counter (shared by auth, account, store) */
/* Failed attempts are written to audit_log (an existing table, so no migration
 * and no writable folder on the host) and counted over a sliding window. */

/** The client IP, as REMOTE_ADDR (the same value auth.php's issue_token() records). */
function client_ip() {
  return substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45);
}

/** Opaque key for one address from one IP (K-26); neither is stored readable. */
function account_ip_key($email, $ip) {
  return 'acip:' . substr(hash('sha256', (string)$email . '|' . (string)$ip), 0, 32);
}

/** Timestamps of the newest failures for one action (optionally one entity) inside the window. */
function recent_failures($action, $entity, $limit, $window) {
  global $conn;
  $limit = max(1, (int)$limit);
  $sql = 'SELECT UNIX_TIMESTAMP(created_at) AS t FROM audit_log
           WHERE action = ? AND created_at > (NOW() - INTERVAL ? SECOND)';
  $types = 'si'; $args = [$action, (int)$window];
  if ($entity !== null) { $sql .= ' AND entity = ?'; $types .= 's'; $args[] = $entity; }
  $sql .= ' ORDER BY id DESC LIMIT ' . $limit;
  $stmt = $conn->prepare($sql);
  $stmt->bind_param($types, ...$args);
  $stmt->execute();
  $res = $stmt->get_result();
  $times = [];
  while ($row = $res->fetch_assoc()) $times[] = (int)$row['t'];
  return $times;
}

/**
 * $checks: [[limit, audit action, entity or null], …]. Answers 429 with the usual
 * {error} body and a Retry-After header if any limit is reached inside $window
 * seconds. A limit of 0 or less switches that check off.
 */
function throttle_enforce(array $checks, $window) {
  global $conn;
  $window = (int)$window;
  $now = (int)($conn->query('SELECT UNIX_TIMESTAMP() AS n')->fetch_assoc()['n'] ?? time());
  $wait = 0;
  foreach ($checks as [$limit, $action, $entity]) {
    $limit = (int)$limit;
    if ($limit <= 0) continue;
    $wait = max($wait, throttle_retry_after(recent_failures($action, $entity, $limit, $window), $limit, $window, $now));
  }
  if ($wait > 0) {
    if (!headers_sent()) header('Retry-After: ' . $wait);
    $mins = (int) ceil($wait / 60);
    fail('Too many attempts. Try again in ' . $mins . ' minute' . ($mins === 1 ? '' : 's') . '.', 429);
  }
}

/* ---- HTML sanitising (blog bodies; rendered with dangerouslySetInnerHTML) -- */

/** Tags kept as-is. Anything else is unwrapped (children kept) unless it is in SANITIZE_DROP. */
const SANITIZE_TAGS = ['p', 'br', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 'blockquote',
  'ul', 'ol', 'li', 'a', 'img', 'figure', 'figcaption', 'hr', 'code', 'pre'];
/** Tags removed together with everything inside them. */
const SANITIZE_DROP = ['script', 'style', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet',
  'form', 'input', 'button', 'select', 'textarea', 'svg', 'math', 'template', 'noscript', 'link',
  'meta', 'base', 'title', 'head'];
/** Attributes kept per tag; every other attribute (on*, style, class, id …) is removed. */
const SANITIZE_ATTRS = ['a' => ['href', 'title'], 'img' => ['src', 'alt', 'width', 'height']];

/**
 * Is this URL safe for href/src? http and https URLs pass, and site paths that
 * start with a single "/"; mailto: and tel: only when $allowMailTel. Refused:
 * javascript:, data:, vbscript: and every other scheme; protocol-relative
 * "//host" and "/\host" (browsers read "\" as "/", so both leave the site);
 * and anything else without a scheme ("page", "#top", "?q"), matching the
 * browser-side rules in src/app/(public)/site/safeHtml.js and
 * src/helpers/richText.js. Control characters and spaces are ignored when
 * reading the URL, as browsers do ("java\tscript:" is still javascript:,
 * "/\t/host" is still "//host").
 */
function sanitize_url_ok($url, $allowMailTel) {
  $probe = preg_replace('/[\x00-\x20\x7F]+/', '', (string)$url);
  if ($probe === '') return false;
  if (!preg_match('/^([a-z][a-z0-9+.\-]*):/i', $probe, $m)) {
    return (bool)preg_match('#^/(?![/\\\\])#', $probe);   // a site path: one "/", then not "/" or "\"
  }
  $scheme = strtolower($m[1]);
  if ($scheme === 'http' || $scheme === 'https') return true;
  return $allowMailTel && ($scheme === 'mailto' || $scheme === 'tel');
}

/**
 * Allowlist sanitiser for rich text. Keeps basic prose tags, links and images,
 * strips scripts, event handlers, styles and unsafe URLs, and returns a fragment
 * (no html/body wrapper). Uses PHP's built-in DOM extension; if that is missing
 * it fails closed to plain allowlisted tags with every attribute removed.
 */
function sanitize_html($html) {
  $html = (string)$html;
  if (function_exists('mb_scrub')) $html = mb_scrub($html, 'UTF-8');   // drop invalid UTF-8 bytes
  if (trim($html) === '') return '';
  if (!class_exists('DOMDocument')) return sanitize_html_fallback($html);

  $doc = new DOMDocument('1.0', 'UTF-8');
  $prevErrors = libxml_use_internal_errors(true);
  // The meta charset makes libxml read the input as UTF-8 (its HTML default is
  // Latin-1, which would mangle ₦ and accents).
  $doc->loadHTML('<!DOCTYPE html><html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body>'
    . $html . '</body></html>', LIBXML_NONET);
  libxml_clear_errors();
  libxml_use_internal_errors($prevErrors);

  $body = $doc->getElementsByTagName('body')->item(0);
  if (!$body) return '';
  sanitize_node($body);
  $out = '';
  foreach ($body->childNodes as $child) $out .= $doc->saveHTML($child);
  return $out;
}

/** Clean $node's children in place (recursive). */
function sanitize_node(DOMNode $node) {
  foreach (iterator_to_array($node->childNodes) as $child) {
    if ($child instanceof DOMText) continue;                         // text (and CDATA) is safe as-is
    if (!($child instanceof DOMElement)) { $node->removeChild($child); continue; }   // comments, PIs
    $tag = strtolower($child->nodeName);
    if (in_array($tag, SANITIZE_DROP, true)) { $node->removeChild($child); continue; }
    sanitize_node($child);
    if (!in_array($tag, SANITIZE_TAGS, true)) {                      // unknown tag: keep its cleaned children
      while ($child->firstChild) $node->insertBefore($child->firstChild, $child);
      $node->removeChild($child);
      continue;
    }
    $keep = SANITIZE_ATTRS[$tag] ?? [];
    foreach (iterator_to_array($child->attributes) as $attr) {
      $name = strtolower($attr->nodeName);
      $value = $attr->nodeValue;
      $ok = in_array($name, $keep, true);
      if ($ok && $name === 'href') $ok = sanitize_url_ok($value, true);
      if ($ok && $name === 'src') $ok = sanitize_url_ok($value, false);
      if ($ok && ($name === 'width' || $name === 'height')) $ok = (bool) preg_match('/^\d{1,4}$/', trim($value));
      if (!$ok) $child->removeAttribute($attr->nodeName);
    }
    if ($tag === 'a' && $child->hasAttribute('href')) $child->setAttribute('rel', 'noopener noreferrer');
  }
}

/** No DOM extension: drop dangerous blocks, keep allowlisted tags, strip all attributes. */
function sanitize_html_fallback($html) {
  $drop = implode('|', SANITIZE_DROP);
  $html = preg_replace('#<(' . $drop . ')\b[^>]*>.*?</\1\s*>#is', '', $html);
  $html = strip_tags($html, SANITIZE_TAGS);
  return preg_replace('#<(/?)([a-z][a-z0-9]*)\b[^>]*>#i', '<$1$2>', $html);
}

/* ---- Payment verification (pure; store.php supplies the gateway reply) ---- */

/** Gateway reference pay_init issues for Paystack / Flutterwave (recomputed on verify). */
function pay_reference($code, $orderId) {
  return $code . '-' . substr(md5($code . $orderId), 0, 8);
}

/** Major currency units → integer minor units (kobo / cents), as pay_init sends them. */
function pay_minor_units($major) {
  return (int) round(((float)$major) * 100);
}

/**
 * Does a gateway verify reply prove payment for this order? Pure, no I/O.
 *   $provider: 'paystack' | 'flutterwave' | 'stripe'
 *   $resp:     decoded verify JSON
 *   $expect:   ['reference' => issued ref (Stripe: the cs_ session id),
 *               'amount_minor' => order total in minor units, 'currency' => 'NGN',
 *               'code' => order code (Stripe metadata binding)]
 * Units: Paystack data.amount is already in the subunit (kobo); Flutterwave
 * data.amount is in major units; Stripe amount_total is in the smallest unit.
 * Paying at least the total is accepted (Flutterwave guidance: give value and
 * refund any excess); paying less never is. Returns ['ok' => bool, 'reason' => string].
 */
function pay_check($provider, $resp, array $expect) {
  if (!is_array($resp)) return ['ok' => false, 'reason' => 'no_response'];
  $wantRef = (string)($expect['reference'] ?? '');
  $wantMinor = (int)($expect['amount_minor'] ?? -1);
  $wantCur = strtoupper((string)($expect['currency'] ?? ''));
  if ($wantRef === '' || $wantMinor < 0 || $wantCur === '') return ['ok' => false, 'reason' => 'bad_expectation'];

  if ($provider === 'paystack') {
    $d = is_array($resp['data'] ?? null) ? $resp['data'] : [];
    $status = ($d['status'] ?? '') === 'success';
    $ref = (string)($d['reference'] ?? '');
    $minor = isset($d['amount']) && is_numeric($d['amount']) ? (int)$d['amount'] : null;
    $cur = strtoupper((string)($d['currency'] ?? ''));
  } elseif ($provider === 'flutterwave') {
    $d = is_array($resp['data'] ?? null) ? $resp['data'] : [];
    $status = ($d['status'] ?? '') === 'successful';
    $ref = (string)($d['tx_ref'] ?? '');
    $minor = isset($d['amount']) && is_numeric($d['amount']) ? pay_minor_units($d['amount']) : null;
    $cur = strtoupper((string)($d['currency'] ?? ''));
  } elseif ($provider === 'stripe') {
    $status = ($resp['payment_status'] ?? '') === 'paid';
    $ref = (string)($resp['id'] ?? '');
    $minor = isset($resp['amount_total']) && is_numeric($resp['amount_total']) ? (int)$resp['amount_total'] : null;
    $cur = strtoupper((string)($resp['currency'] ?? ''));
    $wantCode = (string)($expect['code'] ?? '');
    $metaCode = (string)($resp['metadata']['order_code'] ?? '');
    $clientRef = (string)($resp['client_reference_id'] ?? '');
    if ($wantCode === '' || $metaCode !== $wantCode || ($clientRef !== '' && $clientRef !== $wantCode)) {
      return ['ok' => false, 'reason' => 'order_mismatch'];
    }
  } else {
    return ['ok' => false, 'reason' => 'unknown_provider'];
  }

  if (!$status) return ['ok' => false, 'reason' => 'not_successful'];
  if (!hash_equals($wantRef, $ref)) return ['ok' => false, 'reason' => 'reference_mismatch'];
  if ($cur !== $wantCur) return ['ok' => false, 'reason' => 'currency_mismatch'];
  if ($minor === null || $minor < $wantMinor) return ['ok' => false, 'reason' => 'amount_mismatch'];
  return ['ok' => true, 'reason' => 'ok'];
}

/* ---- Staff codes and customer-facing public references (A06) ------------- */
/* Staff codes (ORD-0042, HC-0042, HCG-0042) stay sequential because the team
 * reads them aloud. Customers look orders up with a separate random public_ref,
 * so knowing one code never lets anyone guess another order. */

/** 31 characters with no 0/O or 1/I/L, so a reference survives being read out. */
const PUBLIC_REF_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const PUBLIC_REF_LENGTH = 10;

/** A new random public reference (about 49 bits from random_int). */
function public_ref_generate() {
  $a = PUBLIC_REF_ALPHABET;
  $max = strlen($a) - 1;
  $out = '';
  for ($i = 0; $i < PUBLIC_REF_LENGTH; $i++) $out .= $a[random_int(0, $max)];
  return $out;
}

/** What a customer typed, upper-cased with spaces and dashes removed; '' unless
 * it is a well-formed public reference. Pure. */
function public_ref_normalise($s) {
  if (!is_scalar($s)) return '';
  $s = strtoupper(preg_replace('/[\s\-]+/', '', (string)$s));
  return preg_match('/^[' . PUBLIC_REF_ALPHABET . ']{' . PUBLIC_REF_LENGTH . '}$/', $s) ? $s : '';
}

/** Staff code from a sequence number: seq_code('ORD', 7) → 'ORD-0007'. Pure. */
function seq_code($prefix, $n) {
  return $prefix . '-' . str_pad((string)(int)$n, 4, '0', STR_PAD_LEFT);
}

/** True when a mysqli exception is a duplicate-key error (errno 1062). */
function is_duplicate_key($e) {
  return $e instanceof mysqli_sql_exception && (int)$e->getCode() === 1062;
}

/**
 * Did a statement lose a race with another transaction? 1213 is a deadlock
 * (InnoDB has already rolled the transaction back); 1020 is MariaDB's "Record
 * has changed since last read" under innodb_snapshot_isolation (on by default
 * from 11.8). Both mean "someone else changed this at the same time", never a
 * fault in the request or the server, so db_tx() answers them with a 409.
 */
function is_tx_conflict($e) {
  return $e instanceof mysqli_sql_exception && in_array((int)$e->getCode(), [1020, 1213], true);
}

const TX_CONFLICT_MESSAGE = 'Someone else changed this at the same time. Reload and try again.';

/** Does $table have $column? Cached per request. Lets CI-deployed endpoints keep
 * working on a database that has not imported the newest schema file yet. */
function has_column($table, $column) {
  global $conn;
  static $cache = [];
  $key = $table . '.' . $column;
  if (!array_key_exists($key, $cache)) {
    $stmt = $conn->prepare('SELECT 1 FROM information_schema.COLUMNS
                             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1');
    $stmt->bind_param('ss', $table, $column);
    $stmt->execute();
    $cache[$key] = (bool)$stmt->get_result()->fetch_row();
  }
  return $cache[$key];
}

/**
 * Insert a row whose staff code is the next MAX(id)+1, retrying with a fresh
 * code when two inserts race for the same one (duplicate key, errno 1062).
 * $insert($code) runs the INSERT and returns the new id. Returns [id, code].
 */
function insert_with_code($table, $prefix, callable $insert, $tries = 5) {
  global $conn;
  for ($attempt = 0; ; $attempt++) {
    $next = (int)($conn->query("SELECT MAX(id) AS m FROM `$table`")->fetch_assoc()['m'] ?? 0) + 1 + $attempt;
    $code = seq_code($prefix, $next);
    try {
      return [(int)$insert($code), $code];
    } catch (mysqli_sql_exception $e) {
      if (!is_duplicate_key($e) || $attempt >= $tries - 1) throw $e;
    }
  }
}

/** Give a row a random public_ref (retrying on the rare collision). Returns the
 * reference, or null when the column does not exist yet (schema_phase17.sql). */
function assign_public_ref($table, $id, $tries = 5) {
  global $conn;
  if (!has_column($table, 'public_ref')) return null;
  $stmt = $conn->prepare("UPDATE `$table` SET public_ref = ? WHERE id = ? AND public_ref IS NULL");
  for ($attempt = 0; ; $attempt++) {
    $ref = public_ref_generate();
    $id = (int)$id;
    try {
      $stmt->bind_param('si', $ref, $id);
      $stmt->execute();
      return $ref;
    } catch (mysqli_sql_exception $e) {
      if (!is_duplicate_key($e) || $attempt >= $tries - 1) throw $e;
    }
  }
}

/**
 * Find a retail order for a customer-facing lookup. The random public_ref always
 * works; the old sequential ORD- code works only while ALLOW_LEGACY_ORDER_CODE_LOOKUP
 * is on (default on, so references already sent to customers keep working).
 * $cols is a trusted column list. Returns the row or null.
 */
function order_by_customer_ref($input, $cols) {
  global $conn;
  $order = null;
  $ref = public_ref_normalise($input);
  if ($ref !== '' && has_column('orders', 'public_ref')) {
    $stmt = $conn->prepare("SELECT $cols FROM orders WHERE public_ref = ? AND deleted_at IS NULL LIMIT 1");
    $stmt->bind_param('s', $ref);
    $stmt->execute();
    $order = $stmt->get_result()->fetch_assoc() ?: null;
  }
  if (!$order && cfg('ALLOW_LEGACY_ORDER_CODE_LOOKUP', true)) {
    $code = strtoupper(trim((string)$input));
    $stmt = $conn->prepare("SELECT $cols FROM orders WHERE UPPER(code) = ? AND deleted_at IS NULL LIMIT 1");
    $stmt->bind_param('s', $code);
    $stmt->execute();
    $order = $stmt->get_result()->fetch_assoc() ?: null;
  }
  return $order;
}
