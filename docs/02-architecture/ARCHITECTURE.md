# Architecture

This file owns the runtime shape of HeritOS: constraints, the architecture decision, trust boundaries, the runtime map, the PHP endpoint pattern, the route inventory, the CMS public projection and the repository layout. Endpoints are in [API-SPEC.md](API-SPEC.md), tables and the target record model in [DATA-MODEL.md](DATA-MODEL.md), external services in [INTEGRATIONS.md](INTEGRATIONS.md), environments and deploy in [DEPLOYMENT.md](../07-operations/DEPLOYMENT.md).

Inventories were Verified from source on 10 October 2026. Presence in source is not proof of working behaviour or of what is deployed.

## Context and constraints

- Users: one owner, a small number of clients and company contacts, public visitors in Lagos. Traffic is small; exact figures Unknown.
- Hosting: Namecheap shared cPanel with PHP and MySQL on the same server; no Node runtime on the server; DNS on Cloudflare (grey cloud).
- Environments: production, and local staging on one laptop ([LOCAL-STAGING.md](../07-operations/LOCAL-STAGING.md)). No shared staging server yet.
- Privacy: client measurements, contact details and photos are private ([DATA-PRIVACY.md](../05-security/DATA-PRIVACY.md)).
- Cost: no paid infrastructure beyond hosting; optional AI and messaging providers only when configured.

## Decision

- **Architecture:** keep the React single-page app plus plain PHP endpoints over one MySQL database. Extend existing records and endpoints rather than replacing them. Owner decision, 10 October 2026 (D-007).
- **Trust boundaries:** the browser is untrusted; `php-api/*.php` is the only code that touches MySQL; `config.php` on the server holds every secret; public JSON is a strict projection with no private fields.
- **Client responsibilities:** rendering, UI-level role hiding, input convenience. Never authorisation, never database access.
- **Server responsibilities:** authentication, `require_auth($roles)` on every staff endpoint, ownership checks (target), validation, prepared statements, audit logging, throttling.
- **Alternatives considered and rejected:** Laravel API, TypeScript migration, microservices, framework migration for SEO, a second CMS (D-007, D-017).
- **Consequences and risks:** CI deploys only nine PHP files, so the rest depend on manual upload and their live versions are Unknown (A02); no automated end-to-end tests yet.

## Runtime map

```text
Browser (React SPA)
   |  fetch() with JSON, Bearer token
   v
php-api/*.php on the cPanel document root  (require '_lib.php', config.php)
   |  mysqli, prepared statements, host = localhost
   v
MySQL database (cPanel, phpMyAdmin)
```

