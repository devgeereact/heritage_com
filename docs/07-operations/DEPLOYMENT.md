# Deployment

How HeritOS reaches production, what the server holds, how schemas are imported, and how to release and roll back. The most important fact first: **pushing to `main` deploys to production.** Work on a branch, open a pull request, and never test against real client records. Local development and staging are in [LOCAL-STAGING.md](LOCAL-STAGING.md); backups in [BACKUP-RECOVERY.md](BACKUP-RECOVERY.md).

Confirm the actual account, project, branch and environment before any remote mutation.

## Hosting

| Item | Value |
|---|---|
| Hosting | Namecheap shared hosting (cPanel) |
| Domain | heritclothing.com, served from the cPanel document root (never a subfolder) |
| DNS | Cloudflare, records on DNS only (grey cloud) so cPanel AutoSSL can issue certificates |
| Database | MySQL on the same server, host `localhost`, managed in phpMyAdmin |
| Mail | Mailbox hello@heritclothing.com on the hosting mail server |
| Secrets | DB, token, AI, mail and gateway credentials only in server `config.php`; FTP credentials only in GitHub repository secrets (`FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`) |

## Environments and promotion path

| Environment | Where | Data | Status |
|---|---|---|---|
| Local staging | One laptop: `php -S` plus local MariaDB or MySQL | Synthetic records only | Built ([LOCAL-STAGING.md](LOCAL-STAGING.md)) |
| Shared non-production | Not decided | Synthetic | Not built |
| Production | cPanel document root | Real client records | Live; deployed endpoint versions Unknown (A02) |

Promotion: feature branch > pull request > CI passes > merge to `main` > deploy job > manual uploads and SQL imports listed in the pull request > post-release checks ([PRODUCTION-CHECK.md](../09-release/PRODUCTION-CHECK.md)).

Still to build (Plans 2026, 04):

1. A shared non-production environment with synthetic clients and no real payment, email or WhatsApp actions, which shows its API URL, database and sender mode visibly before tests. Local staging covers this on one laptop; the app does not yet show which API it is using.
2. Compare required endpoint names and schema versions with the release manifest. Never copy `config.php` or discover credentials during a review.
3. Make application and PHP release versions consistent. The release manifest lists every endpoint still in use and which are retired. Never glob-upload all files, schemas, tests or the sample config.
4. Meaningful JS/JSX lint, PHP syntax and helper tests, and critical flow tests in CI.

## CI and deploy

- `.github/workflows/ci.yml`: on pull requests to `main` and pushes to `main`, Node 22, runs `npm ci`, `npm run lint`, `php -l` over `php-api`, `php php-api/tests/run.php` and `npm run build`.
- `.github/workflows/deploy.yml`: on every push to `main`, Node 22, runs `npm ci`, `npm run lint`, the PHP syntax check and helper tests, then `npm run build`; any failure stops the job before upload. It then copies **nine** PHP files into `dist/` (`_lib`, `api`, `auth`, `ai`, `products`, `customers`, `stats`, `tailoring`, `contact`), then FTP-uploads `dist/` to the document root with `SamKirkland/FTP-Deploy-Action`.
- The other **22** endpoints (account, ai_image, analytics, content, coupons, engage, export, inbox, loyalty, mail, marketing, orders, payments, referrals, reviews, settings, stock, store, suppliers, users, weather, whatsapp) reach the server only by hand upload through cPanel. Their live versions are Unknown (A02). Any change to one of them must be listed in the pull request as a manual upload.
- Also by hand, never by CI: `config.php`, `.htaccess` (SPA routing, `RewriteBase /`, source in `php-api/.htaccess`) and SQL imports.
- Deploy repeats the checks inside its own job rather than waiting on the CI workflow, so the trigger stays a plain push to `main` (A14, changed on `feat/plans-2026-phase1`). Upload order matters when `_lib.php` gains functions: CI uploads `_lib.php`, so hand-uploaded endpoints that call the new functions (for example `account.php` and `store.php` after phase 1) go up after the deploy finishes, never before. Branch protection on `main` is Unknown and must be checked on GitHub, not assumed.
- Watch the repository Actions tab after a merge; the site is usually live within one to two minutes.

