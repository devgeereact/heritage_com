# Current Task Contract

## Outcome

Audit heritage_com (HeritOS) against the applicable GEE OS 0.9.0 standards and apply safe, reversible local improvements, preserving its purpose, working behaviour, data and existing work.

## Mode

Existing Application. Workflow: Existing Application, with the Change Safety protocol for each edit.

## Scope

- In scope: baseline inspection and checks, findings ranked P0 to P4, small local fixes to code, documentation and agent instructions, reports under `../reports/heritage-com/`.
- Out of scope: deletions, dependency or runtime changes, database migrations, authentication, payment or business-rule changes, deployment, commits and pushes, production or external mutations.

## Authority

- Research: yes, read-only.
- Create planning artefacts: yes, under `../reports/heritage-com/`.
- Edit local files: safe, reversible changes only.
- Use external services: no.
- Change production: no.
- MCP reads: documentation lookups only.
- MCP mutations: no.

## Risk and dependencies

- Risk level: production. Pushing `main` deploys through `.github/workflows/deploy.yml`; local development calls the live API at heritclothing.com.
- Affected areas: React admin and storefront (`src/`), PHP API (`php-api/`), deploy workflow, project documentation.
- Required decisions: listed in `../reports/heritage-com/AUDIT-AND-POLISH-2026-10-08.md`.

## Evidence

- Required checks: `npm run build`, bundle inspection for demo code, `npm run lint` (currently matches no JS files), manual review of changed files.
- Completion conditions: every change verified or marked NOT TESTED, project report and workspace summary updated, no unrelated work altered.

## Previous task

GEE OS 0.5.0 local adoption (wave 1) is complete. Its record is `docs/GEE-OS.md`.