| Component | Responsibility | Data handled | Dependency | Failure behaviour | Owner |
|---|---|---|---|---|---|
| React SPA (`src/`) | Public site, admin app, auth screens | Rendered records; tokens in cookie and localStorage (A15) | `heritApi.js`, API | Per-page error states; no offline writes yet ([OFFLINE-SPEC.md](../04-pwa/OFFLINE-SPEC.md)) | Owner |
| API client (`src/helpers/heritApi.js`) | Native `fetch`, adds `Authorization: Bearer <token>`, prefixes `API_BASE` | All API traffic | `src/context/constants.js` | Throws `Error(data.error)` on non-2xx (`heritApi.js:33`); pages show their own message | Owner |
| PHP endpoints (`php-api/`) | Auth, records, CMS, integrations | All business data | `_lib.php`, `config.php`, MySQL | JSON `{error}` with status; uncaught errors become a JSON 500 with detail only when `GK_DEBUG` (`_lib.php:31-40`) | Owner |
| MySQL | Storage | All records | cPanel | "Database connection failed" ([DEPLOYMENT.md](../07-operations/DEPLOYMENT.md#troubleshooting)) | Owner |
| Service worker (`public/sw.js`) | Offline shell for static files | No API data (line 25) | Browser | Falls back to cached `index.html` ([PWA-SPEC.md](../04-pwa/PWA-SPEC.md)) | Owner |

- **Frontend:** React 19, Vite, Bootstrap 5 and react-bootstrap, JavaScript only (no TypeScript files in src). Built on the Larkon React v2 admin kit (JS variant). Public site under `src/app/(public)/site`, admin under `src/app/(admin)`, auth and utility screens under `src/app/(other)`.
- **`API_BASE`** (`src/context/constants.js`): in development `import.meta.env.VITE_API_BASE`, defaulting to the local staging API `http://127.0.0.1:8088`; production builds are same-origin (`''`). Development no longer reaches production unless someone sets `VITE_API_BASE` to it on purpose (A01).
- **Mock backend:** Larkon's axios `fake-backend` mocks only `POST /login` with demo users. It loads only in development (`src/App.jsx`) and no module calls axios.
- **React never connects to MySQL.** Any data need means adding or extending a PHP endpoint and fetching it.

## PHP endpoint pattern

Every endpoint `require`s `_lib.php`, which provides CORS, JSON helpers, `require_auth($roles)`, audit logging, login throttle helpers, the HTML sanitiser, payment helpers, reference helpers and `cfg()`. `cfg()` reads a setting whether `config.php` declares it as a `$variable` or a `define()`d constant. `config.php` is server-only; only `config.sample.php` is committed. Use prepared statements and `echo json_encode(...)`. One file per resource.

CORS: production is same-origin. `_lib.php` used to reflect any `localhost` or `127.0.0.1` origin in every environment (A15); on `feat/plans-2026-phase1` that sits behind `ALLOW_LOCALHOST_CORS`, default off ([DEPLOYMENT.md](../07-operations/DEPLOYMENT.md#server-configuration)).

## Route inventory

From `src/routes/index.jsx`.

| Group | Routes |
|---|---|
| Public site | `/`, `/about`, `/shop`, `/shop/:slug`, `/cart`, `/checkout`, `/gifting`, `/contact`, `/journal`, `/journal/:slug`, `/track`, `/account`. Shop, cart and gifting links show in public navigation only while the `shop_enabled` setting is on (default off); the routes work by direct URL either way. |
| Admin, business modules | `/dashboard`, `/tailoring`, `/tailoring/groups`, `/tailoring/:id`, `/catalogue`, `/catalogue/:id`, `/stock`, `/suppliers`, `/finance`, `/analytics`, `/marketing`, `/pos`, `/studio`, `/content`, `/channels`, `/team`, `/inbox`, `/whatsapp`, `/coupons`, `/loyalty`, `/engage`, `/reviews`, `/weather`, `/enquiries`, `/crm`, `/crm/:id`, `/sales`, `/sales/:id`, `/profile`, `/permissions` |
| Admin, remaining Larkon kit pages | `/apps/calendar` (sample events in React state only, A08; replaced in Phase 3), `/settings` and `/review` (kit pages with no API calls, not in the menu; kept for now) |
| Auth and utility | `/auth/{sign-in,sign-up,reset-pass,lock-screen}`, `/pages-404`, `/maintenance`, `/coming-soon` |

Removed on 10 October 2026 (A18): the kit demo galleries (`/base-ui/*`, `/advanced-ul/*`, `/charts/*`, `/forms/*`, `/icons/*`, `/maps/*`, `/tables/*`, `/widgets`) and the kit operational pages no module used (`/apps/{chat,email,todo}`, `/products/*`, `/category/*`, `/inventory/*`, `/orders/*`, `/purchases/*`, `/attributes/*`, `/invoice/*`, `/role/*`, `/customer/*`, `/seller/*`, `/coupons/{coupons-list,coupons-add}`, `/support/*`, `/pages/*`), with their page folders and 14 components, hooks and contexts only they imported. `roles.js` lists only sections that still have routes. The pre-removal page inventory is preserved in `docs/Plans 2026/07-RESEARCH-AND-COVERAGE.md`.

## CMS and public projection

Extend the existing content.php, settings.php and store.php pattern; never a second CMS. The server owns business details and published content; the website reads a strictly public projection.

| Authoritative record | Website consumers | App consumers | Rules |
|---|---|---|---|
| Business profile | Footer, contact, social links, metadata | Settings, quote and receipt header | One name, phone, location, hours, verified URLs; no placeholder fallback |
| Services | Home, service pages, enquiry choices | Quote and job type choices | Stable service ID; draft and published; never rename a historical job's service |
| Portfolio projects | Home, work pages, social drafts | Website editor, optional private job link | Public copy and images separate from the private job; permissions recorded |
| Appointment availability | Booking free slots | Calendar | Server-computed; no client details in public |
| Journal posts | Blog list, detail, related | Content editor | Draft and published, sanitised body, slug, metadata; real 404 for unpublished or missing |
| Reviews | Home and service proof | Moderation and feedback | Publication consent; private feedback separate |
| Forms and social destinations | CTAs, footer, contact | Business settings | Allowlist safe schemes and domains; hide missing links |
| Job progress projection | Verified client area | Jobs | Explicit safe status and date fields; no internal notes or costs |

Workflow: edit draft > preview phone and desktop > review permissions and copy > publish > confirm the website result. Drafts never overwrite public content before publish. Keep the previous version for rollback. Fixed section order with editable content; no drag-and-drop page builder.

Failure behaviour: show a clear unavailable message, the last verified public content where suitable, or omit optional sections. Never resurrect sample products, fabricated reviews or old offers when the API returns empty; a deliberately empty catalogue stays empty. Changed or unpublished content invalidates the relevant cache. No credentials, private IDs or internal notes in public JSON.

Known gaps: `SiteLayout.jsx:24-31` falls back to platform home pages for Instagram, Facebook and TikTok and to `wa.me/234` for WhatsApp; Twitter and YouTube fall back to empty; LinkedIn is absent (A12).

Acceptance: change a service, phone number and social URL, publish, and confirm every public consumer uses the new value; unpublish a review or post and confirm no fallback recreates it; malicious HTML and URLs are rejected; booking and enquiry complete on phone and keyboard without losing entered details; no fictional proof or private record appears anywhere public.

## Repository layout

| Location | Purpose | Handling (Plans 2026, 06) |
|---|---|---|
| `src/app/(admin)`, `(public)`, `(other)` | App, public and auth features | Keep; consolidate duplicate routes before any file moves |
| `src/assets` | Styles, fonts, logos, imagery | Keep; align tokens; audit unused kit assets by import and build evidence |
| `src/components`, `hooks`, `context`, `helpers`, `routes`, `layout`, `utils`, `types` | Shared implementation | Only real shared concerns; empty or misnamed types need no language rewrite |
| `php-api/` and `php-api/tests/` | API, SQL history, helper tests | Keep endpoint and schema files in place |
| `public/` | Icons, manifest, robots, service worker | Keep web assets here |
| `.github/workflows/` | CI and deploy | Keep machine-readable automation in place |
| `.agent/`, `.claude/` | GEE OS routing and Claude Code adapter | Short pointers only; `settings.local.json` stays local |
| `docs/` | All substantive documentation, numbered GEE OS hierarchy (D-012) | See [docs/README.md](../README.md) |
| `qa/` | Audit evidence | One file per audit type |
| `scripts/staging/` | Local staging | [LOCAL-STAGING.md](../07-operations/LOCAL-STAGING.md) |
| `node_modules`, `dist`, `.idea`, `.DS_Store` | Generated or local state | Ignored; not source |
| Package files, Vite, ESLint and TS configs, `index.html` | Build inputs | Stay at tool-required paths; revisit obsolete TS configuration only with evidence |
