-- HeritOS: Phase 33 migration (staff sign in with Clerk, email code).
-- Additive; safe to re-run. Import via phpMyAdmin AFTER schema_phase32.sql.
--
-- users.clerk_user_id: the Clerk user id (`sub`), set on a person's first sign-in when their
-- verified email matches an active staff row. Unique and nullable. No existing column is changed
-- or dropped (password_hash stays until the owner confirms the old sign-in can go).
--
-- Dry run (read-only), record the result before importing:
--   SHOW COLUMNS FROM users LIKE 'clerk_user_id';

ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_user_id VARCHAR(64) NULL DEFAULT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_clerk_user_id ON users (clerk_user_id);
