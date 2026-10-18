<?php
/**
 * HeritOS — authentication.
 *   POST /auth.php?action=login   {email, password}  → {token, user}
 *   POST /auth.php?action=logout  (staff session)    → {ok:true}
 *   GET  /auth.php?action=me      (staff session)    → {user}
 *   POST /auth.php?action=reset_request {email}          → {ok, message} (same answer either way)
 *   POST /auth.php?action=reset_confirm {token, password} → {ok, message}; signs out every device
 *
 * Tokens are random 64-char strings; auth_tokens keeps their SHA-256 and an expiry.
 * Passwords are verified with password_verify against a bcrypt hash.
 * With STAFF_COOKIE_AUTH on, login and pin_login answer {user, cookie_auth:true}
 * and put the token in the HttpOnly __Host-herit_staff cookie instead (herit_staff
 * on local http staging; A15, _lib.php).
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
  $stored = staff_token_hash($token);   // only the hash is kept (K-15)
  $stmt->bind_param('isssi', $userId, $stored, $device, $ip, $ttl);
  $stmt->execute();
  return $token;
}

/** Answer a successful sign-in: the token in the body, or (cookie auth) in cookies only. */
function login_response($token, array $user) {
  if (staff_cookie_auth_on()) {
    staff_session_cookies_set($token);
    json(['user' => $user, 'cookie_auth' => true]);
  }
  json(['token' => $token, 'user' => $user]);
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
  staff_login_request_enforce();   // JSON only, no foreign origin (A15 login CSRF)
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
  // Check a password even when no account matches, so the answer takes the
  // same time either way and does not reveal which emails exist (K-23).
  // Same cost as every stored hash (STAFF_HASH_COST), or the timing differs again.
  $hashToCheck = $user['password_hash'] ?? STAFF_DUMMY_HASH;
  $ok = password_verify($password, $hashToCheck);
  if (!$user || !$ok) {
    // Two rows so each limit is a plain action + entity match (no JSON queries).
    audit(null, 'login_fail_ip', $ipKey);
    audit(null, 'login_fail_acct', $acctKey);
    fail('Invalid email or password', 401);
  }

  if (staff_secret_needs_rehash($user['password_hash'])) {
    $up = $conn->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    $new = staff_secret_hash($password);
    $up->bind_param('si', $new, $user['id']);
    $up->execute();
  }

  $token = issue_token($user['id']);
  audit($user['id'], 'login');
  unset($user['password_hash']);
  login_response($token, $user);
}

/* ---- PASSWORD RESET BY EMAIL (K-04, schema_phase29.sql) ------------------ */
/* reset_request always answers the same way, whether or not the address has an
 * account, so it cannot be used to find staff emails. The emailed link holds a
 * random token; only its SHA-256 hash is stored (staff_token_hash, as K-15). A link works once, expires
 * (RESET_TTL_MINUTES, default 30) and retires earlier unused links. A reset
 * signs the person out on every device. Requests and failed confirmations are
 * throttled through audit_log like login. */
$THROTTLE_LIMITS['reset_req_ip'] = (int) cfg('RESET_MAX_PER_IP', 5);
$THROTTLE_LIMITS['reset_req_acct'] = (int) cfg('RESET_MAX_PER_ACCOUNT', 3);
$THROTTLE_LIMITS['reset_fail_ip'] = (int) cfg('RESET_FAIL_MAX_PER_IP', 10);

