# Current Task Contract

## Outcome

Build the full Plans 2026 roadmap (owner instruction, 10 October 2026: "build everything that we've planned, from start to finish"), delivered as stacked pull requests, one per phase. Live status is in `docs/ROADMAP.md`; owner actions at each merge are in `docs/DEPLOYMENT.md` (Owner actions per pull request).

| Step | Branch | State |
|---|---|---|
| Phase 1 safety fixes | `feat/plans-2026-phase1` (PR #6) | Done, open. Lint config blocked (A13); release manifest and backups need the owner and production |
| Phase 1b staging and clean-up | `feat/phase1b-staging` (PR #7) | Done, open |
| Docs hierarchy | `feat/docs-gee-os` (PR #8) | Done, open; flattened by the clean-up step |
| Phase 2 daily records | `feat/phase2-daily-records` (PR #9) | Built, open; awaiting merge |
| Clean-up and docs sync | `chore/cleanup-docs-sync` | Current: unused code and assets removed; docs flattened to the Standard application profile and brought up to date; docs-sync rule and CI docs check added |
| Phase 3 appointments and customer portal | `feat/phase3-appointments-portal` | Current. Backend done and committed (not pushed): `schema_phase23.sql` to `25`, `_mail.php`, `_portal.php`, `appointments.php`, `booking.php`, `access.php`, `portal.php`, `messages.php`, changes to `account.php`, `settings.php`, `tailoring.php`, `today.php`, `quotes.php`; 251 helper tests, `e2e-phase3.sh` 93 of 93, `e2e-phase2.sh` 48 of 48. Next: the frontend (Appointments page, availability settings, requests queue, Book page, two-step access form, portal job pages, messages tab, change requests and feedback moderation). NOT TESTED: screens, real email delivery, legacy flag off |
| Phase 4 website | `feat/phase4-website` | Not started: one token layer, service and portfolio CMS, business settings, invented claims removed, booking and tracking pages, sitemap |
| Phase 5 company orders | `feat/phase5-company-orders` | Not started: parent job with members, sample approval, partial handover, wearer privacy |

Phase 6 (release, pilot, social publishing) and Phase 7 (learn and simplify) need the owner and live systems; this task prepares their checklists only.

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

- Apply the tested JS/JSX ESLint config (A13).
- Merge PRs #6 to #9 in order, with the owner actions listed in `docs/DEPLOYMENT.md`.
- Approve or refuse the deletion candidates in `docs/ROADMAP.md`.
- Phase 3: fill in availability in Settings, decide when to open public requests, confirm the proposed feedback consent wording, and choose when to switch off `ALLOW_LEGACY_ORDER_CODE_LOOKUP` (D-021).

## Previous task

Plans 2026 batch 1: PR #6.
