# CLAUDE.md: HeritOS (Herit Clothing)

> **Project memory for Claude Code.** Short by design: routing, safety and the facts needed every session. Everything else lives in [docs/](docs/README.md).

@AGENTS.md

## Project

| Item | Value |
|---|---|
| Repo | `devgeereact/heritage_com` (`git@github.com:devgeereact/heritage_com.git`) |
| Product | HeritOS, the operations app and website for Herit Clothing, a men's fashion and tailoring business in Lagos run by one owner |
| Domain | `heritclothing.com`, served from the cPanel document root |
| Hosting | Namecheap shared hosting (cPanel); DNS on Cloudflare |
| Database | MySQL `heritage_com` on `localhost` (cPanel may prefix the name) |
| Deploy branch | `main`: **pushing it deploys** |
| FTP user | `heritage_com@heritclothing.com` (credentials only in GitHub secrets) |
| Stack | React 19, Vite, Bootstrap 5 (Larkon React v2 JS kit); plain PHP endpoints in `php-api/`; MySQL |
| AI | `ai.php` proxies OpenRouter; key and `OR_MODEL` only in server `config.php` |
| Seed login | `dev@heritclothing.com` (`super_admin`); set its password at import, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#database-and-schema-files) |

Owner decisions of 10 October 2026 (men's tailoring scope, amber accent on a Tesla-style layout, removal of invented website claims) are in [docs/DECISIONS.md](docs/DECISIONS.md). Plans 2026 (`docs/Plans 2026/`) is the approved plan of record; live status and later decisions in `docs/ROADMAP.md` and `docs/DECISIONS.md` win where they differ. Keep the plan folder unchanged until the project is finished.

## Golden rules

1. **Never commit `config.php` or any secret.** It is gitignored and lives only on the server. Only `config.sample.php` is committed.
2. **React never touches MySQL.** Any data need means adding or extending a PHP endpoint (the `_lib.php` pattern: auth, prepared statements, JSON, audit) and calling it through `src/helpers/heritApi.js`.
3. **Use the `API_BASE` pattern** from `src/context/constants.js`: development calls `VITE_API_BASE`, defaulting to the local staging API (`npm run staging:serve`, synthetic data); production uses relative paths. Never point development at production without the owner's agreement. The live API answers a localhost origin only while `ALLOW_LOCALHOST_CORS` is on in the server `config.php`.
4. **Pushing `main` deploys.** Work on a feature branch, push the branch, open a pull request. Never push, merge or rebase `main` without explicit authority. Start with `git pull --ff-only`.
5. **Cloudflare records stay grey cloud (DNS only)** so cPanel can issue SSL.
6. **Roles are enforced on the server** with `require_auth($roles)`. `src/helpers/roles.js` only hides UI; never trust the client.
7. **No manual FTP of the build.** The deploy workflow uploads it.

## Deploy truth

- `.github/workflows/deploy.yml` builds `dist/`, copies the PHP files it lists into it and FTP-uploads the lot to the document root. On `main` that is **nine** files (`_lib`, `api`, `auth`, `ai`, `products`, `customers`, `stats`, `tailoring`, `contact`); the Phase 2 branch (PR #9) adds **seven** (`_domain`, `_jobs`, `today`, `enquiries`, `measurements`, `quotes`, `ledger`).
- The other **22** endpoints, `config.php`, `.htaccess` and every SQL import are done **by hand** in cPanel. A pull request that changes one of those must list it as a manual upload, and the same commit records it in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#owner-actions-per-pull-request).
- Deploy runs on Node 22 and repeats lint, PHP checks and the build before uploading; a failure stops the upload. Hand-uploaded endpoints that depend on new `_lib.php` functions go up after the deploy, never before.
- Detail, schema import order and the release procedure: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Keep the docs current

Follow [.claude/rules/docs-sync.md](.claude/rules/docs-sync.md): read [docs/ROADMAP.md](docs/ROADMAP.md), [KNOWN-ISSUES.md](KNOWN-ISSUES.md), the Unreleased part of [CHANGELOG.md](CHANGELOG.md) and [.agent/CURRENT-TASK.md](.agent/CURRENT-TASK.md) before starting; update the owning doc, the changelog and the status in the same commit as the change; run `node scripts/check-docs.mjs`.

## Where to look

| Need | File |
|---|---|
| Doc index, which file owns what, source map | [docs/README.md](docs/README.md) |
| Context, scope, priorities, roles | [docs/PRODUCT-SPEC.md](docs/PRODUCT-SPEC.md) |
| Journeys and business rules | [docs/USER-JOURNEYS.md](docs/USER-JOURNEYS.md), [docs/BUSINESS-RULES.md](docs/BUSINESS-RULES.md) |
| Runtime, routes, integrations, PWA | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Endpoints and tables | [docs/API-SPEC.md](docs/API-SPEC.md), [docs/DATA-MODEL.md](docs/DATA-MODEL.md) |
| Design tokens, UX and accessibility | [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md), [docs/UX-SPEC.md](docs/UX-SPEC.md), [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md) |
| Security, auth, permissions, privacy | [docs/SECURITY.md](docs/SECURITY.md), [docs/DATA-PRIVACY.md](docs/DATA-PRIVACY.md) |
| Checks and test plan | [docs/TEST-STRATEGY.md](docs/TEST-STRATEGY.md) |
| Local staging and the end-to-end script | [docs/LOCAL-STAGING.md](docs/LOCAL-STAGING.md) |
| Deploy, server config, backups, monitoring, troubleshooting | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |
| Website copy and SEO; social drafts | [docs/CONTENT.md](docs/CONTENT.md), [docs/SOCIAL.md](docs/SOCIAL.md) |
| Phases, findings A01 to A24, status | [docs/ROADMAP.md](docs/ROADMAP.md) |
| Launch checklist and release gate | [qa/LAUNCH-CHECKLIST.md](qa/LAUNCH-CHECKLIST.md) |
| Audit evidence; open issues; changes | [qa/](qa/), [KNOWN-ISSUES.md](KNOWN-ISSUES.md), [CHANGELOG.md](CHANGELOG.md) |
| Current task and scope | [.agent/CURRENT-TASK.md](.agent/CURRENT-TASK.md) |

## Claude-specific notes

- Production confidence is PARTIAL. A passing build is not proof that a workflow works; report runtime behaviour as NOT TESTED unless you ran it (local staging, the end-to-end script or a browser).
- Design work follows [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) only. The old "Tack Stitch" rule is retired.
- The superseded 2025 plans (`docs/features.md`, `docs/nav-map.md`, `docs/seo-analytics.md`, `docs/brief.json`, both `HeritOS.html` files) were deleted on 10 October 2026 with owner approval; they remain in Git history only. Do not plan from them.
