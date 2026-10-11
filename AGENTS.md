# heritage_com Agent Contract

This existing project adopts the active shared GEE OS, minimum version 0.10.1. Read `.agent/PROJECT.yml` and `.agent/CURRENT-TASK.md`, then apply the constitution, loop and routing rules at `~/.agents/gee-os`.

## Read order

1. `AGENTS.md`, this shared entry point.
2. `.agent/PROJECT.yml`, project routing and risk.
3. `.agent/CURRENT-TASK.md`, current scope and evidence.
4. `CLAUDE.md`, project essentials and golden rules.
5. `docs/ROADMAP.md`, `KNOWN-ISSUES.md` and the Unreleased part of `CHANGELOG.md`, so you know what is already done or in progress.
6. `docs/README.md`, then only the files in `docs/` the task needs.

## Project sources of truth

Docs follow the GEE OS Standard application profile: flat `docs/*.md`, evidence in `qa/`. Each fact has one home; `docs/README.md` lists which file owns what.

- Product, context, scope and roles: `docs/PRODUCT-SPEC.md`, with `BUSINESS-RULES.md`, `USER-JOURNEYS.md`, `CONTENT.md` (website) and `SOCIAL.md`
- Architecture, integrations and PWA: `docs/ARCHITECTURE.md`; data: `docs/DATA-MODEL.md`; endpoints: `docs/API-SPEC.md`
- Security, auth and permissions: `docs/SECURITY.md`; privacy: `docs/DATA-PRIVACY.md`
- Design: `docs/DESIGN-SYSTEM.md`, `docs/UX-SPEC.md`, `docs/ACCESSIBILITY.md`
- Tests: `docs/TEST-STRATEGY.md`; evidence and the launch checklist: `qa/`
- Operations: `docs/DEPLOYMENT.md` (with backup and monitoring), `docs/LOCAL-STAGING.md`, `docs/NOTIFICATIONS-SPEC.md`
- Live status and decisions: `docs/ROADMAP.md`, `docs/DECISIONS.md`
- Approved plan of record: `docs/Plans 2026/` (read-only until the project ends; `ROADMAP.md` and `DECISIONS.md` win where they differ)
- Open issues and changes: `KNOWN-ISSUES.md`, `CHANGELOG.md`

## Keep the docs current

Every agent follows `.claude/rules/docs-sync.md`. In short:

- Before starting, read the files in step 5 of the read order and do not redo work they record as done.
- In the same commit as any change, update the one doc that owns the changed fact, add a line under Unreleased in `CHANGELOG.md`, and move the status in `docs/ROADMAP.md` and `KNOWN-ISSUES.md` when a finding or issue changes.
- When a task ends, update `.agent/CURRENT-TASK.md`.
- Link to a fact instead of copying it. Plain British English, no em dashes.
- `node scripts/check-docs.mjs` must pass; CI runs it.

## Commands

- Install: `npm ci`
- Staging: `npm run staging:setup` once, then `npm run staging:serve` (local API on 127.0.0.1:8088, synthetic data; see `docs/LOCAL-STAGING.md`).
- Develop: `npm run dev` (port 5112). Development calls the local staging API unless `VITE_API_BASE` says otherwise; never point it at production without the owner's agreement.
- Build: `npm run build`
- Lint: `npm run lint` (ESLint over `src/**/*.{js,jsx}`, `public/sw.js` and root config files; must report 0 errors)
- Test: `php php-api/tests/run.php` (pure PHP helper checks); `php -l` on changed PHP files; `bash scripts/staging/e2e-phase2.sh` against local staging. No frontend test script yet.
- Docs: `node scripts/check-docs.mjs`
- Type check: none (JavaScript project)

## Shared rules

- Select one primary mode and load only relevant systems, workflows, skills and MCP rules.
- Preserve established business rules, architecture and user work.
- Treat documentation as evidence to verify against real code and behaviour.
- Apply the change safety protocol before modifying existing behaviour.
- Never claim fixed, secure, accessible or ready without matching evidence.
- Pushing `main` deploys to production. Work on a branch and open a pull request; never push, merge or rebase `main` without explicit authority.
- Keep remote and production changes outside scope unless the current user authorises them explicitly.
- MCP and skill availability never expands user authority.