if ($action === 'reset_request' && method() === 'POST') {
  require_once __DIR__ . '/_jobs.php';
  require_once __DIR__ . '/_mail.php';
  $email = trim(strtolower((string)(body()['email'] ?? '')));
  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Enter the email address you sign in with.');
  $ipKey = 'ip:' . client_ip();
  $acctKey = account_key($email);
  throttle_guard([
    ['reset_req_ip', 'reset_req_ip', $ipKey],
    ['reset_req_acct', 'reset_req_acct', $acctKey],
  ]);
  // Every request counts towards the limits, found or not.
  audit(null, 'reset_req_ip', $ipKey);
  audit(null, 'reset_req_acct', $acctKey);

  // A suspended account gets no link, the same rule as login and require_auth (K-23).
  $user = db_row("SELECT id, name, email FROM users
                   WHERE email = ? AND deleted_at IS NULL AND (status IS NULL OR status <> 'suspended')", 's', $email);
  // Equal timing (K-25): every answer leaves no sooner than RESET_MIN_MS after the
  // request started. Where the server can (PHP-FPM or LiteSpeed) the answer goes
  // first and the link and email for a real account are made afterwards; elsewhere
  // the work runs first and the same floor hides it while it takes less than that.
  $answer = ['ok' => true, 'message' => 'If that address has a HeritOS account, a reset link is on its way. Check your inbox and spam folder.'];
  $minMs = max(0, min(5000, (int) cfg('RESET_MIN_MS', 600)));
  if (json_send_early_finisher() !== null) {
    wait_min_duration($minMs);
    json_send_early($answer);
    if ($user) {
      try { reset_link_send($user); }
      catch (Throwable $e) { error_log('reset_request after answer: ' . $e->getMessage()); }
    }
    exit;
  }
  if ($user) reset_link_send($user);
  wait_min_duration($minMs);
  json($answer);
}

/** Retire earlier links, store a new one (hash only) and email it (K-04). */
function reset_link_send(array $user) {
  $token = bin2hex(random_bytes(32));
  $ttl = max(5, min(240, (int) cfg('RESET_TTL_MINUTES', 30)));
  db_tx(function () use ($user, $token, $ttl) {
    db_exec('UPDATE password_resets SET used_at = UTC_TIMESTAMP() WHERE user_id = ? AND used_at IS NULL', 'i', (int)$user['id']);
    db_exec('INSERT INTO password_resets (user_id, token_hash, expires_at, ip) VALUES (?, ?, UTC_TIMESTAMP() + INTERVAL ? MINUTE, ?)',
      'isis', (int)$user['id'], staff_token_hash($token), $ttl, client_ip());
  });
  $site = rtrim((string) cfg('SITE_URL', CORS_ORIGIN), '/');
  $url = $site . '/auth/reset-pass?token=' . $token;
  $first = htmlspecialchars(trim(explode(' ', trim((string)$user['name']))[0] ?? ''), ENT_QUOTES, 'UTF-8');
  $link = htmlspecialchars($url, ENT_QUOTES, 'UTF-8');
  $html = '<p>Hello ' . $first . ',</p>'
    . '<p>Someone asked to reset the password for your HeritOS account. If it was you, choose a new password here:</p>'
    . '<p><a href="' . $link . '">' . $link . '</a></p>'
    . '<p>The link works once and expires in ' . $ttl . ' minutes. If you did not ask, ignore this email: your password stays the same.</p>';
  mail_send_html($user['email'], 'Reset your HeritOS password', $html, ['user_id' => (int)$user['id'], 'entity' => 'password_reset']);
  audit((int)$user['id'], 'password_reset_requested');
}

if ($action === 'reset_confirm' && method() === 'POST') {
  require_once __DIR__ . '/_jobs.php';
  $b = body();
  $token = (string)($b['token'] ?? '');
  $password = (string)($b['password'] ?? '');
  $ipKey = 'ip:' . client_ip();
  throttle_guard([['reset_fail_ip', 'reset_fail_ip', $ipKey]]);
  if (strlen($password) < 8) fail('Choose a password of at least 8 characters.');
  if (strlen($password) > 72) fail('Choose a password of at most 72 characters.');
  // Null when the link is unknown, used or expired; the audit row is written
  // outside the transaction so a failed attempt always counts.
  $userId = !preg_match('/^[a-f0-9]{64}$/', $token) ? null : db_tx(function () use ($token, $password) {
    $r = db_row("SELECT r.id, r.user_id FROM password_resets r JOIN users u ON u.id = r.user_id
                  WHERE r.token_hash = ? AND r.used_at IS NULL AND r.expires_at > UTC_TIMESTAMP() AND u.deleted_at IS NULL
                    AND (u.status IS NULL OR u.status <> 'suspended')
                  FOR UPDATE", 's', staff_token_hash($token));
    if (!$r) return null;
    db_exec('UPDATE users SET password_hash = ? WHERE id = ?', 'si', staff_secret_hash($password), (int)$r['user_id']);
    db_exec('UPDATE password_resets SET used_at = UTC_TIMESTAMP() WHERE user_id = ? AND used_at IS NULL', 'i', (int)$r['user_id']);
    db_exec('DELETE FROM auth_tokens WHERE user_id = ?', 'i', (int)$r['user_id']);
    return (int)$r['user_id'];
  });
  if (!$userId) {
    audit(null, 'reset_fail_ip', $ipKey);
    fail('This reset link has expired or was already used. Ask for a new one.', 400);
  }
  audit($userId, 'password_reset');
  json(['ok' => true, 'message' => 'Your password has changed. Sign in with the new one.']);
}

/* ---- PIN LOGIN (shared market-stall device) ------------------------------ */
/* Staff tap a short PIN instead of typing email+password. Scoped to staff who
 * have set a PIN; we verify against each candidate's hash. */
if ($action === 'pin_login' && method() === 'POST') {
  staff_login_request_enforce();
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
  // Check every account: a PIN shared by two people signs in nobody (K-23).
  $matches = [];
  while ($res && $row = $res->fetch_assoc()) {
    if (password_verify($pin, $row['pin_hash'])) $matches[] = $row;
  }
  if (count($matches) !== 1) {
    audit(null, 'pin_login_fail', $ipKey);
    if (count($matches) > 1) audit(null, 'pin_login_ambiguous', $ipKey, null, ['users' => array_map(fn($m) => (int)$m['id'], $matches)]);
    fail('PIN not recognised', 401);
  }
  $match = $matches[0];
  if (staff_secret_needs_rehash($match['pin_hash'])) {
    $up = $conn->prepare('UPDATE users SET pin_hash = ? WHERE id = ?');
    $new = staff_secret_hash($pin);
    $up->bind_param('si', $new, $match['id']);
    $up->execute();
  }

  $token = issue_token($match['id']);
  audit($match['id'], 'pin_login');
  unset($match['pin_hash']);
  login_response($token, $match);
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
  // Each PIN must belong to one person (K-23). Rejections are capped per user
  // per day, so this cannot be used to discover a colleague's PIN.
  $userKey = 'user:' . (int)$user['id'];
  throttle_enforce([[5, 'set_pin_taken', $userKey]], 86400);
  $others = $conn->prepare("SELECT pin_hash FROM users WHERE id <> ? AND pin_hash IS NOT NULL AND pin_hash <> '' AND deleted_at IS NULL");
  $others->bind_param('i', $user['id']);
  $others->execute();
  $or = $others->get_result();
  while ($row = $or->fetch_assoc()) {
    if (password_verify($pin, $row['pin_hash'])) {
      audit($user['id'], 'set_pin_taken', $userKey);
      fail('That PIN cannot be used. Choose a different one.', 409);
    }
  }
  $hash = staff_secret_hash($pin);
  $stmt = $conn->prepare('UPDATE users SET pin_hash = ? WHERE id = ?');
  $stmt->bind_param('si', $hash, $user['id']);
  $stmt->execute();
  audit($user['id'], 'set_pin');
  json(['ok' => true, 'pin_set' => true]);
}

/* ---- SESSIONS (device list + revoke) ------------------------------------- */
if ($action === 'sessions' && method() === 'GET') {
  $user = require_auth();
  $current = staff_token();
  $rows = [];
  $stmt = $conn->prepare('SELECT id, token, device, ip, last_seen, created_at, expires_at FROM auth_tokens WHERE user_id = ? ORDER BY last_seen DESC, id DESC');
  $stmt->bind_param('i', $user['id']);
  $stmt->execute();
  $r = $stmt->get_result();
  while ($row = $r->fetch_assoc()) {
    $rows[] = [
      'id' => (int)$row['id'], 'device' => $row['device'], 'ip' => $row['ip'],
      'last_seen' => $row['last_seen'], 'created_at' => $row['created_at'], 'expires_at' => $row['expires_at'],
      'current' => $current !== null && (hash_equals((string)$row['token'], staff_token_hash($current)) || hash_equals((string)$row['token'], (string)$current)),
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
  // No CSRF check here (A15 review): sign-out only takes access away, the
  // SameSite=Strict cookie is never sent by a cross-site request anyway, and
  // refusing a stale CSRF header used to leave the HttpOnly session alive
  // while the app showed the person signed out. So always clear both cookies
  // and delete the token that came with the request.
  $cred = staff_credential();
  $tok = $cred['token'] ?? null;
  staff_session_cookies_clear();
  if ($tok) {
    $stmt = $conn->prepare('DELETE FROM auth_tokens WHERE token IN (?, ?)');
    $hash = staff_token_hash($tok);
    $stmt->bind_param('ss', $hash, $tok);
    $stmt->execute();
  }
  json(['ok' => true]);
}

if ($action === 'me' && method() === 'GET') {
  $user = require_auth();
  json(['user' => $user]);
}

fail('Unknown action', 404);
