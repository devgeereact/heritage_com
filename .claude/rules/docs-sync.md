# Keep the docs current

Applies to every agent (Claude Code and Codex) and every change, however small. Goal: any agent can pick up the work without redoing what is done.

## Before you start

1. Read `docs/ROADMAP.md` (phases, findings A01 to A24), `docs/KNOWN-ISSUES.md`, the Unreleased part of `CHANGELOG.md` and `.agent/CURRENT-TASK.md`.
2. If the work is already recorded as done or in progress, do not redo it. Verify it against the code instead, and correct the doc if the doc is wrong.

## In the same commit as the change

Update the one doc that owns the changed fact. Never leave it for a later commit.

| You changed | Update |
|---|---|
| A route, menu item or navigation | `docs/UX-SPEC.md` (as built) and the route inventory in `docs/ARCHITECTURE.md` |
| An endpoint, action, role gate or request rule | `docs/API-SPEC.md` |
| A table, column or `php-api/schema_*.sql` file | `docs/DATA-MODEL.md`, and the import order in `docs/DEPLOYMENT.md` |
| A settings key | The settings rows in `docs/API-SPEC.md`; `docs/PRODUCT-SPEC.md` too if the owner sees it |
| A server config name | Server configuration in `docs/DEPLOYMENT.md` |
| `deploy.yml`, CI, a manual upload or an import step | `docs/DEPLOYMENT.md`, including Owner actions per pull request |
| A design token or shared component | `docs/DESIGN-SYSTEM.md` |
| A business rule | `docs/BUSINESS-RULES.md` |
| A decision by the owner | `docs/DECISIONS.md` (next D-number, dated) |
| Auth, permissions or a security control | `docs/SECURITY.md` |
| A test command or its result | `docs/TEST-STRATEGY.md`, evidence in the matching `qa/*.md` |
| A fixed finding or issue | Its status in `docs/ROADMAP.md` and `docs/KNOWN-ISSUES.md` |
| A new defect you found and did not fix | A new K-number in `docs/KNOWN-ISSUES.md` |

Then, in the same commit:

- Add one line under Unreleased in `CHANGELOG.md` (Added, Changed, Removed or Fixed), naming the finding or issue ID.
- Move the phase status in `docs/ROADMAP.md` if the change completes or starts part of a phase.

## When a task or pull request ends

- Update `.agent/CURRENT-TASK.md`: outcome, what is done, what is next, NOT TESTED items.
- Record the pull request's manual uploads and imports in `docs/DEPLOYMENT.md` under Owner actions per pull request.

## How to write

- One home per fact. Link to it; never copy it into a second file.
- Verify against code before writing a status. Label facts: Verified (file and line), Owner-confirmed (date), Proposed, Unknown, NOT TESTED.
- Plain British English, lead with the outcome, no em dashes. Never use: leverage, empower, showcase, transformative, impactful, cutting-edge, revolutionise, synergy, groundbreaking, utilise.
- New docs go flat in `docs/` only when no existing file owns the topic; add them to the index in `docs/README.md`.
- `docs/Plans 2026/` is the read-only plan of record. Never edit it; record changes of direction in `docs/DECISIONS.md`.

## Check

Run `node scripts/check-docs.mjs` before committing. It must pass; CI runs it on every pull request.
