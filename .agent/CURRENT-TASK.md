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
| Production-readiness and privacy audit | `feat/redesign-dark-luxury` (audit commits, 17 October 2026) | Done, two commits on PR #14 (owner pasted two audit briefs). Fixed K-08 (P0 seed passwords), K-09, K-10 (server security), K-24 (website: not-found page, error screen, SEO tags, pause controls, shop off for visitors, privacy notes, self-hosted fonts). Docs: privacy inventory, retention schedule, sources and owner questions in `docs/DATA-PRIVACY.md`; draft notice `docs/PRIVACY-NOTICE-DRAFT.md`. Evidence: lint 0 errors, build, 374 helper tests, e2e phase2 48, phase3 93, phase4 63, browser checks on staging. NOT TESTED: e2e-phase5 on the Mac (K-17), HSTS under TLS, webhook signature, AI caps, error screen at runtime, booking note in a browser, real phones, screen readers. Second batch the same day: K-15 (hashed staff tokens), K-16 (form focus), K-17 (phase 5 on macOS, 25 of 25), K-20 (sitemap, service worker; manifest choice left to the owner), K-23 (login timing). Owner decisions D-024 the same day built: promotional WhatsApp sends off (K-11), AI drafter without personal data (K-12), 30-day attribution (K-13), staff-only install (K-20). Then A16 (offline write blocking and banner) and 64-bit gift codes. Then one PIN per person and a tested Content Security Policy (K-23). Next: legal entity and privacy contact, retention periods; Terms BLOCKED on commercial rules |

Phase 6 (release, pilot, social publishing) and Phase 7 (learn and simplify) need the owner and live systems; this task prepares their checklists only.

## Handoff: production-readiness and privacy audit (17 October 2026)

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

1. `git fetch origin && git switch feat/redesign-dark-luxury && git pull --ff-only`. The PR stack, in merge order: #6, #7, #8, #9, #10, #11, #12 (Phase 4), #13 (Phase 5), #14 (redesign).
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

- Merge PRs #6 to #14 in order, with the owner actions listed in `docs/DEPLOYMENT.md`.
- Approve or refuse the deletion candidates in `docs/ROADMAP.md`.
- Phase 3: fill in availability in Settings, decide when to open public requests, confirm the proposed feedback consent wording, and choose when to switch off `ALLOW_LEGACY_ORDER_CODE_LOOKUP` (D-021).

## Previous task

Plans 2026 batch 1: PR #6.
