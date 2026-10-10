<?php
/**
 * HeritOS: verified customer access (Phase 3, A03, A09, D-010).
 *
 * A reference alone never unlocks anything. The customer gives a reference (the
 * public_ref of a tailoring job or retail order) and their registered phone or
 * email; if both match, a single-use six-digit code goes to their registered
 * email. If they have no email, or mail cannot be sent, the request waits for
 * the owner, who sends a single-use invite link by hand.
 *
 * Public:
 *   POST ?action=start   {reference, contact, hp_url}  → 200 {challenge, message}   (identical for every outcome)
 *   POST ?action=verify  {challenge, code}             → 200 {token, expires_in_days, name} | 400 generic
 *   POST ?action=redeem  {invite}                      → 200 {token, expires_in_days, name} | 400 generic
 * Customer (Bearer):
 *   POST ?action=logout                                → {ok}   revokes this session
 *   POST ?action=logout_all                            → {ok, revoked}
 * Owner roles (Bearer staff token):
 *   GET  ?action=requests                              → access requests waiting for an invite
 *   POST ?action=invite   {customer_id | challenge_id} → {invite_url, expires_at_local, wa_link?}
 *   POST ?action=revoke   {customer_id}                → {ok, revoked}
 *
 * Throttles (audit_log, ACCESS_THROTTLE_WINDOW seconds, default 900):
 * ACCESS_START_MAX_PER_IP 10, ACCESS_START_MAX_PER_REF 5, ACCESS_VERIFY_MAX_PER_IP 20.
 * Codes last 10 minutes and allow 5 attempts; invites last ACCESS_INVITE_HOURS (24).
 */
require __DIR__ . '/_lib.php';
require __DIR__ . '/_portal.php';
require __DIR__ . '/_mail.php';
cors();

$action = $_GET['action'] ?? '';
$window = (int)cfg('ACCESS_THROTTLE_WINDOW', 900);
$ipKey = 'ip:' . client_ip();
const ACCESS_START_MESSAGE = "If those details match our records, we've sent a code to your email. If you don't receive one, Herit will contact you.";
const ACCESS_FAIL_MESSAGE = "That code didn't work or has expired.";
const ACCESS_CODE_MINUTES = 10;

/** The server secret for code hashes. Never empty in production (config.php sets TOKEN_SECRET). */
function access_secret() {
  $s = (string)cfg('TOKEN_SECRET', '');
  if ($s === '') fail('Customer access is not configured', 503);
  return $s;
}

/** Staging only: write the code to a local file so end-to-end checks can read it. Never in production. */
function staging_code_log($challenge, $code) {
  $path = (string)cfg('STAGING_ACCESS_CODE_LOG', '');
  if (!defined('HERITOS_STAGING') || !defined('HERITOS_ENV') || HERITOS_ENV !== 'staging' || $path === '') return;
  @file_put_contents($path, json_encode(['challenge' => $challenge, 'code' => $code, 'at' => gmdate('c')]) . "\n", FILE_APPEND | LOCK_EX);
}

/** Find the customer behind a public reference (job first, then retail order). Returns [customer row, kind] or [null, null]. */
function customer_by_reference($ref) {
  $ref = public_ref_normalise($ref);
  if ($ref === '') return [null, null];
  $j = db_row('SELECT customer_id FROM tailoring_orders WHERE public_ref = ? AND deleted_at IS NULL', 's', $ref);
  if ($j && $j['customer_id']) {
    $c = db_row('SELECT id, name, phone, email FROM customers WHERE id = ? AND deleted_at IS NULL', 'i', (int)$j['customer_id']);
    if ($c) return [$c, 'job'];
  }
  if (has_column('orders', 'public_ref')) {
    $o = db_row('SELECT customer_id, customer_phone FROM orders WHERE public_ref = ? AND deleted_at IS NULL', 's', $ref);
    if ($o && $o['customer_id']) {
      $c = db_row('SELECT id, name, phone, email FROM customers WHERE id = ? AND deleted_at IS NULL', 'i', (int)$o['customer_id']);
      if ($c) return [$c, 'order'];
    }
  }
  return [null, null];
}