Older notes said "deploys only push dist/" and an older php-api/README.md said no PHP is auto-deployed. Both were wrong: the nine files above are deployed by CI (A19, fixed).

## Server configuration

`config.php` lives only in the server document root, copied from `php-api/config.sample.php`. It is gitignored and never copied between machines. Settings it holds (names only):

- Database: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`. cPanel prefixes names (the sample uses `devgeereact_heritage_com`).
- Debug: `GK_DEBUG` (false in production).
- Tokens and throttling: `TOKEN_SECRET`, `TOKEN_TTL_DAYS`, `LOGIN_THROTTLE_WINDOW`, `LOGIN_MAX_PER_IP`, `LOGIN_MAX_PER_ACCOUNT`, `PIN_MAX_PER_IP`, `PIN_MAX_GLOBAL`.
- Customer throttling: `CUSTOMER_LOGIN_MAX_PER_IP` (default 10), `CUSTOMER_LOGIN_MAX_PER_PHONE` (default 5), `TRACK_MAX_PER_IP` (default 20), all over `LOGIN_THROTTLE_WINDOW`. 0 switches a check off.
- CORS: `CORS_ORIGIN`, and `ALLOW_LOCALHOST_CORS` (default off). Switch it on only for an agreed session that points development at production, and off again afterwards (A15).
- Customer references: `ALLOW_LEGACY_ORDER_CODE_LOOKUP` (default true when unset). While true, tracking and customer sign-in also accept the old sequential `ORD-` code as well as the random public reference. Set it to false once customers have their public references (A06).
- AI: `OPENROUTER_KEY`, `OR_MODEL`, `OR_MODELS`, `OR_REFERER`, `OR_TITLE`, `IMAGE_PROVIDER`, `OR_IMAGE_MODEL`, `OPENAI_IMAGE_KEY`, `STABILITY_KEY`. The old project memory recorded `OR_MODEL` as `anthropic/claude-sonnet-4.6` on the server; the sample default differs. The live value is Unknown from the repo.
- Mail: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_FROM_NAME`, `IMAP_HOST`, `IMAP_PORT`, `IMAP_USER`, `IMAP_PASS`. The mail host recorded previously is premium152.web-hosting.com. Blank `SMTP_HOST` falls back to PHP `mail()`; blank `IMAP_HOST` disables the inbox.
- WhatsApp: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN`. Blank token means wa.me fallback mode. The webhook is `/whatsapp.php?action=webhook`.
- Payments: `PAYMENT_PROVIDER`, `PAYSTACK_SECRET`, `PAYSTACK_PUBLIC`, `FLW_SECRET`, `FLW_PUBLIC`, `STRIPE_SECRET`, `STRIPE_CURRENCY`, `STRIPE_USD_RATE`.
- Promotions: `LOYALTY_RATE`, `REFERRAL_REWARD` (0 means off).
- `OPENWEATHER_API_KEY`, `OPENWEATHER_UNITS`: present in the sample but unused; weather.php calls Open-Meteo.

Frontend environment: `VITE_API_BASE` only, documented in `.env.example`; production builds ignore it.

## Database and schema files

- First install: import `php-api/schema.sql` in phpMyAdmin. It creates the foundation and module tables and seeds one `super_admin`, `dev@heritclothing.com`.
- Where the full `schema.sql` aborts on a stale legacy table, import `schema_modules.sql` instead; it creates only the later-module tables.
- Then apply `schema_phase2.sql` to `schema_phase17.sql` in numeric order (later phases alter tables created earlier). Local staging imports exactly this order without errors (10 October 2026). Which phases the live database has is Unknown.
- `schema_phase17.sql` (from `feat/phase1b-staging`) adds `public_ref` to `orders` and `tailoring_orders` with a backfill and UNIQUE index, and `company` to `enquiries`. Import it before uploading the matching `store.php`, `account.php`, `orders.php` and `settings.php`. The CI-deployed `_lib.php`, `tailoring.php` and `contact.php` check for the new columns and keep working without them, so the merge itself does not depend on the import.
- `users.php`, `mail.php` and `inbox.php` need no new tables.
- `CREATE TABLE IF NOT EXISTS` does not upgrade existing columns, and re-running a file is not automatically safe. Record which versions are applied and their dependencies. Keep versioned SQL in `php-api/`.
- Seed password: set it straight after import. Generate a hash locally with `php -r 'echo password_hash("CHOOSE-A-STRONG-PASSWORD", PASSWORD_DEFAULT), PHP_EOL;'`, then run `UPDATE users SET password_hash = '<hash>' WHERE email = 'dev@heritclothing.com';`. Never commit or share the real password.
- Smoke test: `https://heritclothing.com/api.php` returns a JSON array.

