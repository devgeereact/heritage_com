# Architecture

HeritOS is a React single-page app and a set of plain PHP endpoints sharing one MySQL database on Namecheap cPanel hosting. The architecture stays as it is (owner decision, 10 October 2026); work extends the existing records and endpoints rather than replacing them. This file owns runtime, routes, API, tables, data model and integration boundaries. Deployment and environments live in [OPERATIONS.md](OPERATIONS.md).

Inventories below were Verified from source on 10 October 2026. Presence in source is not proof of working behaviour or of what is deployed.

## Runtime

```
Browser (React SPA)
   |  fetch() with JSON, Bearer token
   v
php-api/*.php on the cPanel document root  (require '_lib.php', config.php)
   |  mysqli, prepared statements, host = localhost
   v
MySQL database (cPanel, phpMyAdmin)
```

- **Frontend:** React 19, Vite, Bootstrap 5 and react-bootstrap, JavaScript only (no TypeScript files in src). Built on the Larkon React v2 admin kit (JS variant), transplanted into the repo root. Public site under `src/app/(public)/site`, admin under `src/app/(admin)`, auth and utility screens under `src/app/(other)`.
- **API client:** `src/helpers/heritApi.js`, native `fetch`, adds `Authorization: Bearer <token>`, prefixes `API_BASE`.
- **`API_BASE`** (`src/context/constants.js`): `import.meta.env.DEV ? 'https://heritclothing.com' : ''`. Development therefore reads and writes the live production API (finding A01). Production is same-origin.
- **Mock backend:** Larkon's axios `fake-backend` mocks only `POST /login` with demo users. It loads only in development (`src/App.jsx`) and no module calls axios.
- **React never connects to MySQL.** Any data need means adding or extending a PHP endpoint and fetching it.
- **Service worker** (`public/sw.js`): caches the shell and static files; never caches `.php` or `/api` (line 25). It is an offline shell, not offline job or payment storage (A16). Writes must be blocked while offline; no background sync until justified.

## PHP endpoint pattern

Every endpoint `require`s `_lib.php`, which provides CORS, JSON helpers, `require_auth($roles)`, audit logging, login throttle helpers and `cfg()`. `cfg()` reads a setting whether `config.php` declares it as a `$variable` or a `define()`d constant. `config.php` is server-only; only `config.sample.php` is committed. Use prepared statements and `echo json_encode(...)`. One file per resource.

CORS: production is same-origin. Until now `_lib.php` reflected any `localhost` or `127.0.0.1` origin in every environment (A15). Phase 1 on `feat/plans-2026-phase1` puts that behind a new `ALLOW_LOCALHOST_CORS` setting, default off (see [OPERATIONS.md](OPERATIONS.md)).

## Authentication and roles

