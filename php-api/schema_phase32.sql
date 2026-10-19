-- HeritOS: Phase 32 migration (policy defaults decided under D-025, 19 October 2026).
-- Additive; safe to re-run. Import via phpMyAdmin AFTER schema_phase31.sql.
--
-- Fills settings that are still EMPTY with the D-025 defaults. A value the owner
-- has already saved is never changed: every statement only writes where the
-- current value is missing or empty. Each value stays editable in Settings.
--
--   Retention (days; the job deletes nothing until these are set, K-18):
--     customer sessions ......... 30 after they expire
--     access attempts ........... 90
--     audit log ................. 365 (the minimum allowed is 90)
--     WhatsApp log .............. 365
--     abandoned carts ........... 30
--     restock waitlist .......... 180
--     closed enquiries .......... 730 (no job, quote or appointment linked)
--     section usage counts ...... 400 (a year can be compared with the last)
--   Quotes:
--     quote_validity_days ....... 14
--     deposit_policy_text ....... wording that states the existing rule, no amount
--
-- Dry run first (shows what would change; empty or missing rows are filled):
--   SELECT skey, svalue FROM settings WHERE skey LIKE 'retention\_%'
--      OR skey IN ('quote_validity_days', 'deposit_policy_text', 'policy_defaults_d025');

INSERT INTO settings (skey, svalue) VALUES
  ('retention_customer_sessions_days', '30'),
  ('retention_access_attempts_days', '90'),
  ('retention_audit_log_days', '365'),
  ('retention_whatsapp_log_days', '365'),
  ('retention_abandoned_carts_days', '30'),
  ('retention_waitlist_days', '180'),
  ('retention_closed_enquiries_days', '730'),
  ('retention_usage_daily_days', '400'),
  ('quote_validity_days', '14'),
  ('deposit_policy_text', 'Work starts once the deposit shown on this quote is paid. The balance is due before collection.'),
  -- Marker for release_check.php --db (schema_phase32.sql applied).
  ('policy_defaults_d025', '2026-10-19')
ON DUPLICATE KEY UPDATE
  svalue = IF(svalue IS NULL OR svalue = '', VALUES(svalue), svalue);
