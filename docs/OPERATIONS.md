# Operations

How to run, check, release and recover HeritOS. The most important fact first: **pushing to `main` deploys to production**, and local development talks to the live production API. Work on a branch, open a pull request, and never test against real client records.

## Hosting

| Item | Value |
|---|---|
| Hosting | Namecheap shared hosting (cPanel) |
| Domain | heritclothing.com, served from the cPanel document root (never a subfolder) |
| DNS | Cloudflare, records on DNS only (grey cloud) so cPanel AutoSSL can issue certificates |
| Database | MySQL on the same server, host `localhost`, managed in phpMyAdmin |
| Mail | Mailbox hello@heritclothing.com on the hosting mail server |
| Secrets | DB, token, AI, mail and gateway credentials only in server `config.php`; FTP credentials only in GitHub repository secrets (`FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`) |

## Local setup

```bash
npm ci           # install exactly from package-lock.json
npm run dev      # http://localhost:5112, strictPort: fails loudly if the port is taken
```

There is no PHP or MySQL on the laptop. In development `API_BASE` is `https://heritclothing.com` (`src/context/constants.js`), so **every local session reads and writes production records** (finding A01). Until a staging API exists, do not create, edit or delete records from a local session unless the change is intended for production.

The live server only accepts requests from a localhost origin while `ALLOW_LOCALHOST_CORS` is set to true in the server `config.php`. Default off (added on `feat/plans-2026-phase1`, A15). Switch it on by hand only while local development against the live API is genuinely needed, then switch it off again. Once that branch is deployed, `npm run dev` cannot reach the live API until the setting is on.

## Checks

| Command | What it does | Status |
|---|---|---|
| `npm run build` | Vite production build to `dist/` | PASS on 10 Oct 2026; Sass deprecation and large-chunk warnings remain |
| `npm run lint` | ESLint | The committed config matches only `.ts`/`.tsx`, so it checks none of the 473 JS/JSX files (A13). A JS/JSX config is written and tested (476 files, 0 errors, 194 warnings) but is waiting for the owner to apply it, because a local hook blocks agents from editing `eslint.config.js`. |
| `php php-api/tests/run.php` | 56 pure helper checks for `_lib.php` (sanitiser, CORS decision, throttle maths, payments); no database or network | PASS on 10 Oct 2026 |
| `php -l php-api/<file>.php` | PHP syntax | PASS for all 32 top-level files on 10 Oct 2026; not functional proof |
| `npm run preview` | Serves the production build locally | The production build uses relative API paths, so it does not reach the live API |

There is no frontend test script and no type check (JavaScript project). Critical flow tests need a staging environment first.

## CI and deploy

- `.github/workflows/ci.yml`: on pull requests to `main` and pushes to `main`, Node 22, runs `npm ci`, `npm run lint`, `php -l` over `php-api`, `php php-api/tests/run.php` and `npm run build`.
- `.github/workflows/deploy.yml`: on every push to `main`, Node 22, runs `npm ci`, `npm run lint`, the PHP syntax check and helper tests, then `npm run build`; any failure stops the job before upload. It then copies **nine** PHP files into `dist/` (`_lib`, `api`, `auth`, `ai`, `products`, `customers`, `stats`, `tailoring`, `contact`), then FTP-uploads `dist/` to the document root with `SamKirkland/FTP-Deploy-Action`.
- The other **22** endpoints (account, ai_image, analytics, content, coupons, engage, export, inbox, loyalty, mail, marketing, orders, payments, referrals, reviews, settings, stock, store, suppliers, users, weather, whatsapp) reach the server only by hand upload through cPanel. Their live versions are Unknown (A02). Any change to one of them must be listed in the pull request as a manual upload.
- Also by hand, never by CI: `config.php`, `.htaccess` (SPA routing, `RewriteBase /`, source in `php-api/.htaccess`) and SQL imports.
- Deploy repeats the checks inside its own job rather than waiting on the CI workflow, so the trigger stays a plain push to `main` (A14, changed on `feat/plans-2026-phase1`). Upload order matters when `_lib.php` gains functions: CI uploads `_lib.php`, so hand-uploaded endpoints that call the new functions (for example `account.php` and `store.php` after this branch) go up after the deploy finishes, never before. Branch protection on `main` is Unknown and must be checked on GitHub, not assumed.
- Watch the repository Actions tab after a merge; the site is usually live within one to two minutes.

Older notes said "deploys only push dist/" and php-api/README.md says no PHP is auto-deployed. Both are wrong: the nine files above are deployed by CI (A19).

## Server configuration

`config.php` lives only in the server document root, copied from `php-api/config.sample.php`. It is gitignored and never copied between machines. Settings it holds (names only):

