# CLAUDE.md — HeritOS (Herit Clothing)

> **Project memory for Claude Code.** Read this fully before doing any work on this project.
> This is a reusable template: copy it into each new project's repo root and fill in §1.
> The full one-time setup steps live in the separate **PROJECT-SETUP-GUIDE**.

---

## 1. Project-specific values — FILL THESE IN

| Item | Value |
|---|---|
| Project / repo | `devgeereact/heritage_com` |
| Remote | `git@github.com:devgeereact/heritage_com.git` |
| Product | **HeritOS** — Herit Clothing brand operations platform |
| Domain | `heritclothing.com` |
| Document root | `/home/<cpanel_user>/heritclothing.com` (confirm cPanel user) |
| Database name | `heritage_com` |
| Database user | `heritage_com` |
| Database host | `localhost` |
| Deploy branch | `main` |
| FTP username | `heritage_com@heritclothing.com` |
| OpenRouter model | `anthropic/claude-sonnet-4.6` (`OR_MODEL`) |
| Base kit | Larkon React v2 (JS) — ecommerce admin, Vite + Bootstrap |
| Seed login | `dev@heritclothing.com` / `Testing123!` (`super_admin`) |

---

## 2. Shared hosting infrastructure (same for every project on this account)

| Item | Value |
|---|---|
| Hosting | Namecheap shared hosting (cPanel) |
| cPanel account | `<cpanel_user>` |
| Home directory | `/home/<cpanel_user>` |
| Server IP | `<server_ip>` |
| DNS provider | Cloudflare — records set to **DNS only (grey cloud)** |
| FTP server | `<server_ip>` |

> Credentials are NEVER stored in this repo. The DB password lives only in `config.php` on the server; FTP credentials live only in GitHub repo Secrets.

---

## 3. What this project is

A **React (Vite) single-page app** hosted on Namecheap shared hosting (cPanel), served at the domain above. It reads/writes a **MySQL database** on the same server through a small **PHP API** (`api.php`). Deployment is **automatic**: pushing to the deploy branch triggers a GitHub Actions workflow that builds the app and uploads it via FTP.

---

## 4. Architecture & data flow

```
Browser (React)
   │  fetch() → JSON
   ▼
api.php  (PHP, on the server)
   │  mysqli, host = localhost
   ▼
MySQL database (cPanel)
```

- **React runs in the browser and NEVER connects to MySQL directly.** It only calls `api.php` over HTTP and receives JSON.
- `api.php` is the only thing that touches the database, using credentials from `config.php`.
- The React build (static files) and the PHP files live together in the document root.

---

## 5. Tech stack

- **Frontend:** React 18 + Vite (JavaScript)
- **API:** PHP with `mysqli` + prepared statements, returns JSON
- **Database:** MySQL (cPanel → phpMyAdmin)
- **DNS:** Cloudflare (DNS only / grey cloud)
- **CI/CD:** GitHub Actions → FTP deploy (`SamKirkland/FTP-Deploy-Action`)

---

## 6. Key files & where they live

**In the repo (version-controlled, auto-deployed on push):**
- `src/` — React app source
- `index.html`, `vite.config.js`, `package.json`, `package-lock.json` — Vite project
- `.github/workflows/deploy.yml` — the auto-deploy workflow
- `.gitignore` — must exclude `node_modules/`, `dist/`, and `config.php`

**On the server only (placed by hand once, NOT in the repo, NOT touched by deploys):**
- `config.php` — DB credentials
- `api.php` — the API endpoints
- `.htaccess` — SPA routing (`RewriteBase /`)

Deploys upload **only the `dist/` build**, so the three server files are never disturbed.

---

## 7. Golden rules (do not break these)

1. **Never commit `config.php` or any password.** It's gitignored. DB creds live only in `config.php` on the server.
2. **React never connects to MySQL directly.** Any data need = add/extend a PHP endpoint, then `fetch` it.
3. **Always use the `API_BASE` pattern** so dev and production both work:
   ```js
   // dev → hit the live API (CORS enabled in api.php); production → relative (same domain)
   const API_BASE = import.meta.env.DEV ? "https://<domain.com>" : "";
   fetch(`${API_BASE}/api.php`)
   ```
4. **Deploys upload only `dist/`.** `config.php`/`api.php`/`.htaccess` are managed by hand on the server.
5. **Cloudflare records stay grey-cloud (DNS only)** so cPanel can issue SSL.
6. **Don't manually FTP files.** `git push` is the deploy.

---

## 8. Local development

```bash
npm install      # first time only
npm run dev      # http://localhost:5173, hot reload
```
`fetch` calls hit the live API at the project's domain (no PHP/MySQL on the laptop). Edit components in `src/`.

---

## 9. Build & deploy

- **Build:** `npm run build` → `dist/`.
- **Deploy:** `git push` to the deploy branch. GitHub Actions runs `npm ci` → `npm run build` → FTP-uploads `dist/`. Watch the repo's **Actions** tab; live in ~1–2 minutes.

Everyday loop:
```bash
git add . && git commit -m "..." && git push   # → live
```

---

## 10. Database & adding features

- Managed in cPanel → phpMyAdmin, on the database named in §1.
- To add a feature with data:
  1. Create the table(s) in phpMyAdmin.
  2. Add an endpoint in `api.php` — read `$_SERVER['REQUEST_METHOD']`, use **prepared statements**, `echo json_encode(...)`. For a separate resource, create another PHP file (e.g. `products.php`).
  3. `fetch` it from React using `API_BASE`.