function session_reply($customerId, $via) {
  $token = customer_session_issue($customerId, $via);
  $name = db_row('SELECT name FROM customers WHERE id = ?', 'i', (int)$customerId)['name'] ?? '';
  json(['token' => $token, 'expires_in_days' => customer_session_days(), 'name' => $name]);
}

/* ---- START (public) ------------------------------------------------------- */
if ($action === 'start' && method() === 'POST') {
  $b = body();
  $ref = public_ref_normalise($b['reference'] ?? '');
  $contact = trim((string)($b['contact'] ?? ''));
  $refKey = 'ref:' . substr(hash('sha256', $ref !== '' ? $ref : strtoupper(trim((string)($b['reference'] ?? '')))), 0, 32);
  throttle_enforce([
    [(int)cfg('ACCESS_START_MAX_PER_IP', 10), 'access_start_ip', $ipKey],
    [(int)cfg('ACCESS_START_MAX_PER_REF', 5), 'access_start_ref', $refKey],
  ], $window);
  if (trim((string)($b['reference'] ?? '')) === '' || $contact === '' || mb_strlen($contact) > 190) fail('Enter your reference and your phone number or email');
  audit(null, 'access_start_ip', $ipKey);
  audit(null, 'access_start_ref', $refKey);

  $challenge = bin2hex(random_bytes(32));
  $reply = ['challenge' => $challenge, 'message' => ACCESS_START_MESSAGE];
  // Honeypot: a filled hidden field gets the normal reply and nothing happens.
  if (trim((string)($b['hp_url'] ?? '')) !== '') json($reply);

  [$c] = customer_by_reference($ref);
  $match = $c && contact_matches($contact, $c['email'] ?? null, $c['phone'] ?? null);
  $exp = utc_sql(time() + ACCESS_CODE_MINUTES * 60);
  if (!$match) {
    // Decoy: same shape of work and the same reply, so nothing is revealed.
    db_exec("INSERT INTO customer_access_challenges (challenge_hash, customer_id, channel, code_hash, expires_at, status, ip)
             VALUES (?, NULL, 'email', ?, ?, 'pending', ?)", 'ssss', token_hash($challenge), access_code_hash(access_code_new(), access_secret()), $exp, client_ip());
    json($reply);
  }
  $email = trim((string)($c['email'] ?? ''));
  $code = access_code_new();
  $sent = false;
  if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $first = htmlspecialchars(trim(explode(' ', trim((string)$c['name']))[0] ?? ''), ENT_QUOTES, 'UTF-8');
    $html = '<p>Hello' . ($first !== '' ? ' ' . $first : '') . ',</p>'
      . '<p>Your Herit Clothing sign-in code is <strong style="font-size:20px;letter-spacing:2px">' . $code . '</strong>.</p>'
      . '<p>It works once and expires in ' . ACCESS_CODE_MINUTES . ' minutes. If you did not ask for it, you can ignore this email.</p>';
    $r = mail_send_html($email, 'Your Herit Clothing sign-in code', $html, ['entity' => 'customer_access']);
    $sent = $r['ok'];
  }
  if ($sent) {
    db_exec("INSERT INTO customer_access_challenges (challenge_hash, customer_id, channel, code_hash, expires_at, status, ip)
             VALUES (?,?, 'email', ?,?, 'pending', ?)", 'sisss', token_hash($challenge), (int)$c['id'], access_code_hash($code, access_secret()), $exp, client_ip());
    staging_code_log($challenge, $code);
  } else {
    // No email or mail failed: the owner sees this request and can send an invite link.
    db_exec("INSERT INTO customer_access_challenges (challenge_hash, customer_id, channel, code_hash, expires_at, status, ip)
             VALUES (?,?, 'manual', NULL, UTC_TIMESTAMP() + INTERVAL 7 DAY, 'awaiting_owner', ?)", 'sis', token_hash($challenge), (int)$c['id'], client_ip());
  }
  json($reply);
}

/* ---- VERIFY (public) ------------------------------------------------------ */
if ($action === 'verify' && method() === 'POST') {
  throttle_enforce([[(int)cfg('ACCESS_VERIFY_MAX_PER_IP', 20), 'access_verify_fail_ip', $ipKey]], $window);
  $b = body();
  $challenge = (string)($b['challenge'] ?? '');
  $code = (string)($b['code'] ?? '');
  $failNow = function () use ($ipKey) {
    audit(null, 'access_verify_fail_ip', $ipKey);
    fail(ACCESS_FAIL_MESSAGE, 400);
  };
  if (!preg_match('/^[0-9a-f]{64}$/', $challenge)) $failNow();
  $secret = access_secret();
  $res = db_tx(function () use ($challenge, $code, $secret) {
    $row = db_row('SELECT * FROM customer_access_challenges WHERE challenge_hash = ? FOR UPDATE', 's', token_hash($challenge));
    if (!$row || $row['channel'] !== 'email') return null;
    $state = challenge_state($row, time());
    if ($state !== 'ok' && $state !== 'decoy') {
      if ($state === 'expired' && $row['status'] === 'pending') db_exec("UPDATE customer_access_challenges SET status = 'expired' WHERE id = ?", 'i', (int)$row['id']);
      return null;
    }
    $attempts = (int)$row['attempts'] + 1;
    $right = $state === 'ok' && access_code_ok($code, $row['code_hash'], $secret);
    if (!$right) {
      db_exec('UPDATE customer_access_challenges SET attempts = ?, status = IF(? >= ?, \'locked\', status) WHERE id = ?',
        'iiii', $attempts, $attempts, ACCESS_CODE_MAX_ATTEMPTS, (int)$row['id']);
      return null;
    }
    db_exec("UPDATE customer_access_challenges SET attempts = ?, status = 'used', used_at = UTC_TIMESTAMP() WHERE id = ?", 'ii', $attempts, (int)$row['id']);
    return (int)$row['customer_id'];
  });
  if (!$res) $failNow();
  audit(null, 'customer_access_verified', 'customer', $res);
  session_reply($res, 'code');
}

/* ---- REDEEM an invite (public) -------------------------------------------- */
if ($action === 'redeem' && method() === 'POST') {
  throttle_enforce([[(int)cfg('ACCESS_VERIFY_MAX_PER_IP', 20), 'access_verify_fail_ip', $ipKey]], $window);
  $b = body();
  $invite = (string)($b['invite'] ?? '');
  if (!preg_match('/^[0-9a-f]{64}$/', $invite)) { audit(null, 'access_verify_fail_ip', $ipKey); fail(ACCESS_FAIL_MESSAGE, 400); }
  // Single use: only one request can flip pending → used.
  $upd = db_exec("UPDATE customer_access_challenges SET status = 'used', used_at = UTC_TIMESTAMP()
                   WHERE challenge_hash = ? AND channel = 'invite' AND status = 'pending' AND used_at IS NULL
                     AND expires_at > UTC_TIMESTAMP() AND customer_id IS NOT NULL", 's', token_hash($invite));
  if ($upd->affected_rows !== 1) { audit(null, 'access_verify_fail_ip', $ipKey); fail(ACCESS_FAIL_MESSAGE, 400); }
  $row = db_row('SELECT customer_id FROM customer_access_challenges WHERE challenge_hash = ?', 's', token_hash($invite));
  if (!db_row('SELECT id FROM customers WHERE id = ? AND deleted_at IS NULL', 'i', (int)$row['customer_id'])) fail(ACCESS_FAIL_MESSAGE, 400);
  audit(null, 'customer_access_invite_used', 'customer', (int)$row['customer_id']);
  session_reply((int)$row['customer_id'], 'invite');
}

/* ---- Customer session actions --------------------------------------------- */
if ($action === 'logout' && method() === 'POST') {
  $me = require_customer_session();
  customer_session_revoke_current($me);
  json(['ok' => true]);
}
if ($action === 'logout_all' && method() === 'POST') {
  $me = require_customer_session();
  json(['ok' => true, 'revoked' => customer_sessions_revoke_all((int)$me['id'])]);
}

/* ---- Owner actions -------------------------------------------------------- */
if (in_array($action, ['requests', 'invite', 'revoke'], true)) {
  $user = require_auth(ROLES_OWNER);

  if ($action === 'requests' && method() === 'GET') {
    db_exec("UPDATE customer_access_challenges SET status = 'expired' WHERE status IN ('pending','awaiting_owner') AND expires_at < UTC_TIMESTAMP()");
    $rows = db_rows("SELECT ch.id, ch.customer_id, c.name AS client_name, c.client_ref, c.phone, c.email, ch.created_at
                       FROM customer_access_challenges ch JOIN customers c ON c.id = ch.customer_id
                      WHERE ch.status = 'awaiting_owner' ORDER BY ch.id DESC LIMIT 100");
    json(['count' => count($rows), 'items' => array_map(function ($r) {
      return ['id' => (int)$r['id'], 'customer_id' => (int)$r['customer_id'], 'client_name' => $r['client_name'], 'client_ref' => $r['client_ref'],
              'phone_masked' => phone_masked($r['phone']), 'has_email' => trim((string)$r['email']) !== '', 'created_at' => $r['created_at']];
    }, $rows)]);
  }

  if ($action === 'invite' && method() === 'POST') {
    $b = body();
    $cid = (int)($b['customer_id'] ?? 0);
    $chId = (int)($b['challenge_id'] ?? 0);
    if ($chId) {
      $ch = db_row("SELECT customer_id FROM customer_access_challenges WHERE id = ? AND status = 'awaiting_owner'", 'i', $chId);
      if (!$ch) fail('That request is no longer waiting', 404);
      $cid = (int)$ch['customer_id'];
    }
    $c = db_row('SELECT id, name, phone FROM customers WHERE id = ? AND deleted_at IS NULL', 'i', $cid);
    if (!$c) fail('Client not found', 404);
    $hours = max(1, min(168, (int)cfg('ACCESS_INVITE_HOURS', 24)));
    $invite = bin2hex(random_bytes(32));
    db_exec("INSERT INTO customer_access_challenges (challenge_hash, customer_id, channel, expires_at, status, created_by, ip)
             VALUES (?,?, 'invite', UTC_TIMESTAMP() + INTERVAL ? HOUR, 'pending', ?, ?)", 'siiis', token_hash($invite), $cid, $hours, (int)$user['id'], client_ip());
    if ($chId) db_exec("UPDATE customer_access_challenges SET status = 'used', used_at = UTC_TIMESTAMP() WHERE id = ?", 'i', $chId);
    audit($user['id'], 'customer_access_invite', 'customer', $cid, ['hours' => $hours]);
    $site = rtrim((string)cfg('SITE_URL', CORS_ORIGIN), '/');
    $url = $site . '/account?invite=' . $invite;
    $phone = wa_normalize_phone($c['phone'] ?? '');
    $text = 'Hello ' . trim(explode(' ', trim((string)$c['name']))[0] ?? '') . ', here is your private Herit Clothing link to follow your order. It works once and expires in '
      . $hours . ' hours: ' . $url;
    json(['invite_url' => $url, 'expires_at_local' => lagos_iso(time() + $hours * 3600), 'single_use' => true,
          'message_text' => $text, 'wa_link' => $phone !== '' ? 'https://wa.me/' . $phone . '?text=' . rawurlencode($text) : null], 201);
  }

  if ($action === 'revoke' && method() === 'POST') {
    $b = body();
    $cid = (int)($b['customer_id'] ?? 0);
    if (!db_row('SELECT id FROM customers WHERE id = ?', 'i', $cid)) fail('Client not found', 404);
    $n = customer_sessions_revoke_all($cid);
    audit($user['id'], 'customer_sessions_revoke', 'customer', $cid, ['revoked' => $n]);
    json(['ok' => true, 'revoked' => $n]);
  }
}

fail('Unknown action', 404);