- Database: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`. cPanel prefixes names (the sample uses `devgeereact_heritage_com`).
- Debug: `GK_DEBUG` (false in production).
- Tokens and throttling: `TOKEN_SECRET`, `TOKEN_TTL_DAYS`, `LOGIN_THROTTLE_WINDOW`, `LOGIN_MAX_PER_IP`, `LOGIN_MAX_PER_ACCOUNT`, `PIN_MAX_PER_IP`, `PIN_MAX_GLOBAL`.
- Customer throttling (new): `CUSTOMER_LOGIN_MAX_PER_IP` (default 10), `CUSTOMER_LOGIN_MAX_PER_PHONE` (default 5), `TRACK_MAX_PER_IP` (default 20), all over `LOGIN_THROTTLE_WINDOW`. 0 switches a check off.
- CORS: `CORS_ORIGIN`, and the new `ALLOW_LOCALHOST_CORS` (default off).
- AI: `OPENROUTER_KEY`, `OR_MODEL`, `OR_MODELS`, `OR_REFERER`, `OR_TITLE`, `IMAGE_PROVIDER`, `OR_IMAGE_MODEL`, `OPENAI_IMAGE_KEY`, `STABILITY_KEY`. The old project memory recorded `OR_MODEL` as `anthropic/claude-sonnet-4.6` on the server; the sample default differs. The live value is Unknown from the repo.
- Mail: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_FROM_NAME`, `IMAP_HOST`, `IMAP_PORT`, `IMAP_USER`, `IMAP_PASS`. The mail host recorded previously is premium152.web-hosting.com. Blank `SMTP_HOST` falls back to PHP `mail()`; blank `IMAP_HOST` disables the inbox.
- WhatsApp: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN`. Blank token means wa.me fallback mode. The webhook is `/whatsapp.php?action=webhook`.
- Payments: `PAYMENT_PROVIDER`, `PAYSTACK_SECRET`, `PAYSTACK_PUBLIC`, `FLW_SECRET`, `FLW_PUBLIC`, `STRIPE_SECRET`, `STRIPE_CURRENCY`, `STRIPE_USD_RATE`.
- Promotions: `LOYALTY_RATE`, `REFERRAL_REWARD` (0 means off).
- `OPENWEATHER_API_KEY`, `OPENWEATHER_UNITS`: present in the sample but unused; weather.php calls Open-Meteo.

## Database and schema files

- First install: import `php-api/schema.sql` in phpMyAdmin. It creates the foundation and module tables and seeds one `super_admin`, `dev@heritclothing.com`.
- Where the full `schema.sql` aborts on a stale legacy table, import `schema_modules.sql` instead; it creates only the later-module tables.
- Then apply `schema_phase2.sql` to `schema_phase16.sql` in numeric order (Proposed order: later phases alter tables created earlier). Which phases the live database has is Unknown.
- `users.php`, `mail.php` and `inbox.php` need no new tables.
- `CREATE TABLE IF NOT EXISTS` does not upgrade existing columns, and re-running a file is not automatically safe. Record which versions are applied and their dependencies. Keep versioned SQL in `php-api/`.
- Seed password: set it straight after import. Generate a hash locally with `php -r 'echo password_hash("CHOOSE-A-STRONG-PASSWORD", PASSWORD_DEFAULT), PHP_EOL;'`, then run `UPDATE users SET password_hash = '<hash>' WHERE email = 'dev@heritclothing.com';`. Never commit or share the real password.
- Smoke test: `https://heritclothing.com/api.php` returns a JSON array.

