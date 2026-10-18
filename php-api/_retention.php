<?php
/**
 * HeritOS: data retention plan (K-18). Pure helpers, no database and no I/O.
 *
 * Each category is one settings key holding a number of days. Empty, 0 or an
 * invalid value means OFF: keep forever. Only expired staff and legacy portal
 * tokens are seeded with a period (30 days past expiry, schema_phase30.sql);
 * every other period is an owner decision (docs/DATA-PRIVACY.md).
 *
 * retention_plan() turns the settings and a "now" into the statements the CLI
 * runner (retention.php) executes: a COUNT for the dry run and a batched DELETE
 * for --apply, both with the cutoff as a placeholder. Business and tax records
 * (jobs, payments, ledger, quotes, orders, measurements, customers) are never
 * planned: RETENTION_PROTECTED_TABLES lists them and retention_plan() refuses a
 * step that names one, even if the map below were edited by mistake.
 *
 * Times: the cutoff is a UTC 'Y-m-d H:i:s' string. DATETIME columns here hold
 * UTC already; the runner sets the session time zone to +00:00 so TIMESTAMP
 * columns compare in UTC too.
 */

const RETENTION_MAX_DAYS = 3650;   // ten years; anything longer is treated as a typo
const RETENTION_BATCH = 500;       // rows per DELETE statement

/**
 * category => [key, label, min days, steps]. Each step: table, date column, an
 * optional extra condition (static SQL, no input) and the columns it needs so
 * the runner can skip a table an older database does not have yet.
 */
const RETENTION_CATEGORIES = [
  'expired_tokens' => [
    'key' => 'retention_expired_tokens_days',
    'label' => 'Expired staff sign-in tokens and legacy portal tokens, days after expiry',
    'min' => 1,
    'steps' => [
      ['table' => 'auth_tokens', 'column' => 'expires_at', 'where' => '', 'needs' => ['auth_tokens.expires_at']],
      ['table' => 'customer_tokens', 'column' => 'expires_at', 'where' => '', 'needs' => ['customer_tokens.expires_at']],
    ],
  ],
  'customer_sessions' => [
    'key' => 'retention_customer_sessions_days',
    'label' => 'Expired client portal sessions (hold an IP address), days after expiry',
    'min' => 1,
    'steps' => [
      ['table' => 'customer_sessions', 'column' => 'expires_at', 'where' => '', 'needs' => ['customer_sessions.expires_at']],
    ],
  ],
  'access_attempts' => [
    'key' => 'retention_access_attempts_days',
    'label' => 'Client access attempts and invite links (hold an IP address), days after expiry',
    'min' => 1,
    'steps' => [
      ['table' => 'customer_access_challenges', 'column' => 'expires_at', 'where' => '', 'needs' => ['customer_access_challenges.expires_at']],
    ],
  ],
  'audit_log' => [
    'key' => 'retention_audit_log_days',
    'label' => 'Audit log, including failed sign-in rows with IP addresses, days after the entry',
    // Sign-in throttling reads the last 15 minutes and investigations need history.
    'min' => 90,
    'steps' => [
      ['table' => 'audit_log', 'column' => 'created_at', 'where' => '', 'needs' => ['audit_log.created_at']],
    ],
  ],
  'whatsapp_log' => [
    'key' => 'retention_whatsapp_log_days',
    'label' => 'WhatsApp message log, days after the message',
    'min' => 1,
    'steps' => [
      ['table' => 'whatsapp_messages', 'column' => 'created_at', 'where' => '', 'needs' => ['whatsapp_messages.created_at']],
    ],
  ],
  'abandoned_carts' => [
    'key' => 'retention_abandoned_carts_days',
    'label' => 'Abandoned shop carts, days after the last change',
    'min' => 1,
    'steps' => [
      // One row per phone, upserted, so the last change is the trigger.
      ['table' => 'abandoned_carts', 'column' => 'updated_at', 'where' => '', 'needs' => ['abandoned_carts.updated_at']],
    ],
  ],
  'waitlist' => [
    'key' => 'retention_waitlist_days',
    'label' => 'Restock waitlist sign-ups, days after the sign-up',
    'min' => 1,
    'steps' => [
      ['table' => 'waitlist', 'column' => 'created_at', 'where' => '', 'needs' => ['waitlist.created_at']],
    ],
  ],
  'closed_enquiries' => [
    'key' => 'retention_closed_enquiries_days',
    'label' => 'Closed enquiries that never became a job, days after the last change',
    'min' => 1,
    'steps' => [
      // Closed, never converted, and not referenced by a quote, job or appointment.
      ['table' => 'enquiries', 'column' => 'updated_at',
       'where' => "status = 'closed' AND job_id IS NULL AND converted_at IS NULL"
         . ' AND NOT EXISTS (SELECT 1 FROM quotes q WHERE q.enquiry_id = enquiries.id)'
         . ' AND NOT EXISTS (SELECT 1 FROM tailoring_orders t WHERE t.enquiry_id = enquiries.id)'
         . ' AND NOT EXISTS (SELECT 1 FROM appointments a WHERE a.enquiry_id = enquiries.id)',
       'needs' => ['enquiries.updated_at', 'enquiries.status', 'enquiries.job_id', 'enquiries.converted_at',
         'quotes.enquiry_id', 'tailoring_orders.enquiry_id', 'appointments.enquiry_id']],
    ],
  ],
];

