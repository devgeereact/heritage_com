# Deployment

How HeritOS reaches production, what the server holds, how schemas are imported, and how to release and roll back. The most important fact first: **pushing to `main` deploys to production.** Work on a branch, open a pull request, and never test against real client records. Local development and staging are in [LOCAL-STAGING.md](LOCAL-STAGING.md); backups and monitoring further down this file.

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

Promotion: feature branch > pull request > CI passes > merge to `main` > deploy job > manual uploads and SQL imports in the order the pull request gives (some come before the merge; see [Owner actions per pull request](#owner-actions-per-pull-request)) > post-release checks ([qa/LAUNCH-CHECKLIST.md](../qa/LAUNCH-CHECKLIST.md#production-check)).

Still to build (Plans 2026, 04):

1. A shared non-production environment with synthetic clients and no real payment, email or WhatsApp actions, which shows its API URL, database and sender mode visibly before tests. Local staging covers this on one laptop; the app does not yet show which API it is using.
2. Compare required endpoint names and schema versions with the release manifest. Never copy `config.php` or discover credentials during a review.
3. Make application and PHP release versions consistent. The release manifest lists every endpoint still in use and which are retired. Never glob-upload all files, schemas, tests or the sample config.
4. Meaningful JS/JSX lint (A13, blocked) and critical flow tests in CI. PHP syntax, helper tests and the documentation check already run there; the Phase 2 end-to-end script runs only against local staging.

## CI and deploy

- `.github/workflows/ci.yml`: on pull requests to `main` and pushes to `main`, Node 22, runs `npm ci`, `npm run lint`, `npm run build`, `php -l` over `php-api`, `php php-api/tests/run.php` and the documentation check `node scripts/check-docs.mjs` ([docs/README.md](README.md#how-the-docs-stay-current)).
- `.github/workflows/deploy.yml`: on every push to `main`, Node 22, runs `npm ci`, `npm run lint`, the PHP syntax check and helper tests, then `npm run build`; any failure stops the job before upload. It then copies the PHP files listed in the workflow into `dist/`: the original **nine** (`_lib`, `api`, `auth`, `ai`, `products`, `customers`, `stats`, `tailoring`, `contact`) and, on the Phase 2 branch, **seven** more (`_domain`, `_jobs`, `today`, `enquiries`, `measurements`, `quotes`, `ledger`), which had no hand-managed server copy. The Phase 3 branch adds `_mail`, `_portal`, `appointments`, `booking`, `access`, `portal` and `messages`, again new with no server copy, so a hand-uploaded caller never arrives before its include. The Phase 4 branch adds `_cms`, `_media`, `cms`, `site` and `sitemap`, also new; the build itself ships `uploads/.htaccess` (from `public/uploads/`) and the new `robots.txt`. It then FTP-uploads `dist/` to the document root with `SamKirkland/FTP-Deploy-Action`.
- The other **22** endpoints (account, ai_image, analytics, content, coupons, engage, export, inbox, loyalty, mail, marketing, orders, payments, referrals, reviews, settings, stock, store, suppliers, users, weather, whatsapp) reach the server only by hand upload through cPanel. Their live versions are Unknown (A02). Any change to one of them must be listed in the pull request as a manual upload.
- Also by hand, never by CI: `config.php`, `.htaccess` (SPA routing, `RewriteBase /`, source in `php-api/.htaccess`) and SQL imports.
- Website images (Phase 4 branch) live in `uploads/site/` in the document root, written only by `cms.php` on the server. They are not in Git or `dist/`. The FTP action keeps `.ftp-deploy-sync-state.json` on the server and deletes only files listed there that have gone from `dist/` (Verified against the FTP-Deploy documentation, Context7 `/samkirkland/ftp-deploy`, 11 October 2026), so a deploy never deletes uploaded images. Never switch on `dangerous-clean-slate`. Back up `uploads/site/` with the database: the two belong together.
- Deploy repeats the checks inside its own job rather than waiting on the CI workflow, so the trigger stays a plain push to `main` (A14, PR #6). Upload order matters when `_lib.php` gains functions: CI uploads `_lib.php`, so hand-uploaded endpoints that call the new functions (for example `account.php` and `store.php` after PR #6) go up after the deploy finishes, never before. Branch protection on `main` is Unknown and must be checked on GitHub, not assumed.
- Watch the repository Actions tab after a merge; the site is usually live within one to two minutes.

Older notes said "deploys only push dist/" and an older php-api/README.md said no PHP is auto-deployed. Both were wrong: the files above are deployed by CI (A19, fixed).

## Server configuration

`config.php` lives only in the server document root, copied from `php-api/config.sample.php`. It is gitignored and never copied between machines. Settings it holds (names only):

- Database: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`. cPanel prefixes names (the sample uses `devgeereact_heritage_com`).
- Debug: `GK_DEBUG` (false in production).
- Tokens and throttling: `TOKEN_SECRET`, `TOKEN_TTL_DAYS`, `LOGIN_THROTTLE_WINDOW`, `LOGIN_MAX_PER_IP`, `LOGIN_MAX_PER_ACCOUNT`, `PIN_MAX_PER_IP`, `PIN_MAX_GLOBAL`.
- Customer throttling: `CUSTOMER_LOGIN_MAX_PER_IP` (default 10), `CUSTOMER_LOGIN_MAX_PER_PHONE` (default 5), `TRACK_MAX_PER_IP` (default 20), all over `LOGIN_THROTTLE_WINDOW`. 0 switches a check off.
- CORS: `CORS_ORIGIN`, and `ALLOW_LOCALHOST_CORS` (default off). Switch it on only for an agreed session that points development at production, and off again afterwards (A15).
- Public appointment requests (Phase 3 branch): `BOOKING_SLOTS_MAX_PER_IP` (default 60) and `BOOKING_REQUEST_MAX_PER_IP` (default 5) per `BOOKING_THROTTLE_WINDOW` seconds (default 3600). 0 switches a check off.
- Customer access (Phase 3 branch): `ACCESS_START_MAX_PER_IP` (default 10), `ACCESS_START_MAX_PER_REF` (5) and `ACCESS_VERIFY_MAX_PER_IP` (20) per `ACCESS_THROTTLE_WINDOW` seconds (900); `ACCESS_INVITE_HOURS` (24); `SITE_URL` (base of invite links, defaults to `CORS_ORIGIN`). Codes are hashed with `TOKEN_SECRET`, which must be set; access answers 503 without it. `STAGING_ACCESS_CODE_LOG` exists only in the local staging config and is ignored unless the staging router is running; never set it in production.
- Customer references: `ALLOW_LEGACY_ORDER_CODE_LOOKUP` (default true when unset). While true, tracking and customer sign-in also accept the old sequential `ORD-` code as well as the random public reference. On the Phase 3 branch it also keeps the old phone plus order code portal login, its raw tokens and its measurement form working; false switches all of those off, leaving verified access (D-021). Set it to false once customers have their public references (A06).
- AI: `OPENROUTER_KEY`, `OR_MODEL`, `OR_MODELS`, `OR_REFERER`, `OR_TITLE`, `IMAGE_PROVIDER`, `OR_IMAGE_MODEL`, `OPENAI_IMAGE_KEY`, `STABILITY_KEY`. The old project memory recorded `OR_MODEL` as `anthropic/claude-sonnet-4.6` on the server; the sample default differs. The live value is Unknown from the repo.
- Mail: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_FROM_NAME`, `IMAP_HOST`, `IMAP_PORT`, `IMAP_USER`, `IMAP_PASS`. The mail host recorded previously is premium152.web-hosting.com. Blank `SMTP_HOST` falls back to PHP `mail()`; blank `IMAP_HOST` disables the inbox.
- WhatsApp: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN`. Blank token means wa.me fallback mode. The webhook is `/whatsapp.php?action=webhook`.
- Payments: `PAYMENT_PROVIDER`, `PAYSTACK_SECRET`, `PAYSTACK_PUBLIC`, `FLW_SECRET`, `FLW_PUBLIC`, `STRIPE_SECRET`, `STRIPE_CURRENCY`, `STRIPE_USD_RATE`.
- Promotions: `LOYALTY_RATE`, `REFERRAL_REWARD` (0 means off).
- Website (Phase 4 branch): `SITE_URL` (also the base of sitemap and JSON-LD URLs; default `https://heritclothing.com`), `PUBLIC_UPLOAD_DIR` (default `<doc root>/uploads/site`, created on the first upload if the folder is writable), `PUBLIC_UPLOAD_URL` (default `/uploads/site`), `MEDIA_MAX_MB` (default 8). PHP's own `upload_max_filesize` and `post_max_size` must be at least `MEDIA_MAX_MB` (cPanel > MultiPHP INI Editor); the live values are Unknown, and a lower limit makes larger uploads fail with 413.
- `OPENWEATHER_API_KEY`, `OPENWEATHER_UNITS`: present in the sample but unused; weather.php calls Open-Meteo.

Frontend environment: `VITE_API_BASE` only, documented in `.env.example`; production builds ignore it.

## Database and schema files

- First install: import `php-api/schema.sql` in phpMyAdmin. It creates the foundation and module tables and seeds one `super_admin`, `dev@heritclothing.com`.
- Where the full `schema.sql` aborts on a stale legacy table, import `schema_modules.sql` instead; it creates only the later-module tables.
- Then apply `schema_phase2.sql` onwards in numeric order, up to `schema_phase22.sql` on the Phase 2 branch, `schema_phase25.sql` on the Phase 3 branch and `schema_phase26.sql` on the Phase 4 branch (later phases alter tables created earlier). Local staging imports exactly this order without errors and replays 18 to 22 over seeded data (10 October 2026). Which phases the live database has is Unknown.
- `users.php`, `mail.php` and `inbox.php` need no new tables.
- Phase-specific imports and their order relative to the merge are under [Owner actions per pull request](#owner-actions-per-pull-request).
- `CREATE TABLE IF NOT EXISTS` does not upgrade existing columns, and re-running a file is not automatically safe. Record which versions are applied and their dependencies. Keep versioned SQL in `php-api/`.
- Seed password: set it straight after import. Generate a hash locally with `php -r 'echo password_hash("CHOOSE-A-STRONG-PASSWORD", PASSWORD_DEFAULT), PHP_EOL;'`, then run `UPDATE users SET password_hash = '<hash>' WHERE email = 'dev@heritclothing.com';`. Never commit or share the real password.
- Smoke test: `https://heritclothing.com/api.php` returns a JSON array.

Table and schema inventory: [DATA-MODEL.md](DATA-MODEL.md#table-inventory).

## Owner actions per pull request

The stacked pull requests merge in order (#6, #7, #8, #9) and each merge deploys. Every later PR lists its own manual uploads, imports and NOT TESTED items in the same way; add them here in the same commit.

| PR | Branch | Before merging | After the deploy finishes |
|---|---|---|---|
| #6 | `feat/plans-2026-phase1` | Decide `ALLOW_LOCALHOST_CORS` in the server `config.php` (default off; local development against live data stops working without it) | Hand-upload `account.php`, `store.php`, `content.php`. They call functions the new `_lib.php` defines, so never upload them first |
| #7 | `feat/phase1b-staging` | Import `schema_phase17.sql` (`public_ref`, enquiry `company`); the CI files check for the columns, so the merge does not depend on it | Hand-upload `store.php`, `account.php`, `orders.php`, `settings.php`. Optional: set `ALLOW_LEGACY_ORDER_CODE_LOOKUP` (default on) |
| #8 | `feat/docs-gee-os` | Nothing (documentation only) | Nothing |
| #9 | `feat/phase2-daily-records` | 1. Full database backup. 2. Run the dry-run `SELECT`s at the top of each schema file and record the counts. 3. Import `schema_phase18.sql` to `schema_phase22.sql` in order (each is re-runnable). 4. Hand-upload `settings.php` and `account.php`, and replace the server `.htaccess` with `php-api/.htaccess` (blocks direct requests to `_*.php` and `config*.php`) | 5. The deploy uploads `_lib.php`, `_domain.php`, `_jobs.php`, `tailoring.php`, `customers.php`, `contact.php`, `stats.php`, `today.php`, `enquiries.php`, `measurements.php`, `quotes.php` and `ledger.php` together. 6. Re-import `schema_phase18.sql` once, to map jobs the old `tailoring.php` created between steps 3 and 5. 7. Signed in as the owner, open `ledger.php?action=recalc_all`. 8. In Settings, confirm or edit the five proposed measurement templates and confirm the unit of each imported measurement set |
| None yet | `feat/phase3-appointments-portal` | 1. Full database backup. 2. Run the dry-run `SELECT` at the top of `schema_phase23.sql` and record the count of fitting dates. 3. Import `schema_phase23.sql`, `schema_phase24.sql` and `schema_phase25.sql` in order (each re-runnable). 4. Hand-upload `settings.php`. 5. Confirm `TOKEN_SECRET` is set in `config.php` | 6. The deploy uploads `_domain.php`, `_jobs.php`, `_mail.php`, `_portal.php`, `appointments.php`, `booking.php`, `access.php`, `portal.php`, `messages.php`, `quotes.php`, `tailoring.php` and `today.php` together. 7. Hand-upload `mail.php` and `account.php` (they now need `_mail.php` and `_portal.php`). 8. In Settings, fill in working hours, breaks, buffer, durations, minimum notice, horizon and hold time; until then there are no slots. Leave public requests off until you choose to open them. 9. Confirm or edit the proposed feedback consent wording in Settings. 10. The new screens (Appointments, Messages, Settings sections, `/book`, `/track`, `/account`, `/account/jobs/:ref`, `/access/:invite`) ship in `dist/` with the same deploy; the existing `.htaccess` SPA rewrite already serves the new paths. Clients signed in with the older login are moved to the new session storage on their next visit |

| None yet | `feat/phase4-website` (server part) | 1. Full database and `uploads/` backup. 2. Run the dry-run `SELECT` at the top of `schema_phase26.sql` and record which promotion codes are active. 3. Import `schema_phase26.sql` (re-runnable; it switches off the never-used seeded HERIT10 and FREESHIP codes). 4. In cPanel, set PHP `upload_max_filesize` and `post_max_size` to at least 8M (or set `MEDIA_MAX_MB` lower in `config.php`). 5. Confirm PHP has GD with WebP (cPanel > Select PHP Version); without it uploads answer 501 | 6. The deploy uploads `_cms.php`, `_media.php`, `cms.php`, `site.php`, `sitemap.php`, `uploads/.htaccess` and `robots.txt`. 7. Hand-upload `settings.php` and `store.php` (they now need `_cms.php`), never before the deploy. 8. Replace the server `.htaccess` with `php-api/.htaccess` (adds the `/sitemap.xml` rewrite). 9. Check `https://heritclothing.com/sitemap.xml` answers XML, and that `https://heritclothing.com/uploads/site/x.php` answers 403 or 404. 10. Fill in the business profile and socials in the Website area; until then the public site hides those details |

The documentation clean-up branch `chore/cleanup-docs-sync` changes no server file and needs no owner action at merge.

## Branches, worktrees and machines

- Pushing `main` deploys. Work on a feature branch, push the branch and open a pull request. Never push, merge or rebase `main` without explicit authority. Never force-push a shared branch.
- Start work with `git pull --ff-only`. One concern per commit; push each verified batch.
- Code moves between the Mac (owns env files and secrets) and the Ubuntu build machine only through GitHub. Env files, keys and sessions never move and are never committed.
- No extra worktrees by default; one isolated branch or worktree only when concurrency needs it. Before removing any branch or worktree, inspect dirty and ignored work, compare commits to the base and confirm nothing unique is lost.
- Baseline on 10 October 2026: one worktree on `main` at d91951c, no other local branches. Phase work is on stacked branches listed in [ROADMAP.md](ROADMAP.md).

## Release procedure

Before any production change:

1. Snapshot the database and private files; confirm the restore route works ([DEPLOYMENT.md](#backup-and-recovery)).
2. Record the current deployed version and the endpoint and schema versions in the manifest.
3. Use backward-compatible schema changes; prepare maintenance or read-only handling if needed.
4. List every manual upload (endpoints not copied by `deploy.yml`) and SQL import in the pull request, and in [Owner actions per pull request](#owner-actions-per-pull-request).
5. Merge only after CI passes.

After release: run the checks in [qa/LAUNCH-CHECKLIST.md](../qa/LAUNCH-CHECKLIST.md#production-check).

## Rollback

- Frontend and the CI-deployed PHP files: revert the merge commit on a branch, open a pull request, merge after CI; the deploy redeploys the previous build.
- Manually uploaded endpoints: keep the previous file version from the release snapshot and re-upload it.
- Schema: restore from the pre-release snapshot only when a backward-compatible fix is not possible.
- If a gate fails in production, disable the affected public action and keep a truthful enquiry channel rather than advertising working bookings or payments.

## Troubleshooting

- **Site 404 or wrong content:** a Cloudflare record may be orange-cloud (set it to grey) or point at the wrong IP. Hard refresh or use a private window to rule out cache.
- **"Database connection failed":** wrong credentials in `config.php`, or the DB user lacks privileges.
- **Endpoint errors on GET:** the table it queries does not exist; import the right schema file.
- **Deploy fails:** open the Actions run. An `npm ci` failure usually means `package-lock.json` is out of step; an FTP auth failure means the three repository secrets do not match the FTP account.
- **HTTPS warning:** SSL is still issuing; run cPanel > SSL/TLS Status > Run AutoSSL.
- **A page says it could not load something, with a Retry button:** the API request failed (A17 and K-02 replaced the old upload instruction with this plain message). The browser console has the technical detail. Usual causes: the endpoint missing on the server (for Enquiries on the Phase 2 branch, `enquiries.php`), a table or column missing because a schema file was not imported, or an expired session.

## Backup and recovery

Backup targets, the restore procedure and the outage runbook list. Finding A20: backups, private storage, deployed config and schema cannot be certified from the repository.

- **Data and configuration covered:** the MySQL database, private files (none stored yet; future job photos), server `config.php` (kept by the owner, never in Git), hand-uploaded endpoint versions (release snapshot).
- **Backup owner, frequency and retention:** owner. Proposed targets, to confirm against the hosting plan (not achieved guarantees): daily encrypted database and private-file backup stored away from the live host; recent daily copies plus longer periodic copies.
- **Encryption and access:** backup credentials and encryption keys stay outside Git and recoverable by the owner.
- **Recovery time and recovery point objectives:** Proposed: at most 24 hours of data loss; restoration within four hours only if realistically supported.
- **Restore procedure and last restore test:** `NOT TESTED`.

### Restore procedure (Proposed)

A downloaded SQL file is not proof of a usable backup. Restore into a separate environment, check record counts and one linked client, job, payment and photo, and record the time taken. Repeat after major storage or schema changes and periodically (monthly sample restore, [DEPLOYMENT.md](#monitoring)). Before any production change, snapshot first ([DEPLOYMENT.md](#release-procedure)).

### Runbook list

Keep a short runbook for each: host or database outage; accidental edit; payment mismatch; failed reminders; suspected data exposure ([DATA-PRIVACY.md](DATA-PRIVACY.md#rights-requests-and-incidents)). During outages, block unsafe writes, keep unsent form values in memory and tell the user what happened. Do not persist private drafts on shared devices by default. Runbooks written so far: none.

Gaps: no backup schedule confirmed with the host; no restore ever performed; no shared environment to restore into except local staging.

## Monitoring

How problems are noticed and reviewed. Approved direction (Plans 2026, 04): no operations platform; hosting error logs, a simple public uptime check and an owner-visible list of failed notifications.

- **Availability checks:** a simple public uptime check (Proposed; provider not chosen). Smoke check: `https://heritclothing.com/api.php` returns a JSON array.
- **Error capture and release tagging:** cPanel hosting error logs; PHP uncaught errors return a JSON 500 without detail unless `GK_DEBUG` is on ([ARCHITECTURE.md](ARCHITECTURE.md#runtime-map)). No release tagging yet.
- **Structured logs and privacy filtering:** logs carry request IDs, endpoint and error category, never tokens or full measurement bodies (target; request IDs are not implemented). `audit_log` records staff actions through `audit()` in `_lib.php`.
- **Product and performance signals:** enquiry source, relevant enquiries, appointments and accepted jobs ([CONTENT.md](CONTENT.md#analytics)). WhatsApp sends are logged in `whatsapp_messages`.
- **Alert thresholds, owners and escalation:** owner only; thresholds Unknown.
- **Incident record location:** not decided (Proposed: a dated note in the private job or a short incident log kept outside the public site).

### Review rhythm

- Weekly: unread enquiries, overdue jobs, pending payment reconciliation, failed messages, backup status.
- Monthly: a sample restore ([DEPLOYMENT.md](#backup-and-recovery)), accounts and access review, published service promises.

Status: nothing above has been verified with a safe test event. Verify monitoring by producing one in the intended environment when authorised.