Full table and schema inventory: [ARCHITECTURE.md](ARCHITECTURE.md#table-inventory).

## Branches, worktrees and machines

- Pushing `main` deploys. Work on a feature branch, push the branch and open a pull request. Never push, merge or rebase `main` without explicit authority. Never force-push a shared branch.
- Start work with `git pull --ff-only`. One concern per commit; push each verified batch.
- Code moves between the Mac (owns env files and secrets) and the Ubuntu build machine only through GitHub. Env files, keys and sessions never move and are never committed.
- No extra worktrees by default; one isolated branch or worktree only when concurrency needs it. Before removing any branch or worktree, inspect dirty and ignored work, compare commits to the base and confirm nothing unique is lost.
- Baseline on 10 October 2026: one worktree on `main` at d91951c, no other local branches. Phase 1 work is on `feat/plans-2026-phase1`.

## Environments and staging

Approved direction, not yet built:

1. A non-production environment with synthetic clients and no real payment, email or WhatsApp actions. It shows its API URL, database and sender mode visibly before tests.
2. Compare required endpoint names and schema versions with the release manifest. Never copy `config.php` or discover credentials during a review.
3. Make application and PHP release versions consistent. The release manifest lists every endpoint still in use and which are retired. Never glob-upload all files, schemas, tests or the sample config.
4. Meaningful JS/JSX lint, PHP syntax and helper tests, and critical flow tests in CI.

## Release checklist

Before any production change:

1. Snapshot the database and private files; confirm the restore route works.
2. Record the current deployed version and the endpoint and schema versions in the manifest.
3. Use backward-compatible schema changes; prepare maintenance or read-only handling if needed.
4. List every manual upload (endpoints outside the nine CI files) and SQL import in the pull request.
5. Merge only after CI passes.

After release, verify with designated test records: login, enquiry, booking, client isolation, measurement snapshot, quote, payment, message and delivery. Confirm rollback triggers and monitoring.

## Rollback

- Frontend and the nine CI endpoints: revert the merge commit on a branch, open a pull request, merge after CI; the deploy redeploys the previous build.
- Manually uploaded endpoints: keep the previous file version from the release snapshot and re-upload it.
- Schema: restore from the pre-release snapshot only when a backward-compatible fix is not possible.
- If a gate fails in production, disable the affected public action and keep a truthful enquiry channel rather than advertising working bookings or payments.

## Backup and restore

Proposed targets, to confirm against the hosting plan (not achieved guarantees): daily encrypted database and private-file backup stored away from the live host; recent daily copies plus longer periodic copies; at most 24 hours of data loss; restoration within four hours only if realistically supported.

A downloaded SQL file is not proof of a usable backup. Restore into a separate environment, check record counts and one linked client, job, payment and photo, and record the time taken. Repeat after major storage or schema changes and periodically. Backup credentials and encryption keys stay outside Git and recoverable by the owner. Current status: NOT TESTED.

## Monitoring and incidents

No operations platform: hosting error logs, a simple public uptime check and an owner-visible list of failed notifications. Logs carry request IDs, endpoint and error category, never tokens or full measurement bodies.

- Weekly: unread enquiries, overdue jobs, pending payment reconciliation, failed messages, backup status.
- Monthly: a sample restore, accounts and access review, published service promises.
- Keep a short runbook for host or database outage, accidental edit, payment mismatch, failed reminders and suspected data exposure. During outages, block unsafe writes, keep unsent form values in memory and tell the user what happened. Do not persist private drafts on shared devices by default.

## Launch verification matrix

| Scenario | Required proof |
|---|---|
| Client isolation | Two synthetic customers; swapping every relevant ID or reference fails safely |
| Company isolation | An organiser cannot read individual measurements or another company's job |
| Booking integrity | Simultaneous slot requests, cancellation, reschedule and expiry behave atomically |
| Measurement integrity | An approved job stays unchanged after a profile update; units stay correct |
| Record conversion | A retried enquiry conversion yields one linked job |
| Payment integrity | Retry, concurrency, reversal and overpayment totals and receipts match |
| Rich text and files | Script, unsafe URL and unexpected upload denied; private files need auth |
| Session recovery | Expired or revoked token blocked; owner recovery works |
| Failure handling | Offline, API timeout, failed email and missing config show plain, truthful states |
| Publication | Drafts private; unpublish effective; invalid URL rejected |
| Recovery | Backup restored and records and files verified in a separate environment |
| Release | Endpoint and schema versions match the build; rollback rehearsed |

Current status of the whole matrix: NOT TESTED. Helper tests and syntax checks do not substitute for it.

## Privacy and Nigeria notes

Planning input, not a compliance certification.

- Phone numbers, addresses, measurements, messages and photos are private client information. Measurements are personal data when tied to a person; they are not automatically medical data. Do not collect identity documents just to issue a reference.
- The Lagos business needs a Nigeria-focused privacy review. The Nigeria Data Protection Act and current NDPC guidance are the starting sources. Do not import UK-only rules or assume a sole-trader exemption. Confirm registration and compliance duties against the real scale and categories of data before launch.
- Prepare a short privacy notice: who runs the business, what is collected and why, service providers, disclosures and transfers, retention, rights and contact. Choose lawful grounds for service records separately from marketing consent. Portfolio and review publication need separate permission, never bundled into order acceptance.
- Retention (Proposed for owner and legal review): short expiry for abandoned enquiries; periodic review of inactive measurement profiles and reference images; financial evidence kept for the statutory period. Exact periods are undecided. Never keep everything for ever, and never promise immediate deletion of records the law requires to remain.
- A manual request workflow for access, correction and deletion, with identity verification and a logged decision. Remove or anonymise eligible data in the live database, exports and backup rotation, documenting lawful exceptions.
- Keep an incident contact and checklist, and verify notification obligations if an incident occurs.
- No private customer content goes to OpenRouter or image AI by default. If customer processing is ever approved, document the providers and international transfer arrangements.

## Troubleshooting

- **Site 404 or wrong content:** a Cloudflare record may be orange-cloud (set it to grey) or point at the wrong IP. Hard refresh or use a private window to rule out cache.
- **"Database connection failed":** wrong credentials in `config.php`, or the DB user lacks privileges.
- **Endpoint errors on GET:** the table it queries does not exist; import the right schema file.
- **Deploy fails:** open the Actions run. An `npm ci` failure usually means `package-lock.json` is out of step; an FTP auth failure means the three repository secrets do not match the FTP account.
- **HTTPS warning:** SSL is still issuing; run cPanel > SSL/TLS Status > Run AutoSSL.
- **Enquiries page shows an upload instruction:** the page currently tells the owner to upload contact.php and import the enquiries table (A17). It means the endpoint or table is missing on the server.
