<?php
/**
 * HeritOS — Team & Access (staff user management).
 *
 *   GET  /users.php?action=list                 → all staff (no customers)
 *   POST /users.php?action=create  {name, email, role, phone, password?}
 *                                               → create staff; password optional
 *                                                 (auto-generated temp returned once)
 *   POST /users.php?action=update&id=N {name?, role?, phone?, status?}
 *   POST /users.php?action=reset&id=N           → set a new temp password, returned once
 *   POST /users.php?action=deactivate&id=N      → soft-delete (deleted_at = NOW)
 *
 *   GET  /users.php?action=me                   → current user (any role)
 *   POST /users.php?action=password {current, next}  → change own password (any role)
 *
 * Management actions are admin-only (super_admin / admin). The two "self"
 * actions (me, password) are open to any authenticated user.
 *
 * Guard rails: can't deactivate or demote yourself, and can't remove the last
 * active super_admin (so the platform can never be locked out).
 */
require __DIR__ . '/_lib.php';
cors();

$ADMIN = ['super_admin', 'admin'];
// Staff roles a person can hold (excludes 'customer' — those aren't logins here).
$ROLES = ['super_admin', 'admin', 'manager', 'tailor', 'editor', 'seller', 'employee'];
$STATUSES = ['active', 'invited', 'suspended'];

$action = $_GET['action'] ?? 'list';

/** Generate a readable temp password, e.g. "Herit-7F3K9Q". */
function temp_password() {
  $s = strtoupper(bin2hex(random_bytes(4))); // 8 hex chars
  return 'Herit-' . substr($s, 0, 6);
}

/** Count active super_admins (used to protect against lockout). */
function super_admin_count($conn) {
  $r = $conn->query("SELECT COUNT(*) c FROM users WHERE role='super_admin' AND deleted_at IS NULL");
  return (int)($r->fetch_assoc()['c'] ?? 0);
}

/* ---- SELF (any authenticated role) -------------------------------------- */

