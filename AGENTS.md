# heritage_com Agent Contract

This existing project adopts the active shared GEE OS, minimum version 0.10.1. Read `.agent/PROJECT.yml` and `.agent/CURRENT-TASK.md`, then apply the constitution, loop and routing rules at `~/.agents/gee-os`.

## Read order

1. `AGENTS.md`, this shared entry point.
2. `.agent/PROJECT.yml`, project routing and risk.
3. `.agent/CURRENT-TASK.md`, current scope and evidence.
4. `CLAUDE.md`, project essentials and golden rules.
5. `docs/README.md`, then only the files under `docs/` the task needs: `PRODUCT.md`, `ARCHITECTURE.md`, `DESIGN.md`, `OPERATIONS.md`, `CONTENT-AND-SOCIAL.md`, `ROADMAP.md`.

## Commands

- Install: `npm ci`
- Staging: `npm run staging:setup` once, then `npm run staging:serve` (local API on 127.0.0.1:8088, synthetic data; see docs/OPERATIONS.md).
- Develop: `npm run dev` (port 5112). Development calls the local staging API unless `VITE_API_BASE` says otherwise; never point it at production without the owner's agreement.
- Build: `npm run build`
- Lint: `npm run lint` (ESLint over JS/JSX; the JS/JSX config lands with `feat/plans-2026-phase1`, before which it matched only TS/TSX and linted nothing)
- Test: `php php-api/tests/run.php` (pure PHP helper checks); `php -l` on changed PHP files. No frontend test script yet.
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
