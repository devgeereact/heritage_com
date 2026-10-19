# Current Task Contract

## Outcome

Build the full Plans 2026 roadmap (owner instruction, 10 October 2026: "build everything that we've planned, from start to finish"), delivered as stacked pull requests, one per phase. Live status is in `docs/ROADMAP.md`; owner actions at each merge are in `docs/DEPLOYMENT.md` (Owner actions per pull request).

| Step | Branch | State |
|---|---|---|
| Phase 1 safety fixes | `feat/plans-2026-phase1` (PR #6) | Done, open. Lint config blocked (A13); release manifest and backups need the owner and production |
| Phase 1b staging and clean-up | `feat/phase1b-staging` (PR #7) | Done, open |
| Docs hierarchy | `feat/docs-gee-os` (PR #8) | Done, open; flattened by the clean-up step |
| Phase 2 daily records | `feat/phase2-daily-records` (PR #9) | Built, open; awaiting merge |
| Clean-up and docs sync | `chore/cleanup-docs-sync` (PR #10) | Done, open: unused code and assets removed; docs flattened to the Standard application profile and brought up to date; docs-sync rule and CI docs check added |
| Phase 3 appointments and customer portal | `feat/phase3-appointments-portal` | Built, PR #11 open (contains wip commit 2c9188c: squash-merge). Backend: `schema_phase23.sql` to `25`, `_mail.php`, `_portal.php`, `appointments.php`, `booking.php`, `access.php`, `portal.php`, `messages.php`, changes to `account.php`, `settings.php`, `tailoring.php`, `today.php`, `quotes.php`. Frontend (11 October 2026): Appointments page, availability and portal settings, Messages page and job Messages tab, access links, Today blocks and bell, public `/book`, two-step access on `/track` and `/account`, portal job page `/account/jobs/:ref`, invite route; `/apps/calendar`, `@fullcalendar/*` and `react-select` gone; inbox 500 fixed (K-05). Evidence: build, 251 helper tests, `e2e-phase3.sh` 93 of 93, `e2e-phase2.sh` 48 of 48, browser journeys PASS at 390px and 1280px ([qa/FUNCTIONAL-AUDIT.md](../qa/FUNCTIONAL-AUDIT.md#phase-3-journeys-in-the-browser-11-october-2026)). NOT TESTED: real email delivery, WhatsApp sends, real phones, screen readers, dark theme on new screens, portal quote acceptance and measurement view (switches off), legacy flag off |
| Phase 4 website | `feat/phase4-website` | Built, PR #12 open (16 October 2026). Server (CMS, uploads, public projection, sitemap) as before; 11 October 2026 on the Ubuntu machine: JS/JSX lint applied (A13); public data layer (`siteData.js`, `useSeo`, `useActions`, `safeHtml`); every public page on the CMS (Home, Services, a service, Our work, a project, How it works, Company orders with the brief form, About, Contact, Questions, Privacy, Terms, Journal); admin Website area at `/website` (hub, business details, images, lists, one editor with draft, preview, publish, unpublish, roll back); noindex for staff screens and PHP answers; `uploads/site/**` excluded from the FTP sync; contact enquiry types fixed; 320px hero clipping fixed. Evidence: 323 helper tests, `e2e-phase2.sh` 48, `e2e-phase3.sh` 93, `e2e-phase4.sh` 62, lint 0 errors, browser journeys and a 75-load responsive sweep ([qa/FUNCTIONAL-AUDIT.md](../qa/FUNCTIONAL-AUDIT.md#phase-4-website-pages-and-website-admin-in-the-browser-11-october-2026), [qa/ACCESSIBILITY-AUDIT.md](../qa/ACCESSIBILITY-AUDIT.md#phase-4-cms-pages-11-october-2026)). Deviations: D-022. NOT TESTED: screen readers, the empty-CMS run, the editor role in a browser, live `.htaccess` and PHP upload limits, link previews (K-06), real photographs. Next: owner review and merge in order |
| Phase 5 company orders | `feat/phase5-company-orders` | Built, PR #13 open (16 October 2026), stacked on Phase 4, 12 October 2026: `schema_phase27.sql` (companies, contacts, items, samples, item handovers, quote bill-to), `_company.php` (43 helper tests), `companies.php`, `company_jobs.php`, portal company and wearer views with `sample_decide` behind `company_portal_enabled` (default off), Companies pages and company job tabs in the admin, portal company and wearer screens. Evidence: 366 helper tests, `e2e-phase5.sh` 25 of 25, `e2e-phase3.sh` 93, `e2e-phase4.sh` 62, browser checks on staging (admin create and tabs, portal approval at 390px). `e2e-phase2.sh` 47 of 48 on today's staging data (E15c, K-07). NOT TESTED: real phones, screen readers, a real pilot company, the editor of item wearers after creation (wearers are chosen when the job is created), dark theme on the new admin screens. Next: owner decides K-07, then merge after #12 |
| Redesign: dark luxury (D-023) | `feat/redesign-dark-luxury` | Built 13 October 2026, stacked on Phase 5 (`main` lacks the Phase 2 to 5 screens it restyles). Owner approved two prototypes, then asked for the build. Tokens, fonts, home hero slider (from published content, no new endpoint), cards, header, footer, ivory bands, admin skin and Today summary tiles. Evidence: lint 0 errors, check-tokens, build, browser checks at 1440 and 390px on staging ([qa/FUNCTIONAL-AUDIT.md](../qa/FUNCTIONAL-AUDIT.md#redesign-dark-luxury-13-october-2026)). NOT TESTED: reduced motion on the new hero, real phones, screen readers, other pages and admin screens in both themes, real photographs. Since then (14 October 2026): prototype sections built end to end, sitewide consistency pass, and the hero slide editor (Website > Hero slides, `schema_phase28.sql`, 374 helper tests). Owner, 14 October 2026: "landing looks great now so lets move to the cms". Admin (CMS) pass built the same day: Jobs board view, Payments summary tiles, row avatars, Today greeting ([qa/FUNCTIONAL-AUDIT.md](../qa/FUNCTIONAL-AUDIT.md#redesign-dark-luxury-13-october-2026)). Job page (16 October 2026): stage bar on every tab and an owner Money card on Overview. Admin sweep at 390px dark, Groups header, Website publish bar, Payments method filter and Enquiries tab pills (16 October 2026). PR #14 open (16 October 2026), stacked on #13. Gap checks the same day: tailor and company job pages, reduced motion on the hero (qa/FUNCTIONAL-AUDIT.md). Next: owner review on staging, then merge after #13. Then: owner review on staging and a PR after Phase 5 (owner actions: import `schema_phase28.sql`) |
| Offline behaviour (A16) | `feat/offline-a16` | Built 16 October 2026, stacked on #16. 18 October 2026: #14's audit fixes merged in through #15 and #16 (merge commit). #14 had its own A16 work (commit 3941337), so one implementation is kept: #14's write refusal in `heritApi.js`, its staff `OfflineBanner` in `AdminLayout` and its root `AppErrorBoundary`. Ported from #17: the offline wording in `LoadError` (through `err.offline`), an offline message on the error screen with no pointless reload, and the error screen clearing when the path changes. Dropped from #17: the bar on the website and sign-in, "Back online", `RouteErrorBoundary` and `OfflineBanner.css`. Evidence: lint, build, check:tokens, 388 helper tests, e2e reset, phase 3 and 4. Browser (Playwright, offline): staff banner, offline error screen instead of a blank app, cleared on Back, PASS. NOT TESTED: the `LoadError` offline sentence on screen, real phone, production service worker, slow connections. PR #17 open |
| Link previews (K-06) | `feat/link-previews` | Built 16 October 2026, stacked on #15: public defaults in the page head, `spa.php` behind `SPA_HEAD_INJECTION` (off). Evidence: 387 helper tests, `spa.php` on and off against staging data, fatal fallback. NOT TESTED: a real WhatsApp or Facebook share, production. PR #16 open. 18 October 2026: #14's audit fixes merged in through #15 (merge commit): head defaults now use the audit's description, locale and icon, no inline script; 388 helper tests. Next: owner shares a link after deploy and decides the switch |
| Staff password reset (K-04) | `feat/staff-password-reset` | Built 16 October 2026, stacked on the redesign (owner: "continue building"). `auth.php` `reset_request` and `reset_confirm`, `schema_phase29.sql`, two-step `/auth/reset-pass`. Evidence: `e2e-reset.sh` 19 of 19 twice, screens at 390px in a browser, lint, build. NOT TESTED: real email delivery, production. PR #15 open. 18 October 2026: #14's audit fixes merged in (merge commit, no rebase); the reset now refuses suspended accounts and hashes with `staff_token_hash`; `e2e-reset.sh` 19, `e2e-phase3.sh` 93, `e2e-phase4.sh` 63, 374 helper tests. NOT TESTED: the reset request's response time still differs when an email is sent (see [SECURITY.md](../docs/SECURITY.md#staff)). Next: the owner imports `schema_phase29.sql` and confirms outgoing email |
| Production-readiness and privacy audit | `feat/redesign-dark-luxury` (audit commits, 17 October 2026) | Done, two commits on PR #14 (owner pasted two audit briefs). Fixed K-08 (P0 seed passwords), K-09, K-10 (server security), K-24 (website: not-found page, error screen, SEO tags, pause controls, shop off for visitors, privacy notes, self-hosted fonts). Docs: privacy inventory, retention schedule, sources and owner questions in `docs/DATA-PRIVACY.md`; draft notice `docs/PRIVACY-NOTICE-DRAFT.md`. Evidence: lint 0 errors, build, 374 helper tests, e2e phase2 48, phase3 93, phase4 63, browser checks on staging. NOT TESTED: e2e-phase5 on the Mac (K-17), HSTS under TLS, webhook signature, AI caps, error screen at runtime, booking note in a browser, real phones, screen readers. Second batch the same day: K-15 (hashed staff tokens), K-16 (form focus), K-17 (phase 5 on macOS, 25 of 25), K-20 (sitemap, service worker; manifest choice left to the owner), K-23 (login timing). Owner decisions D-024 the same day built: promotional WhatsApp sends off (K-11), AI drafter without personal data (K-12), 30-day attribution (K-13), staff-only install (K-20). Then A16 (offline write blocking and banner) and 64-bit gift codes. Then one PIN per person and a tested Content Security Policy (K-23). Next: legal entity and privacy contact, retention periods; Terms BLOCKED on commercial rules |
| Hardening (K-07, K-14, K-18, A15, A13) | `feat/hardening-2026-10-18` | Built and integrated 18 October 2026, stacked on #17 (which carries #14 to #16); PR #18, number not assigned yet. K-07 Today ordering, `more` and the hidden count on screen; K-14 order lookup by POST; K-18 retention job (`retention.php`, `_retention.php`, `schema_phase30.sql`, Settings > Data retention); A15 staff cookie with `X-Herit-CSRF` behind `STAFF_COOKIE_AUTH` (default off) and its review fixes; A13 first frontend suite (`npm test`); corrupt session cookie fix; sanitisers refuse `//host` and `/\host`; `e2e-phase2.sh` self-seeds (52 checks). Evidence ([docs/TEST-STRATEGY.md](../docs/TEST-STRATEGY.md#commands-and-latest-results)): 559 helper tests, 263 frontend tests in 14 files, lint 0 errors, build PASS, `e2e-phase2.sh` 52, `e2e-phase3.sh` 93 (B5c flaky once, K-27), `e2e-phase4.sh` 63, `e2e-phase5.sh` 25, `e2e-reset.sh` 19. NOT TESTED: the cookie flow and the retention cron on the live server, browser journeys for the new screens, admin screens beyond sign-in under the frontend tests |
| Release readiness (A02, A20, K-25 to K-30) | `feat/release-readiness` | Built and integrated 18 October 2026, stacked on #18; PR #19, number to be confirmed. Release tools (`release:manifest`, `release_check.php`, `release:smoke`, `backup.sh`, `restore-check.sh`), the 152-check launch matrix (`e2e-launch.sh`), `npm run check:php` in CI, and fixes for K-25 to K-30. No schema change. Evidence: [docs/TEST-STRATEGY.md](../docs/TEST-STRATEGY.md#commands-and-latest-results). NOT TESTED: every release tool on the host. Owner actions: the "#19" row in [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md#owner-actions-per-pull-request) |
| Phase 7 evidence | `feat/phase7-review` | Built 19 October 2026, PR #20 stacked on #19: `usage.php`, `review.php`, `_review.php`, `schema_phase31.sql`, Owner review page `/review`. Evidence: 758 helper tests, 306 frontend tests, `check:php` PASS, lint 0 errors, build, e2e phase2 52, phase3 100, phase4 63, phase5 25, reset 23, launch 152; browser `/review` at 1280 and 390px, light and dark. Owner to confirm: owner-only access, a usage retention period (400 days proposed), role counts with one person per role, whether to audit failed saves (K-31), the label "Owner review" under Settings |

Phase 6 (release, pilot, social publishing) and Phase 7 (learn and simplify) need the owner and live systems; this task prepares their checklists only.

## Handoff: release readiness (18 October 2026)

State at handoff: the release tools, the launch-matrix script and the defect fixes are integrated on `feat/release-readiness`, stacked on PR #18 (`feat/hardening-2026-10-18`); the pull request will be #19. The documentation step did not commit or push. Nothing is deployed and `main` is untouched. No schema change and no new `config.php` entry.

Where the facts live (do not copy them here):

- What changed: the release readiness section under Unreleased in [CHANGELOG.md](../CHANGELOG.md).
- Open issues: A02 and A20 stay open until the owner runs the tools on the host; K-25 to K-30 are listed as fixed in code in [KNOWN-ISSUES.md](../KNOWN-ISSUES.md), with the K-26 residual; status of the stack and Phase 6: [docs/ROADMAP.md](../docs/ROADMAP.md).
- Owner actions in order (backup and restore check, `release_check.php --db`, merge, the 23 hand uploads after the deploy, `.htaccess`, the `RESET_MAX_PER_ACCOUNT` line, the second check, the smoke test): the "#19" row in [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md#owner-actions-per-pull-request), with the procedure in [Release procedure](../docs/DEPLOYMENT.md#release-procedure).
- Test counts and results: [docs/TEST-STRATEGY.md](../docs/TEST-STRATEGY.md#commands-and-latest-results); the launch matrix rows: [qa/LAUNCH-CHECKLIST.md](../qa/LAUNCH-CHECKLIST.md#launch-verification-matrix) (Payment integrity and Failure handling now pass on staging; Recovery and Release stay PARTIAL).
- Reset timing and lockout design: [docs/SECURITY.md](../docs/SECURITY.md#staff).

Owner decisions to confirm:

- `RESET_MIN_MS` default of 600 ms for every reset request.
- The reset throttle numbers: 3 requests per address from one IP (`RESET_MAX_PER_ACCOUNT_IP`), an hourly ceiling of 10 per address (`RESET_MAX_PER_ACCOUNT`, window `RESET_ACCOUNT_WINDOW`), and the accepted residual that a stranger with several IPs can still reach the ceiling (K-26).
- The release manifest is made on the Mac and kept off the public site (the deploy never uploads it, `.htaccess` denies it).
- Backups are kept outside `public_html` (`~/heritos-backups`, `backup.sh` refuses a folder containing the document root), with a copy downloaded to the Mac.

Next steps:

1. Owner reviews the diff, then the branch is pushed and a pull request opened against #18's branch. Record the PR number in [docs/ROADMAP.md](../docs/ROADMAP.md), [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md#owner-actions-per-pull-request) and here.
2. Owner works through the "#19" row of the Owner actions table, then records the results in the Production check table in [qa/LAUNCH-CHECKLIST.md](../qa/LAUNCH-CHECKLIST.md#production-check). A restore of a real backup, checked by hand for one linked client, job, payment and photo, closes A20; the live `release_check.php` result closes A02.
3. Still open from earlier handoffs: the #18 owner actions, retention periods, the cookie switch, K-15 plain-token fallback removal, and switching off `ALLOW_LEGACY_ORDER_CODE_LOOKUP` (D-021).

Checks to rerun before any further change: `npm test`, `npm run check:php`, `npx eslint . --ignore-pattern '.claude/**'`, `npm run build`, `npm run check:tokens`, `node scripts/check-docs.mjs`, `php php-api/tests/run.php`, `bash scripts/staging/e2e-phase{2,3,4,5}.sh`, `e2e-reset.sh` and `e2e-launch.sh`. Last results: helper tests 669; frontend tests 282 in 16 files; e2e phase2 52, phase3 100, phase4 63, phase5 25, reset 23, launch 152.

## Handoff: hardening (18 October 2026)

State at handoff: the hardening work is integrated on `feat/hardening-2026-10-18`, stacked on PR #17 (which carries #14 to #16, synced by merge commits onto #14's audit fixes). The branch is pushed and open as PR #18. Nothing is deployed and `main` is untouched. The integration-only working branches for K-18 and A15 are not separate pull requests; the work is all on this branch.

Where the facts live (do not copy them here):

- What changed: the hardening section under Unreleased in [CHANGELOG.md](../CHANGELOG.md).
- Open issues and the new K-25 to K-28: [KNOWN-ISSUES.md](../KNOWN-ISSUES.md); finding status for A13 and A15 and the PR stack: [docs/ROADMAP.md](../docs/ROADMAP.md).
- Owner actions in order (hand uploads, `schema_phase30.sql` after `schema_phase29.sql`, cron): the "PR #18" row in [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md#owner-actions-per-pull-request); the cron line: [Retention job](../docs/DEPLOYMENT.md#retention-job); the cookie switch: [Server configuration](../docs/DEPLOYMENT.md#server-configuration).
- Auth design (cookie, CSRF, sign-in checks, hashing): [docs/SECURITY.md](../docs/SECURITY.md#staff); the retention policy and settings: [docs/DATA-PRIVACY.md](../docs/DATA-PRIVACY.md#retention-schedule) and [docs/API-SPEC.md](../docs/API-SPEC.md#data-retention-settings-keys-k-18).
- Test counts and results: [docs/TEST-STRATEGY.md](../docs/TEST-STRATEGY.md#commands-and-latest-results).

Lead decisions the owner should confirm:

- Today ranks a due or overdue enquiry follow-up first, then new enquiries (K-07).
- A15 design: an HttpOnly SameSite=Strict staff cookie with a double-submit `X-Herit-CSRF` header, and it stays off until the owner switches `STAFF_COOKIE_AUTH` on over HTTPS.
- Retention: only expired sign-in tokens default to 30 days past expiry; every other category keeps data forever until the owner chooses a period; only the owner may change a period, and old and new values are audited.
- The server sanitiser now refuses fragment-only (`#top`) and bare relative (`page`) links, as the browser sanitiser already did.
- #17's public offline bar and "Back online" message were dropped in favour of #14's audited staff banner (already recorded under #17).

Next steps:

1. Owner reviews the diff, then the branch is pushed and a pull request opened against #17's branch (or the stack is merged in order). Record the PR number in [docs/ROADMAP.md](../docs/ROADMAP.md), [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md#owner-actions-per-pull-request) and here.
2. At release, follow the DEPLOYMENT row in order: `store.php` early, the deploy, then `users.php`, `_retention.php`, `settings.php`, `retention.php`, the `schema_phase30.sql` import and the cron line.
3. Owner chooses retention periods (legal review), then switches on the cookie auth when the site is on HTTPS.
4. Still open from earlier handoffs: K-15 plain-token fallback removal once `TOKEN_TTL_DAYS` has passed; switching off `ALLOW_LEGACY_ORDER_CODE_LOOKUP` (D-021) after cached browsers update.

Checks to rerun before any further change: `npm test`, `npx eslint . --ignore-pattern '.claude/**'` (agent worktrees under `.claude/worktrees/` would otherwise be linted), `npm run build`, `npm run check:tokens`, `node scripts/check-docs.mjs`, `php php-api/tests/run.php`, `bash scripts/staging/e2e-phase{2,3,4,5}.sh` and `e2e-reset.sh`. Last results: helper tests 559; frontend tests 263 in 14 files; e2e phase2 52, phase3 93 (B5c flaky once, K-27), phase4 63, phase5 25, reset 19.

## Handoff: production-readiness and privacy audit (17 October 2026)

The next-steps list below was written on 17 October 2026; items 1, 3 and 4 (A15, K-18, K-07) are built on `feat/hardening-2026-10-18` (see the hardening handoff above).

State at handoff: all audit work is committed and pushed on `feat/redesign-dark-luxury` (PR #14), commits `83a6d38` to the formatter pass after `ca32587`; nothing is deployed and `main` is untouched. Working tree clean.

Where the facts live (do not copy them here):

- Every finding and its status: [KNOWN-ISSUES.md](../KNOWN-ISSUES.md) (K-04 to K-24, A15, A16) and [docs/ROADMAP.md](../docs/ROADMAP.md#findings).
- What changed: the Unreleased audit entries in [CHANGELOG.md](../CHANGELOG.md).
- Evidence: [qa/SECURITY-AUDIT.md](../qa/SECURITY-AUDIT.md), [qa/FUNCTIONAL-AUDIT.md](../qa/FUNCTIONAL-AUDIT.md), [qa/ACCESSIBILITY-AUDIT.md](../qa/ACCESSIBILITY-AUDIT.md), [qa/PERFORMANCE-AUDIT.md](../qa/PERFORMANCE-AUDIT.md).
- Privacy inventory, retention schedule, sources and owner questions: [docs/DATA-PRIVACY.md](../docs/DATA-PRIVACY.md); draft notice (not publication-ready): [docs/PRIVACY-NOTICE-DRAFT.md](../docs/PRIVACY-NOTICE-DRAFT.md).
- Owner decisions taken during the audit: D-024 in [docs/DECISIONS.md](../docs/DECISIONS.md).
- Deploy steps for this work (seed-account lock, hand uploads, `.htaccess` after the deploy): the "#14 (audit fixes, 17 October 2026)" row in [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md#owner-actions-per-pull-request).

Launch decision at handoff: NOT READY FOR PRODUCTION (A02, A03, A20 open; privacy facts missing). Privacy readiness: BLOCKED, owner information required.

Next for a developer:

1. A15: move the staff token out of the script-readable cookie (HttpOnly cookie plus CSRF protection). It changes sign-in and local development (the dev API is another origin), so agree a plan with the owner first. The CSP (K-23) reduces the risk meanwhile.
2. K-15 follow-up: once `TOKEN_TTL_DAYS` has passed after the deploy, remove the plain-token fallback in `require_auth`, logout and password change.
3. K-18: retention jobs, after the owner sets periods.
4. K-07: Today's lists stop at 20 items (enquiries and unverified payments); `e2e-phase2.sh` E9b and E15c fail on accumulated staging data. Clear old staging rows or fix the ordering rule with the owner.

Waiting on the owner: legal name, privacy contact, retention periods, Terms commercial rules, counsel on GAID Article 19 (attribution), photographs for link previews (K-19), switching off the legacy order-code login (K-14).

Checks to rerun before any further change: `npm run lint`, `npm run build`, `npm run check:tokens`, `node scripts/check-docs.mjs`, `php php-api/tests/run.php`, `bash scripts/staging/e2e-phase{2,3,4,5}.sh` (phase 5 now runs on macOS). Last results: helper tests 374; e2e phase3 93, phase4 63, phase5 25, phase2 46 of 48 (K-07).

Local staging residue from the audit: synthetic staff `audit-hash@example.test` and `audit-pin2@example.test`, one synthetic gift card, extra e2e rows. All `example.test`; safe to delete.

## Continue on another computer

Everything is on GitHub; nothing needed lives only on the Mac. On the other machine:

1. `git fetch origin && git switch feat/redesign-dark-luxury && git pull --ff-only`. The PR stack, in merge order: #6, #7, #8, #9, #10, #11, #12 (Phase 4), #13 (Phase 5), #14 (redesign), #15 (`feat/staff-password-reset`, K-04), #16 (`feat/link-previews`, K-06), #17 (`feat/offline-a16`, A16), then the hardening branch (`feat/hardening-2026-10-18`, no PR number yet). GitHub runs no CI on stacked PRs (only on PRs to `main`), so run the checks in step 5 locally; latest stack verification is in [docs/TEST-STRATEGY.md](../docs/TEST-STRATEGY.md#commands-and-latest-results) (17 October 2026).
2. `npm ci`. For local staging you need PHP 8.x (mysqli, dom, mbstring, gd) and MariaDB or MySQL: `npm run staging:setup` (prints a fresh staging admin password), `npm run staging:serve`, then `npm run dev` ([docs/LOCAL-STAGING.md](../docs/LOCAL-STAGING.md)). Never point a dev build at production.
3. Before any work, read [docs/ROADMAP.md](../docs/ROADMAP.md), [KNOWN-ISSUES.md](../KNOWN-ISSUES.md), the Unreleased part of [CHANGELOG.md](../CHANGELOG.md) and this file, as `.claude/rules/docs-sync.md` requires.
4. Remaining build: [docs/BUILD-SPEC.md](../docs/BUILD-SPEC.md) Phase 5 company orders (Phase 4 is built; see the table above). Plan of record: `docs/Plans 2026/`.
5. Checks per change: `npm run build`, `npm run lint`, `npm run check:tokens`, `npm run docs:check`, `php php-api/tests/run.php`, and `bash scripts/staging/e2e-phase2.sh`, `e2e-phase3.sh`, `e2e-phase4.sh`, `e2e-phase5.sh` against staging.
6. Lint (A13): the JS/JSX config is applied in `eslint.config.js` (11 October 2026); `npm run lint` must report 0 errors.
7. Env files and `config.php` never move between computers; the Ubuntu machine uses its own staging `config.local.php`, created by `npm run staging:setup`.

## Mode

Existing Application. Workflow: Change Safety for every change.

## Decisions (owner, 10 October 2026)

- Local staging: yes. Unknown business facts become editable settings; the website hides empty sections; nothing is invented.
- Delete Larkon demo routes and superseded docs; hide the retail shop from public navigation (code and data kept).
- One pull request per phase, stacked on PR #6.
- Docs flat in `docs/`, `docs/Plans 2026/` kept unchanged until the project ends, every agent keeps the docs current (D-020).

## Scope

- In scope: `src/`, `php-api/` (including new schema files), `docs/`, `qa/`, `scripts/`, workflows, agent files.
- Out of scope: production data and deployment, merging or pushing `main`, external messages, social account creation, new paid services, new runtime npm dependencies unless a phase cannot work without one (record why).

## Authority

- Edit and delete local files within scope; push feature branches; open pull requests.
- Local staging database only. Never connect to the production database or call live write endpoints.
- Schema changes ship as new `php-api/schema_*.sql` files for the owner to import by hand.

## Evidence

- Per phase: `npm run build`, `php php-api/tests/run.php`, `php -l`, `npm run lint` (meaningful once the owner applies the JS/JSX config), `node scripts/check-docs.mjs`, an end-to-end script against local staging with synthetic records, and browser checks where tooling allows; otherwise NOT TESTED.
- Completion: each PR lists manual uploads, schema imports and NOT TESTED items, and the same commit records them in `docs/DEPLOYMENT.md`.
- Keep the docs current as `.claude/rules/docs-sync.md` says: status in `docs/ROADMAP.md`, decisions in `docs/DECISIONS.md`, evidence in `qa/`, defects in `KNOWN-ISSUES.md`, changes in `CHANGELOG.md`. Follow `docs/Plans 2026/` as the plan of record.

## Open items for the owner

- Merge PRs #6 to #17 in order, then the hardening branch (`feat/hardening-2026-10-18`, #18), then the release readiness branch (`feat/release-readiness`, #19, number to be confirmed), with the owner actions listed in `docs/DEPLOYMENT.md`.
- Approve or refuse the deletion candidates in `docs/ROADMAP.md`.
- Phase 3: fill in availability in Settings, decide when to open public requests, confirm the proposed feedback consent wording, and choose when to switch off `ALLOW_LEGACY_ORDER_CODE_LOOKUP` (D-021).

## Previous task

Plans 2026 batch 1: PR #6.
