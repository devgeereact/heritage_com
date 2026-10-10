# Changelog

Notable changes to HeritOS, grouped by pull request. Dates are when the work was committed; nothing below is released until it is merged to `main` and deployed. Live status: [docs/ROADMAP.md](docs/ROADMAP.md). Owner actions at each merge: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#owner-actions-per-pull-request).

## Unreleased

### `feat/phase3-appointments-portal` (no PR yet), 10 October 2026

Added

- Pure Phase 3 rules in `_domain.php`: availability validation (empty means not set), Lagos slot windows, buffer-aware overlap, free slots, a slot check with reasons, appointment transitions, six-digit access codes stored only as an HMAC, challenge expiry and lockout, and `job_public_view()`, the allowlist projection the portal returns. 85 new helper tests (251 in total).

Changed

- Mail: the SMTP client moved from `mail.php` into the shared include `_mail.php` with `mail_send_html()`, so other endpoints can send mail; `mail.php` is a thin endpoint over it and also audits failed sends. `_mail.php` is deployed by CI.

### `chore/cleanup-docs-sync` (no PR yet), 10 October 2026

Added

- `scripts/check-docs.mjs`, run in CI: fails on broken Markdown links or anchors, em dashes in live docs, and mentions of `docs/` or `qa/` paths that do not exist.
- Documentation-sync rule for every agent ([.claude/rules/docs-sync.md](.claude/rules/docs-sync.md)), summarised in `AGENTS.md` and pointed to from `CLAUDE.md` and `CODEX.md` (D-020).
- Owner actions per pull request in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#owner-actions-per-pull-request).

Changed

- Documentation flattened to the GEE OS Standard application profile: flat `docs/*.md`, `docs/Plans 2026/` the only subfolder; thin files merged (context and roles into PRODUCT-SPEC, integrations and PWA into ARCHITECTURE, auth and permissions into SECURITY, backup and monitoring into DEPLOYMENT, email into NOTIFICATIONS-SPEC, release files into `qa/LAUNCH-CHECKLIST.md`, UX and PWA audits into the functional and performance audits) (D-020).
- Every status brought up to date with PRs #6 to #9: roadmap phases, findings, known issues, navigation as built, endpoint and table inventories, test results.
- The three tsconfig files replaced by one `jsconfig.json`.

Removed

- Orphan Larkon components, helpers and type stubs; the unlinked `/review`, `/maintenance` and `/coming-soon` pages; 32 unused packages and their style partials; unused demo images, icon fonts and the light logo; the axios fake backend and axios. `dist` fell from 10.2 MB to 2.6 MB (A18).

### PR #9 `feat/phase2-daily-records` (Phase 2), 10 October 2026

Added

- Today page as the owner's home: overdue, due soon, ready, enquiries, balances, unverified payments and measurements awaiting approval (`today.php`).
- Enquiry pipeline with tabs, detail page and a retry-safe convert wizard that offers matching clients instead of merging silently (`enquiries.php`).
- One Clients area: search, duplicate warning, `client_ref`, detail tabs, and dated measurement sets on five editable templates with explicit units, owner approval and frozen job snapshots (`measurements.php`, A10).
- Jobs: stage rules, event and promised dates, next action, `lock_version` conflict messages, versioned quotes with recorded acceptance (`quotes.php`), append-only payment ledger with request keys and uncapped credit (`ledger.php`, A05), planned and partial handovers, printable quote, invoice, receipt and measurement sheet.
- Payments page; Settings for business details, quote defaults, payment rules and measurement templates.
- Schema files `schema_phase18.sql` to `schema_phase22.sql`; `_domain.php` and `_jobs.php` shared helpers; 166 helper tests; `scripts/staging/e2e-phase2.sh` (48 checks).
- Needle H favicon, app icons and an updated manifest (K-03).

Changed

- Navigation: Today, Enquiries, Appointments, Clients, Jobs, Payments, Website and Settings, with older modules under More tools; a bottom bar on phones; old URLs redirect (D-009).
- Page access matches the server role gates; tailors never see money (K-01).
- CI deploys the seven new PHP files with their callers; `php-api/.htaccess` blocks direct requests to `_*.php` and `config*.php`.

Fixed

- Jobs and Groups show a plain error with Retry instead of an upload instruction (K-02).
- The phone sidebar closes on navigation and no longer opens by itself.

### PR #8 `feat/docs-gee-os`, 10 October 2026

Changed

- Documentation moved into the GEE OS Full Product hierarchy, with root `qa/` audits, this changelog and `KNOWN-ISSUES.md` (D-012; flattened again by D-020).
- Plans 2026 restored as the standing plan of record (D-012).

### PR #7 `feat/phase1b-staging` (Phase 1b), 10 October 2026

Added

- Local staging: `npm run staging:setup` and `staging:serve` give a local PHP API and database with synthetic records; development uses it by default (A01).
- Random 10-character public references for customer lookups, with `schema_phase17.sql` and collision-safe staff codes (A06).
- A real optional company field on enquiries, with the honeypot renamed (A11).

Changed

- Enquiries page shows a plain error with Retry instead of an upload instruction (A17).
- Retail shop links hidden from public navigation unless `shop_enabled` is on (D-014).

Removed

- Larkon demo routes and unused kit pages, with 14 orphaned components; production JavaScript fell from 4,985,796 to 1,553,500 bytes (A18).
- Superseded 2025 plans and both `HeritOS.html` specifications (D-017).

### PR #6 `feat/plans-2026-phase1` (Phase 1), 10 October 2026

Added

- Throttling and one generic failure message for customer sign-in and public tracking (A03, partial).
- Server-side HTML sanitiser for blog posts (A04).
- CI runs PHP syntax checks and the helper tests; the deploy job repeats lint, PHP checks and the build before uploading (A14).

Changed

- Deposit updates run inside a transaction with a row lock (A05, later replaced by the ledger in PR #9).
- Localhost CORS allowed only when `ALLOW_LOCALHOST_CORS` is on (A15, partial).

Fixed

- Editing an existing blog post: the UPDATE now binds 11 values with an 11-character type string (A21).
- Contradictory deployment descriptions in project docs (A19).
