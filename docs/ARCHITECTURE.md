# Architecture

This file owns the runtime shape of HeritOS: constraints, the architecture decision, trust boundaries, the runtime map, the PHP endpoint pattern, the route inventory, the CMS public projection, the repository layout, external integrations, and PWA, offline and update behaviour. Endpoints are in [API-SPEC.md](API-SPEC.md), tables and the target record model in [DATA-MODEL.md](DATA-MODEL.md), environments and deploy in [DEPLOYMENT.md](DEPLOYMENT.md). External services are under [Integrations](#integrations) and the installable shell under [PWA, offline and updates](#pwa-offline-and-updates).

Inventories were Verified from source on 10 October 2026. Presence in source is not proof of working behaviour or of what is deployed.

## Context and constraints

- Users: one owner, a small number of clients and company contacts, public visitors in Lagos. Traffic is small; exact figures Unknown.
- Hosting: Namecheap shared cPanel with PHP and MySQL on the same server; no Node runtime on the server; DNS on Cloudflare (grey cloud).
- Environments: production, and local staging on one laptop ([LOCAL-STAGING.md](LOCAL-STAGING.md)). No shared staging server yet.
- Privacy: client measurements, contact details and photos are private ([DATA-PRIVACY.md](DATA-PRIVACY.md)).
- Cost: no paid infrastructure beyond hosting; optional AI and messaging providers only when configured.

## Decision

- **Architecture:** keep the React single-page app plus plain PHP endpoints over one MySQL database. Extend existing records and endpoints rather than replacing them. Owner decision, 10 October 2026 (D-007).
- **Trust boundaries:** the browser is untrusted; `php-api/*.php` is the only code that touches MySQL; `config.php` on the server holds every secret; public JSON is a strict projection with no private fields.
- **Client responsibilities:** rendering, UI-level role hiding, input convenience. Never authorisation, never database access.
- **Server responsibilities:** authentication, `require_auth($roles)` on every staff endpoint, ownership checks (target), validation, prepared statements, audit logging, throttling.
- **Alternatives considered and rejected:** Laravel API, TypeScript migration, microservices, framework migration for SEO, a second CMS (D-007, D-017).
- **Consequences and risks:** CI deploys only the PHP files listed in `deploy.yml` (nine on `main`, 16 on the Phase 2 branch), so the other 22 endpoints depend on manual upload and their live versions are Unknown (A02); the only end-to-end checks are the local staging script and per-phase browser runs, not CI.

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
| React SPA (`src/`) | Public site, admin app, auth screens | Rendered records; staff token in a cookie, customer token in sessionStorage on the Phase 3 branch (localStorage before; A15) | `heritApi.js`, API | Per-page error states; no offline writes yet ([ARCHITECTURE.md](#offline-behaviour)) | Owner |
| API client (`src/helpers/heritApi.js`) | Native `fetch`, adds `Authorization: Bearer <token>`, prefixes `API_BASE` | All API traffic | `src/context/constants.js` | Throws `Error(data.error)` on non-2xx (`heritApi.js:33`); pages show their own message | Owner |
| PHP endpoints (`php-api/`) | Auth, records, CMS, integrations | All business data | `_lib.php`, `config.php`, MySQL | JSON `{error}` with status; uncaught errors become a JSON 500 with detail only when `GK_DEBUG` (`_lib.php:31-40`) | Owner |
| MySQL | Storage | All records | cPanel | "Database connection failed" ([DEPLOYMENT.md](DEPLOYMENT.md#troubleshooting)) | Owner |
| Service worker (`public/sw.js`) | Offline shell for static files | No API data (line 25) | Browser | Falls back to cached `index.html` ([ARCHITECTURE.md](#pwa-offline-and-updates)) | Owner |

- **Frontend:** React 19, Vite, Bootstrap 5 and react-bootstrap, JavaScript only (no TypeScript files in src; editor path aliases in `jsconfig.json`). Built on the Larkon React v2 admin kit (JS variant). Public site under `src/app/(public)/site`, admin under `src/app/(admin)`, auth and utility screens under `src/app/(other)`.
- **`API_BASE`** (`src/context/constants.js`): in development `import.meta.env.VITE_API_BASE`, defaulting to the local staging API `http://127.0.0.1:8088`; production builds are same-origin (`''`). Development no longer reaches production unless someone sets `VITE_API_BASE` to it on purpose (A01).
- **No mock backend:** the Larkon axios `fake-backend` and the axios dependency were removed on `chore/cleanup-docs-sync` (commit 224627f); sign-in always goes through `auth.php`.
- **React never connects to MySQL.** Any data need means adding or extending a PHP endpoint and fetching it.

## PHP endpoint pattern

Every endpoint `require`s `_lib.php`, which provides CORS, JSON helpers, `require_auth($roles)`, audit logging, login throttle helpers, the HTML sanitiser, payment helpers, reference helpers and `cfg()`. `cfg()` reads a setting whether `config.php` declares it as a `$variable` or a `define()`d constant. `config.php` is server-only; only `config.sample.php` is committed. Use prepared statements and `echo json_encode(...)`. One file per resource.

Phase 2 adds two shared includes: `_domain.php` (pure rules: role groups, money in kobo, stage transitions, request keys; loaded directly by the helper tests) and `_jobs.php` (database helpers for jobs, clients, measurement sets and the ledger; functions ending in `_tx` run inside the caller's transaction). Endpoints that use them load `_lib.php` first. Shared includes and config files are never requested directly (`php-api/.htaccess`).

CORS: production is same-origin. `_lib.php` used to reflect any `localhost` or `127.0.0.1` origin in every environment (A15); since PR #6 that sits behind `ALLOW_LOCALHOST_CORS`, default off ([DEPLOYMENT.md](DEPLOYMENT.md#server-configuration)).

## Route inventory

From `src/routes/index.jsx` on `chore/cleanup-docs-sync`, 10 October 2026. Navigation as the owner sees it is in [UX-SPEC.md](UX-SPEC.md#as-built-phase-2).

| Group | Routes |
|---|---|
| Public site | `/`, `/about`, `/shop`, `/shop/:slug`, `/cart`, `/checkout`, `/gifting`, `/contact`, `/journal`, `/journal/:slug`, `/track`, `/account`. Shop, cart and gifting links show in public navigation only while the `shop_enabled` setting is on (default off); the routes work by direct URL either way. |
| Public site, Phase 3 branch | `/book` (linked as Book appointment only while `booking.php?action=config` says enabled), `/account/jobs/:ref` (one tailoring job in the client portal), `/access/:invite` (exchanges an owner invite, then opens `/account`); `/track` and `/account` become the two-step verified access form and the portal |
| Admin, daily records (Phase 2 branch) | `/today`, `/enquiries`, `/enquiries/:id`, `/enquiries/:id/convert`, `/clients`, `/clients/:id`, `/clients/:id/measurements/new`, `/jobs`, `/jobs/groups`, `/jobs/:id`, `/payments`, `/appointments`, `/print/:doc/:id`, `/settings`, `/reports` (the former dashboard). On the Phase 3 branch `/appointments` is the real Appointments page and `/messages` is added (owner roles) |
| Admin, redirects (Phase 2 branch) | `/dashboard` to `/today`, `/tailoring` to `/jobs`, `/tailoring/groups` to `/jobs/groups`, `/tailoring/:id` to `/jobs/:id`, `/crm` to `/clients`, `/crm/:id` to `/clients/:id`; on the Phase 3 branch also `/apps/calendar` to `/appointments` |
| Admin, other modules (under More tools) | `/catalogue`, `/catalogue/:id`, `/stock`, `/suppliers`, `/finance`, `/analytics`, `/marketing`, `/pos`, `/studio`, `/content` (Website), `/channels`, `/team`, `/inbox`, `/whatsapp`, `/coupons`, `/loyalty`, `/engage`, `/reviews`, `/weather`, `/sales`, `/sales/:id`, `/profile`, `/permissions` |
| Auth and utility | `/auth/{sign-in,sign-up,reset-pass,lock-screen}`, `/pages-404` |

Removed on 10 October 2026 (A18): the kit demo galleries (`/base-ui/*`, `/advanced-ul/*`, `/charts/*`, `/forms/*`, `/icons/*`, `/maps/*`, `/tables/*`, `/widgets`) and the kit operational pages no module used (`/apps/{chat,email,todo}`, `/products/*`, `/category/*`, `/inventory/*`, `/orders/*`, `/purchases/*`, `/attributes/*`, `/invoice/*`, `/role/*`, `/customer/*`, `/seller/*`, `/coupons/{coupons-list,coupons-add}`, `/support/*`, `/pages/*`), with their page folders and 14 components, hooks and contexts only they imported. On `chore/cleanup-docs-sync` the unlinked kit `/review`, `/maintenance` and `/coming-soon` pages were also removed (commit 05e13d6). On the Phase 3 branch the last kit page, `/apps/calendar` (sample events in React state, A08), was retired with its seven files, `SelectFormInput.jsx`, and the packages only it used: the seven `@fullcalendar/*` packages and `react-select`; its old URL redirects to `/appointments`. `roles.js` lists only sections that still have routes. The pre-removal page inventory is preserved in `docs/Plans 2026/07-RESEARCH-AND-COVERAGE.md`.

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
| `docs/` | All substantive documentation, flat GEE OS Standard application profile; `docs/Plans 2026/` is the only subfolder (D-020) | See [docs/README.md](README.md) |
| `qa/` | Audit evidence and the launch checklist | One file per audit type |
| `scripts/staging/` | Local staging and the Phase 2 end-to-end script | [LOCAL-STAGING.md](LOCAL-STAGING.md) |
| `scripts/check-docs.mjs` | Documentation check run in CI | [docs/README.md](README.md#how-the-docs-stay-current) |
| `node_modules`, `dist`, `.idea`, `.DS_Store` | Generated or local state | Ignored; not source |
| Package files, Vite and ESLint configs, `jsconfig.json`, `index.html` | Build inputs | Stay at tool-required paths. The three tsconfig files were replaced by one `jsconfig.json` (commit a3a4610); `typescript` and `typescript-eslint` stay because the ESLint config imports them |

## Integrations

Every external service HeritOS can call, its boundary and its failure path. Setting names are in [DEPLOYMENT.md](DEPLOYMENT.md#server-configuration); credentials never appear in this repository. Message events and email behaviour are in [NOTIFICATIONS-SPEC.md](NOTIFICATIONS-SPEC.md). Whether each service is configured on the live server is Unknown (A20); local staging configures none of them except Open-Meteo.

| Service | Purpose | Data exchanged | Credential owner | Cost or limit | Failure path | Replacement risk | Status |
|---|---|---|---|---|---|---|---|
| OpenRouter text AI (`ai.php`) | Optional public draft copy | Staff prompts only. No private client content, measurements or records by default | Owner, `OPENROUTER_KEY` and `OR_MODEL` in server config.php | Per token, Unknown | Returns "not configured" when the key is blank | Low; optional feature | Optional, no launch dependency |
| Image AI (`ai_image.php`) | Optional image drafts | Staff prompts only | Owner, `IMAGE_PROVIDER` and provider keys | Per image, Unknown | Same as above | Low | Optional. AI-made garments are never presented as delivered work |
| Outgoing mail (`mail.php`) | Staff-sent email | Recipient, subject, body | Owner, `SMTP_*` | Hosting mail limits, Unknown | Blank `SMTP_HOST` falls back to PHP `mail()`; failure returns 502 (`mail.php:64`) | Low | Built; live config Unknown |
| Incoming mail (`inbox.php`) | Read the business mailbox | Mailbox messages | Owner, `IMAP_*` | None | Clean 501 when `IMAP_HOST` is blank | Low | Built; live config Unknown |
| WhatsApp (`whatsapp.php`, `_lib.php` `wa_dispatch()`) | Order and job messages | Phone number, message text | Owner, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN` | Meta pricing, Unknown | Without a token every send is logged and offered as a wa.me link | Medium; Meta policy changes | Built. No promise of syncing personal WhatsApp |
| Payment gateways | Optional hosted card payments | Order reference, amount | Owner, `PAYMENT_PROVIDER` (Paystack or Flutterwave) and Stripe keys | Provider fees | Manual mode when unconfigured | Medium | Approved direction: manual verified transfer and cash first; at most one hosted gateway later; never handle card details (BR-25) |
| Weather (`weather.php`, Open-Meteo) | Lagos forecast | None (no key) | None | Free | Endpoint error | Low | Built; hidden from the daily app in the target design. `OPENWEATHER_API_KEY` in config.sample.php is unused |
| Social profiles | Links from website and app | Public URLs only | Owner (accounts) | None | Unconfigured links hidden (target; A12) | None | A saved link grants no publishing authority; no automatic posting |
| GitHub Actions and FTP | CI and deploy | Build output and the PHP files listed in `deploy.yml` (16 on the Phase 2 branch) | Owner, repository secrets `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` | Free tier | Deploy job fails before upload | Low | Built ([DEPLOYMENT.md](DEPLOYMENT.md#ci-and-deploy)) |
| Cloudflare DNS | DNS only (grey cloud) | DNS records | Owner | Free | Orange cloud breaks AutoSSL | Low | Built |

Confirm current availability and terms through the provider's official source before enabling any service. A useful manual step beats an unreliable integration.

## PWA, offline and updates

Whether HeritOS is a PWA, what its manifest and service worker do today, how it behaves offline and how updates arrive. Evidence goes in [qa/PERFORMANCE-AUDIT.md](../qa/PERFORMANCE-AUDIT.md#pwa).

**Background sync: N/A.** No offline queue or background sync exists or is planned; the service worker is an offline shell and writes are blocked offline (D-016). Server-side duplicate protection still applies to online writes (request keys, `lock_version` conflicts; [DATA-MODEL.md](DATA-MODEL.md#rules)). Revisit only through a new decision backed by a repeated owner need.

- **Applicability:** Applicable, limited to an installable offline shell. The app ships a manifest and a service worker; offline job or payment storage is out of scope (D-016, from Plans 2026, approved 10 October 2026).
- **User reason for installation:** quick launch of the admin app on the owner's phone. The service worker comment still says "installable + offline-capable for the stall" (`public/sw.js:1`), a market-stall use that is no longer a launch priority.
- **Supported platforms:** browsers that support service workers; exact device list Unknown and NOT TESTED.
- **Manifest, start URL and scope:** `public/manifest.webmanifest`, linked from `index.html:12`. `start_url` `/`, `scope` `/`, `display` `standalone`, `orientation` `portrait-primary`. Since commit f1e8960 (K-03) the description names the workshop scope (enquiries, appointments, clients, measurements, jobs, payments, website), `background_color` is `#FFFFFF`, `theme_color` is ink `#171A20`, and the icons are the needle H monogram: SVG, 192 and 512 PNG, and maskable SVG and 512 PNG, plus `favicon.ico` and `apple-touch-icon.png`.
- **Service worker strategy (Verified, `public/sw.js`):** cache `heritos-v1` (line 4); precaches `/`, `/index.html`, the manifest and `/icon.svg` (line 5); ignores non-GET requests (line 21); never caches `.php` or `/api` paths (line 25); network-first for navigations with the cached `index.html` as offline fallback (lines 28-30); cache-first for same-origin static assets, caching successful responses (lines 34-43).
- **Registration:** `index.html:101-103` registers `/sw.js` on load in every environment except `localhost` and `127.0.0.1`, so local development and staging run without it.
- **Installation and update experience:** no custom install prompt and no update prompt ([ARCHITECTURE.md](#updates)).

The PWA release gate in [LAUNCH-CHECKLIST.md](../qa/LAUNCH-CHECKLIST.md) applies because the manifest and service worker ship to production.

### Offline behaviour

Decision D-016 (Plans 2026, approved 10 October 2026): the service worker is an offline shell, not offline job or payment storage; writes are blocked while offline; no background sync until justified (finding A16).

#### Current behaviour (Verified 10 October 2026)

- The shell and static files load offline; navigations fall back to the cached `index.html` (`public/sw.js:28-30`).
- API calls are never cached (`public/sw.js:25`), so every data request fails offline.
- The app has no connection detection: no `navigator.onLine` or `offline` event handling in `src/`. Some admin pages name their failed-request state "offline" in code (for example `tailoring/groups/page.jsx`); it means "request failed". Since PR #9 the daily pages show a plain message with Retry through the shared `LoadError` component (K-02 fixed); no page shows the old upload instruction.
- Write blocking while offline: not implemented.

#### Target behaviour

| Journey | Offline read | Offline write | User message | Queue or fallback | Recovery |
|---|---|---|---|---|---|
| Any admin screen | Shell only; no cached records | Blocked | Plain "You are offline. Changes cannot be saved until the connection returns." (Proposed wording) | None; typed values kept in memory | Retry when back online |
| Measurement entry, payment, stage change | None | Blocked | As above, shown before submit | None | Values kept in memory; owner resubmits |
| Public enquiry and booking request | Public shell only | Blocked | As above | None | Typed values kept on screen |
| Customer access | None | Blocked | As above | None | Retry |

Rules:

- Never imply a write succeeded before the server confirms it.
- During outages keep unsent form values in memory and tell the user what happened. Do not persist private drafts on shared devices by default (Plans 2026, 04).
- Cache allowlist stays limited to the shell and static assets; private data is never cached.
- Behaviour on slow, intermittent and restored connections is NOT TESTED ([qa/PERFORMANCE-AUDIT.md](../qa/PERFORMANCE-AUDIT.md#pwa)).

### Updates

How a new deployment reaches installed or cached copies of the app. Current behaviour is Verified from `public/sw.js`; none of it has been tested on a device.

- **Service worker versioning:** a single hard-coded cache name, `heritos-v1` (`public/sw.js:4`). It changes only when someone edits it ("Bump CACHE to invalidate", line 3). It is not tied to the release version.
- **Cache migration and deletion:** on activate, every cache whose name differs from the current one is deleted (lines 11-16).
- **Update detection:** the browser's standard service worker update check on navigation. Navigations are network-first (lines 28-30), so a fresh `index.html` arrives whenever the network is available.
- **User prompt or automatic activation:** automatic. `skipWaiting()` on install (line 8) and `clients.claim()` on activate (line 15); there is no user prompt.
- **Unsaved-work protection:** none specific to updates. Risk: same-origin static assets are cache-first (lines 34-43); Vite emits hashed asset names, so a new build normally requests new files, but an open tab can keep running old JavaScript until reload. Impact on a form in progress is NOT TESTED.
- **Rollback path:** redeploy the previous build ([DEPLOYMENT.md](DEPLOYMENT.md#rollback)); navigations pick it up network-first. If a broken service worker ever ships, bump the cache name in a fixed build.

Proposed (not decided): tie the cache name to the release version so each deploy clears old static files, and record the update check in the release checklist. Verify an upgrade from the previous production version; a clean install does not prove the update path ([qa/PERFORMANCE-AUDIT.md](../qa/PERFORMANCE-AUDIT.md#pwa)).
