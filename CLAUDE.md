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
| Seed login | `dev@heritclothing.com` (`super_admin`); set its password at import, see [docs/OPERATIONS.md](docs/OPERATIONS.md#database-and-schema-files) |

Owner decisions of 10 October 2026 (men's tailoring scope, amber accent on a Tesla-style layout, removal of invented website claims) are in [docs/PRODUCT.md](docs/PRODUCT.md#owner-decisions).

## Golden rules

1. **Never commit `config.php` or any secret.** It is gitignored and lives only on the server. Only `config.sample.php` is committed.
2. **React never touches MySQL.** Any data need means adding or extending a PHP endpoint (the `_lib.php` pattern: auth, prepared statements, JSON, audit) and calling it through `src/helpers/heritApi.js`.
3. **Use the `API_BASE` pattern** from `src/context/constants.js`: development calls `https://heritclothing.com`, production uses relative paths. This means **local development reads and writes live production data**. Do not create, edit or delete records locally unless the change is meant for production. The live API answers a localhost origin only while `ALLOW_LOCALHOST_CORS` is on in the server `config.php`.
4. **Pushing `main` deploys.** Work on a feature branch, push the branch, open a pull request. Never push, merge or rebase `main` without explicit authority. Start with `git pull --ff-only`.
5. **Cloudflare records stay grey cloud (DNS only)** so cPanel can issue SSL.
6. **Roles are enforced on the server** with `require_auth($roles)`. `src/helpers/roles.js` only hides UI; never trust the client.
7. **No manual FTP of the build.** The deploy workflow uploads it.

## Deploy truth

- `.github/workflows/deploy.yml` builds `dist/`, copies **nine** PHP files into it (`_lib`, `api`, `auth`, `ai`, `products`, `customers`, `stats`, `tailoring`, `contact`) and FTP-uploads the lot to the document root.
- The other **22** endpoints, `config.php`, `.htaccess` and every SQL import are done **by hand** in cPanel. A pull request that changes one of those endpoints must list it as a manual upload.
- Deploy runs on Node 22 and repeats lint, PHP checks and the build before uploading; a failure stops the upload. Hand-uploaded endpoints that depend on new `_lib.php` functions go up after the deploy, never before.
- Detail, schema import order and the release checklist: [docs/OPERATIONS.md](docs/OPERATIONS.md).

## Where to look

| Need | File |
|---|---|
| Doc index and source map | [docs/README.md](docs/README.md) |
| Scope, decisions, journeys, priorities | [docs/PRODUCT.md](docs/PRODUCT.md) |
| Runtime, API, routes, tables, integrations | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Design tokens and UI rules | [docs/DESIGN.md](docs/DESIGN.md) |
| Setup, checks, deploy, recovery, troubleshooting | [docs/OPERATIONS.md](docs/OPERATIONS.md) |
| Website copy, SEO, social drafts | [docs/CONTENT-AND-SOCIAL.md](docs/CONTENT-AND-SOCIAL.md) |
| Phases, findings A01 to A24, status | [docs/ROADMAP.md](docs/ROADMAP.md) |
| Current task and scope | [.agent/CURRENT-TASK.md](.agent/CURRENT-TASK.md) |

## Claude-specific notes

- Production confidence is PARTIAL. A passing build is not proof that a workflow works; report runtime behaviour as NOT TESTED until staging exists.
- Design work follows [docs/DESIGN.md](docs/DESIGN.md) only. The old "Tack Stitch" rule is retired.
- Older docs (`docs/features.md`, `docs/nav-map.md`, `docs/seo-analytics.md`, `docs/brief.json`, both `HeritOS.html` files) are superseded. Do not plan from them.