if ($action === 'me' && method() === 'GET') {
  $user = require_auth();
  $stmt = $conn->prepare('SELECT id, name, email, role, phone, status, created_at FROM users WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('i', $user['id']);
  $stmt->execute();
  json($stmt->get_result()->fetch_assoc());
}

if ($action === 'password' && method() === 'POST') {
  $user = require_auth();
  $b = body();
  $current = $b['current'] ?? '';
  $next = $b['next'] ?? '';
  if (strlen($next) < 8) fail('New password must be at least 8 characters.');

  $stmt = $conn->prepare('SELECT password_hash FROM users WHERE id = ?');
  $stmt->bind_param('i', $user['id']);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();
  if (!$row || !password_verify($current, $row['password_hash'])) {
    fail('Current password is incorrect.', 403);
  }
  $hash = password_hash($next, PASSWORD_BCRYPT);
  $stmt = $conn->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
  $stmt->bind_param('si', $hash, $user['id']);
  $stmt->execute();
  // Drop all other sessions for this user; keep the current one.
  $tok = bearer();
  $stmt = $conn->prepare('DELETE FROM auth_tokens WHERE user_id = ? AND token <> ?');
  $stmt->bind_param('is', $user['id'], $tok);
  $stmt->execute();
  audit($user['id'], 'password_change');
  json(['ok' => true]);
}

/* ---- MANAGEMENT (admins only) ------------------------------------------- */

$me = require_auth($ADMIN);

if ($action === 'list' && method() === 'GET') {
  $rows = [];
  $sql = "SELECT id, name, email, role, phone, status, created_at,
                 (SELECT MAX(t.expires_at) FROM auth_tokens t WHERE t.user_id = users.id) AS session_until
            FROM users
           WHERE deleted_at IS NULL AND role <> 'customer'
        ORDER BY FIELD(role,'super_admin','admin','manager','tailor','editor','seller','employee'), name ASC";
  $res = $conn->query($sql);
  while ($res && $row = $res->fetch_assoc()) $rows[] = $row;
  json($rows);
}

if ($action === 'create' && method() === 'POST') {
  $b = body();
  $name = trim($b['name'] ?? '');
  $email = trim(strtolower($b['email'] ?? ''));
  $role = $b['role'] ?? 'employee';
  $phone = trim($b['phone'] ?? '');
  if ($name === '') fail('Name is required.');
  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('A valid email is required.');
  if (!in_array($role, $ROLES, true)) fail('Unknown role.');

  // Unique email (including soft-deleted, since the column is UNIQUE).
  $stmt = $conn->prepare('SELECT id, deleted_at FROM users WHERE email = ?');
  $stmt->bind_param('s', $email);
  $stmt->execute();
  if ($stmt->get_result()->fetch_assoc()) fail('A user with that email already exists.', 409);

  $plain = trim($b['password'] ?? '');
  if ($plain === '') $plain = temp_password();
  elseif (strlen($plain) < 8) fail('Password must be at least 8 characters.');
  $hash = password_hash($plain, PASSWORD_BCRYPT);
  $status = 'invited';

  $stmt = $conn->prepare('INSERT INTO users (name, email, password_hash, role, phone, status) VALUES (?,?,?,?,?,?)');
  $stmt->bind_param('ssssss', $name, $email, $hash, $role, $phone, $status);
  $stmt->execute();
  $id = $conn->insert_id;
  audit($me['id'], 'staff_create', 'user', $id, ['email' => $email, 'role' => $role]);
  json(['id' => $id, 'temp_password' => $plain], 201);
}

if ($action === 'update' && method() === 'POST') {
  $id = (int)($_GET['id'] ?? 0);
  $b = body();

  $stmt = $conn->prepare("SELECT id, role, status FROM users WHERE id = ? AND deleted_at IS NULL AND role <> 'customer'");
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $target = $stmt->get_result()->fetch_assoc();
  if (!$target) fail('User not found.', 404);

  $name = array_key_exists('name', $b) ? trim($b['name']) : null;
  $phone = array_key_exists('phone', $b) ? trim($b['phone']) : null;
  $role = array_key_exists('role', $b) ? $b['role'] : null;
  $status = array_key_exists('status', $b) ? $b['status'] : null;
  if ($role !== null && !in_array($role, $ROLES, true)) fail('Unknown role.');
  if ($status !== null && !in_array($status, $STATUSES, true)) fail('Unknown status.');

  // Lockout guards: don't strip the last super_admin, and don't demote/suspend yourself.
  $demoting = ($role !== null && $role !== 'super_admin' && $target['role'] === 'super_admin');
  $suspending = ($status !== null && $status !== 'active' && $target['status'] === 'active');
  if ($target['role'] === 'super_admin' && ($demoting || $suspending) && super_admin_count($conn) <= 1) {
    fail('This is the last active super admin — promote someone else first.', 409);
  }
  if ((int)$me['id'] === $id && ($demoting || $suspending)) {
    fail("You can't change your own role or status.", 409);
  }

  $sets = []; $types = ''; $vals = [];
  if ($name !== null)   { $sets[] = 'name = ?';   $types .= 's'; $vals[] = $name; }
  if ($phone !== null)  { $sets[] = 'phone = ?';  $types .= 's'; $vals[] = $phone; }
  if ($role !== null)   { $sets[] = 'role = ?';   $types .= 's'; $vals[] = $role; }
  if ($status !== null) { $sets[] = 'status = ?'; $types .= 's'; $vals[] = $status; }
  if (!$sets) fail('Nothing to update.');

  $types .= 'i'; $vals[] = $id;
  $stmt = $conn->prepare('UPDATE users SET ' . implode(', ', $sets) . ' WHERE id = ?');
  $stmt->bind_param($types, ...$vals);
  $stmt->execute();
  audit($me['id'], 'staff_update', 'user', $id, $b);
  json(['ok' => true]);
}

if ($action === 'reset' && method() === 'POST') {
  $id = (int)($_GET['id'] ?? 0);
  $stmt = $conn->prepare("SELECT id FROM users WHERE id = ? AND deleted_at IS NULL AND role <> 'customer'");
  $stmt->bind_param('i', $id);
  $stmt->execute();
  if (!$stmt->get_result()->fetch_assoc()) fail('User not found.', 404);

  $plain = temp_password();
  $hash = password_hash($plain, PASSWORD_BCRYPT);
  $stmt = $conn->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
  $stmt->bind_param('si', $hash, $id);
  $stmt->execute();
  // Invalidate their existing sessions so the old password stops working everywhere.
  $stmt = $conn->prepare('DELETE FROM auth_tokens WHERE user_id = ?');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  audit($me['id'], 'staff_reset_password', 'user', $id);
  json(['temp_password' => $plain]);
}

if ($action === 'deactivate' && method() === 'POST') {
  $id = (int)($_GET['id'] ?? 0);
  if ((int)$me['id'] === $id) fail("You can't deactivate your own account.", 409);

  $stmt = $conn->prepare("SELECT id, role FROM users WHERE id = ? AND deleted_at IS NULL AND role <> 'customer'");
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $target = $stmt->get_result()->fetch_assoc();
  if (!$target) fail('User not found.', 404);
  if ($target['role'] === 'super_admin' && super_admin_count($conn) <= 1) {
    fail('This is the last active super admin — promote someone else first.', 409);
  }

  $stmt = $conn->prepare('UPDATE users SET deleted_at = NOW(), status = "suspended" WHERE id = ?');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $stmt = $conn->prepare('DELETE FROM auth_tokens WHERE user_id = ?');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  audit($me['id'], 'staff_deactivate', 'user', $id);
  json(['ok' => true]);
}

fail('Unknown action', 404);
