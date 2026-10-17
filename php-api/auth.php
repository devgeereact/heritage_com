<?php
/**
 * HeritOS — authentication.
 *   POST /auth.php?action=login   {email, password}  → {token, user}
 *   POST /auth.php?action=logout  (Bearer token)     → {ok:true}
 *   GET  /auth.php?action=me      (Bearer token)      → {user}
 *
 * Tokens are random 64-char strings stored in auth_tokens with an expiry.
 * Passwords are verified with password_verify against a bcrypt hash.
 */
require __DIR__ . '/_lib.php';
cors();

$action = $_GET['action'] ?? '';

/** Issue a session token, stamping the device + IP for session tracking. */
function issue_token($userId) {
  global $conn;
  $token = bin2hex(random_bytes(32));
  $device = substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 190);
  $ip = substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45);
  $ttl = (int) TOKEN_TTL_DAYS;
  $stmt = $conn->prepare(
    'INSERT INTO auth_tokens (user_id, token, device, ip, last_seen, expires_at)
     VALUES (?,?,?,?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY))'
  );
  $stmt->bind_param('isssi', $userId, $token, $device, $ip, $ttl);
  $stmt->execute();
  return $token;
}

/* ---- BRUTE-FORCE THROTTLING ---------------------------------------------- */
/* Failed attempts are written to audit_log (an existing table, so no migration
 * and no writable folder on the host) and counted over a sliding window. While
 * a limit is reached the endpoint answers 429 with the usual {error} body, before
 * any password or PIN is checked. Limits can be tuned in config.php; 0 disables
 * one. The client IP is REMOTE_ADDR, the same value issue_token() records. */
$THROTTLE_WINDOW = (int) cfg('LOGIN_THROTTLE_WINDOW', 900);   // seconds
$THROTTLE_LIMITS = [
  'login_fail_ip'   => (int) cfg('LOGIN_MAX_PER_IP', 10),       // email login, per IP
  'login_fail_acct' => (int) cfg('LOGIN_MAX_PER_ACCOUNT', 5),   // email login, per email address
  'pin_fail_ip'     => (int) cfg('PIN_MAX_PER_IP', 5),          // PIN login, per IP (the stall device)
  'pin_fail_all'    => (int) cfg('PIN_MAX_GLOBAL', 20),         // PIN login, every source combined
];

/** Opaque per-account key: the email is hashed so attempted addresses are not stored. */
function account_key($email) {
  return 'acct:' . substr(hash('sha256', (string)$email), 0, 32);
}

/** $checks: [[limit key, audit action, entity or null], …]. Sends 429 if any limit is reached.
 * client_ip(), recent_failures() and throttle_enforce() live in _lib.php. */
function throttle_guard(array $checks) {
  global $THROTTLE_WINDOW, $THROTTLE_LIMITS;
  $resolved = [];
  foreach ($checks as [$key, $action, $entity]) $resolved[] = [(int)($THROTTLE_LIMITS[$key] ?? 0), $action, $entity];
  throttle_enforce($resolved, $THROTTLE_WINDOW);
}

if ($action === 'login' && method() === 'POST') {
  $b = body();
  $email = trim(strtolower($b['email'] ?? ''));
  $password = $b['password'] ?? '';
  if ($email === '' || $password === '') fail('Email and password are required');

  $ipKey = 'ip:' . client_ip();
  $acctKey = account_key($email);
  throttle_guard([
    ['login_fail_ip', 'login_fail_ip', $ipKey],
    ['login_fail_acct', 'login_fail_acct', $acctKey],
  ]);

  $stmt = $conn->prepare(
    "SELECT id, name, email, role, password_hash FROM users
      WHERE email = ? AND deleted_at IS NULL AND (status IS NULL OR status <> 'suspended')"
  );
  $stmt->bind_param('s', $email);
  $stmt->execute();
  $user = $stmt->get_result()->fetch_assoc();
  if (!$user || !password_verify($password, $user['password_hash'])) {
    // Two rows so each limit is a plain action + entity match (no JSON queries).
    audit(null, 'login_fail_ip', $ipKey);
    audit(null, 'login_fail_acct', $acctKey);
    fail('Invalid email or password', 401);
  }

  $token = issue_token($user['id']);
  audit($user['id'], 'login');
  unset($user['password_hash']);
  json(['token' => $token, 'user' => $user]);
}

/* ---- PIN LOGIN (shared market-stall device) ------------------------------ */
/* Staff tap a short PIN instead of typing email+password. Scoped to staff who
 * have set a PIN; we verify against each candidate's hash. */
