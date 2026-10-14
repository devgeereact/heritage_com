# API Specification

This file owns the endpoint inventory, the server role gate on each file, the deploy route for each file, the request conventions, the per-action contracts added by each phase, and the settings keys. Who may do what in business terms is in [SECURITY.md](SECURITY.md#permissions); deploy procedure is in [DEPLOYMENT.md](DEPLOYMENT.md).

## Conventions

- One PHP file per resource under `php-api/`, each `require '_lib.php'`. Operations are selected with `?action=` and the HTTP method; responses are JSON from `json()`, errors are `{"error": "..."}` with an HTTP status from `fail()` (`_lib.php:79-86`).
- Auth: `Authorization: Bearer <token>` checked by `require_auth($roles)` (`_lib.php:119`). Staff tokens come from `auth.php`. Customer sessions come from `access.php` (verified) or the legacy `account.php` login, and are checked by `require_customer_session()` in `_portal.php` (Phase 3 branch).
- Input: JSON body through `body()`; prepared statements only.
- Throttling: staff email and PIN login; customer login and public tracking since PR #6 (A03). Limits are server settings ([DEPLOYMENT.md](DEPLOYMENT.md#server-configuration)).
- Idempotency: Phase 2 writes that must not repeat (enquiry conversion, measurement sets, quotes, ledger entries, handovers) take a `request_key`; a repeat returns the first result with `duplicate:true` ([BR-02 and BR-22](BUSINESS-RULES.md)). Job edits carry `lock_version` and answer 409 when stale.
- Pagination, rate limits beyond login, versioning, timeouts and retries: not defined per operation. Each phase adds its action contracts to this file.

## Endpoint inventory

52 top-level PHP files on the Phase 4 branch: 43 endpoints, seven shared includes and two config files (Verified 11 October 2026; 47 on the Phase 3 branch). "Server gate" is the role list passed to the file-level `require_auth()` call; individual actions may narrow it further, which is NOT TESTED. "CI" means `deploy.yml` copies it to the server on every push to `main` (28 files on the Phase 4 branch, 23 on the Phase 3 branch, 16 on the Phase 2 branch, nine before it); "Manual" means it reaches the server only by hand upload, so its live version is Unknown (A02).

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
| `_portal.php` | Customer sessions (hashed tokens, expiry, revocation, legacy tokens behind the flag) and the object-level job check (Phase 3) | Not an endpoint; direct requests refused by `.htaccess` | CI (Phase 3 branch) |
| `access.php` | Verified customer access: start, verify, redeem an invite, logout; owner invites and revocation (Phase 3) | Public and customer session; `requests`, `invite`, `revoke` owner | CI (Phase 3 branch) |
| `portal.php` | Customer portal over tailoring jobs and retail orders: job view, messages, change requests, appointment requests, measurement proposals, feedback (Phase 3) | Customer session; every lookup filtered by the signed-in client | CI (Phase 3 branch) |
| `messages.php` | Job messages, change-request decisions and feedback moderation (Phase 3) | Owner | CI (Phase 3 branch) |
| `_cms.php` | Pure Phase 4 website rules: field schemas, sanitising, slugs, social link allowlist, business profile validation, publish checks, the draft, publish and rollback state machine, the public whitelist projections, JSON-LD, sitemap XML, upload type and image width plan | Not an endpoint; direct requests refused by `.htaccess` | CI (Phase 4 branch) |
| `_media.php` | Phase 4 image ingest: type check, GD re-encode (metadata stripped), WebP and JPEG variants with random names | Not an endpoint; direct requests refused by `.htaccess` | CI (Phase 4 branch) |
| `cms.php` | Website CMS: services, portfolio, FAQs, policies, pages (draft, preview, publish, unpublish, rollback), images, business profile (Phase 4) | super_admin, admin, manager, editor; policy publishing and the profile owner only | CI (Phase 4 branch) |
| `site.php` | Public website projection: published content only (Phase 4) | Public, GET only | CI (Phase 4 branch) |
| `sitemap.php` | XML sitemap of published public pages, served at `/sitemap.xml` (Phase 4) | Public | CI (Phase 4 branch) |
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
| `inbox.php` | IMAP mailbox reader | super_admin, admin, manager, editor, employee | Manual |
| `loyalty.php` | Store credit and gift cards | super_admin, admin, manager | Manual |
| `mail.php` | Staff email send; a thin endpoint over `_mail.php` on the Phase 3 branch | super_admin, admin, manager, editor, employee | Manual |
| `marketing.php` | Campaign planner | super_admin, admin, manager, editor | Manual |
| `orders.php` | Staff retail orders and market (POS) sales | super_admin, admin, manager, seller, employee | Manual |
| `payments.php` | Money in and out, cash position | super_admin, admin, manager | Manual |
| `referrals.php` | Referral codes and rewards | super_admin, admin, manager | Manual |
| `reviews.php` | Reviews, ratings and photo moderation | super_admin, admin, manager, editor | Manual |
| `settings.php` | Channel toggles, store configuration (`shop_enabled`) and the Phase 2 business settings; on the Phase 4 branch the business profile keys go through the same validator as `cms.php` | super_admin, admin, manager | Manual |
| `stock.php` | Stock adjustments | super_admin, admin, manager, employee | Manual |
| `store.php` | Public storefront: catalogue, checkout, published feeds, order tracking by public reference, public config (`shop_enabled`). On the Phase 4 branch there is no fallback catalogue or free-delivery threshold, and `config` returns only social links that pass the allowlist | Public | Manual |
| `suppliers.php` | Suppliers and purchase orders (receiving bumps stock) | super_admin, admin, manager | Manual |
| `users.php` | Team and access: staff CRUD, last super_admin guard | Management super_admin, admin; self actions any staff | Manual |
| `weather.php` | Lagos forecast from Open-Meteo, no key (weather.php:23) | super_admin, admin, manager, seller, employee | Manual |
| `whatsapp.php` | WhatsApp threads, templates, Cloud API or wa.me fallback | super_admin, admin, manager, seller, editor, employee; webhook public | Manual |
| `config.sample.php` | Template for server-only `config.php` | Not an endpoint | Never deployed |
| `config.local.php` | Local staging config written by `scripts/staging/setup.sh`; gitignored | Not an endpoint | Never deployed |

Role lists are Verified from the `$STAFF`, `$ADMIN` and inline `require_auth()` declarations in each file. Public actions (Verified from source): `coupons.php?action=validate` (GET, before the gate); every `store.php` action: `config`, `blog`, `testimonials`, `catalogue`, `checkout`, `pay_init`, `pay_verify`, `waitlist_join`, `save_cart`, `track`; every `booking.php` action (`config`, `slots`, `request`) and `access.php` `start`, `verify` and `redeem` on the Phase 3 branch; every `site.php` action and `sitemap.php` on the Phase 4 branch. Runtime behaviour of each is NOT TESTED beyond the staging smoke checks in [qa/FUNCTIONAL-AUDIT.md](../qa/FUNCTIONAL-AUDIT.md).

## Customer lookups and references

- Verified customer access (Phase 3 branch) is the primary route: [Customer access](#customer-access) below. The older lookups that follow remain.
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
| `today.php` | GET | | `appointments_today` now lists real appointments (`id, type, status, all_day, starts_at_local, ends_at_local, client_name, job_id, job_code, source`), plus `appointment_requests`, `access_requests`, `messages_unread`, `change_requests` and `feedback_follow_up`, each `{count, items}` and empty until their schema exists | Owner |

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
| `messages.php?action=unread_count` | GET | | `{messages, change_requests, feedback_follow_up}` |
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

Entities: `service`, `project` (portfolio), `faq`, `policy` (keys `privacy`, `terms`), `page` (keys `home`, `about`, `how_it_works`, `company`, `services_intro`, `contact`) and `slide` (home hero slides, D-023; needs `schema_phase28.sql`, otherwise `save_draft` answers 409 "Hero slides are not set up yet"). A slide's fields are `label` (30), `eyebrow` (40), `headline` (90, required), `lead` (220), `hero_media_id` (required, with alt text) and an optional button: `cta_label` (40) and `cta_path` (120, an internal path starting with one `/`; outside links, `//` and `..` are refused). Each item keeps a public `live` copy, an unpublished `draft` and one earlier version (`prev`). Saving a draft never changes the public site. Publishing copies the draft to live and keeps the old live copy; rolling back swaps live and the earlier version, so a second rollback undoes the first. Unpublishing hides the item and keeps its content. An item that was ever published is never deleted (unpublish it), and its slug never changes.

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
| `journal` | `{enabled, items:[{slug, title, excerpt, category, author, published_at}]}`; empty while `journal_enabled` is off |
| `journal_post&slug=S` | `{post:{slug, title, excerpt, body (sanitised), category, author, published_at}}`; 404 while the journal is off |

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

