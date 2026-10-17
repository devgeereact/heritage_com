# Security Audit

Evidence for security controls. Threat model and controls: [docs/SECURITY.md](../docs/SECURITY.md). Findings and status: [ROADMAP.md](../docs/ROADMAP.md#findings).

## Automated evidence

The GEE OS automated gate (`./scripts/project security` writing `.agent/evidence/security.json`) is not set up in this project: neither path exists (Verified 10 October 2026). Automated checks available today: `php php-api/tests/run.php` (166 helper checks on the Phase 2 branch, including the HTML sanitiser, CORS decision and throttle maths; PASS on 10 October 2026) and `php -l`. No dependency vulnerability audit has been run (NOT TESTED). These are not a threat model, penetration test or proof of complete application security.

## Manual assurance

| Area | Threat or control | Test performed | Result | Severity | Evidence | Owner |
|---|---|---|---|---|---|---|
| Secrets | Client, source and history exposure | Source review: `config.php` gitignored, only `VITE_*` reaches the browser | PARTIAL: Git history not scanned | Critical until checked | `.gitignore`, `.env.example` | Business owner |
| Customer authentication | Guessable references, enumeration (A03, A06) | Staging smoke checks for public reference, legacy flag, wrong phone | PARTIAL: throttle and generic errors in source; contact verification not built | P0 | [FUNCTIONAL-AUDIT.md](FUNCTIONAL-AUDIT.md) | Business owner |
| Authorisation | Cross-customer and cross-role access | None | NOT TESTED | P0 | None | Business owner |
| Client and server role drift | UI and API disagree (K-01) | Source comparison; tailor role in a browser | PASS for source and the tailor role (Phase 2 branch); other roles NOT TESTED | Low | [SECURITY.md](../docs/SECURITY.md#permissions) | Business owner |
| Output encoding | Stored script in blog HTML (A04) | Helper tests of `sanitize_html()` | PARTIAL: rendered page NOT TESTED | P0 | `php-api/tests/run.php` | Business owner |
| Payment integrity | Lost or double-counted payments (A05) | Transaction and row lock (PR #6); append-only ledger with request keys checked by `e2e-phase2.sh` (PR #9) | PARTIAL: duplicate submits PASS on staging; concurrency NOT TESTED | P0 | `ledger.php`, `scripts/staging/e2e-phase2.sh` | Business owner |
| Shared includes | Direct requests to `_*.php` or `config*.php` | `php-api/.htaccess` rule (Phase 2 branch); staging router refuses them | PASS on staging; live `.htaccess` NOT TESTED | P1 | `php-api/.htaccess`, `scripts/staging/router.php` | Business owner |
| CORS | Localhost origins in production (A15) | Helper tests of the CORS decision | PASS (unit); live server NOT TESTED | P1 | `php-api/tests/run.php` | Business owner |
| Deployed state | Unknown hand-uploaded endpoints (A02, A20) | None | NOT TESTED | P0 | None | Business owner |
| Uploads, CSRF, headers, cookies | Per SECURITY.md | Headers: see below. Uploads, CSRF, cookies: none | Headers PARTIAL (local Apache); others NOT TESTED | Unknown | None | Business owner |

## Audit fixes, 17 October 2026

Branch `feat/redesign-dark-luxury`, local staging. Controls are described in [SECURITY.md](../docs/SECURITY.md#audit-fixes-17-october-2026).

| Area | Test performed | Result |
|---|---|---|
| Helper tests and syntax | `php php-api/tests/run.php`; `php -l` on every PHP file | PASS: 374 passed, 0 failed; syntax OK |
| API journeys | `e2e-phase2.sh`, `e2e-phase3.sh`, `e2e-phase4.sh` (new O2a: shop writes 403 while the shop is off) | PASS: 48 of 48, 93 of 93, 63 of 63. `e2e-phase5.sh` BLOCKED on macOS (bash 3.2 has no `mapfile`; C1 to C5 passed before it stopped) |
| `.htaccess` headers and redirect | Local Apache 2.4.67 on port 8099 with `php-api/.htaccess` | PASS: HTTP answers 301 to HTTPS; nosniff, Referrer-Policy, X-Frame-Options, `frame-ancestors` CSP and Permissions-Policy present; hashed build files `immutable`, `index.html` `no-cache`. HSTS under real TLS NOT TESTED |
| WhatsApp webhook signature | None at runtime | NOT TESTED (source review only) |
| AI daily caps | None at runtime (no key on staging) | NOT TESTED (source review only) |
| Third-party requests | Browser network log on public pages | PASS: only localhost and the staging API requested; no Google Fonts |
| Live seed tailors | Check the live `users` table | NOT TESTED: owner action ([DEPLOYMENT.md](../docs/DEPLOYMENT.md#owner-actions-per-pull-request)) |

Open items not fixed are listed in [SECURITY.md](../docs/SECURITY.md#open-items-not-fixed).

### Second batch, 17 October 2026

| Area | Test performed | Result |
|---|---|---|
| Staff token storage (K-15) | Sign in a synthetic `example.test` tailor on staging; compare `auth_tokens` with the raw and the SHA-256 token; call `me` and `sessions`; log out | PASS: 64-character token returned, only its SHA-256 stored, `me` 200, current session marked, row gone and `me` 401 after logout |
| Login timing (K-23) | Two wrong-password sign-ins each for an existing and an unknown email | PASS: 0.18s for both (was 0.19s and 0.05s) |
| End-to-end with hashed tokens | `e2e-phase3.sh`, `e2e-phase4.sh`, `e2e-phase5.sh`, `e2e-phase2.sh` | PASS 93, 63, 25; phase 2 47 of 48 (E15c, K-07 staging data) |
| Sitemap with the shop on (K-20) | Switch `shop_enabled` on in staging, fetch `sitemap.php`, restore | PASS: `/shop`, `/gifting` and published products listed only while on |

### Owner decisions D-024, 17 October 2026

| Check | Result |
|---|---|
| Promotional sends refused (K-11) | PASS: `whatsapp.php?action=broadcast`, `engage.php?action=waitlist_notify` and `abandoned_nudge` answer 403 with the D-024 message for a staff token; broadcast without a token 401 |
| Attribution expiry (K-13) | PASS: Node check of `attribution.js` for fresh, 29-day, 31-day, legacy plain, missing and blocked-storage cases |
| Manifest on staff pages only (K-20) | PASS in Chromium: no manifest link on `/`; manifest with `start_url` `/today` on `/auth/sign-in` |
| AI drafter prompt (K-12) | Source only; NOT TESTED at runtime (no AI key on staging) |
| Regression | Helper tests 374; e2e phase3 93, phase4 63, phase5 25; phase2 46 of 48 (E9b and E15c: Today's 20-item cap on accumulated staging data, K-07); lint 0 errors; build |

### Shared PINs, 17 October 2026 (K-23)

Two synthetic `example.test` tailors on local staging (script in the session scratchpad; PINs cleared afterwards).

| Check | Result |
|---|---|
| Second user sets a PIN the first already uses | PASS: 409 "That PIN cannot be used. Choose a different one." |
| Sign-in with a unique PIN | PASS: 200 |
| Sign-in with a PIN forced onto both accounts in the database | PASS: 401, `pin_login_ambiguous` audited |
| Repeated refusals | PASS: 409 four more times, then 429 |
