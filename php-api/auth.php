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

if ($action === 'login' && method() === 'POST') {
  $b = body();
  $email = trim(strtolower($b['email'] ?? ''));
  $password = $b['password'] ?? '';
  if ($email === '' || $password === '') fail('Email and password are required');

  $stmt = $conn->prepare(
    'SELECT id, name, email, role, password_hash FROM users WHERE email = ? AND deleted_at IS NULL'
  );
  $stmt->bind_param('s', $email);
  $stmt->execute();
  $user = $stmt->get_result()->fetch_assoc();
  if (!$user || !password_verify($password, $user['password_hash'])) {
    fail('Invalid email or password', 401);
  }

  $token = bin2hex(random_bytes(32));
  $stmt = $conn->prepare(
    'INSERT INTO auth_tokens (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))'
  );
  $ttl = (int) TOKEN_TTL_DAYS;
  $stmt->bind_param('isi', $user['id'], $token, $ttl);
  $stmt->execute();

  audit($user['id'], 'login');
  unset($user['password_hash']);
  json(['token' => $token, 'user' => $user]);
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
