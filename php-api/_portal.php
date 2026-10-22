<?php
/**
 * HeritOS: customer sessions and object-level access for the customer portal
 * (Phase 3). Requires _lib.php; pulls in _jobs.php and _domain.php.
 *
 * Sessions: a random 48-hex token goes to the customer once; only its sha256
 * is stored in customer_sessions (schema_phase24.sql). Sessions expire after
 * customer_session_days (setting, default 7) and can be revoked.
 *
 * Legacy: raw tokens in customer_tokens (from the old phone + order code login)
 * are accepted only while ALLOW_LEGACY_ORDER_CODE_LOOKUP is on (default on until
 * the owner switches it off).
 *
 * Object-level rule: every portal lookup filters by the signed-in customer. A
 * job, order, message or measurement that belongs to someone else answers the
 * same 404 as one that does not exist.
 */
require_once __DIR__ . '/_jobs.php';
require_once __DIR__ . '/_company.php';

/** Is the old phone + order code login (and its raw tokens) still allowed? */
function legacy_portal_login_enabled() {
  return (bool)cfg('ALLOW_LEGACY_ORDER_CODE_LOOKUP', true);
}

/** Session length in days from the setting (1 to 90, default 7). */
function customer_session_days() {
  $n = (int)setting_get('customer_session_days', '7');
  return ($n >= 1 && $n <= 90) ? $n : 7;
}

/** Issue a session for a customer. Returns the raw token (shown once). */
function customer_session_issue($customerId, $via) {
  $token = bin2hex(random_bytes(24));
  $days = customer_session_days();
  db_exec('INSERT INTO customer_sessions (token_hash, customer_id, created_via, expires_at, last_seen_at, ip)
           VALUES (?,?,?, UTC_TIMESTAMP() + INTERVAL ? DAY, UTC_TIMESTAMP(), ?)',
    'sisis', token_hash($token), (int)$customerId, $via, $days, client_ip());
  return $token;
}

/**
 * The signed-in customer, or 401. Returns the customer row with two extra keys:
 * _session_id (customer_sessions.id, or null for a legacy token) and _legacy.
 */
