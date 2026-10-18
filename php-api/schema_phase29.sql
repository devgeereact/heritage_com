-- HeritOS: Phase 29 migration (data retention settings, K-18).
-- Additive; safe to re-run. Import via phpMyAdmin AFTER schema_phase28.sql.
--
-- One settings key per retention category, holding a number of days. Empty or
-- 0 means keep forever, so the retention job (retention.php, run by cron)
-- deletes nothing in that category. Every period is an owner decision
-- (docs/DATA-PRIVACY.md, retention schedule) and starts empty, except expired
-- staff sign-in tokens and legacy portal tokens: they are not personal history,
-- so they start at 30 days past their own expires_at.
--
-- INSERT IGNORE never overwrites a value the owner has already saved. No table
-- or column changes.
--
-- Dry run (read-only), record the result before importing:
--   SELECT skey, svalue FROM settings WHERE skey LIKE 'retention\_%';

INSERT IGNORE INTO settings (skey, svalue) VALUES
  ('retention_expired_tokens_days', '30'),
  ('retention_customer_sessions_days', ''),
  ('retention_access_attempts_days', ''),
  ('retention_audit_log_days', ''),
  ('retention_whatsapp_log_days', ''),
  ('retention_abandoned_carts_days', ''),
  ('retention_waitlist_days', ''),
  ('retention_closed_enquiries_days', '');
