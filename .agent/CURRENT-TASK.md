# Current Task Contract

## Outcome

Carry out the first approved batch of Plans 2026 (approved by the owner on 10 October 2026):

1. Move the approved decisions from `docs/Plans 2026/` into a small flat set of permanent docs under `docs/`, align the agent entry files with GEE OS 0.10.1, then remove the temporary plan folder.
2. Phase 1 safety baseline: real JS/JSX lint coverage, deploy gated on CI with one Node version, blog update fix and HTML sanitising, payment write in a transaction, customer login throttle with generic errors, and localhost CORS removed from production.

## Mode

Existing Application. Workflows: Change Safety for every code edit; Project Recovery for the documentation migration.

## Scope

- In scope: `docs/`, root entry files (AGENTS.md, CLAUDE.md, CODEX.md, README.md, DESIGN-SYSTEM.md), `.agent/`, `.claude/rules/`, `eslint.config.js`, `.github/workflows/`, the PHP endpoints named in the outcome, `php-api/tests/`, `php-api/config.sample.php`, lint fixes in `src/` needed to make the new lint gate pass.
- Out of scope: website copy and design changes (Phase 4), appointments, measurement versioning and portal redesign (Phases 2 and 3), schema migrations, new npm dependencies, deployment, production data, external messages, social accounts.

## Authority

- Research: yes.
- Create planning artefacts: yes, inside `docs/`.
- Edit local files: yes, within scope.
- Delete: `docs/Plans 2026/` only, after every accepted decision is mapped to a permanent doc.
- Git: feature branch `feat/plans-2026-phase1`, one commit per concern, push the branch and open a pull request. Never push or merge `main` (pushing `main` deploys).
- Use external services: GitHub for the branch push and pull request only.
- Change production: no.
- MCP reads: documentation lookups only. MCP mutations: no.

## Risk and dependencies

- Risk level: production. Merging the pull request deploys; only the nine PHP files listed in `deploy.yml` reach the server automatically. Edited endpoints outside that list need a manual upload, recorded in the PR.
- Affected areas: CI, deploy workflow, `_lib.php`, `account.php`, `content.php`, `store.php`, `tailoring.php`, documentation and agent instructions.
- Required decisions: none outstanding for this batch. Owner decisions are recorded in `docs/PRODUCT.md`.

## Evidence

- Required checks: `npm run lint` reporting real JS/JSX files with zero errors, `npm run build`, `php php-api/tests/run.php`, `php -l` on every changed PHP file, link check across `docs/`, grep for stale instructions.
- Completion conditions: each change verified or marked NOT TESTED; runtime database behaviour is NOT TESTED until a staging environment exists; PR open with evidence and manual-upload list.

## Previous task

8 October 2026 audit and polish, recorded in commit d91951c. Its contract is superseded by this one.
