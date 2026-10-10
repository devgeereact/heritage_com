# HeritOS server files (`php-api/`)

These PHP files and the SQL schema are **source-controlled here**. Deployment is
split: `.github/workflows/deploy.yml` uploads nine of them with every push to
`main` (`_lib`, `api`, `auth`, `ai`, `products`, `customers`, `stats`,
`tailoring`, `contact`). Every other endpoint, `config.php`, `.htaccess` and the
SQL imports are placed by hand in the cPanel document root. The full procedure
and upload order are in [docs/OPERATIONS.md](../docs/OPERATIONS.md).

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
  dev → `VITE_API_BASE`, defaulting to the local staging API on
  `http://127.0.0.1:8088` (`npm run staging:serve`); production → relative (same origin).

## Seed login

`schema.sql` seeds one `super_admin`, `dev@heritclothing.com`. Give it your own
password as soon as the import finishes. Generate a hash on any machine with PHP
(replace the placeholder; do not commit or share the real password):

```bash
php -r 'echo password_hash("CHOOSE-A-STRONG-PASSWORD", PASSWORD_DEFAULT), PHP_EOL;'
```

then run in phpMyAdmin:

```sql
UPDATE users SET password_hash = '<paste the hash>' WHERE email = 'dev@heritclothing.com';
```

## Files

| File | Purpose |
|---|---|
| `config.sample.php` | Template for the server-only `config.php` (DB + OpenRouter + CORS). |
| `_lib.php` | Shared helpers: CORS, JSON, auth/token validation, audit log. |
| `api.php` | Smoke-test/default endpoint: `items` list (public) and insert (staff session). |
| `auth.php` | Login / logout / me: issues and validates session tokens; throttles failed email and PIN logins. |
| `ai.php` | OpenRouter proxy. Key stays server-side; staff-only. |
| `tailoring.php` | Tailoring & Production — orders, stages, measurements (staff). |
| `products.php` | Products & Variants — catalogue, size×colour matrix, stock (staff). |
| `contact.php` | Public enquiry submit + staff inbox (list/status). |
| `schema.sql` | All tables + seeds (foundation, tailoring, catalogue, enquiries). |
| `.htaccess` | SPA routing (`RewriteBase /`). |
| `tests/run.php` | CLI tests for the pure helpers in `_lib.php`: `php php-api/tests/run.php`. Not deployed. |

When a change touches an endpoint outside the nine CI files, upload that file by
hand after the deploy finishes, and import any new schema sections so new tables
exist. List every manual upload in the pull request.