Table and schema inventory: [DATA-MODEL.md](../02-architecture/DATA-MODEL.md#table-inventory).

## Branches, worktrees and machines

- Pushing `main` deploys. Work on a feature branch, push the branch and open a pull request. Never push, merge or rebase `main` without explicit authority. Never force-push a shared branch.
- Start work with `git pull --ff-only`. One concern per commit; push each verified batch.
- Code moves between the Mac (owns env files and secrets) and the Ubuntu build machine only through GitHub. Env files, keys and sessions never move and are never committed.
- No extra worktrees by default; one isolated branch or worktree only when concurrency needs it. Before removing any branch or worktree, inspect dirty and ignored work, compare commits to the base and confirm nothing unique is lost.
- Baseline on 10 October 2026: one worktree on `main` at d91951c, no other local branches. Phase work is on stacked branches listed in [ROADMAP.md](../08-change-management/ROADMAP.md).

## Release procedure

Before any production change:

1. Snapshot the database and private files; confirm the restore route works ([BACKUP-RECOVERY.md](BACKUP-RECOVERY.md)).
2. Record the current deployed version and the endpoint and schema versions in the manifest.
3. Use backward-compatible schema changes; prepare maintenance or read-only handling if needed.
4. List every manual upload (endpoints outside the nine CI files) and SQL import in the pull request.
5. Merge only after CI passes.

After release: run the checks in [PRODUCTION-CHECK.md](../09-release/PRODUCTION-CHECK.md).

## Rollback

- Frontend and the nine CI endpoints: revert the merge commit on a branch, open a pull request, merge after CI; the deploy redeploys the previous build.
- Manually uploaded endpoints: keep the previous file version from the release snapshot and re-upload it.
- Schema: restore from the pre-release snapshot only when a backward-compatible fix is not possible.
- If a gate fails in production, disable the affected public action and keep a truthful enquiry channel rather than advertising working bookings or payments.

## Troubleshooting

- **Site 404 or wrong content:** a Cloudflare record may be orange-cloud (set it to grey) or point at the wrong IP. Hard refresh or use a private window to rule out cache.
- **"Database connection failed":** wrong credentials in `config.php`, or the DB user lacks privileges.
- **Endpoint errors on GET:** the table it queries does not exist; import the right schema file.
- **Deploy fails:** open the Actions run. An `npm ci` failure usually means `package-lock.json` is out of step; an FTP auth failure means the three repository secrets do not match the FTP account.
- **HTTPS warning:** SSL is still issuing; run cPanel > SSL/TLS Status > Run AutoSSL.
- **Enquiries page says it could not load enquiries:** the request to `contact.php?action=list` failed (A17 replaced the old upload instruction with this plain message and a Retry button). The browser console has the technical detail. Usual causes: `contact.php` missing on the server, the `enquiries` table missing, or an expired session.