function require_customer_session() {
  $tok = bearer();
  if (!$tok || strlen($tok) > 128) fail('Please sign in', 401);
  if (has_table('customer_sessions')) {
    $c = db_row('SELECT c.*, s.id AS _session_id FROM customer_sessions s JOIN customers c ON c.id = s.customer_id
                  WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > UTC_TIMESTAMP() AND c.deleted_at IS NULL',
      's', token_hash($tok));
    if ($c) {
      db_exec('UPDATE customer_sessions SET last_seen_at = UTC_TIMESTAMP() WHERE id = ? AND (last_seen_at IS NULL OR last_seen_at < UTC_TIMESTAMP() - INTERVAL 5 MINUTE)',
        'i', (int)$c['_session_id']);
      $c['_session_id'] = (int)$c['_session_id'];
      $c['_legacy'] = false;
      return $c;
    }
  }
  if (legacy_portal_login_enabled() && preg_match('/^[0-9a-f]{48}$/', $tok)) {
    $c = db_row('SELECT c.* FROM customer_tokens t JOIN customers c ON c.id = t.customer_id
                  WHERE t.token = ? AND t.expires_at > NOW() AND c.deleted_at IS NULL', 's', $tok);
    if ($c) { $c['_session_id'] = null; $c['_legacy'] = true; return $c; }
  }
  fail('Your session has expired. Please sign in again.', 401);
}

/**
 * The signed-in customer behind the bearer token, or null (never fails). Used by
 * public endpoints that offer extra things to a verified customer, such as store
 * credit at checkout, without requiring sign-in for everyone.
 */
function customer_session_optional() {
  $tok = bearer();
  if (!$tok || strlen($tok) > 128 || !has_table('customer_sessions')) return null;
  $c = db_row('SELECT c.id, c.name, c.phone FROM customer_sessions s JOIN customers c ON c.id = s.customer_id
                WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > UTC_TIMESTAMP() AND c.deleted_at IS NULL',
    's', token_hash($tok));
  return $c ?: null;
}

/** Revoke the session behind the current bearer token (logout). */
function customer_session_revoke_current(array $me) {
  if (!empty($me['_session_id'])) {
    db_exec('UPDATE customer_sessions SET revoked_at = UTC_TIMESTAMP() WHERE id = ? AND revoked_at IS NULL', 'i', (int)$me['_session_id']);
  } elseif (!empty($me['_legacy'])) {
    db_exec('DELETE FROM customer_tokens WHERE token = ?', 's', (string)bearer());
  }
}

/** Revoke every session (and legacy token) for a customer. Returns how many sessions were revoked. */
function customer_sessions_revoke_all($customerId) {
  $n = 0;
  if (has_table('customer_sessions')) {
    $n = db_exec('UPDATE customer_sessions SET revoked_at = UTC_TIMESTAMP() WHERE customer_id = ? AND revoked_at IS NULL', 'i', (int)$customerId)->affected_rows;
  }
  db_exec('DELETE FROM customer_tokens WHERE customer_id = ?', 'i', (int)$customerId);
  return $n;
}

/** Is the company portal on (contacts and wearers see company jobs)? Off by default; the owner turns it on per pilot. */
function company_portal_on() {
  return has_column('tailoring_orders', 'job_kind') && setting_flag('company_portal_enabled', false);
}

/**
 * How this customer may see a job: ['owner', null] for the job's own client
 * (individual jobs), ['contact', contact row] for an active company contact
 * with can_view_jobs, ['wearer', item row] for a wearer of one of its items,
 * or [null, null]. A company job is never reached through customer_id alone,
 * so a deactivated primary contact loses access at once (Phase 5, BR-28).
 */
function portal_job_access(array $me, array $job) {
  $isCompany = ($job['job_kind'] ?? 'individual') === 'company';
  if (!$isCompany) return (int)$job['customer_id'] === (int)$me['id'] ? ['owner', null] : [null, null];
  if (!company_portal_on()) return [null, null];
  $k = db_row('SELECT * FROM company_contacts WHERE company_id = ? AND customer_id = ? AND active = 1', 'ii', (int)$job['company_id'], (int)$me['id']);
  if ($k && contact_can($k, 'view_jobs')) return ['contact', $k];
  $it = db_row("SELECT * FROM job_items WHERE job_id = ? AND wearer_customer_id = ? AND item_stage <> 'cancelled' ORDER BY id LIMIT 1", 'ii', (int)$job['id'], (int)$me['id']);
  if ($it) return ['wearer', $it];
  return [null, null];
}

/**
 * The job this customer may see, by its public reference, or the generic 404.
 * $allow lists the kinds of access the calling action accepts (default: the
 * job's own client only), so company contacts and wearers reach only the
 * actions written for them; anything else answers like a missing job.
 * The result carries portal_access and, for contacts and wearers, the row.
 */
function portal_job(array $me, $ref, array $allow = ['owner']) {
  $ref = public_ref_normalise($ref);
  $job = $ref === '' ? null : db_row('SELECT * FROM tailoring_orders WHERE public_ref = ? AND deleted_at IS NULL', 's', $ref);
  [$access, $row] = $job ? portal_job_access($me, $job) : [null, null];
  if (!$access || !in_array($access, $allow, true)) fail('Not found', 404);
  $job['job_stage'] = job_stage_of($job);
  $job['portal_access'] = $access;
  $job['portal_contact'] = $access === 'contact' ? $row : null;
  $job['portal_item'] = $access === 'wearer' ? $row : null;
  return $job;
}

/** Object-level check for one job (any kind of access). */
function portal_can_access_job(array $me, array $job) {
  return portal_job_access($me, $job)[0] !== null;
}

/**
 * A single-use owner invite link for one client (Phase 3; reused for Phase 5
 * wearers). Records the challenge and the audit entry; returns the link, its
 * expiry and a ready-to-send message with a wa.me link when the client has a
 * phone. $c is a customers row with id, name and phone.
 */
function customer_invite_create(array $c, $userId) {
  $cid = (int)$c['id'];
  $hours = max(1, min(168, (int)cfg('ACCESS_INVITE_HOURS', 24)));
  $invite = bin2hex(random_bytes(32));
  db_exec("INSERT INTO customer_access_challenges (challenge_hash, customer_id, channel, expires_at, status, created_by, ip)
           VALUES (?,?, 'invite', UTC_TIMESTAMP() + INTERVAL ? HOUR, 'pending', ?, ?)", 'siiis', token_hash($invite), $cid, $hours, (int)$userId, client_ip());
  audit($userId, 'customer_access_invite', 'customer', $cid, ['hours' => $hours]);
  $site = rtrim((string)cfg('SITE_URL', CORS_ORIGIN), '/');
  $url = $site . '/account?invite=' . $invite;
  $phone = wa_normalize_phone($c['phone'] ?? '');
  $text = 'Hello ' . trim(explode(' ', trim((string)$c['name']))[0] ?? '') . ', here is your private Herit Clothing link to follow your order. It works once and expires in '
    . $hours . ' hours: ' . $url;
  return ['invite_url' => $url, 'expires_at_local' => lagos_iso(time() + $hours * 3600), 'single_use' => true,
          'message_text' => $text, 'wa_link' => $phone !== '' ? 'https://wa.me/' . $phone . '?text=' . rawurlencode($text) : null];
}