/** Business and tax records. Never deleted by the retention job. */
const RETENTION_PROTECTED_TABLES = [
  'tailoring_orders', 'tailoring_events', 'tailoring_groups', 'job_payments', 'job_handovers', 'job_handover_items',
  'job_items', 'job_samples', 'job_messages', 'job_change_requests', 'job_feedback',
  'payments', 'expenses', 'quotes', 'quote_items', 'orders', 'order_items', 'store_credit', 'gift_cards',
  'coupon_redemptions', 'measurement_sets', 'measurement_templates', 'customers', 'companies', 'company_contacts',
  'appointments', 'users', 'settings',
];

/** The settings keys, in display order. */
function retention_keys() {
  return array_values(array_map(fn($c) => $c['key'], RETENTION_CATEGORIES));
}

/**
 * Parse one stored or submitted value. Returns ['days' => int|null, 'error' => string|null]:
 * days null means OFF. Empty, null and 0 are OFF without an error; text, decimals,
 * negatives, values under the category minimum or over RETENTION_MAX_DAYS are OFF
 * with an error (settings.php refuses them; the runner reports and skips them).
 */
function retention_parse_days($category, $value) {
  if (!isset(RETENTION_CATEGORIES[$category])) return ['days' => null, 'error' => 'unknown category'];
  if ($value === null || $value === false) return ['days' => null, 'error' => null];
  if (is_int($value)) $value = (string)$value;
  if (!is_string($value)) return ['days' => null, 'error' => 'must be a whole number of days'];
  $value = trim($value);
  if ($value === '' || $value === '0') return ['days' => null, 'error' => null];
  if (!preg_match('/^[0-9]{1,6}$/', $value)) return ['days' => null, 'error' => 'must be a whole number of days'];
  $days = (int)$value;
  if ($days === 0) return ['days' => null, 'error' => null];
  $min = RETENTION_CATEGORIES[$category]['min'];
  if ($days < $min || $days > RETENTION_MAX_DAYS) {
    return ['days' => null, 'error' => "must be $min to " . RETENTION_MAX_DAYS . ' days, or empty to keep forever'];
  }
  return ['days' => $days, 'error' => null];
}

/** UTC cutoff 'Y-m-d H:i:s' for $days before the Unix time $now. */
function retention_cutoff($now, $days) {
  return gmdate('Y-m-d H:i:s', (int)$now - (int)$days * 86400);
}

/**
 * The plan for $settings (skey => svalue, as read from the settings table) at the
 * Unix time $now. Returns ['steps' => [...], 'off' => [category...], 'invalid' =>
 * [category => error]]. Each step: category, key, days, cutoff, table, column,
 * count_sql, delete_sql, params (the cutoff, bound as one 's'), needs.
 */
function retention_plan(array $settings, $now) {
  $out = ['steps' => [], 'off' => [], 'invalid' => []];
  foreach (RETENTION_CATEGORIES as $cat => $def) {
    $p = retention_parse_days($cat, $settings[$def['key']] ?? null);
    if ($p['error'] !== null) { $out['invalid'][$cat] = $p['error']; continue; }
    if ($p['days'] === null) { $out['off'][] = $cat; continue; }
    $cutoff = retention_cutoff($now, $p['days']);
    foreach ($def['steps'] as $s) {
      if (in_array($s['table'], RETENTION_PROTECTED_TABLES, true)) {
        throw new LogicException("Retention map names protected table {$s['table']}");
      }
      if (!preg_match('/^[a-z_]+$/', $s['table']) || !preg_match('/^[a-z_]+$/', $s['column'])) {
        throw new LogicException('Retention map has an unsafe identifier');
      }
      $where = "`{$s['column']}` < ?" . ($s['where'] !== '' ? " AND ({$s['where']})" : '');
      $out['steps'][] = [
        'category' => $cat, 'key' => $def['key'], 'days' => $p['days'], 'cutoff' => $cutoff,
        'table' => $s['table'], 'column' => $s['column'],
        'count_sql' => "SELECT COUNT(*) AS n FROM `{$s['table']}` WHERE $where",
        'delete_sql' => "DELETE FROM `{$s['table']}` WHERE $where LIMIT " . RETENTION_BATCH,
        'params' => [$cutoff], 'needs' => $s['needs'],
      ];
    }
  }
  return $out;
}