- **Staff:** `auth.php` issues a random token stored in `auth_tokens` (with device, IP and last-seen columns from schema_phase12). React keeps it in the `_LARKON_AUTH_KEY_` cookie, which is JavaScript-readable (A15). Failed email and PIN logins are throttled (`LOGIN_*`, `PIN_*` settings). Staff PIN login exists for a shared device (`users.pin_hash`).
- **Customers:** `account.php` issues a token stored in `customer_tokens`; React keeps it in localStorage as `herit_customer_token`. Current login is phone plus a retail order code, without throttle (A03). The approved replacement is in [PRODUCT.md](PRODUCT.md#customer-access).
- **Roles:** seven staff roles: `super_admin`, `admin`, `manager`, `tailor`, `editor`, `seller`, `employee`. The server enforces access in every endpoint through `require_auth($roles)`. `src/helpers/roles.js` only hides menu items and blocks routes in the UI; anything it does not list defaults to admin-only. The Permissions page is generated from roles.js, so it cannot drift from client gating, but it does not prove server rules.
- **Approved direction:** owner access covers business records and settings. Future helpers get only the functions they need, with no finance or export access by default. Do not add staff roles because old schemas have them. Keep last-owner lockout protection.

## Access and session requirements (approved target)

- Customer and company access checks ownership on every request: detail, measurement, message, quote, attachment and export. UI hiding is not enforcement. A company contact never reads unrelated clients or wearer measurements.
- Login, reference lookup, verification and public writes get throttles, generic failure messages, payload limits and server validation. Staff-login throttling does not cover customer or public paths. No CAPTCHA until abuse is observed; honeypot plus request limits first.
- Move towards secure, HttpOnly cookies with explicit expiry and revocation, through a reviewed migration. Cookie auth needs a deliberate CSRF design; SameSite alone is not enough. HTTPS, production debug off, restricted origins and no token logging are prerequisites.
- Owner recovery must work without bypassing access control. Assess MFA for the app before launch; at minimum hosting, source control, mailbox and social accounts use their own MFA. Recovery codes never go in the repo or app content.

## Private files and content safety

- Private reference images and proof live outside the public document root or behind authenticated download. Validate real MIME type and extension, limit size and count, randomise names, block execution, avoid inline rendering of active content. Start with JPEG, PNG, WebP and PDF only where needed. Strip location metadata from public images; keep public derivatives separate.
- Blog bodies are stored as raw HTML and rendered with `dangerouslySetInnerHTML` (BlogPostPage.jsx:47), with no sanitiser (A04). Writers are super_admin, admin and manager, so this is stored XSS from a staff account. Sanitise allowed rich text on the server, prohibit scripts, event handlers and unsafe URLs, and treat staff content as untrusted for rendering.
- CSV exports need formula-injection protection; privileged exports are logged.

## API inventory

32 top-level PHP files. "CI" means `deploy.yml` copies it to the server on every push to main; "Manual" means it reaches the server only by hand upload, so its live version is Unknown (A02).

| File | Purpose | Deployed by |
|---|---|---|
| `_lib.php` | Shared helpers: CORS, JSON, auth, audit, throttle, `cfg()`, coupon and referral helpers | CI |
| `api.php` | Smoke test: `items` list (public) and insert (staff) | CI |
| `auth.php` | Staff login, logout, me; email and PIN throttling | CI |
| `ai.php` | OpenRouter text proxy, staff only | CI |
| `products.php` | Catalogue, variants, stock (staff) | CI |
| `customers.php` | Clients (CRM) and customer measurements | CI |
| `stats.php` | Dashboard headline numbers in one call | CI |
| `tailoring.php` | Tailoring jobs, stages, measurements, deposits, groups | CI |
| `contact.php` | Public enquiry submit plus staff enquiry inbox | CI |
| `account.php` | Customer self-service portal | Manual |
| `ai_image.php` | Text-to-image proxy | Manual |
| `analytics.php` | Read-only reports over live tables | Manual |
| `content.php` | Journal (blog) and testimonials CRUD | Manual |
| `coupons.php` | Promo codes and public validation | Manual |
| `engage.php` | Restock waitlist and abandoned-cart recovery | Manual |
| `export.php` | CSV export of orders, payments, expenses, customers | Manual |
| `inbox.php` | IMAP mailbox reader | Manual |
| `loyalty.php` | Store credit and gift cards | Manual |
| `mail.php` | SMTP sender | Manual |
| `marketing.php` | Campaign planner | Manual |
| `orders.php` | Staff retail orders and market (POS) sales | Manual |
| `payments.php` | Money in and out, cash position | Manual |
| `referrals.php` | Referral codes and rewards | Manual |
| `reviews.php` | Reviews, ratings and photo moderation | Manual |
| `settings.php` | Channel toggles and store configuration | Manual |
| `stock.php` | Stock adjustments | Manual |
| `store.php` | Public storefront: catalogue, checkout, published feeds, order tracking | Manual |
| `suppliers.php` | Suppliers and purchase orders (receiving bumps stock) | Manual |
| `users.php` | Team and access: staff CRUD, last super_admin guard | Manual |
| `weather.php` | Lagos forecast from Open-Meteo, no key (weather.php:23) | Manual |
| `whatsapp.php` | WhatsApp threads, templates, Cloud API or wa.me fallback | Manual |
| `config.sample.php` | Template for server-only `config.php` | Never deployed |

## Route inventory

From `src/routes/index.jsx`.

| Group | Routes |
|---|---|
| Public site | `/`, `/about`, `/shop`, `/shop/:slug`, `/cart`, `/checkout`, `/gifting`, `/contact`, `/journal`, `/journal/:slug`, `/track`, `/account` |
| Admin, business modules | `/dashboard`, `/tailoring`, `/tailoring/groups`, `/tailoring/:id`, `/catalogue`, `/catalogue/:id`, `/stock`, `/suppliers`, `/finance`, `/analytics`, `/marketing`, `/pos`, `/studio`, `/content`, `/channels`, `/team`, `/inbox`, `/whatsapp`, `/coupons`, `/loyalty`, `/engage`, `/reviews`, `/weather`, `/enquiries`, `/crm`, `/crm/:id`, `/sales`, `/sales/:id`, `/settings`, `/profile`, `/permissions` |
| Admin, Larkon kit operational pages | `/apps/{chat,email,calendar,todo}`, `/products/*`, `/category/*`, `/inventory/{warehouse,received-orders}`, `/orders/*`, `/purchases/*`, `/attributes/*`, `/invoice/*`, `/role/*`, `/customer/*`, `/seller/*`, `/coupons/{coupons-list,coupons-add}`, `/review`, `/support/{help-center,faqs,privacy-policy}`, `/pages/{welcome,timeline,pricing,pages-404-alt}`, `/widgets` |
| Admin, kit demo galleries | `/base-ui/*` (21 pages), `/advanced-ul/*` (5), `/charts/*` (16), `/forms/*` (11), `/icons/{boxicons,solaricons}`, `/maps/{google,vector}`, `/tables/{basic,gridjs}` |
| Auth and utility | `/auth/{sign-in,sign-up,reset-pass,lock-screen}`, `/pages-404`, `/maintenance`, `/coming-soon`, `*` |

Kit demo routes are hidden from the menu but reachable by URL for any signed-in role roles.js allows (A18). The calendar at `/apps/calendar` holds sample events in React state only (A08).

## Table inventory

35 tables from the `CREATE TABLE` statements in `php-api/*.sql`. This is the source inventory, not proof of what the live database contains. There is no appointments table.

| Schema file | Creates | Also alters |
|---|---|---|
| `schema.sql` | items, users, auth_tokens, audit_log, customers, tailoring_orders, tailoring_events, products, product_variants, enquiries, orders, order_items, stock_adjustments, suppliers, purchase_orders, purchase_order_items, payments, expenses, campaigns, settings | |
| `schema_modules.sql` | orders, order_items, stock_adjustments, suppliers, purchase_orders, purchase_order_items, payments, expenses, campaigns, settings (later-module subset of schema.sql) | |
| `schema_phase2.sql` | | orders (courier, tracking, returns), products |
| `schema_phase3.sql` | whatsapp_messages, whatsapp_templates | |
| `schema_phase4.sql` | | tailoring_orders (fabric_cost, labour_cost, fitting_date) |
| `schema_phase5.sql` | coupons, coupon_redemptions | |
| `schema_phase6.sql` | store_credit, gift_cards | |
| `schema_phase7.sql` | | customers and orders (referral columns) |
| `schema_phase8.sql` | waitlist, abandoned_carts | |
| `schema_phase9.sql` | customer_tokens | |
| `schema_phase10.sql` | reviews | |
| `schema_phase11.sql` | | products (slug, published, storefront) |
| `schema_phase12.sql` | | users (pin_hash), auth_tokens (device, ip, last_seen) |
| `schema_phase13.sql` | tailoring_groups | |
| `schema_phase14.sql` | wishlist_items | |
| `schema_phase15.sql` | nps_responses | |
| `schema_phase16.sql` | blog_posts, testimonials | |

Codes: retail `ORD-` and tailoring `HC-` codes come from `MAX(id)+1` before insert. UNIQUE keys stop duplicates (a race fails the second insert), but the codes are sequential and guessable (A06). store.php and orders.php share one `ORD-` sequence.

## Data model target

Approved direction: one database, the current endpoints and API client, and only the records real workflows need. Existing tailoring records are extended, not replaced.

| Record | Minimum contents | Relationships and invariants |
|---|---|---|
| Client | ID, readable reference, name, contact, preferences | Many jobs and approved measurement sets; phone is not identity |
| Company | Name, authorised contact, invoice information | Linked people and jobs only as needed; no multi-tenant engine |
| Enquiry | Contact, service, brief, desired date, source, status, next follow-up | Optional client and converted job links; conversion idempotent |
| Quote version | Work and items, amount and currency, terms, expiry, acceptance evidence | Job uses the accepted version; edits make a new version |
| Measurement set version | Garment template, unit, values, source, date, approval | Job snapshot fixed at approval; pending client edits separate |
| Appointment | Type, start, end, timezone, buffer, status, client or job link | Server reserves one owner resource; no overlap among active reservations |
| Job | Reference, client or company, garment, scope, promised date, stage, next action | Extends tailoring_orders |
| Job item or member | Quantity or wearer link, snapshot, progress | Only for multi-person jobs; privacy per wearer |
| Payment | Amount, currency, method, date, external reference, receipt, reversal link | Append-only ledger, unique request key, verified settlement |
| Message or note | Job or client link, author, public or internal, channel, time, delivery status | Only explicit client-visible messages leave the admin boundary |
| Delivery or collection | Method, date, carrier or reference, quantities, evidence | Partial fulfilment explicit; address changes reviewed |
| Feedback and consent | Private comment, rating, publication choice, photo permission | Public review curated separately |
| Portfolio item | Public images, copy, service, slug, status | No live projection of private notes; optional internal job link |
| Activity history | Actor, action, target, time, minimal change summary | Never copy full bodies, tokens or measurements into general logs |

Rules:

- Database constraints for unique references and request IDs, foreign keys where practical, transactions for writes that belong together.
- When two screens edit one record, a version or updated-at check returns a conflict and asks the owner to reload, rather than silently overwriting.
- Status transitions are validated centrally on the server and exposed with consistent labels. Today, Jobs and customer tracking never duplicate stage logic.
- Timestamps are stored unambiguously and displayed in Africa/Lagos. Money uses consistent decimal or minor-unit rules, never browser floats.
- Measurements and payments today: one mutable JSON measurement field per customer and per job (A10); deposits are read, added and written back with no transaction (tailoring.php:223-247, A05).

## Integration boundaries

| Integration | Where | Boundary |
|---|---|---|
| OpenRouter text AI | `ai.php`; key and `OR_MODEL` in server config.php | Staff only. No private client content, measurements or records sent by default. Public draft copy only, owner reviewed. No launch dependency. |
| Image AI | `ai_image.php`; `IMAGE_PROVIDER` and keys in config.php | Same rules. AI-made garments are never presented as delivered work. |
| Outgoing mail | `mail.php`: hand-rolled SMTP client (SSL 465, STARTTLS 587, AUTH LOGIN), PHP `mail()` fallback when `SMTP_HOST` is blank | Mailbox hello@heritclothing.com; settings `SMTP_*` in config.php. Delivered, failed and manual are distinct states. |
| Incoming mail | `inbox.php` over IMAP (PHP imap extension): list, get, mark seen | Returns a clean 501 when `IMAP_HOST` is blank. |
| WhatsApp | `whatsapp.php` and `_lib.php` `wa_dispatch()`; Meta Cloud API when `WHATSAPP_TOKEN` is set | Without a token every send is logged and offered as a wa.me link. No promise of syncing personal WhatsApp. |
| Payment gateways | `PAYMENT_PROVIDER` (Paystack or Flutterwave) and Stripe keys exist in config.sample.php | Approved direction: manual verified transfer and cash first; at most one hosted gateway later. Never handle card details. |
| Weather | `weather.php`, Open-Meteo, no key | Hidden from the daily app (see PRODUCT.md). `OPENWEATHER_API_KEY` in config.sample.php is unused by weather.php. |
| Social | Public profile URLs in CMS settings | Links only. A saved link grants no publishing authority. No automatic posting. |

## CMS to website links

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

Known gaps: `SiteLayout.jsx:24-31` falls back to platform home pages for Instagram, Facebook and TikTok and to `wa.me/234` for WhatsApp; Twitter and YouTube fall back to empty; LinkedIn is absent (A12). `contact.php` uses a field named `company` as a honeypot, so a real company field must use a different name (A11).

Acceptance: change a service, phone number and social URL, publish, and confirm every public consumer uses the new value; unpublish a review or post and confirm no fallback recreates it; malicious HTML and URLs are rejected.