- `api.php` begins with `require 'config.php';`, which provides `$conn` (a `mysqli` connection).

---

## 11. Troubleshooting

- **Site 404 / wrong content:** Cloudflare record may be orange-cloud (set grey) or wrong IP. Hard refresh / incognito for cache.
- **`api.php` "Database connection failed":** wrong creds in `config.php`, or user lacks privileges.
- **`api.php` errors on GET:** the queried table doesn't exist — create it in phpMyAdmin.
- **Deploy red X:** open the Actions run; `npm ci` fail → commit `package-lock.json`; FTP auth fail → check the three Secrets match the FTP account.
- **HTTPS warning:** SSL still issuing — use `http://` or run cPanel → SSL/TLS Status → Run AutoSSL.

---

## 12. What NOT to do

- Don't commit `config.php`, `node_modules/`, `dist/`, or any secret.
- Don't write database connection code in React.
- Don't manually FTP/upload the build — push instead.
- Don't switch Cloudflare to orange-cloud without proper SSL setup.
- Don't deploy into a subfolder — the site lives at the document root (`server-dir: ./`).

---

## 13. HeritOS build notes (this project)

**Spec:** `HeritOS.html` — 14 modules, 182 features (58 AI). It's the source of truth
for what to build. Build order follows the kickoff brief §8.

**Base kit:** Larkon React v2 (JS variant) transplanted into the repo root. Vite +
React 18 + Bootstrap 5 + react-bootstrap. Prebuilt admin sections under
`src/app/(admin)/` map onto HeritOS modules: products/attributes/category →
Products & Variants · orders → Orders · inventory → Stock · customer → CRM ·
seller + purchases → Suppliers · invoice → Payments · charts → Analytics ·
apps (chat/email/calendar) → Comms/Scheduling · permissions/role/settings → Platform.

**Server API (`php-api/`):** version-controlled here, deployed to the cPanel doc root
**by hand once** (deploy uploads only `dist/`). One file per resource, all
`require '_lib.php'` (CORS + JSON + auth + audit). `config.php` is server-only and
gitignored — only `config.sample.php` is committed. Import `schema.sql` via phpMyAdmin.

**React ↔ API:** real endpoints go through `src/helpers/heritApi.js` (native `fetch`,
adds `Authorization: Bearer <token>`, uses `API_BASE` from `constants.js`). Larkon's
bundled axios `fake-backend` still serves demo data for modules not yet wired to PHP —
swap each module to `heritApi` as it's built. Don't fight the MockAdapter; bypass it.

**Auth:** `auth.php` issues a random token stored in `auth_tokens`; React keeps it in
the `_LARKON_AUTH_KEY_` session cookie (Larkon's auth context). Roles enforced
server-side via `require_auth($roles)` — never trust the client.

**AI:** every AI feature calls `ai.php` (OpenRouter proxy, staff-only). Key + `OR_MODEL`
live in `config.php`, never in the browser.

**Status:** foundation done — kit transplanted, **warm maroon brand** (`#9b2c2c`,
Poppins/Libre Baskerville/IBM Plex Mono) across app + public site, real login.
Public storefront live (multi-page: Home/About/Shop/Product/Gifting/Contact).
Live PHP modules (all 14 §8 modules now built): Dashboard, Products & Variants
(catalogue), Orders (sales), Customers (CRM), Production & Tailoring, Enquiries,
Inventory & Stock (stock.php), Suppliers & Purchasing (suppliers.php — POs that
bump stock on receive), Payments & Finance (payments.php — money in/out, cash
position), Analytics & Reports (analytics.php — read-only over live tables),
Marketing & Social (marketing.php — campaign planner), Market Sales/POS
(pos page → orders.php, channel=market), Content & Brand Studio (studio → ai.php),
Online Store & Channels + Platform (settings.php — channel toggles, store config),
Weather & Ops (weather.php — Lagos forecast via Open-Meteo, no key, turned into
trading nudges: rain → push online + protect deliveries, hot → lightweight pieces),
Team & Access (users.php — admin-only staff CRUD over the existing `users` table:
add/invite, edit role+status, reset password, deactivate; guards against locking
out the last super_admin; self password-change for any role). The Platform group
now also has a real Permissions matrix (read-only, generated from roles.js so it
can't drift from enforced access) and a real Profile page (own account + password
change). The leftover Larkon Roles/Settings demo pages were dropped from the nav.
Email (Inbox at /inbox): `mail.php` sends via SMTP (hand-rolled client, no
Composer/PHPMailer; SSL 465 / STARTTLS 587 / AUTH LOGIN; PHP mail() fallback when
SMTP_HOST blank) and `inbox.php` reads the mailbox over IMAP (PHP imap extension;
list/get/mark-seen; clean 501 when unconfigured). SMTP_*/IMAP_* live in server
config.php (mail host premium152.web-hosting.com, mailbox hello@heritclothing.com);
`_lib.php`'s `cfg()` reads them whether they're $vars or define()d constants.
Each endpoint follows the `_lib.php` pattern (auth + audit); React pages go through
`heritApi`, role-gated in roles.js, listed in menu-items.js.
**Deploy note:** upload the new php-api/*.php to the cPanel doc root by hand and
import the new tables from schema.sql (deploys only push dist/). `users.php` needs
no new table — `users` already ships in schema.sql. `mail.php`/`inbox.php` need no
table either — add the SMTP/IMAP block to config.php (see config.sample.php).
For DBs where the full schema.sql aborts on a stale legacy table, import
`schema_modules.sql` instead — it creates only the later-module tables.
