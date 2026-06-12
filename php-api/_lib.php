<?php
/**
 * HeritOS — shared API helpers. Every endpoint does `require '_lib.php';`
 * (which itself requires config.php and gives us $conn).
 */
require __DIR__ . '/config.php';

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

/** Emit just the CORS response headers (no OPTIONS short-circuit). */
function cors_headers() {
  if (headers_sent()) return;
  // Production is same-origin (no Origin header). In dev, Vite may pick any
  // localhost port (auto-port), so reflect any localhost/127.0.0.1 origin, plus
  // whatever CORS_ORIGIN is configured to. Anything else is not allowed.
  $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
  $allowed = $origin !== '' && (
    $origin === CORS_ORIGIN ||
    preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#', $origin)
  );
  header('Access-Control-Allow-Origin: ' . ($allowed ? $origin : CORS_ORIGIN));
  header('Vary: Origin');
  header('Access-Control-Allow-Credentials: true');
  header('Access-Control-Allow-Headers: Content-Type, Authorization');
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

/** Read the Bearer token from the Authorization header. */
function bearer() {
  $h = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
  if (preg_match('/Bearer\s+(.+)/i', $h, $m)) return trim($m[1]);
  return null;
}

/**
 * Require a valid session token; returns the user row (id, name, email, role).
 * Pass a list of allowed roles to gate by role (server-side, never trust client).
 */
function require_auth($roles = null) {
  global $conn;
  $tok = bearer();
  if (!$tok) fail('Not authenticated', 401);
  $stmt = $conn->prepare(
    'SELECT u.id, u.name, u.email, u.role
       FROM auth_tokens t JOIN users u ON u.id = t.user_id
      WHERE t.token = ? AND t.expires_at > NOW() AND u.deleted_at IS NULL'
  );
  $stmt->bind_param('s', $tok);
  $stmt->execute();
  $res = $stmt->get_result();
  $user = $res->fetch_assoc();
  if (!$user) fail('Session expired', 401);
  if ($roles && !in_array($user['role'], (array)$roles, true)) fail('Forbidden', 403);
  return $user;
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
