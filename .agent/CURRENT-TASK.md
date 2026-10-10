# Current Task Contract

## Outcome

Build the full Plans 2026 roadmap (owner instruction, 10 October 2026: "build everything that we've planned, from start to finish"), delivered as stacked pull requests, one per phase:

1. `feat/phase1b-staging`: local staging (MariaDB + `php -S`, synthetic data), dev API switchable away from production, non-guessable public references (A06), plain enquiry error (A17), real company field (A11), Larkon demo routes removed (A18), shop hidden from public navigation, superseded docs removed.
2. `feat/phase2-daily-records`: Today page, enquiry conversion, one Clients area, dated measurement sets with job snapshots, versioned quotes, append-only payment ledger, delivery records, simplified navigation.
3. `feat/phase3-appointments-portal`: availability settings, conflict-safe appointments, verified customer access over tailoring jobs, messages, change requests, feedback.
4. `feat/phase4-website`: one token layer (Herit amber on a Tesla-style layout), service and portfolio CMS, business settings, invented claims removed, booking and tracking pages, sitemap, restrained hero motion.
5. `feat/phase5-company-orders`: parent job with members, sample approval, partial handover, wearer privacy.

Phase 6 (release, pilot, social publishing) and Phase 7 (learn and simplify) need the owner and live systems; this task prepares their checklists only.

## Mode

Existing Application. Workflow: Change Safety for every change.

## Decisions (owner, 10 October 2026)

- Local staging: yes. Unknown business facts become editable settings; the website hides empty sections; nothing is invented.
- Delete Larkon demo routes and superseded docs; hide the retail shop from public navigation (code and data kept).
- One pull request per phase, stacked on PR #6.

## Scope

- In scope: `src/`, `php-api/` (including new schema files), `docs/`, `scripts/`, workflows, agent files.
- Out of scope: production data and deployment, merging or pushing `main`, external messages, social account creation, new paid services, new runtime npm dependencies unless a phase cannot work without one (record why).

## Authority

- Edit and delete local files within scope; push feature branches; open pull requests.
- Local staging database only. Never connect to the production database or call live write endpoints.
- Schema changes ship as new `php-api/schema_*.sql` files for the owner to import by hand.

## Evidence

- Per phase: `npm run build`, `php php-api/tests/run.php`, `php -l`, lint (if config applied), and end-to-end checks against local staging with synthetic records. Browser checks where tooling allows; otherwise NOT TESTED.
- Completion: each PR lists manual uploads, schema imports and NOT TESTED items.
- Record status in `docs/08-change-management/ROADMAP.md`, decisions in `DECISIONS.md`, evidence in `qa/`, open defects in `KNOWN-ISSUES.md`. Follow `docs/Plans 2026/` as the plan of record (owner instruction, 10 October 2026).

## Previous task

Plans 2026 batch 1: PR #6.