if ($action === 'pin_login' && method() === 'POST') {
  $b = body();
  $pin = preg_replace('/\D/', '', (string)($b['pin'] ?? ''));
  if (strlen($pin) < 4 || strlen($pin) > 6) fail('Enter your 4–6 digit PIN', 400);

  // A PIN carries no account, so limit per IP and across all sources combined.
  $ipKey = 'ip:' . client_ip();
  throttle_guard([
    ['pin_fail_ip', 'pin_login_fail', $ipKey],
    ['pin_fail_all', 'pin_login_fail', null],
  ]);

  $res = $conn->query(
    "SELECT id, name, email, role, pin_hash FROM users
      WHERE pin_hash IS NOT NULL AND pin_hash <> '' AND status = 'active'
        AND deleted_at IS NULL AND role NOT IN ('customer', 'super_admin', 'admin')"
  );
  $match = null;
  while ($res && $row = $res->fetch_assoc()) {
    if (password_verify($pin, $row['pin_hash'])) { $match = $row; break; }
  }
  if (!$match) {
    audit(null, 'pin_login_fail', $ipKey);
    fail('PIN not recognised', 401);
  }

  $token = issue_token($match['id']);
  audit($match['id'], 'pin_login');
  unset($match['pin_hash']);
  json(['token' => $token, 'user' => $match]);
}

/* ---- SET PIN (own account) ----------------------------------------------- */
if ($action === 'set_pin' && method() === 'POST') {
  $user = require_auth($STAFF_ROLES ?? null);
  $b = body();
  $pin = preg_replace('/\D/', '', (string)($b['pin'] ?? ''));
  if ($pin === '') {
    // Clear the PIN.
    $stmt = $conn->prepare('UPDATE users SET pin_hash = NULL WHERE id = ?');
    $stmt->bind_param('i', $user['id']);
    $stmt->execute();
    json(['ok' => true, 'pin_set' => false]);
  }
  if (strlen($pin) < 4 || strlen($pin) > 6) fail('PIN must be 4–6 digits');
  // A short PIN is guessable from the internet, so owner-level roles sign in
  // with email and password only (pin_login refuses them too).
  if (in_array($user['role'], ['super_admin', 'admin'], true)) fail('Owner and admin accounts sign in with email and password, not a PIN', 403);
  $hash = password_hash($pin, PASSWORD_DEFAULT);
  $stmt = $conn->prepare('UPDATE users SET pin_hash = ? WHERE id = ?');
  $stmt->bind_param('si', $hash, $user['id']);
  $stmt->execute();
  audit($user['id'], 'set_pin');
  json(['ok' => true, 'pin_set' => true]);
}

/* ---- SESSIONS (device list + revoke) ------------------------------------- */
if ($action === 'sessions' && method() === 'GET') {
  $user = require_auth();
  $current = bearer();
  $rows = [];
  $stmt = $conn->prepare('SELECT id, token, device, ip, last_seen, created_at, expires_at FROM auth_tokens WHERE user_id = ? ORDER BY last_seen DESC, id DESC');
  $stmt->bind_param('i', $user['id']);
  $stmt->execute();
  $r = $stmt->get_result();
  while ($row = $r->fetch_assoc()) {
    $rows[] = [
      'id' => (int)$row['id'], 'device' => $row['device'], 'ip' => $row['ip'],
      'last_seen' => $row['last_seen'], 'created_at' => $row['created_at'], 'expires_at' => $row['expires_at'],
      'current' => hash_equals((string)$row['token'], (string)$current),
    ];
  }
  json($rows);
}

if ($action === 'revoke' && method() === 'POST') {
  $user = require_auth();
  $b = body();
  $id = (int)($b['id'] ?? 0);
  $stmt = $conn->prepare('DELETE FROM auth_tokens WHERE id = ? AND user_id = ?');
  $stmt->bind_param('ii', $id, $user['id']);
  $stmt->execute();
  audit($user['id'], 'session_revoke', 'auth_token', $id);
  json(['ok' => true]);
}

if ($action === 'logout' && method() === 'POST') {
  $tok = bearer();
  if ($tok) {
    $stmt = $conn->prepare('DELETE FROM auth_tokens WHERE token = ?');
    $stmt->bind_param('s', $tok);
    $stmt->execute();
  }
  json(['ok' => true]);
}

if ($action === 'me' && method() === 'GET') {
  $user = require_auth();
  json(['user' => $user]);
}

fail('Unknown action', 404);
