# API Specification

This file owns the endpoint inventory, the server role gate on each file, the deploy route for each file, the request conventions, the per-action contracts added by each phase, and the settings keys. Who may do what in business terms is in [SECURITY.md](SECURITY.md#permissions); deploy procedure is in [DEPLOYMENT.md](DEPLOYMENT.md).

## Conventions

- One PHP file per resource under `php-api/`, each `require '_lib.php'`. Operations are selected with `?action=` and the HTTP method; responses are JSON from `json()`, errors are `{"error": "..."}` with an HTTP status from `fail()` (`_lib.php:79-86`).
- Auth: `Authorization: Bearer <token>` checked by `require_auth($roles)` (`_lib.php:119`). Staff tokens come from `auth.php`; customer tokens from `account.php`.
- Input: JSON body through `body()`; prepared statements only.
- Throttling: staff email and PIN login; customer login and public tracking since PR #6 (A03). Limits are server settings ([DEPLOYMENT.md](DEPLOYMENT.md#server-configuration)).
- Idempotency: Phase 2 writes that must not repeat (enquiry conversion, measurement sets, quotes, ledger entries, handovers) take a `request_key`; a repeat returns the first result with `duplicate:true` ([BR-02 and BR-22](BUSINESS-RULES.md)). Job edits carry `lock_version` and answer 409 when stale.
- Pagination, rate limits beyond login, versioning, timeouts and retries: not defined per operation. Each phase adds its action contracts to this file.

## Endpoint inventory

43 top-level PHP files on the Phase 3 branch: 37 endpoints, four shared includes and two config files (Verified 10 October 2026). "Server gate" is the role list passed to the file-level `require_auth()` call; individual actions may narrow it further, which is NOT TESTED. "CI" means `deploy.yml` copies it to the server on every push to `main` (19 files on the Phase 3 branch, 16 on the Phase 2 branch, nine before it); "Manual" means it reaches the server only by hand upload, so its live version is Unknown (A02).

| File | Purpose | Server gate (file level) | Deployed by |
|---|---|---|---|
| `_lib.php` | Shared helpers: CORS, JSON, auth, audit, throttle, sanitiser, `cfg()`, coupon and referral helpers, payment helpers, staff codes and public references. Loads `config.local.php` instead of `config.php` only when the local staging router defines `HERITOS_STAGING` | Not an endpoint | CI |
| `api.php` | Smoke test: `items` list (public) and insert | List public; insert all seven staff roles (`api.php:23`) | CI |
| `auth.php` | Staff login, logout, me; email and PIN throttling | Login public; other actions any signed-in staff | CI |
| `ai.php` | OpenRouter text proxy | Any signed-in staff (`ai.php:14`) | CI |
| `products.php` | Catalogue, variants, stock | super_admin, admin, manager, editor, employee | CI |
| `customers.php` | Clients: search, match, duplicate warning, measurement sets | super_admin, admin, manager, tailor, employee (`ROLES_CLIENTS`) | CI |
| `_domain.php` | Pure Phase 2 rules: role groups, kobo money, stage transitions, request keys | Not an endpoint; direct requests refused by `.htaccess` | CI (Phase 2 branch) |
| `_jobs.php` | Phase 2 database helpers: jobs, clients, measurement sets, ledger | Not an endpoint; direct requests refused by `.htaccess` | CI (Phase 2 branch) |
| `_mail.php` | Shared SMTP sender `mail_send_html()` (Phase 3 extraction from `mail.php`) | Not an endpoint; direct requests refused by `.htaccess` | CI (Phase 3 branch) |
| `appointments.php` | Appointments, availability settings and blocked time (Phase 3) | Workshop read (tailors see times only); writes owner | CI (Phase 3 branch) |
| `booking.php` | Public consultation requests and free slots (Phase 3), off until `public_booking_enabled` | Public, throttled | CI (Phase 3 branch) |
| `today.php` | Daily worklist | Owner: super_admin, admin, manager | CI (Phase 2 branch) |
| `enquiries.php` | Enquiry pipeline and conversion | super_admin, admin, manager, employee (convert owner only) | CI (Phase 2 branch) |
| `measurements.php` | Templates and measurement sets | Workshop | CI (Phase 2 branch) |
| `quotes.php` | Versioned quotes | Owner | CI (Phase 2 branch) |
| `ledger.php` | Append-only job payment ledger | Owner | CI (Phase 2 branch) |
| `stats.php` | Dashboard headline numbers in one call | super_admin, admin, manager, tailor, editor, employee | CI |
| `tailoring.php` | Jobs: stages, measurements, payments wrapper, groups, handovers, documents | Workshop: super_admin, admin, manager, tailor (employee removed on the Phase 2 branch, K-01) | CI |
| `contact.php` | Public enquiry submit plus the older staff enquiry list | Submit public; inbox super_admin, admin, manager, employee | CI |
| `account.php` | Customer self-service portal | Customer token | Manual |
| `ai_image.php` | Text-to-image proxy | Any signed-in staff | Manual |
| `analytics.php` | Read-only reports over live tables | super_admin, admin, manager | Manual |
| `content.php` | Journal (blog) and testimonials CRUD | super_admin, admin, manager | Manual |
| `coupons.php` | Promo codes and public validation | super_admin, admin, manager, editor (validation public) | Manual |
| `engage.php` | Restock waitlist and abandoned-cart recovery | super_admin, admin, manager, editor | Manual |
| `export.php` | CSV export of orders, payments, expenses, customers | super_admin, admin, manager | Manual |
| `inbox.php` | IMAP mailbox reader | super_admin, admin, manager, editor, employee | Manual |
| `loyalty.php` | Store credit and gift cards | super_admin, admin, manager | Manual |
| `mail.php` | Staff email send; a thin endpoint over `_mail.php` on the Phase 3 branch | super_admin, admin, manager, editor, employee | Manual |
| `marketing.php` | Campaign planner | super_admin, admin, manager, editor | Manual |
| `orders.php` | Staff retail orders and market (POS) sales | super_admin, admin, manager, seller, employee | Manual |
| `payments.php` | Money in and out, cash position | super_admin, admin, manager | Manual |
| `referrals.php` | Referral codes and rewards | super_admin, admin, manager | Manual |
| `reviews.php` | Reviews, ratings and photo moderation | super_admin, admin, manager, editor | Manual |
| `settings.php` | Channel toggles, store configuration (`shop_enabled`) and the Phase 2 business settings | super_admin, admin, manager | Manual |
| `stock.php` | Stock adjustments | super_admin, admin, manager, employee | Manual |
| `store.php` | Public storefront: catalogue, checkout, published feeds, order tracking by public reference, public config (`shop_enabled`) | Public | Manual |
| `suppliers.php` | Suppliers and purchase orders (receiving bumps stock) | super_admin, admin, manager | Manual |
| `users.php` | Team and access: staff CRUD, last super_admin guard | Management super_admin, admin; self actions any staff | Manual |
| `weather.php` | Lagos forecast from Open-Meteo, no key (weather.php:23) | super_admin, admin, manager, seller, employee | Manual |
| `whatsapp.php` | WhatsApp threads, templates, Cloud API or wa.me fallback | super_admin, admin, manager, seller, editor, employee; webhook public | Manual |
| `config.sample.php` | Template for server-only `config.php` | Not an endpoint | Never deployed |
| `config.local.php` | Local staging config written by `scripts/staging/setup.sh`; gitignored | Not an endpoint | Never deployed |

Role lists are Verified from the `$STAFF`, `$ADMIN` and inline `require_auth()` declarations in each file. Public actions (Verified from source): `coupons.php?action=validate` (GET, before the gate); every `store.php` action: `config`, `blog`, `testimonials`, `catalogue`, `checkout`, `pay_init`, `pay_verify`, `waitlist_join`, `save_cart`, `track`; every `booking.php` action (`config`, `slots`, `request`) on the Phase 3 branch. Runtime behaviour of each is NOT TESTED beyond the staging smoke checks in [qa/FUNCTIONAL-AUDIT.md](../qa/FUNCTIONAL-AUDIT.md).

## Customer lookups and references

- Customer lookups (`store.php?action=track`, `account.php?action=login`) go through `order_by_customer_ref()` in `_lib.php`: the random public reference always works; the old `ORD-` code works only while `ALLOW_LEGACY_ORDER_CODE_LOOKUP` is true (default true, so references already sent to customers keep working). Both still need the matching phone and are throttled per IP.
- The checkout confirmation, tracking page, customer portal and WhatsApp order confirmation show the public reference. Tailoring jobs carry one ready for Phase 3; no customer page shows it yet. Payment start and verification (`pay_init`, `pay_verify`) still use the staff code.
- Code and reference formats are in [DATA-MODEL.md](DATA-MODEL.md#codes-and-references).

Authorisation belongs at the trusted boundary, not only in the interface. Object-level ownership checks for customer and company access are the target in [SECURITY.md](SECURITY.md#authentication).

## Phase 2 daily records

Branch `feat/phase2-daily-records`, PR #9 (open).

Verified on local staging, 10 October 2026: `scripts/staging/e2e-phase2.sh`, 48 checks passing. Every write takes a JSON body. Money in requests is a string such as `"45,000"` or `"45000.50"`, parsed to kobo on the server. Money in responses is a decimal string. New `DATETIME` columns hold UTC. "Today" is the Africa/Lagos date, computed in PHP. `request_key` is 16 to 64 characters of `[A-Za-z0-9_-]`; repeating a key returns the first result with `duplicate:true`. Owner roles are super_admin, admin and manager. Workshop roles are owner roles plus tailor. Tailors never receive money fields.

| Endpoint | Actions | Roles |
|---|---|---|
| `today.php` | GET: `{date, appointments_today, overdue, due_soon, next_actions, ready, enquiries, balances, credits, unverified_payments, stage_review, measurements_pending}`, each `{count, items}` | Owner |
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
| `today.php` | GET | | `appointments_today` now lists real appointments (`id, type, status, all_day, starts_at_local, ends_at_local, client_name, job_id, job_code, source`), plus `appointment_requests` | Owner |

`availability` shape (every field may be empty, which means not set): `{weekly:{mon:[["09:00","13:00"],["14:00","18:00"]], ..., sun:[]}, buffer_min, min_notice_hours, horizon_days, step_min, durations:{consultation, fitting, collection}, request_hold_hours}`. Breaks are the gaps between a day's windows; closed dates and leave are blocks. A type can be requested only when there is a window, a duration for it, a horizon, a minimum notice, a buffer and a hold time.

### Phase 3 settings keys

| Key | Default | Written by |
|---|---|---|
| `availability` | Not set (no hours, so no slots) | `appointments.php?action=availability_save` only (validated there); `settings.php` GET returns it decoded |
| `public_booking_enabled` | `0` | `appointments.php?action=availability_save` or `settings.php` |
| `customer_session_days` | `7` (1 to 90) | `settings.php` |
| `portal_quote_accept_enabled` | `0` | `settings.php` |
| `portal_show_measurements` | `0` | `settings.php` |
| `feedback_publish_wording`, `feedback_photo_wording` | Proposed wording (`schema_phase25.sql`), at most 1000 characters | `settings.php` |

