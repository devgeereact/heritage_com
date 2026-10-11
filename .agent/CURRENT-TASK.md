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
| Phase 4 website | `feat/phase4-website` | In progress, pushed (no PR yet). Frontend: token layer and fallback removal committed. Server (11 October 2026): `schema_phase26.sql`, `_cms.php`, `_media.php`, `cms.php`, `site.php`, `sitemap.php`, upload `.htaccess`, robots, `store.php` and `settings.php` changes. Evidence: 323 helper tests, `e2e-phase4.sh` 62 of 62 on two runs, `e2e-phase2.sh` 48 of 48, `e2e-phase3.sh` 93 of 93 ([qa/FUNCTIONAL-AUDIT.md](../qa/FUNCTIONAL-AUDIT.md#phase-4-api-checks-on-staging-11-october-2026)). Design foundation (11 October 2026, commits e1ba62f, 60500c2, cd765d4, 65dcfe4): one `--hc-*` token layer, admin CSS and Iconify kept off public routes (home CSS 63.0 to 6.5 KB gzip, JS 155.7 to 107.4 KB gzip), public UI kit with motion, new header and footer, invented claims removed from Home, About, Contact and the shop pages; Playwright checks PASS at five widths ([qa/ACCESSIBILITY-AUDIT.md](../qa/ACCESSIBILITY-AUDIT.md#phase-4-public-foundation-11-october-2026)). Next: public pages and the admin Website area (spec sections 4.7 to 4.12 in [docs/BUILD-SPEC.md](../docs/BUILD-SPEC.md)) on the API in [docs/API-SPEC.md](../docs/API-SPEC.md#phase-4-website-cms-and-public-projection). NOT TESTED: uploads `.htaccess` and PHP upload limits on the live host, link previews for crawlers that do not run JavaScript, real photographs |
| Phase 5 company orders | `feat/phase5-company-orders` | Not started: parent job with members, sample approval, partial handover, wearer privacy |

Phase 6 (release, pilot, social publishing) and Phase 7 (learn and simplify) need the owner and live systems; this task prepares their checklists only.

## Continue on another computer

Everything is on GitHub; nothing needed lives only on the Mac. On the other machine:

1. `git fetch origin && git switch feat/phase4-website && git pull --ff-only`. The PR stack, in merge order: #6, #7, #8, #9, #10, #11, then Phase 4 and 5.
2. `npm ci`. For local staging you need PHP 8.x (mysqli, dom, mbstring, gd) and MariaDB or MySQL: `npm run staging:setup` (prints a fresh staging admin password), `npm run staging:serve`, then `npm run dev` ([docs/LOCAL-STAGING.md](../docs/LOCAL-STAGING.md)). Never point a dev build at production.
3. Before any work, read [docs/ROADMAP.md](../docs/ROADMAP.md), [KNOWN-ISSUES.md](../KNOWN-ISSUES.md), the Unreleased part of [CHANGELOG.md](../CHANGELOG.md) and this file, as `.claude/rules/docs-sync.md` requires.
4. Remaining build: [docs/BUILD-SPEC.md](../docs/BUILD-SPEC.md) (Phase 4 pages and admin Website area, then Phase 5 company orders). Plan of record: `docs/Plans 2026/`.
5. Checks per change: `npm run build`, `npm run lint`, `npm run check:tokens`, `npm run docs:check`, `php php-api/tests/run.php`, and `bash scripts/staging/e2e-phase2.sh`, `e2e-phase3.sh`, `e2e-phase4.sh` against staging.
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

- Merge PRs #6 to #11 in order, with the owner actions listed in `docs/DEPLOYMENT.md`.
- Approve or refuse the deletion candidates in `docs/ROADMAP.md`.
- Phase 3: fill in availability in Settings, decide when to open public requests, confirm the proposed feedback consent wording, and choose when to switch off `ALLOW_LEGACY_ORDER_CODE_LOOKUP` (D-021).

## Previous task

Plans 2026 batch 1: PR #6.
