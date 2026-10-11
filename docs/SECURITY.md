# Security Model

This file owns the threat picture, the baseline controls and their current state, and the private-file and content-safety rules. Sign-in and sessions are under [Authentication](#authentication); who may do what under [Permissions](#permissions); personal data in [DATA-PRIVACY.md](DATA-PRIVACY.md). Security findings and their status live in [ROADMAP.md](ROADMAP.md#findings); evidence in [qa/SECURITY-AUDIT.md](../qa/SECURITY-AUDIT.md). Nothing here is a penetration test result.

## Assets and threats

- **Sensitive data and operations:** client phone numbers, addresses, body measurements, messages, photos and payment records; staff and customer tokens; server `config.php`; FTP secrets; publishing to the public website.
- **Trust boundaries:** browser to PHP endpoint; PHP to MySQL; public JSON projection; the cPanel document root (anything placed there is web-reachable unless blocked); GitHub Actions to FTP.
- **Likely attackers and abuse paths:** guessing customer references to read another person's job (A03, A06); stored script in staff-written blog content (A04); cross-customer ID swapping on detail endpoints; development sessions writing to production (A01); stale or unknown hand-uploaded endpoints on the server (A02); token theft from JavaScript-readable storage (A15); spam through the public enquiry form.
- **Required controls:** the baseline below plus object-level ownership checks for every customer and company read or write ([access requirements](#access-requirements-approved-target)).

## Baseline controls and current state

| Control | State (10 October 2026) |
|---|---|
| Secrets outside client bundles, source and logs | `config.php` gitignored and server-only; FTP secrets in GitHub; only `VITE_*` values reach the browser (`.env.example`). Log contents NOT TESTED |
| Server-side authorisation | `require_auth($roles)` in every staff endpoint ([API-SPEC.md](API-SPEC.md#endpoint-inventory)); object ownership for customers is not yet enforced everywhere (A03). Shared includes (`_*.php`) and `config*.php` are refused when requested directly by `php-api/.htaccess` (Phase 2 branch; the server copy is replaced by hand) |
| Input validation and output encoding | Prepared statements throughout; blog HTML sanitised on save with an allowlist (`_lib.php:430-520`, `content.php:56`) (A04, PR #6; rendered-page check NOT TESTED) |
| Rate limiting | Staff login and PIN; customer login and tracking since phase 1 (A03); public enquiry form uses a honeypot (`website_url_confirm`, A11) and no rate limit. Phase 3 branch: customer access start (per IP and per hashed reference), verify and invite redemption (per IP), and public slot reads and appointment requests (per IP), all through `throttle_enforce()` |
| CORS | Same-origin in production; localhost allowed only when `ALLOW_LOCALHOST_CORS` is on (A15) |
| CSRF | Bearer tokens in headers today; a cookie migration would need a deliberate CSRF design (see [Authentication](#authentication)) |
| Headers, cookies, production settings | `GK_DEBUG` false in production; HTTPS through cPanel AutoSSL. Security headers: Unknown |
| Dependencies | No vulnerability audit run (NOT TESTED); no blind upgrades |
| Monitoring and incident response | [DEPLOYMENT.md](DEPLOYMENT.md#monitoring) |

## Private files and content safety

- Private reference images and proof live outside the public document root or behind authenticated download. Validate real MIME type and extension, limit size and count, randomise names, block execution, avoid inline rendering of active content. Start with JPEG, PNG, WebP and PDF only where needed. Attachments are never reachable by guessing a filename. Strip location metadata from public images; keep public derivatives separate. No private upload feature exists yet; these rules gate its build.
- Blog bodies were stored as raw HTML and rendered with `dangerouslySetInnerHTML` (BlogPostPage.jsx:47) with no sanitiser (A04). Writers are super_admin, admin and manager, so this was stored XSS from a staff account. Rule: sanitise allowed rich text on the server, prohibit scripts, event handlers and unsafe URLs, and treat staff content as untrusted for rendering. The blog update bind mismatch that stopped edits (A21) is fixed in the same pull request (#6) so publishing edits work before content is relied on.
- CSV exports need formula-injection protection; privileged exports are logged and downloaded securely.
- Never put credentials, private IDs or internal notes in public JSON ([ARCHITECTURE.md](ARCHITECTURE.md#cms-and-public-projection)).

## Authentication

How staff and customers sign in, how sessions live and end, and the approved target for customer access and session hardening. Authentication does not replace authorisation ([Permissions](#permissions)).

### Staff

- **Method:** email and password, or a staff PIN for a shared device (`users.pin_hash`, schema_phase12). `auth.php` issues a random token stored in `auth_tokens` with device, IP and last-seen columns.
- **Throttling:** failed email and PIN logins are throttled (`LOGIN_*`, `PIN_*` settings, [DEPLOYMENT.md](DEPLOYMENT.md#server-configuration)).
- **Storage in the browser:** React keeps the token in the `_LARKON_AUTH_KEY_` cookie, which is JavaScript-readable (A15).
- **Expiry:** `TOKEN_TTL_DAYS` server setting. Logout revokes the token through `auth.php`.
- **Registration:** no self-registration; staff are created in Team and access (`users.php`, admin only). The kit `/auth/sign-up` screen is template UI.
- **Recovery:** the seed account's password is set by hash in phpMyAdmin ([DEPLOYMENT.md](DEPLOYMENT.md#database-and-schema-files)); in-app owner recovery is a launch-core requirement and is not built. The kit `/auth/reset-pass` screen must not show usable controls until a recovery endpoint is verified.
- **Multi-factor:** none in the app. Assess app MFA before launch; at minimum hosting, source control, mailbox and social accounts use their own MFA. Recovery codes never go in the repository or app content.

### Customers

**Current (Verified 10 October 2026, including PRs #6 to #9):** `account.php` issues a token stored in `customer_tokens`; React keeps it in localStorage as `herit_customer_token` (A15). Sign-in is phone plus an order reference. Since PRs #6 and #7 it is throttled per IP and per phone, returns one generic failure, and accepts the random public reference (A03, A06). The portal reads only retail `orders`, so tailoring clients cannot use it (A09). Since PR #9 a customer's measurement change becomes a pending proposal for the owner to approve instead of overwriting the record (A10).

**Phase 3 branch (`feat/phase3-appointments-portal`, staging API checks PASS, 10 October 2026; screens built 11 October 2026):** the approved target below is built on the server and in the screens. The browser keeps the customer token in sessionStorage (`herit_customer_token`), so it ends with the tab; a token left in localStorage by the older login is moved across once and cleared. Any 401 clears it and returns to the access form. The invite secret is the only link-borne secret and leaves the address bar (`history.replaceState`) before it is exchanged. Two clients' isolation was also checked in the browser: a second client opening the first client's job URL sees "We could not find that order" ([qa/FUNCTIONAL-AUDIT.md](../qa/FUNCTIONAL-AUDIT.md#phase-3-journeys-in-the-browser-11-october-2026)).

- `access.php?action=start` takes a public reference plus the registered phone or email and always returns the same reply. A request that matches nobody stores a decoy row, so neither the reply nor the stored shape reveals a match. Response time can still differ when an email is sent; throttles limit probing.
- On a match a single-use six-digit code (`random_int`) goes to the registered email through `_mail.php`; only its HMAC with `TOKEN_SECRET` is stored, with a 10 minute expiry and a 5 attempt lock. With no email, or when mail fails, the request waits for the owner, who sends a single-use invite link (24 hours) by hand.
- A successful verify or invite issues a 48-hex session token; only its sha256 is stored in `customer_sessions`, with expiry (`customer_session_days`, default 7), `last_seen_at`, logout, logout everywhere and owner revocation.
- Every portal lookup filters by the signed-in client; another client's reference answers exactly like a missing one (404). The portal's job view is an allowlist (`job_public_view()`), so notes, internal notes, costs, the tailor, the HC code, unverified payments and internal messages never leave the server. Company contacts are a Phase 5 hook in `portal_can_access_job()`.
- The phone plus order code login stays only while `ALLOW_LEGACY_ORDER_CODE_LOOKUP` is on (D-021) and now issues the same hashed, expiring sessions.

**Approved target (D-010):** a reference is a locator, not a password.

1. Screen one: reference plus registered contact.
2. Screen two: a short-lived, single-use link or code sent through a verified channel. With no delivery provider configured, the owner approves an access invitation manually through an established contact rather than weakening authentication.
3. Unauthenticated lookup returns nothing sensitive and uses one generic response.
4. Expiry, logout and revocation; recovery through verified contact. No mandatory customer password at first.
5. A company contact may see its authorised parent jobs, never individual wearer profiles.

What a verified customer may see and do is in [USER-JOURNEYS.md J-07](USER-JOURNEYS.md#j-07-customer-access).

### Access requirements (approved target)

- Customer and company access checks ownership on every request: detail, measurement, message, quote, attachment and export. UI hiding is not enforcement. A company contact never reads unrelated clients or wearer measurements.
- Login, reference lookup, verification and public writes get throttles, generic failure messages, payload limits and server validation. Staff-login throttling does not cover customer or public paths. No CAPTCHA until abuse is observed; honeypot plus request limits first.
- Move towards secure, HttpOnly cookies with explicit expiry and revocation, through a reviewed narrow migration. Cookie auth needs a deliberate CSRF design; SameSite alone is not enough. HTTPS, production debug off, restricted origins and no token logging are prerequisites.
- Owner recovery must work without bypassing access control.

### States to design and test

Wrong credentials, throttled, disabled or suspended account, expired token, revoked token, provider unavailable (no verification channel configured). Current status of every state: NOT TESTED in a browser; the staging API smoke checks cover wrong password, suspended account and customer sign-in by public reference ([qa/FUNCTIONAL-AUDIT.md](../qa/FUNCTIONAL-AUDIT.md)).

PWA and offline lifecycle: tokens are never cached by the service worker; offline sessions cannot write ([ARCHITECTURE.md](ARCHITECTURE.md#offline-behaviour)).

## Permissions

The resource-by-role access rules: the approved target, and what the client and server enforce today. Roles and their purpose are in [PRODUCT-SPEC.md](PRODUCT-SPEC.md#user-roles). Default to deny until a business rule grants access.

### Approved target (Plans 2026, approved 10 October 2026)

| Role | Resource | Read | Create | Change | Delete | Approve | Server policy | Test |
|---|---|---|---|---|---|---|---|---|
| Owner | All business records and settings | Allow | Allow | Allow | Allow (history kept; payments reversed, never deleted, BR-21) | Allow | `require_auth` with the owner role | Required |
| Future helper | Only the functions granted | Granted only | Granted only | Granted only | Deny | Deny | Least privilege; no finance or export by default | Required |
| Client | Own jobs, quotes, payment summaries, messages, appointment requests | Own only | Messages, requests, proposals | Own proposals only | Deny | Own quote acceptance | Ownership check on every request | Cross-customer swap test |
| Client | Own measurements | Own only | Proposals only (BR-07) | Deny | Deny | Deny | Ownership check | Required |
| Company contact | Authorised parent jobs | Agreed job-level fields | Messages, requests | Deny | Deny | Sample approval where agreed | Ownership check; no wearer profiles (BR-27) | Company isolation test |
| Anonymous | Public pages, free slots | Public projection only | Enquiry, slot request | Deny | Deny | Deny | Throttle, honeypot, validation | Required |

### Current enforcement (Verified 10 October 2026)

The server enforces staff access with `require_auth($roles)` in each endpoint; the file-level role lists are in [API-SPEC.md](API-SPEC.md#endpoint-inventory). `src/helpers/roles.js` only hides menu items and blocks routes in the UI; anything it does not list defaults to admin-only (`SECTIONS` in `roles.js`). The Permissions page is generated from roles.js, so it cannot drift from client gating, but it does not show server rules.

Client and server lists used to disagree in four places (K-01: Tailoring, Catalogue, Content and Dashboard). On the Phase 2 branch each `roles.js` section lists only the roles that every endpoint the page needs accepts, using the same role groups as `php-api/_domain.php` (`ROLES_OWNER`, `ROLES_WORKSHOP`, `ROLES_ENQUIRY`, `ROLES_CLIENTS`). Verified from source; the tailor role was checked in the browser (no money shown, Today and Payments refused); other roles NOT TESTED. Tailors never receive money fields from the server.

Customer access today: `account.php` checks the customer token but not yet the full ownership model above (A03, A09). On the Phase 3 branch `portal.php` and `access.php` enforce it for tailoring jobs; cross-customer reference swapping on job, messages, change requests, feedback, measurements and appointment changes is refused with the missing-record reply (`e2e-phase3.sh` P1, C3e).

Test allowed and forbidden cross-user and cross-role cases against the real data boundary before any release ([LAUNCH-CHECKLIST.md](../qa/LAUNCH-CHECKLIST.md)).
