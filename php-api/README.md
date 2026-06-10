# HeritOS server files (`php-api/`)

These PHP files and the SQL schema are **source-controlled here** but are **not
auto-deployed**. The GitHub Actions workflow only uploads `dist/` (the React
build). You place these on the server **by hand, once**, in the cPanel document
root, exactly as the project's `CLAUDE.md` describes.

## One-time server setup

1. **Create the database** (cPanel → MySQL Databases): a DB + user, user added
   to the DB with all privileges. Note the names (cPanel prefixes them, e.g.
   `heritcl_heritos`).
2. **Import the schema**: cPanel → phpMyAdmin → select the DB → SQL tab → paste
   `schema.sql` → Go. This creates `items`, `users`, `auth_tokens`, `audit_log`
   and seeds the super-admin.
3. **Create `config.php`** in the document root: copy `config.sample.php` to
   `config.php`, fill in the real DB credentials, `TOKEN_SECRET`, and (when
   ready) `OPENROUTER_KEY`. **Never commit `config.php`** — it is gitignored.
4. **Upload** `_lib.php`, `api.php`, `auth.php`, `ai.php`, `.htaccess`, and your
   `config.php` to the document root via cPanel File Manager / FTP.

## Smoke test (proves the pipe)

- Visit `https://heritclothing.com/api.php` → should return a JSON array
  (the two seeded items, or `[]` once cleared).
- The React app calls these through `API_BASE` (see `src/context/constants.js`):
  dev → `https://heritclothing.com`, production → relative (same origin).

## Seed login

`dev@heritclothing.com` / `Testing123!` (`super_admin`). Change the password
immediately in production.

## Files

| File | Purpose |
|---|---|
| `config.sample.php` | Template for the server-only `config.php` (DB + OpenRouter + CORS). |
| `_lib.php` | Shared helpers: CORS, JSON, auth/token validation, audit log. |
| `api.php` | Smoke-test/default endpoint — `items` CRUD. |
| `auth.php` | Login / logout / me — issues and validates session tokens. |
| `ai.php` | OpenRouter proxy. Key stays server-side; staff-only. |
| `schema.sql` | Foundation tables + super-admin seed. |
| `.htaccess` | SPA routing (`RewriteBase /`). |
