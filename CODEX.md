# Codex Adapter

Read `AGENTS.md`, `.agent/PROJECT.yml` and `.agent/CURRENT-TASK.md` first. This project follows the shared GEE OS at `~/.agents/gee-os`.

Use Codex skills, plugins and MCP tools only when selected by the project route and relevant to the current task. Confirm the repository, account and environment before relying on live information. Do not infer remote or production authority from tool availability.

Project essentials and golden rules are in `CLAUDE.md`; detailed project facts are in flat `docs/*.md` (start at `docs/README.md`; sources of truth are listed in `AGENTS.md`). Claude Code hooks are not mirrored in Codex, so honour the same rules directly: never read or print secrets, never commit `config.php`, and never push `main` (pushing it deploys).

Keep the docs current exactly as `.claude/rules/docs-sync.md` says (summary in `AGENTS.md`, "Keep the docs current"): owning doc, CHANGELOG line and ROADMAP status in the same commit, then `node scripts/check-docs.mjs`.
