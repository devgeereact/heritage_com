# API Specification

This file owns the endpoint inventory, the server role gate on each file, the deploy route for each file, the request conventions, the per-action contracts added by each phase, and the settings keys. Who may do what in business terms is in [SECURITY.md](SECURITY.md#permissions); deploy procedure is in [DEPLOYMENT.md](DEPLOYMENT.md).

## Conventions

- One PHP file per resource under `php-api/`, each `require '_lib.php'`. Operations are selected with `?action=` and the HTTP method; responses are JSON from `json()`, errors are `{"error": "..."}` with an HTTP status from `fail()` (`_lib.php:79-86`).
- Auth: `Authorization: Bearer <token>` or, with `STAFF_COOKIE_AUTH` on, the HttpOnly `__Host-herit_staff` cookie (`herit_staff` on local http staging), checked by `require_auth($roles)` in `_lib.php`. A cookie-authenticated POST, PUT, PATCH or DELETE must also send `X-Herit-CSRF` equal to the `__Host-herit_csrf` cookie (`herit_csrf` locally), or it answers 403 (A15, [SECURITY.md](SECURITY.md#staff)). `cors_headers()` allows `Content-Type, Authorization, X-Herit-CSRF`. Staff tokens come from `auth.php`. Customer sessions come from `access.php` (verified) or the legacy `account.php` login, and are checked by `require_customer_session()` in `_portal.php` (Phase 3 branch).
- Input: JSON body through `body()`; prepared statements only. A list or object sent where text or a number is expected (in the body or the query string, for example `{"name":["x"]}` or `?phone[]=1`) answers 400 `{"error":"<field> must be text"}` (or `must be a number`) and saves nothing, never a 500 and never the text "Array". Fields are read through `in_str()`, `in_int()`, `in_num()` and `in_text_only()` in `_lib.php`; the pure helpers use `scalar_text()` (`_domain.php`), and endpoints that answer `{errors}` per field (`cms.php` content, company items) report "Must be text" there. Fields that really are lists or maps (`items`, `members`, `data`, `measurements`, the JSON settings keys) keep their own checks.
- Throttling: staff email and PIN login; customer login and public tracking since PR #6 (A03); shop and review writes, gift card checks and AI calls on the redesign branch ([audit fixes](#audit-fixes-17-october-2026)). Limits are server settings ([DEPLOYMENT.md](DEPLOYMENT.md#server-configuration)).
- Idempotency: Phase 2 writes that must not repeat (enquiry conversion, measurement sets, quotes, ledger entries, handovers) take a `request_key`; a repeat returns the first result with `duplicate:true` ([BR-02 and BR-22](BUSINESS-RULES.md)). Job edits carry `lock_version` and answer 409 when stale.
- Concurrent change: every transaction (`db_tx()` in `_jobs.php`) takes its lock before any plain read of the rows that lock protects. If a write still loses a race with another transaction (MariaDB 1213 deadlock or 1020 "Record has changed since last read" under `innodb_snapshot_isolation`), it is rolled back and answers 409 `{"error":"Someone else changed this at the same time. Reload and try again."}`, never a 500 (`is_tx_conflict()` in `_lib.php`). Two simultaneous `ledger.php` reversals of one entry answer one 201 and one 409 "That entry has already been reversed".
- Pagination, rate limits beyond login, versioning, timeouts and retries: not defined per operation. Each phase adds its action contracts to this file.

## Endpoint inventory

52 top-level PHP files on the Phase 4 branch: 43 endpoints, seven shared includes and two config files (Verified 11 October 2026; 47 on the Phase 3 branch). "Server gate" is the role list passed to the file-level `require_auth()` call; individual actions may narrow it further, which is NOT TESTED. "CI" means `deploy.yml` copies it to the server on every push to `main` (28 files on the Phase 4 branch, 23 on the Phase 3 branch, 16 on the Phase 2 branch, nine before it); "Manual" means it reaches the server only by hand upload, so its live version is Unknown (A02).

| File | Purpose | Server gate (file level) | Deployed by |
|---|---|---|---|
| `_lib.php` | Shared helpers: CORS, JSON, auth, audit, throttle, sanitiser, `cfg()`, coupon and referral helpers, payment helpers, staff codes and public references. Loads `config.local.php` instead of `config.php` only when the local staging router defines `HERITOS_STAGING` | Not an endpoint | CI |
| `api.php` | Smoke test: `items` list (public) and insert | List public; insert all seven staff roles (`api.php:23`) | CI |
| `auth.php` | Staff login, logout, me; email and PIN throttling; password reset by email (`reset_request {email}` answers the same, and takes at least `RESET_MIN_MS` (600 ms), whether or not the address has an account; on PHP-FPM or LiteSpeed the link and email are made after the answer has gone (K-25); throttled per IP, per address and IP pair, and per address over an hour (K-26); `reset_confirm {token, password}`, 8 to 72 characters, single-use link, signs out every device; K-04, `feat/staff-password-reset`) | Login and both reset actions public; other actions any signed-in staff | CI |
| `ai.php` | OpenRouter text proxy | Any signed-in staff (`ai.php:14`) | CI |
| `products.php` | Catalogue, variants, stock | super_admin, admin, manager, editor, employee | CI |
| `customers.php` | Clients: search, match, duplicate warning, measurement sets | super_admin, admin, manager, tailor, employee (`ROLES_CLIENTS`) | CI |
| `_domain.php` | Pure Phase 2 rules: role groups, kobo money, stage transitions, request keys | Not an endpoint; direct requests refused by `.htaccess` | CI (Phase 2 branch) |
| `_jobs.php` | Phase 2 database helpers: jobs, clients, measurement sets, ledger | Not an endpoint; direct requests refused by `.htaccess` | CI (Phase 2 branch) |
| `_mail.php` | Shared SMTP sender `mail_send_html()` (Phase 3 extraction from `mail.php`) | Not an endpoint; direct requests refused by `.htaccess` | CI (Phase 3 branch) |
| `appointments.php` | Appointments, availability settings and blocked time (Phase 3) | Workshop read (tailors see times only); writes owner | CI (Phase 3 branch) |
| `booking.php` | Public consultation requests and free slots (Phase 3), off until `public_booking_enabled` | Public, throttled | CI (Phase 3 branch) |
| `_portal.php` | Customer sessions (hashed tokens, expiry, revocation, legacy tokens behind the flag) and the object-level job check (Phase 3) | Not an endpoint; direct requests refused by `.htaccess` | CI (Phase 3 branch) |
| `access.php` | Verified customer access: start, verify, redeem an invite, logout; owner invites and revocation (Phase 3) | Public and customer session; `requests`, `invite`, `revoke` owner | CI (Phase 3 branch) |
| `portal.php` | Customer portal over tailoring jobs and retail orders: job view, messages, change requests, appointment requests, measurement proposals, feedback (Phase 3) | Customer session; every lookup filtered by the signed-in client | CI (Phase 3 branch) |
| `messages.php` | Job messages, change-request decisions and feedback moderation (Phase 3) | Owner | CI (Phase 3 branch) |
| `_cms.php` | Pure Phase 4 website rules: field schemas, sanitising, slugs, social link allowlist, business profile validation, publish checks, the draft, publish and rollback state machine, the public whitelist projections, JSON-LD, sitemap XML, upload type and image width plan | Not an endpoint; direct requests refused by `.htaccess` | CI (Phase 4 branch) |
| `_media.php` | Phase 4 image ingest: type check, GD re-encode (metadata stripped), WebP and JPEG variants with random names | Not an endpoint; direct requests refused by `.htaccess` | CI (Phase 4 branch) |
| `cms.php` | Website CMS: services, portfolio, FAQs, policies, pages (draft, preview, publish, unpublish, rollback), images, business profile (Phase 4) | super_admin, admin, manager, editor; policy publishing and the profile owner only | CI (Phase 4 branch) |
| `site.php` | Public website projection: published content only (Phase 4) | Public, GET only | CI (Phase 4 branch) |
| `sitemap.php` | XML sitemap of published public pages, served at `/sitemap.xml` (Phase 4) | Public | CI (Phase 4 branch) |
| `spa.php` | Link previews (K-06): serves `index.html` with the `<!--hc:head-->` block filled from the page's published content (title, description, canonical URL, https photograph) for `/`, the CMS pages, `/services/:slug` and `/work/:slug`; defaults elsewhere; plain `index.html` on any failure. A path that previews nothing is matched before `_lib.php` loads, so it is served without config or a database connection. Does nothing until `SPA_HEAD_INJECTION` is true and the `.htaccess` fallback points to it. Reads published content only | Public | CI (`feat/link-previews`) |
| `today.php` | Daily worklist | Owner: super_admin, admin, manager | CI (Phase 2 branch) |
| `enquiries.php` | Enquiry pipeline and conversion | super_admin, admin, manager, employee (convert owner only) | CI (Phase 2 branch) |
| `measurements.php` | Templates and measurement sets | Workshop | CI (Phase 2 branch) |
| `quotes.php` | Versioned quotes | Owner | CI (Phase 2 branch) |
| `ledger.php` | Append-only job payment ledger | Owner | CI (Phase 2 branch) |
| `stats.php` | Dashboard headline numbers in one call | super_admin, admin, manager, tailor, editor, employee | CI |
| `tailoring.php` | Jobs: stages, measurements, payments wrapper, groups, handovers, documents | Workshop: super_admin, admin, manager, tailor (employee removed on the Phase 2 branch, K-01) | CI |
| `contact.php` | Public enquiry submit plus the older staff enquiry list | Submit public; inbox super_admin, admin, manager, employee | CI |
| `account.php` | Customer self-service for retail orders; on the Phase 3 branch it uses the shared sessions, and its phone plus order code `login` and `measurements` actions answer only while `ALLOW_LEGACY_ORDER_CODE_LOOKUP` is on | Customer session | Manual |
| `ai_image.php` | Text-to-image proxy | Any signed-in staff | Manual |
| `analytics.php` | Read-only reports over live tables | super_admin, admin, manager | Manual |
| `content.php` | Journal (blog) and testimonials CRUD | super_admin, admin, manager | Manual |
| `coupons.php` | Promo codes and public validation | super_admin, admin, manager, editor (validation public) | Manual |
| `engage.php` | Restock waitlist and abandoned-cart recovery | super_admin, admin, manager, editor | Manual |
| `export.php` | CSV export of orders, payments, expenses, customers | super_admin, admin, manager | Manual |
| `inbox.php` | IMAP mailbox reader. `get` is read-only (body fetched with `FT_PEEK`, `\Seen` left alone); the app marks a message read with POST `seen` (K-28) | super_admin, admin, manager, editor, employee | Manual |
| `loyalty.php` | Store credit and gift cards | super_admin, admin, manager | Manual |
| `mail.php` | Staff email send; a thin endpoint over `_mail.php` on the Phase 3 branch | super_admin, admin, manager, editor, employee | Manual |
| `marketing.php` | Campaign planner | super_admin, admin, manager, editor | Manual |
| `orders.php` | Staff retail orders and market (POS) sales | super_admin, admin, manager, seller, employee | Manual |
| `payments.php` | Money in and out, cash position | super_admin, admin, manager | Manual |
| `referrals.php` | Referral codes and rewards. GET `code` only reads (`code: null` when the customer has none); POST `ensure_code {customer_id}` creates one, audited `referral_code_ensure` (K-28) | super_admin, admin, manager | Manual |
| `reviews.php` | Reviews, ratings and photo moderation | super_admin, admin, manager, editor | Manual |
| `settings.php` | Channel toggles, store configuration (`shop_enabled`) and the Phase 2 business settings; on the Phase 4 branch the business profile keys go through the same validator as `cms.php`; the retention keys (K-18) through `_retention.php` and only from super_admin (403 for anyone else) | super_admin, admin, manager | Manual |
| `retention.php` | Data retention job (K-18): dry run by default, `--apply` deletes ([DEPLOYMENT.md](DEPLOYMENT.md#retention-job)) | Command line only; 404 over HTTP | Manual |
| `_retention.php` | Pure retention plan: category to table, date column and guard; protected tables | Not an endpoint | Manual |
| `usage.php` | Phase 7 section usage counts: `POST ?action=hit {section}` adds one to `usage_daily` for today (Lagos) and the caller's role ([Phase 7](#phase-7-usage-counts-and-owner-review)) | Any signed-in staff role | Manual |
| `review.php` | Phase 7 owner review report, read-only ([Phase 7](#phase-7-usage-counts-and-owner-review)) | super_admin only | Manual |
| `_review.php` | Pure Phase 7 helpers: the section allowlist, window, rate, median, overdue days, delivery and zero-hit calculations | Not an endpoint; direct requests refused by `.htaccess` | Manual |
| `stock.php` | Stock adjustments | super_admin, admin, manager, employee | Manual |
| `store.php` | Public storefront: catalogue, checkout, published feeds, order tracking by public reference, public config (`shop_enabled`). On the Phase 4 branch there is no fallback catalogue or free-delivery threshold, and `config` returns only social links that pass the allowlist | Public | Manual |
| `suppliers.php` | Suppliers and purchase orders (receiving bumps stock) | super_admin, admin, manager | Manual |
| `users.php` | Team and access: staff CRUD, last super_admin guard; only a super_admin changes a super_admin (redesign branch) | Management super_admin, admin; self actions any staff | Manual |
| `weather.php` | Lagos forecast from Open-Meteo, no key (weather.php:23) | super_admin, admin, manager, seller, employee | Manual |
| `whatsapp.php` | WhatsApp threads, templates, Cloud API or wa.me fallback. GET `thread` only reads; POST `mark_seen {phone}` marks that number's inbound messages seen, `{ok, marked}` (K-28) | super_admin, admin, manager, seller, editor, employee; webhook public | Manual |
| `config.sample.php` | Template for server-only `config.php` | Not an endpoint | Never deployed |
| `config.local.php` | Local staging config written by `scripts/staging/setup.sh`; gitignored | Not an endpoint | Never deployed |

Role lists are Verified from the `$STAFF`, `$ADMIN` and inline `require_auth()` declarations in each file. Public actions (Verified from source): `coupons.php?action=validate` (GET, before the gate); every `store.php` action: `config`, `blog`, `testimonials`, `catalogue`, `checkout`, `pay_init`, `pay_verify`, `waitlist_join`, `save_cart`, `track`; every `booking.php` action (`config`, `slots`, `request`) and `access.php` `start`, `verify` and `redeem` on the Phase 3 branch; every `site.php` action and `sitemap.php` on the Phase 4 branch. Runtime behaviour of each is NOT TESTED beyond the staging smoke checks in [docs/AUDIT.md](AUDIT.md).

## Audit fixes (17 October 2026)

Redesign branch (`feat/redesign-dark-luxury`). Why each change was made is in [SECURITY.md](SECURITY.md#audit-fixes-17-october-2026); limits are overridable in `config.php` ([DEPLOYMENT.md](DEPLOYMENT.md#server-configuration)).

| File and action | Change |
|---|---|
| `whatsapp.php` `broadcast`; `engage.php` `waitlist_notify`, `abandoned_nudge` | Answer 403 "Promotional messages are switched off until customers can opt in (D-024)." after the staff check; `send` and the read actions are unchanged (K-11) |
| `auth.php` `login`, `_lib.php` `require_auth()` | Refuse users with `status = 'suspended'` (`invited` still allowed); staff tokens stored as SHA-256 with a plain fallback for older tokens (K-15) |
| `auth.php` `login`, `pin_login` (A15) | Flag off: `{token, user}` as before. `STAFF_COOKIE_AUTH` on: `{user, cookie_auth: true}`, no token in the body; sets `__Host-herit_staff` (HttpOnly) and `__Host-herit_csrf` (readable), both Secure, SameSite=Strict, Path=/, no Domain (bare names and no Secure on local http staging), Max-Age `TOKEN_TTL_DAYS` days. Either flag: the request must be `Content-Type: application/json` (415 otherwise) and must not come from a foreign origin (403; `staff_login_request_check()`, [SECURITY.md](SECURITY.md#staff)) |
| `auth.php` `logout` (A15) | POST. Deletes the token from the header or cookie and clears both cookies (Max-Age 0); `{ok:true}`. No CSRF check: it always signs out, so a stale or missing `X-Herit-CSRF` never leaves the session alive |
| `auth.php` `sessions`, `users.php` `password` (A15) | Find the current session from the header or the cookie, so `current` is right and a password change keeps the session it came from |
| `auth.php` `pin_login`, `set_pin` | `pin_login` ignores `super_admin` and `admin`, and answers 401 when a PIN matches more than one account; `set_pin` answers 403 for them, 409 when another account uses the PIN (5 refusals per user per day, then 429) |
| `users.php` create, update, reset, deactivate | `guard_super_admin()`: only a super_admin may create, promote to, edit, reset or deactivate a super_admin (403). Tokens are deleted when status leaves `active` |
| `loyalty.php` `credit_balance` | Public; answers `{customer_id:null, balance}` for a verified customer session (`customer_session_optional()` in `_portal.php`), else balance 0. `phone` is ignored |
| `loyalty.php` `gift_check` | 10 failed checks per IP per hour (`GIFT_CHECK_MAX_FAILS_PER_IP`) |
| `store.php` `checkout`, `waitlist_join`, `save_cart` | 403 "The shop is not open." while `shop_enabled` is not `'1'`. Per IP per hour: checkout 10, waitlist 10, saved cart 60. Length caps on free text (too long answers 400); checkout at most 50 items. Credit is applied only when the customer session belongs to the order's customer |
| `reviews.php` `submit` | Same shop check (403). 5 per IP per hour; length caps; `photo_url` kept only when `https://`; verified purchase only from a verified customer session, a typed phone no longer links the review |
| `export.php` | Every cell passes `csv_safe()`: text starting with `=`, `+`, `-`, `@`, tab or CR gets a leading apostrophe; plain numbers and phone numbers unchanged |
| `ai.php`, `ai_image.php` | Per staff member per day: 200 text calls, 50 images (`AI_MAX_PER_USER_DAY`, `AI_IMAGE_MAX_PER_USER_DAY`). Prompt caps: text 20,000 characters and system 4,000; image 4,000. Upstream `curl_error` detail only under `GK_DEBUG` (also `weather.php`) |
| `whatsapp.php` `webhook` (POST) | With `WA_APP_SECRET` set, a missing or wrong `X-Hub-Signature-256` answers 403; unset, the post is accepted and a warning logged |

The client sends the customer session token (`crequest` in `heritApi.js`) with `checkout`, `reviews.submit` and `creditBalance`.

## Customer lookups and references

- Verified customer access (Phase 3 branch) is the primary route: [Customer access](#customer-access) below. The older lookups that follow remain.
- Customer lookups (`store.php?action=track`, `account.php?action=login`) go through `order_by_customer_ref()` in `_lib.php`: the random public reference always works; the old `ORD-` code works only while `ALLOW_LEGACY_ORDER_CODE_LOOKUP` is true (default true, so references already sent to customers keep working). Both still need the matching phone and are throttled per IP. `store.php?action=track` takes `POST` with a JSON body `{code, phone}` so the phone number never reaches access logs (K-14). The older `GET ...&code=&phone=` form still answers while `ALLOW_LEGACY_ORDER_CODE_LOOKUP` is on, for browsers that cached the old site; with it off, `GET` is refused with 405 (D-021). A failed lookup is the same generic 404 either way.
- The checkout confirmation, tracking page, customer portal and WhatsApp order confirmation show the public reference. Tailoring jobs carry one ready for Phase 3; no customer page shows it yet. Payment start and verification (`pay_init`, `pay_verify`) still use the staff code.
- Code and reference formats are in [DATA-MODEL.md](DATA-MODEL.md#codes-and-references).

Authorisation belongs at the trusted boundary, not only in the interface. Object-level ownership checks for customer and company access are the target in [SECURITY.md](SECURITY.md#authentication).

## Phase 2 daily records

Branch `feat/phase2-daily-records`, PR #9 (open).

Verified on local staging, 10 October 2026: `scripts/staging/e2e-phase2.sh`, 48 checks passing. Every write takes a JSON body. Money in requests is a string such as `"45,000"` or `"45000.50"`, parsed to kobo on the server. Money in responses is a decimal string. New `DATETIME` columns hold UTC. "Today" is the Africa/Lagos date, computed in PHP. `request_key` is 16 to 64 characters of `[A-Za-z0-9_-]`; repeating a key returns the first result with `duplicate:true`. Owner roles are super_admin, admin and manager. Workshop roles are owner roles plus tailor. Tailors never receive money fields.

| Endpoint | Actions | Roles |
|---|---|---|
| `today.php` | GET: `{date, appointments_today, overdue, due_soon, next_actions, ready, enquiries, balances, credits, unverified_payments, stage_review, measurements_pending}`, each `{count, items, more}`. Each list is capped at 20; `more` is `count` minus the items listed, never negative (K-07). Enquiries are ordered: a follow-up that is due or overdue first (most overdue first), then new enquiries, then the rest by follow-up date. Unverified payments stay oldest first, so a newer transfer past the cap shows only through `more`. `messages_unread` lists one row per job, so its `more` counts jobs, not messages; its count, items and per-job count share one join (`tailoring_orders`, `customers`, `o.deleted_at IS NULL`), so messages on a deleted job are left out of all three | Owner |
| `enquiries.php` | `list` (`status`, `q`; returns counts), `get`, `create` (staff-entered), `update`, `link_client`, `convert` (owner; idempotent; 409 `{candidates}` on a phone or email match) | Owner and employee |
| `customers.php` | `list` (`q`), `get` (jobs, measurement sets, payments summary for owner roles), `match`, `create` (409 `{candidates}` unless `confirm_new`), `update`, `measure` (legacy form, now creates a set), `birthdays` | Workshop and employee |
| `measurements.php` | `templates`, `template_save` (owner), `list&customer_id`, `get`, `create` (request key), `approve` (owner; `unit` required for imported sets), `reject` (owner), `convert_preview` | Workshop |
| `tailoring.php` | Adds `meta`, `update` (409 on a stale `lock_version`), `stage` (new or legacy values; owner `force` with `reason`), `confirm_review`, `attach_measurements`, `handovers`, `handover_save`, `handover_complete`, `document` (owner). `pay` (owner) and `measure` keep working as wrappers. `create` and `group_create` answer 409 `{candidates}` instead of attaching by phone. | Workshop (employee removed, K-01) |
| `quotes.php` | `list`, `get`, `create`, `save` (drafts), `send`, `revise`, `accept` (needs the frozen `content_hash`), `decline`, `withdraw` | Owner |
| `ledger.php` | `list` (one job or across jobs), `due`, `credits`, `record`, `verify`, `reverse`, `refund`, `recalc_all` | Owner |
| `settings.php` | Adds `business_phone`, `business_email`, `business_address`, `business_hours_text`, `quote_default_terms`, `quote_validity_days`, `deposit_policy_text`, `measurement_recheck_days` (default 180) and `payment_verified_methods` (default `["cash"]`) | Owner |
| `contact.php` | The public form also takes `quantity` and `desired_date`. `status` maps `contacted` to `awaiting_reply`. | Public / staff |
| `account.php` | `measurements` now creates a pending proposal; `me` adds `measurements_pending` | Customer |

## Phase 3 appointments, customer access and messages

Branch `feat/phase3-appointments-portal` (no PR yet). Verified on local staging, 10 October 2026, by `scripts/staging/e2e-phase3.sh` ([LOCAL-STAGING.md](LOCAL-STAGING.md#end-to-end-checks)). Conventions are those of Phase 2 above. Times in requests are Africa/Lagos local (`2026-10-12T10:00`) unless they carry an offset; responses carry UTC `DATETIME` values plus `*_local` ISO 8601 strings with `+01:00`. Errors that a client sees are generic and never say what else is booked.

### Appointments and availability

| Endpoint and action | Method | Request | Response | Roles |
|---|---|---|---|---|
| `appointments.php?action=list&from&to[&status][&job_id][&customer_id]` | GET | Lagos dates, inclusive, at most 92 days; `status` comma list | `{from, to, timezone, items}`; items carry `client_name`, `job_code`, `job_ref`, `starts_at_local`, `ends_at_local`, `hold_expires_at_local` | Workshop (tailors get type, status, times and job only) |
| `appointments.php?action=get&id` | GET | | Appointment plus `events` (from and to status and time, reason, actor) | Workshop (events owner only) |
| `appointments.php?action=requests` | GET | | Requests still on hold | Owner |
| `appointments.php?action=slots&type&from&days` | GET | `days` at most 31 | `{timezone, type, ready, slots:[{start, end}]}` | Workshop |
| `appointments.php?action=create` | POST | `type`, `start` or (`all_day`, `date`), `duration_min` (30, 45 or 60; else the setting), `customer_id` or `contact_name`, `job_id`, `enquiry_id`, `contact_phone`, `contact_email`, `notes_internal`, `client_note`, `override_reason`, `request_key` | 201 appointment (`duplicate:false`); a repeated key 200 `duplicate:true`. A clash with hours, blocked time or another booking answers 409 `{reason, problems, can_override:true}` until an `override_reason` is given, which is stored | Owner |
| `appointments.php?action=reschedule&id` | POST | `start` or (`all_day`, `date`), `reason`, `override_reason` | The moved appointment; one history row with from and to | Owner |
| `appointments.php` actions `confirm`, `decline`, `complete`, `no_show`, `cancel` (`&id`) | POST | `reason` (optional) | The appointment. `confirm` only from requested (409 once the hold expired); `decline` only from requested | Owner |
| `appointments.php?action=availability_get` | GET | | `{availability, ready:{consultation, fitting, collection}, public_booking_enabled, timezone, durations_allowed:[30,45,60], steps_allowed:[15,30,60]}` | Workshop |
| `appointments.php?action=availability_save` | POST | `availability` (below) and or `public_booking_enabled` | 400 `{errors}` per field, else `{ok, saved, availability, ready, public_booking_enabled}` | Owner |
| `appointments.php?action=blocks&from&to`, `block_save`, `block_delete&id` | GET, POST | `block_save`: `start`, `end` (dates mean whole Lagos days, end inclusive; or date-times), `reason` | `block_save` 201 with a `warning` when bookings fall inside; `block_delete` only for blocks not yet over | Read workshop; write owner |
| `booking.php?action=config` | GET | | `{enabled, timezone, types:[{type, duration_min}], horizon_days, min_notice_hours}`; `enabled:false` while the switch is off or hours are empty | Public |
| `booking.php?action=slots&type=consultation&from&days` | GET | `days` at most 14 | `{timezone, type, slots:[{start, end}]}`; 503 while switched off | Public, `BOOKING_SLOTS_MAX_PER_IP` |
| `booking.php?action=request` | POST | `type:'consultation'`, `start`, `name`, `phone` or `email`, `note`, `hp_url` (honeypot), `request_key` | 201 `{ok, message}` (a request, never an instant booking; also opens an enquiry); 422 `{reason}` for `outside_hours`, `too_soon`, `too_far`; 409 when taken; 503 while switched off | Public, `BOOKING_REQUEST_MAX_PER_IP` |
| `tailoring.php?action=fitting&id` | POST | `fitting_date` or null (unchanged contract) | Adds `appointment_id`: the date is kept as an all-day confirmed fitting appointment, moved or cancelled with it | Workshop |
| `today.php` | GET | | `appointments_today` now lists real appointments (`id, type, status, all_day, starts_at_local, ends_at_local, client_name, job_id, job_code, source`), plus `appointment_requests`, `access_requests`, `messages_unread`, `change_requests` and `feedback_follow_up`, each `{count, items}` and empty until their schema exists; for unread messages and feedback the count and the items share one FROM and WHERE, so an entry on a deleted job is in neither | Owner |

`availability` shape (every field may be empty, which means not set): `{weekly:{mon:[["09:00","13:00"],["14:00","18:00"]], ..., sun:[]}, buffer_min, min_notice_hours, horizon_days, step_min, durations:{consultation, fitting, collection}, request_hold_hours}`. Breaks are the gaps between a day's windows; closed dates and leave are blocks. A type can be requested only when there is a window, a duration for it, a horizon, a minimum notice, a buffer and a hold time.

### Customer access

| Endpoint and action | Method | Request | Response | Auth |
|---|---|---|---|---|
| `access.php?action=start` | POST | `reference` (public reference of a job or retail order), `contact` (registered phone or email), `hp_url` (honeypot) | Always 200 `{challenge, message}` with the same message whatever happened. On a match a single-use six-digit code goes to the registered email (10 minutes, 5 attempts); with no email, or when mail fails, the request waits for the owner | Public; `ACCESS_START_MAX_PER_IP` and `ACCESS_START_MAX_PER_REF` |
| `access.php?action=verify` | POST | `challenge`, `code` | 200 `{token, expires_in_days, name}`; every failure (wrong, expired, reused, locked, unknown) 400 `{"error":"That code didn't work or has expired."}` | Public; `ACCESS_VERIFY_MAX_PER_IP` |
| `access.php?action=redeem` | POST | `invite` (64 hex characters from the invite link, exchanged at once) | As `verify`; single use | Public; same throttle |
| `access.php?action=logout`, `logout_all` | POST | | `{ok}`; `logout_all` adds `revoked` | Customer session |
| `access.php?action=requests` | GET | | Clients waiting for an invite: `{count, items:[{id, customer_id, client_name, client_ref, phone_masked, has_email, created_at}]}` | Owner |
| `access.php?action=invite` | POST | `customer_id` or `challenge_id` | 201 `{invite_url, expires_at_local, single_use, message_text, wa_link}`; the owner sends it by hand (`ACCESS_INVITE_HOURS`, default 24) | Owner |
| `access.php?action=revoke` | POST | `customer_id` | `{ok, revoked}` ends every session of that client | Owner |

Customer tokens are 48 hex characters sent as `Authorization: Bearer`; only their sha256 is stored. Sessions last `customer_session_days` (default 7). The token never goes in a URL; the only link-borne secret is the single-use invite.

### Customer portal

Every action needs a customer session. A job is addressed by its public reference (`ref`); another client's reference answers 404 `{"error":"Not found"}`, exactly like a missing one. Writes take a `request_key`; a repeat returns the first result with `duplicate:true`.

| Action | Method | Request | Response |
|---|---|---|---|
| `portal.php?action=me` | GET | | `{name, first_name, email_masked, phone_masked, features:{quote_accept, measurements}, timezone, company:null}` |
| `portal.php?action=jobs` | GET | | `{jobs:[{ref, description, garment_type, quantity, stage, stage_label, promised_date, event_date, unread}], orders:[{ref, status, total, item_count, created_at, courier, tracking_url}]}` |
| `portal.php?action=job&ref` | GET | | `job_public_view()`: `ref, description, garment_type, quantity, stage, stage_label, promised_date, event_date, quantity_handed_over, appointments, quote, payment{agreed, paid_verified, balance, credit, receipts}, handovers, timeline`; plus `messages`, `change_requests`, `feedback`, `can{accept_quote, give_feedback, request_appointment, request_change}` and `feedback_wording{publish, photo}`. `quote.content_hash` appears only when portal acceptance is on and the quote is sent |
| `portal.php?action=messages&ref` | GET | | `{ref, messages:[{id, from: you, herit or system, body, at, read}]}`; marks Herit's messages read |
| `portal.php?action=message` | POST | `ref`, `body` (plain text, at most 2000), `request_key` | 201 `{ok, id, duplicate, messages}` |
| `portal.php?action=change_requests&ref` | GET | | `{items:[{id, kind, status, details, address, requested_start, owner_response, price_effect, date_effect, created_at, decided_at}]}` |
| `portal.php?action=change_request` | POST | `ref`, `kind` (`address`, `garment` or `other`), `details` (at most 1000), `address` (for `address`), `request_key` | 201 change request; 409 once the job is closed |
| `portal.php?action=slots&type&from&days` | GET | `type` fitting, collection or consultation; `days` at most 14 | `{timezone, type, slots}` (independent of the public switch; empty until hours are set) |
| `portal.php?action=appointment_request` | POST | `ref`, `type`, `start`, `note`, `request_key` | 201 `{duplicate, message, id, type, status:'requested', all_day, starts_at, ends_at}`; 422 or 409 as for public requests |
| `portal.php?action=appointment_reschedule_request` | POST | `ref`, `appointment_id`, `start`, `reason`, `request_key` | 201 change request of kind `reschedule`; the owner applies it |
| `portal.php?action=measurements` | GET | | 404 unless `portal_show_measurements` is on; then `{read_only:true, sets:[{template, template_key, unit, values, status, taken_at}]}` (own approved and pending sets) |
| `portal.php?action=measurement_templates` | GET | | `{templates:[{key, label, fields}]}` (active, hidden fields left out) |
| `portal.php?action=propose_measurements` | POST | `ref` (optional), `template_key`, `unit` (`cm` or `in`), `vals`, `note`, `request_key` | 201 `{ok, pending:true, duplicate, warnings, change_request_id}`: a pending set (plus a change request when `ref` is given); never touches an approved set or a job snapshot |
| `portal.php?action=feedback` | POST | `ref`, `rating` (1 to 5, optional), `comment`, `contact_ok`, `publish_consent` (`no`, `anonymous`, `first_name`), `photo_consent`, `request_key` | 201; 409 before handover or when feedback exists; 400 `{errors}` |
| `portal.php?action=quote_accept` | POST | `ref`, `quote_id`, `content_hash`, `confirm:true` | 403 unless `portal_quote_accept_enabled` is on; then `{ok, already}` (channel `portal`) |

### Messages, change requests and feedback (owner)

| Action | Method | Request | Response |
|---|---|---|---|
| `messages.php?action=inbox` | GET | | `{items:[{job_id, code, client_name, last_at, last_at_local, unread}], unread_total}` |
| `messages.php?action=unread_count` | GET | | `{messages, change_requests, feedback_follow_up}`; `messages` and `feedback_follow_up` leave out deleted jobs and use the same FROM and WHERE as Today (`UNREAD_MESSAGES_FROM`, `OPEN_FEEDBACK_FROM` in `_jobs.php`), so the badge and Today agree |
| `messages.php?action=thread&job_id` | GET | | Every message, internal notes included, with `author_name`, `visibility`, `channel`, `delivery_status`, `read_by_owner_at`, `read_by_customer_at`, `created_at_local` |
| `messages.php?action=post` | POST | `job_id`, `visibility` (`internal` or `client`), `channel` (client: `portal`, `whatsapp`, `email`, `phone`, `in_person`; internal is always `note`), `body`, `request_key` | 201 message; WhatsApp sends through `wa_dispatch()` (adds `wa_link` in fallback mode), email through `_mail.php`; `delivery_status` records `sent`, `failed`, `manual` or `na` |
| `messages.php?action=mark_read` | POST | `job_id` | `{ok, marked}` |
| `messages.php?action=change_requests[&status][&job_id]` | GET | `status` open (default), approved, declined, withdrawn or all | `{items}` with `payload` decoded, `code`, `job_stage`, `client_name` |
| `messages.php?action=change_decide&id` | POST | `decision` (`approve` or `decline`), `response`, `price_effect` (signed amount), `date_effect` (YYYY-MM-DD), `override_reason` (reschedule only) | The decided request. After cutting starts, approving a measurement or garment change without a price or date effect answers 422 (BR-30). A reschedule is applied through the booking lock (409 on a clash). A measurement approval approves the pending set but leaves the job snapshot alone. The client sees a notice in the thread |
| `messages.php?action=feedback_list[&follow_up]` | GET | | `{items}` with consents and the wording agreed to |
| `messages.php?action=feedback_update&id` | POST | `follow_up` (`none`, `open`, `done`) | `{ok, follow_up}` |
| `messages.php?action=feedback_publish&id` | POST | | 201 `{testimonial_id, status:'hidden'}` only with publication consent, a rating and a comment (else 409); never automatic (BR-33) |

### Phase 3 settings keys

| Key | Default | Written by |
|---|---|---|
| `availability` | Not set (no hours, so no slots) | `appointments.php?action=availability_save` only (validated there); `settings.php` GET returns it decoded |
| `public_booking_enabled` | `0` | `appointments.php?action=availability_save` or `settings.php` |
| `customer_session_days` | `7` (1 to 90) | `settings.php` |
| `portal_quote_accept_enabled` | `0` | `settings.php` |
| `portal_show_measurements` | `0` | `settings.php` |
| `feedback_publish_wording`, `feedback_photo_wording` | Proposed wording (`schema_phase25.sql`), at most 1000 characters | `settings.php` |


## Phase 4 website CMS and public projection

Branch `feat/phase4-website` (no PR yet). Verified on local staging, 11 October 2026, by `scripts/staging/e2e-phase4.sh` ([LOCAL-STAGING.md](LOCAL-STAGING.md#end-to-end-checks)). Tables: [DATA-MODEL.md](DATA-MODEL.md#phase-4-tables-schema_phase26). Every write takes a JSON body except `media_upload` (multipart). Times are UTC `DATETIME` strings.

### Content model

Entities: `service`, `project` (portfolio), `faq`, `policy` (keys `privacy`, `terms`), `page` (keys `home`, `about`, `how_it_works`, `company`, `services_intro`, `contact`, and since 19 October 2026 `fabrics`, the fabric story band on Home, which has no page or sitemap entry of its own) and `slide` (home hero slides, D-023; needs `schema_phase28.sql`, otherwise `save_draft` answers 409 "Hero slides are not set up yet"). A slide's fields are `label` (30), `eyebrow` (40), `headline` (90, required), `lead` (220), `hero_media_id` (required, with alt text) and an optional button: `cta_label` (40) and `cta_path` (120, an internal path starting with one `/`; outside links, `//` and `..` are refused). Each item keeps a public `live` copy, an unpublished `draft` and one earlier version (`prev`). Saving a draft never changes the public site. Publishing copies the draft to live and keeps the old live copy; rolling back swaps live and the earlier version, so a second rollback undoes the first. Unpublishing hides the item and keeps its content. An item that was ever published is never deleted (unpublish it), and its slug never changes.

Fields (`data` in `save_draft`; required ones are checked only at publish):

| Entity | Fields |
|---|---|
| `service` | `title` (required, 120), `summary` (300), `body` (rich text), `includes` (up to 12 lines of 160), `price_note` (255), `hero_media_id`, `seo_title` (70), `seo_description` (170) |
| `project` | `title` (required), `summary`, `body`, `garment`, `fabric` (120), `service_slug`, `cover_media_id`, `images` ([{`media_id`, `alt`, `role`: front, back, detail, process or other}], up to 24), `featured`, `seo_title`, `seo_description`; private, never public: `own_work`, `consent_images`, `consent_client`, `consent_note` (255), `client_id` |
| `faq` | `question` (required, 255), `answer` (required, rich text), `category` (40), `show_on_home` |
| `policy` | `title` (required), `body` (required, rich text), `effective_date` (YYYY-MM-DD) |
| `page` | `headline` (required, 160), `intro` (600), `body` (rich text), `hero_media_id`, `seo_title`, `seo_description` |

Rich text goes through `sanitize_html()` on save (scripts, event handlers, styles, iframes and unsafe URLs removed). Publish is refused (422 `{problems}`) when a required field is empty; any public text holds `[owner`, `{{`, `lorem`, `TODO` or `TBC`; an image is missing, deleted or has alt text under five characters (the per-image `alt` overrides the image's own); or, for a project, there is no image, no image consent, or no client consent on work that is not the business's own. A project whose public text looks like a phone number, email address or staff code answers 409 `{warnings}` until it is published again with `confirm_leak:true`.

### `cms.php` (staff)

| Action | Method | Request | Response | Roles |
|---|---|---|---|---|
| `list&entity=E` | GET | | `{items:[{id, entity, slug, key?, status, sort, version, title, has_draft, has_prev, slug_locked, published_at, live_updated_at, draft_updated_at, updated_at}], keys?}` (`keys` lists the fixed page or policy keys) | CMS |
| `get&entity=E&id=N` or `&key=K` | GET | | `{item}`: the list fields plus `live`, `draft` and `editable` (draft if any, else live) | CMS |
| `save_draft&entity=E` | POST | `{id?, key? (page, policy), slug? (service, project), sort?, data:{…}}`. Without `id` it creates the item (service and project slug from `slug` or the title); a page or policy is found or created by `key` | 201 created or 200 `{ok, item}`; 400 `{errors}` per field; 409 `{code:'slug_taken'}` or `{code:'slug_locked'}` | CMS |
| `preview&entity=E&id=N` | GET | | `{entity, status, has_draft, preview, problems}`: `preview` is exactly the public shape built from the draft (or live) | CMS |
| `publish&entity=E&id=N` | POST | `{confirm_leak?}` | `{ok, item}`; 422 `{problems}`; 409 `{warnings}` or `{code}` (`nothing_to_publish`, `no_changes`) | CMS; policy owner only |
| `unpublish`, `rollback`, `discard_draft`, `delete` (`&entity=E&id=N`) | POST | | `{ok, item}` (`delete`: `{ok}`); 409 `{code}`: `not_published`, `no_previous_version`, `no_draft`, `published_once` | CMS; policy `unpublish` and `rollback` owner only |
| `reorder&entity=E` | POST | `{ids:[…]}` in the new order | `{ok}` | CMS |
| `media_list` | GET | | `{items:[media], max_mb}`; media: `{id, width, height, alt_text, caption, bytes, created_at, in_use, public:{url, srcset:[{url, width, type}], width, height, alt}}` | CMS |
| `media_upload` | POST multipart | `file`, `alt_text?`, `caption?` | 201 `{ok, duplicate:false, media}`; the same file again 200 `{duplicate:true}`; 413 over `MEDIA_MAX_MB`; 415 not JPEG, PNG or WebP by content; 501 without GD | CMS |
| `media_update&id=N` | POST | `{alt_text?, caption?}` (250 each) | `{ok, media}` | CMS |
| `media_delete&id=N` | POST | | `{ok}` (soft delete); 409 while a live or draft item uses it | CMS |
| `profile_get` | GET | | `{profile:{business_name, business_phone, business_whatsapp, business_email, business_address, business_address_public, business_area_text, business_hours_text, socials:{platform:url}, journal_enabled}, missing:[keys]}` | CMS |
| `profile_save` | POST | Any profile keys | `{ok, saved, profile}`; 400 `{errors}` (for example `socials.instagram`) | Owner |

CMS roles are super_admin, admin, manager and editor; owner roles are super_admin, admin and manager. Every write is audited (`website_*` actions). Publishing, unpublishing, rollback, reorder, image text changes and profile saves bump the `site_rev` setting.

Social links: `instagram`, `facebook`, `tiktok`, `x` (`twitter` is read as `x`), `youtube` and `linkedin` must be `https://` on that platform's own host or a subdomain of it, with an account path, no credentials and no port; `whatsapp` must be exactly `https://wa.me/<8 to 15 digits>` (a bare number is converted). Anything else is refused on save and left out of public output. `business_whatsapp` is stored as international digits (a Nigerian `0…` number becomes `234…`).

### `site.php` (public, GET only)

Answers carry an ETag (304 on a match) and `Cache-Control: public, max-age=60, stale-while-revalidate=300`, so an unpublish can take up to a minute to disappear from a browser cache. Missing, unpublished or unknown items answer 404 `{error}`. Image URLs are root-relative (`/uploads/site/…`); in development, prefix the API base.

| Action | Response |
|---|---|
| `config` | `{business:{name?, phone?, whatsapp?, whatsapp_url?, email?, address? (only when business_address_public is 1), area?, hours_text?}, socials:[{platform, url}], nav:{services, work, faqs, about, how_it_works, company, contact, journal, privacy, terms, book, shop}, pages:[published page keys], booking_enabled, site_url, jsonld (LocalBusiness or null), rev}`. Empty facts are omitted; `jsonld` is null without a business name and never has ratings |
| `home` | `{page (home page or null), services (up to 6), work (up to 6, featured first), faqs (up to 4 with show_on_home), slides (up to 6 published slides with a photograph, in staff order: `{id, label, eyebrow, headline, lead, hero, cta_label, cta_path}`; empty before `schema_phase28.sql`)}`. With no slide the site builds the hero from the home page and photographed services |
| `page&key=K` | `{page:{key, headline, intro, body, hero, seo_title, seo_description, updated_at}}` |
| `services` | `{intro (services_intro page or null), items:[service]}`; service: `{slug, title, summary, body, includes, price_note, hero, seo_title, seo_description, published_at, updated_at}` |
| `service&slug=S` | `{service, work:[up to 6 projects with this service_slug]}` |
| `work[&service=S]` | `{items:[project]}`; project: `{slug, title, summary, body, garment, fabric, service_slug, cover, images:[image + role], featured, seo_title, seo_description, published_at, updated_at}` |
| `work_item&slug=S` | `{item:project}` |
| `faqs[&home=1]` | `{items:[{id, question, answer, category, show_on_home}]}` |
| `policy&key=privacy\|terms` | `{policy:{key, title, body, effective_date, updated_at}}` |
| `journal` | `{enabled, items:[{slug, title, excerpt, category, print, author, published_at}]}`; empty while `journal_enabled` is off. `print` (since 19 October 2026) is `adire`, `ankara`, `asooke` or `kente`, from the post's stored `tile` (`journal_print_name()` in `_cms.php`) |
| `journal_post&slug=S` | `{post:{slug, title, excerpt, body (sanitised), category, print, author, published_at}}`; 404 while the journal is off |

Images (`hero`, `cover`, `images[]`): `{url (JPEG fallback), srcset:[{url, width, type:'image/webp'}], width, height, alt, caption?}`, or null.

### `sitemap.php`

`GET /sitemap.xml` (rewrite in `.htaccess`; the staging router does the same) returns `application/xml`. It lists `/` and `/contact` always; `/book` while public requests are on and ready; `/services`, `/work` and `/faqs` when something is published under them; each published page (`/about`, `/how-it-works`, `/company-orders`, `/contact`, `/services` for the intro), policy (`/privacy`, `/terms`), service (`/services/<slug>`) and project (`/work/<slug>`) with `lastmod`; and `/journal` with `/journal/<slug>` for published posts while `journal_enabled` is on. Absolute URLs use `SITE_URL`. These paths are the React routes the public site must serve.

### Phase 4 settings keys

All start empty (or `0`); empty means hidden on the public site. Saved by `cms.php?action=profile_save` or `settings.php`, both through `profile_clean()`.

| Key | Rule |
|---|---|
| `business_name` | Up to 120 characters; needed for the JSON-LD |
| `business_phone` | Digits, spaces, brackets, hyphens, optional leading `+` |
| `business_whatsapp` | International digits; public as `whatsapp_url` `https://wa.me/<digits>` |
| `business_email` | A valid address |
| `business_address`, `business_address_public` | Up to 300 characters; shown publicly only when `business_address_public` is `1` (default `0`) |
| `business_area_text` | Service area, up to 300 characters |
| `business_hours_text` | Up to 300 characters |
| `socials` | `{platform: url}`, rules above |
| `journal_enabled` | `0` or `1` (default `0`): the journal list, posts and sitemap entries |
| `site_rev` | Counter bumped on every public change; read-only |

## Phase 5 company orders

Branch `feat/phase5-company-orders` (no PR yet). Tables: [DATA-MODEL.md](DATA-MODEL.md#phase-5-tables-and-columns-schema_phase27). Without `schema_phase27.sql` every Phase 5 endpoint answers 409 with an import message.

### `companies.php` (owner roles)

| Action | Method | Request | Response |
|---|---|---|---|
| `list[&q=]` | GET | | `{items:[{id, company_ref, name, invoice_email, contacts (active), jobs}]}` |
| `get&id=N` | GET | | `{company (all columns, staff only), contacts:[contact], jobs:[{id, code, ref, description, quantity, job_stage, stage_label, due_date, po_number, sample_status, price, paid_total}]}` |
| `match&name=` | GET | | `{matches:[{id, company_ref, name}]}`: names equal or containing each other once case, spaces and suffixes (Ltd, Limited, Plc, Nig, Nigeria, Inc, LLC, Company, Co) are ignored |
| `save` | POST | `{id?, name, invoice_name?, invoice_address?, invoice_email?, tax_id?, notes_internal?, confirm_new?}` | 201 or 200 `{company}`; 400 `{errors}`; 409 `{matches}` for a new company with a similar name unless `confirm_new` |
| `contact_save` | POST | `{company_id, id?}` to edit, or `customer_id`, or `person:{name, phone, email, confirm_new}` to add; `role_title?`, `can_view_jobs?`, `can_approve_samples?`, `is_invoice_recipient?` | 201 or 200 `{contact:{id, company_id, customer_id, name, client_ref, phone_masked, email, role_title, can_view_jobs, can_approve_samples, is_invoice_recipient, active}}`; 409 `{candidates}` when the person may already be a client (Phase 2 rule, never merged); 400 without a phone or email |
| `contact_deactivate&id=N` | POST | | `{contact}` with `active: 0`; from the next portal request that person sees none of the company's jobs |

Every write is audited (`company_create`, `company_update`, `company_contact_add`, `company_contact_update`, `company_contact_deactivate`). A company reference is `CO-` and the id padded to four digits.

### `company_jobs.php` (workshop roles; everything except `job` and `item_progress` is owner-only)

A company job is one `tailoring_orders` row with `job_kind = 'company'`; it starts at stage `quote` with price 0 (the quote sets the price) and its `quantity` is kept equal to the active items' total. Tailors see the items (they make the garments) but no money, company or contact fields. Every write runs under the job lock and adds a job event.

| Action | Method | Request | Response and rules |
|---|---|---|---|
| `create` | POST | `{company_id, contact_id (active contact of that company; becomes the job's client), description?, po_number?, measurement_method? (individual, sizes, mixed), sample_required?, due_date?, items:[{description, qty 1 to 999, garment_type?, service_key?, size_label?, wearer_customer_id?, wearer_label?}], request_key}` | 201 `{job, items, samples, handovers, company, contacts, bill_to, suggested_stage}`; the same request key answers 200 with the same job. The invoice contact defaults to the chosen contact when they are the invoice recipient. No automatic discount (BR-29) |
| `job&job_id=N` | GET | | The same shape; `job.progress` reads "2 of 5 handed over"; items carry `measurement_state` (`attached`, `available`, `pending`, `missing`, `not_needed`) and the wearer's name for staff; `suggested_stage` is what the items imply (the stage itself still moves through Jobs) |
| `set&job_id=N` | POST | `{po_number?, invoice_contact_id?, measurement_method?}` | The answer above |
| `item_save&job_id=N` | POST | `{item_id?, ...item fields, effect_note?}` | Adds or edits an item. Once an item has started, an edit needs `effect_note` stating the price or date effect (BR-30), else 409 `{code:'effect_required'}`; quantity never below what is handed over; changing the wearer clears the attached measurements |
| `item_cancel&job_id=N` | POST | `{item_id, reason}` | Refused (409) once any of the item is handed over |
| `item_progress&job_id=N` | POST | `{item_id, qty_ready}` | 0 to the item quantity and not below what is handed over; 409 while the job is a quote or cancelled. Tailors may call it |
| `item_attach_measurement&job_id=N` | POST | `{item_id, measurement_set_id}` | Only an approved set belonging to the item's wearer |
| `wearer_invite&job_id=N` | POST | `{item_id}` | 201 single-use invite link for the wearer's own client record (the Phase 3 invite, now `customer_invite_create()` in `_portal.php`) |
| `sample_submit&job_id=N` | POST | `{description, item_id?, request_key}` | New version; a version still waiting is withdrawn; job `sample_status` becomes `submitted`; public timeline event |
| `sample_record_decision&job_id=N` | POST | `{sample_id, decision: approve or changes, channel: in_person, whatsapp, email or phone, note?, contact_id?}` | Only the latest submitted version moves; 409 once decided. (Decisions from the portal arrive through `portal.php`) |
| `handover&job_id=N` | POST | `{items:[{item_id, qty}], method: collection or delivery, received_by?, evidence_note?, checklist?, request_key}` | 201 with the job; each quantity at least 1 and at most ready minus already handed over, else 422 `{errors}`; the same request key answers 200 without a second row; the job moves to handed over only when every active item is out; `warning` when a balance is still owed |

`tailoring.php?action=document` for a company job adds `bill_to` (the quote's frozen snapshot when there is one, else the live company details: company, invoice name, address, email, tax id, PO number and the invoice recipient), `bill_to_frozen` and `po_number`. `quotes.php?action=send` freezes `bill_to_snapshot`, `bill_to_company_id` and `po_number` on the quote for company jobs.

### Portal additions (`portal.php`, Phase 5)

Off until the owner sets `company_portal_enabled` to 1 (setting, default 0); while it is off, company contacts and wearers see no company jobs and a company job's reference answers 404 to everyone in the portal. A company job is never reached through its `customer_id` alone, so a deactivated primary contact loses access at once.

| Action | Change |
|---|---|
| `me` | `company`: `[{name, can_approve_samples}]` for each company the person is an active contact of (null while the switch is off) |
| `jobs` | Own jobs exclude company jobs; adds `company_jobs:[{ref, company, description, quantity, quantity_handed_over, stage, stage_label, promised_date}]` for active contacts with `can_view_jobs`, and `wearing:[wearer view]` for garments the person wears |
| `job&ref=` | Company contact: `{ref, kind:'company', description, quantity, stage, stage_label, promised_date, po_number, quantity_ready, quantity_handed_over, lines:[{description, qty, qty_ready, qty_handed_over, sizes? (only when measuring by size)}], sample:{id, version, description, status, decided_at} or null, quote, payment, handovers, timeline, messages, can:{approve_sample}}`. Wearer: `{ref, kind:'wearer', item_id, description, garment_type, quantity, stage, stage_label, promised_date}`. Neither view ever carries a wearer, a measurement, notes, costs or another company (exact key sets tested in `tests/company_cases.php`) |
| `messages`, `message` | Also open to company contacts on their company's jobs; wearers get 404 |
| `sample_decide` (new) | POST `{ref, sample_id, decision: approve or changes, note? (required for changes), request_key}`; only an active contact with `can_approve_samples`, only the latest submitted version; anyone else gets the 404 of a missing job; records channel `portal` and a public timeline event |
| Every other action | Unchanged and still limited to the job's own client: contacts and wearers get 404 (they never propose measurements, request appointments or changes, give feedback or accept quotes) |

Settings: `company_portal_enabled` (`0` or `1`, default `0`).

Policy defaults ([D-025](DECISIONS.md), `schema_phase32.sql`, 19 October 2026): `quote_validity_days` `14` and `deposit_policy_text` `Work starts once the deposit shown on this quote is paid. The balance is due before collection.` (states the existing rule and names no amount, which stays per quote), written only where the setting is empty. The same file sets the `retention_*_days` keys below and a marker row `policy_defaults_d025` (`2026-10-19`) that `release_check.php --db` reads. Both policy values stay editable by the owner in Settings.

## Data retention settings keys (K-18)

Branch `feat/hardening-2026-10-18`. Seeded by `schema_phase30.sql`; saved through `settings.php` by `super_admin` only: a request from admin or manager that contains any of these keys answers 403 "Only the owner can change how long data is kept." and saves nothing, although they can still read the values (GET) and see them read-only in Settings > Data retention. The `settings_update` audit entry records `meta.retention` as `{key: {old, new}}` for each retention key sent (`old` is null when the key was never stored). The defaults were decided in [D-025](DECISIONS.md) and are written by `schema_phase32.sql` only where the value is still empty; a value the owner saved is never changed. Each value is a whole number of days. Empty or `0` means keep forever (stored as empty); anything else outside the range answers 400 with the rule. Read only by `retention.php`, which treats a bad stored value as off and reports it. A row goes when its date column is older than now minus the period. Cutoffs are UTC, except for `auth_tokens` and `customer_tokens`: their `expires_at` is a DATETIME written with `NOW()` in the server's zone, so the job compares them with the server's own clock (read before it switches its session to UTC) minus the period.

| Key | Default | Range | Deletes from (date column, condition) |
|---|---|---|---|
| `retention_expired_tokens_days` | `30` | 1 to 3650 | `auth_tokens` and `customer_tokens` (`expires_at`) |
| `retention_customer_sessions_days` | Empty, then `30` from `schema_phase32.sql` (D-025) | 1 to 3650 | `customer_sessions` (`expires_at`) |
| `retention_access_attempts_days` | Empty, then `90` from `schema_phase32.sql` (D-025) | 1 to 3650 | `customer_access_challenges` (`expires_at`) |
| `retention_audit_log_days` | Empty, then `365` from `schema_phase32.sql` (D-025) | 90 to 3650 | `audit_log` (`created_at`); the floor keeps sign-in throttling and recent history |
| `retention_whatsapp_log_days` | Empty, then `365` from `schema_phase32.sql` (D-025) | 1 to 3650 | `whatsapp_messages` (`created_at`) |
| `retention_abandoned_carts_days` | Empty, then `30` from `schema_phase32.sql` (D-025) | 1 to 3650 | `abandoned_carts` (`updated_at`, one row per phone) |
| `retention_waitlist_days` | Empty, then `180` from `schema_phase32.sql` (D-025) | 1 to 3650 | `waitlist` (`created_at`) |
| `retention_closed_enquiries_days` | Empty, then `730` from `schema_phase32.sql` (D-025) | 1 to 3650 | `enquiries` (`updated_at`), only `status = 'closed'` with no `job_id`, no `converted_at` and no quote, job or appointment pointing at it |
| `retention_usage_daily_days` | Empty, then `400` from `schema_phase32.sql` (D-025) | 1 to 3650 | `usage_daily` (`day`, a Lagos DATE compared with the UTC cutoff, so a row may go up to an hour early or late); seeded by `schema_phase31.sql` (Phase 7) |

Never deleted (protected in `_retention.php`, checked by the helper tests): jobs and their events, items, handovers, samples, messages, change requests and feedback; `job_payments`, `payments`, `expenses`, quotes, orders, store credit, gift cards, coupon redemptions, measurement sets and templates, customers, companies and their contacts, appointments, users and settings.

## Phase 7 usage counts and owner review

Branch `feat/phase7-review`, 19 October 2026. Evidence for the plan's Phase 7 ("learn and simplify"): nothing is removed or added by these endpoints. Verified on local staging only; production NOT TESTED.

### `usage.php` (any staff)

- `POST ?action=hit {section}` (all seven staff roles, `require_auth(USAGE_ROLES)`). `section` must be one of `USAGE_SECTIONS` in `_review.php`, the first URL segment of each admin menu item (`src/__tests__/usage.test.js` fails if the two lists differ). Answers `{ok:true, counted:true}` and runs `INSERT ... ON DUPLICATE KEY UPDATE hits = hits + 1` on `usage_daily (day, section, role)` with `day = lagos_today()`. Before `schema_phase31.sql` it answers `{ok:true, counted:false}` and stores nothing.
- Errors: unknown or missing section 400 "Unknown section"; a list or object 400 "section must be text"; no session 401; GET 405; another action 404.
- One `(day, section, role)` row holds at most `USAGE_DAILY_CAP` (50) hits, so a looping client or hand-made posts cannot turn one row into a misleading number (staging: 60 posts stop at 50, 19 October 2026). The browser keeps its once-a-day list per role, so on a shared device the next role to open a section the same day is still counted.
- Stores no user id, IP address or path. The admin layout (`src/helpers/usage.js`) sends at most one hit per section per browser per Lagos day, remembered in localStorage `herit_usage_sent`; it never waits for the answer, ignores errors and sends nothing offline or without working storage.

### `review.php` (super_admin)

`GET ?action=summary&days=30|90` (default 30; any other value 400 "days must be 30 or 90"; admin, manager and other roles 403; POST 405). Read-only. The window is the last `days` Lagos days including today; TIMESTAMP columns are compared with `FROM_UNIXTIME()` of the window start, so the database session zone does not move it. Answer:

| Block | Source | Meaning |
|---|---|---|
| `enquiries {available, created, converted, rate, median_days_to_convert, timed}` | `enquiries.created_at`, `job_id`, `converted_at` (UTC DATETIME) | Enquiries created in the window and how many of those have a job so far; `rate` is null when none were created; the median uses those with `converted_at`. `available:false` before `schema_phase18.sql` |
| `overdue_jobs {count, items[<=20], more}` | `tailoring_orders`, same rule as Today's Overdue | Open jobs past `due_date` now, oldest first: `id, code, client_name, due_date, days_overdue` |
| `refusals {available, total, items[{action, label, count}]}` | `audit_log` | One audited row per refused attempt: `login_fail_ip`, `pin_login_fail`, `reset_fail_ip`, `set_pin_taken`, `access_verify_fail_ip`, `cust_login_fail_ip`, `track_fail_ip`, `gift_check_fail`, `mail_send_failed` (`REVIEW_REFUSAL_ACTIONS`). Failed saves are counted separately in `failed_saves`; 400 answers are not audited |
| `failed_saves {available, total, kinds[{kind, label, count}], endpoints[{endpoint, action, count}]}` | `audit_log` | Lost races and server errors in the window (K-31, D-025): `save_conflict` (the 409 from `db_tx`, including deadlock and lock-timeout) and `server_error` (the JSON 500 handler). `kinds` keeps both with zeros; `endpoints` are the ten busiest by endpoint file and `?action`, biggest first. See [Failed saves](#failed-saves-k-31) |
| `notifications {whatsapp, reminders, email, portal_messages}`, each `{available, sent, failed, other, total, by_status}` | `whatsapp_messages` (direction `out`; reminders are `template = 'tailoring_reminder'`), `audit_log` `mail_send` and `mail_send_failed`, `job_messages` (owner to client, `delivery_status <> 'na'`) | Sent is `sent`, `delivered` or `read` for WhatsApp; `manual` (wa.me links) and `queued` are other |
| `usage {available, counting_since, sections[{section, hits, roles}], zero_hit_sections}` | `usage_daily` | Per section and role over the window, most used first; allowlisted sections with no hits, in menu order; `counting_since` is the first day recorded |

### Failed saves (K-31)

Branch `feat/ceo-decisions`, 19 October 2026 ([D-025](DECISIONS.md)). `audit_failure($kind)` in `_lib.php` writes one `audit_log` row per failed save, from two places: the uncaught-error handler (`server_error`, the JSON 500) and `db_tx` (`save_conflict`, the 409 for a lost race, deadlock or lock timeout).

- The row holds the kind as `action`, the endpoint file as `entity` and, in `meta`, the `?action` and the HTTP method. It holds no user, no IP, no request body and no record id, so a failure row carries no personal data (`user_id` is NULL). `audit_failure_row()` is the pure part and is covered by the helper tests.
- At most 200 rows per kind per hour (`AUDIT_FAILURE_HOURLY_CAP`), so a burst cannot flood the log.
- It swallows every error of its own: counting a failure never turns one error into another or changes the answer the caller gets.
- 400 answers (bad input) are not counted; they are the form doing its job.
- Kept as long as the rest of the audit log (`retention_audit_log_days`, [DATA-PRIVACY.md](DATA-PRIVACY.md#retention-schedule)).
- Read only by `review.php` (`failed_saves` block above). Staging: a probe 500 was recorded with user NULL and shown in the report; the card in a browser and the host are NOT TESTED. `_lib.php` and `_jobs.php` go up with the deploy; `_review.php` and `review.php` are hand uploads.
