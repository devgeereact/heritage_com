# Data Model

This file owns the table and schema inventory, codes and references, the current state of measurements and payments, and the approved target record model with its rules. Schema import order and procedure are in [DEPLOYMENT.md](DEPLOYMENT.md#database-and-schema-files). Business rules the records enforce are in [BUSINESS-RULES.md](BUSINESS-RULES.md). Retention and deletion are in [DATA-PRIVACY.md](DATA-PRIVACY.md).

## Table inventory

52 tables from the `CREATE TABLE` statements in `php-api/*.sql` on the Phase 4 branch (Verified 11 October 2026): 35 before Phase 2, six from `schema_phase19.sql` to `schema_phase22.sql`, nine from `schema_phase23.sql` to `schema_phase25.sql`, and two from `schema_phase26.sql`. This is the source inventory, not proof of what the live database contains.

| Schema file | Creates | Also alters |
|---|---|---|
| `schema.sql` | items, users, auth_tokens, audit_log, customers, tailoring_orders, tailoring_events, products, product_variants, enquiries, orders, order_items, stock_adjustments, suppliers, purchase_orders, purchase_order_items, payments, expenses, campaigns, settings | |
| `schema_modules.sql` | orders, order_items, stock_adjustments, suppliers, purchase_orders, purchase_order_items, payments, expenses, campaigns, settings (later-module subset of schema.sql) | |
| `schema_phase2.sql` | | orders (courier, tracking, returns), products |
| `schema_phase3.sql` | whatsapp_messages, whatsapp_templates | |
| `schema_phase4.sql` | | tailoring_orders (fabric_cost, labour_cost, fitting_date) |
| `schema_phase5.sql` | coupons, coupon_redemptions | No longer seeds codes (Phase 4 branch; it used to seed HERIT10 and FREESHIP) |
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
| `schema_phase17.sql` | | orders and tailoring_orders (`public_ref` CHAR(10), backfilled, UNIQUE), enquiries (`company`) |
| `schema_phase18.sql` | | tailoring_orders, tailoring_events, customers, enquiries, settings defaults ([detail](#phase-2-tables-and-columns-schema_phase18-to-22)) |
| `schema_phase19.sql` | measurement_templates, measurement_sets | tailoring_orders (snapshot columns) |
| `schema_phase20.sql` | quotes, quote_items | |
| `schema_phase21.sql` | job_payments | tailoring_orders (`deposit` mirrors `paid_total`) |
| `schema_phase22.sql` | job_handovers | |
| `schema_phase23.sql` | appointments, appointment_events, availability_blocks, booking_lock | settings default; old `fitting_date` values copied into appointments ([detail](#phase-3-tables-and-columns-schema_phase23-to-25)) |
| `schema_phase24.sql` | customer_sessions, customer_access_challenges | settings defaults |
| `schema_phase25.sql` | job_messages, job_change_requests, job_feedback | settings (proposed consent wording) |
| `schema_phase26.sql` | media_assets, cms_items | coupons (switches off the never-used seeded HERIT10 and FREESHIP codes) ([detail](#phase-4-tables-schema_phase26)) |

## Codes and references

Implemented in PR #7 (A06), with client references from PR #9:

- Staff codes stay sequential and readable: retail `ORD-`, tailoring `HC-` and group `HCG-` come from `MAX(id)+1`. `insert_with_code()` in `_lib.php` retries with a fresh code when an insert hits a duplicate key (errno 1062), up to five times. store.php and orders.php share one `ORD-` sequence.
- Customers use a separate random `public_ref`: 10 characters from `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (no 0/O or 1/I/L), generated with `random_int` and UNIQUE on `orders` and `tailoring_orders` (`_lib.php:589-603`). `assign_public_ref()` sets it after insert and skips quietly if `schema_phase17.sql` is not imported yet. Rows that existed before the import get a SQL `RAND()` backfill, which is weaker.
- Clients get a readable `client_ref` such as `CL-00042` and quotes show as `Q-{series}-v{version}` (Phase 2 branch).
- Where references are shown and how lookups work: [API-SPEC.md](API-SPEC.md#customer-lookups-and-references).

## Current state of sensitive records

On the Phase 2 branch (PR #9, Verified from source and the staging end-to-end script):

- Measurements: dated, immutable measurement sets on editable templates with an explicit unit (`cm`, `in`, or `unknown` for imported legacy values). The owner approves each set; customer and tailor entries wait as pending. A job keeps a frozen snapshot of the set it used. The old JSON fields were imported once as `imported_unverified` (A10).
- Payments: an append-only, signed `job_payments` ledger with unique request keys and reversal links; `tailoring_orders.paid_total` and `payment_state` are recalculated from it, and overpayment shows as credit rather than being capped (A05). Retail `payments` stay separate.
- Scheduling: on the Phase 3 branch, `appointments` with type, status, UTC start and end, buffer, hold expiry and history in `appointment_events`; every reservation is decided under the one-row `booking_lock`. `tailoring_orders.fitting_date` stays as a cache of the next confirmed fitting (A08).

Before Phase 2 is imported on the live database, the older shape applies there: one mutable JSON measurement field per customer and job, and a single deposit total updated inside a transaction (PR #6).

## Target record model

Approved direction (Plans 2026, 04): one database, the current endpoints and API client, and only the records real workflows need. Existing tailoring records are extended, not replaced.

| Entity | Purpose and minimum contents | Sensitive fields | Retention | Relationships and invariants |
|---|---|---|---|---|
| Client | ID, readable reference, name, contact, preferences | Phone, email, address | [DATA-PRIVACY.md](DATA-PRIVACY.md) | Many jobs and approved measurement sets; phone is not identity |
| Company | Name, authorised contact, invoice information | Contact details | As client | Linked people and jobs only as needed; no multi-tenant engine |
| Enquiry | Contact, service, brief, desired date, source, status, next follow-up | Contact details | Short expiry for abandoned enquiries (Proposed) | Optional client and converted job links; conversion idempotent |
| Quote version | Work and items, amount and currency, terms, expiry, acceptance evidence | None beyond price | Financial evidence period | Job uses the accepted version; edits make a new version |
| Measurement set version | Garment template, unit, values, source, date, approval | Body measurements | Periodic review of inactive profiles (Proposed) | Job snapshot fixed at approval; pending client edits separate |
| Appointment | Type, start, end, timezone, buffer, status, client or job link | Client link | Unknown | Server reserves one owner resource; no overlap among active reservations |
| Job | Reference, client or company, garment, scope, promised date, stage, next action | Notes, costs | Financial evidence period | Extends `tailoring_orders` |
| Job item or member | Quantity or wearer link, snapshot, progress | Wearer measurements | As measurement set | Only for multi-person jobs; privacy per wearer |
| Payment | Amount, currency, method, date, external reference, receipt, reversal link | Payment references | Statutory period (Unknown) | Append-only ledger, unique request key, verified settlement |
| Message or note | Job or client link, author, public or internal, channel, time, delivery status | Message bodies | Unknown | Only explicit client-visible messages leave the admin boundary |
| Delivery or collection | Method, date, carrier or reference, quantities, evidence | Address | As job | Partial fulfilment explicit; address changes reviewed |
| Feedback and consent | Private comment, rating, publication choice, photo permission | Comments, photos | Unknown | Public review curated separately |
| Portfolio item | Public images, copy, service, slug, status | None (public by consent) | While published | No live projection of private notes; optional internal job link |
| Activity history | Actor, action, target, time, minimal change summary | Minimal | Unknown | Never copy full bodies, tokens or measurements into general logs |

Owner of every entity: the business owner.

## Rules

- Database constraints for unique references and request IDs, foreign keys where practical, transactions for writes that belong together.
- When two screens edit one record, a version or updated-at check returns a conflict and asks the owner to reload, rather than silently overwriting.
- Status transitions are validated centrally on the server and exposed with consistent labels. Today, Jobs and customer tracking never duplicate stage logic ([BR-16](BUSINESS-RULES.md)).
- Timestamps are stored unambiguously and displayed in Africa/Lagos. Money uses consistent decimal or minor-unit rules, never browser floats.
- Migrations: versioned `php-api/schema_*.sql` files imported by hand; `CREATE TABLE IF NOT EXISTS` does not upgrade existing columns. Fixtures for staging come from `scripts/staging/seed.php` ([LOCAL-STAGING.md](LOCAL-STAGING.md)). Backup: [DEPLOYMENT.md](DEPLOYMENT.md#backup-and-recovery).
- Every row-level access rule must trace to a role or business rule ([SECURITY.md](SECURITY.md#permissions)).

## Phase 2 tables and columns (schema_phase18 to 22)

| File | Change |
|---|---|
| `schema_phase18.sql` | `tailoring_orders`: `job_stage` (the legacy `stage` is mapped and still dual-written; `done` becomes `ready` with `stage_review = 1`), `event_date`, `next_action`, `next_action_date`, `quantity`, `description`, `fabric_source`, `enquiry_id`, `quote_id`, `paid_total`, `payment_state`, `handed_over_qty`, `lock_version`. `tailoring_events`: `stage` is widened to 30, and `kind`, `meta` and `public` are added. `customers`: `client_ref` (unique, `CL-00042`), `phone_tail9`, `company_name`, `preferred_contact`, `comm_notes`. `enquiries`: the pipeline statuses (`contacted` kept as an alias), `quantity`, `desired_date`, `next_follow_up`, `closed_reason`, `owner_notes`, `client_id`, `job_id`, `conversion_key` (unique), `converted_at`, `converted_by` and `request_key` (unique). Settings defaults. |
| `schema_phase19.sql` | `measurement_templates`: five proposed templates plus a hidden `legacy` one. `measurement_sets`: immutable values; unit `cm`, `in` or `unknown`; statuses `pending`, `approved`, `superseded`, `rejected` and `imported_unverified`; `request_key` and `legacy_source` unique. Old JSON is imported once with unit `unknown`. Job snapshot columns `measurement_set_id`, `measurement_snapshot`, `measurement_snapshot_at` and `measurement_snapshot_by`. |
| `schema_phase20.sql` | `quotes` (shown as `Q-{series}-v{version}`; unique `(series_id, version)` and `request_key`; `content_hash` frozen on send) and `quote_items`. |
| `schema_phase21.sql` | `job_payments`: append-only and signed, with `request_key` and `reverses_id` unique. Opening entries come from the old deposit. `deposit` mirrors `paid_total` and is not capped. Retail `payments` stay separate. |
| `schema_phase22.sql` | `job_handovers`: collection or delivery with quantity, checklist, `balance_at_handover` and a unique `request_key`. |

## Phase 3 tables and columns (schema_phase23 to 25)

| File | Change |
|---|---|
| `schema_phase23.sql` | `appointments`: type (`consultation`, `fitting`, `collection`), status (`requested`, `confirmed`, `completed`, `cancelled`, `no_show`, `expired`), `starts_at` and `ends_at` in UTC, `all_day`, `buffer_min`, client, job and enquiry links, contact fields, `source` (`owner`, `public`, `portal`, `migration`), `hold_expires_at`, `override_reason`, `notes_internal`, `client_note`, unique `request_key`. `appointment_events`: status and time changes with reason and actor. `availability_blocks`: closed dates and leave. `booking_lock`: one row locked by every reservation. Each job's `fitting_date` becomes an all-day fitting (`migr-fitting-<id>`): `confirmed` when today or later in Lagos, `completed` when earlier, `cancelled` when the job is cancelled; nothing is deleted. All-day appointments never block timed slots. Settings default `public_booking_enabled = 0`. |
| `schema_phase24.sql` | `customer_sessions`: `token_hash` (sha256, unique), client, `created_via` (`legacy`, `code`, `invite`), UTC `expires_at`, `revoked_at`, `last_seen_at`, `ip`. `customer_access_challenges`: `challenge_hash` (sha256 of the challenge or invite), client (NULL for a decoy), channel (`email`, `manual`, `invite`), `code_hash` (HMAC), expiry, `used_at`, `attempts`, status (`pending`, `awaiting_owner`, `used`, `expired`, `locked`). The spec proposed new columns on `customer_tokens`; its raw `token` is the primary key, so a separate table keeps hashed sessions clean, and `customer_tokens` is read only for legacy tokens. `public_ref` already exists from `schema_phase17.sql`. Settings defaults `customer_session_days = 7`, `portal_quote_accept_enabled = 0`, `portal_show_measurements = 0`. |
| `schema_phase25.sql` | `job_messages`: one thread per job; `author_type` (`owner`, `customer`, `system`), `visibility` (`internal` or `client`), `channel`, plain-text `body`, `delivery_status` (`na`, `queued`, `sent`, `failed`, `manual`), read times for owner and client, unique `request_key`. `job_change_requests`: kind (`reschedule`, `address`, `measurement`, `garment`, `other`), JSON `payload`, linked measurement set or appointment, status (`open`, `approved`, `declined`, `withdrawn`), owner response, signed `price_effect`, `date_effect`, decision time, unique `request_key`. `job_feedback`: one per job; optional rating, comment, `contact_ok`, `publish_consent` (`no`, `anonymous`, `first_name`), `photo_consent`, the publication and photo wording shown at the time, `follow_up` (`none`, `open`, `done`; ratings of 2 or less open one), `published_testimonial_id`. Proposed wording for `feedback_publish_wording` and `feedback_photo_wording`. |

## Phase 4 tables (schema_phase26)

| Table | Columns and rules |
|---|---|
| `media_assets` | Website images. `base_name` (32 random hex, unique; files are `<base>-w<width>.webp` and one `.jpg`), `width`, `height`, `variants` JSON (`{"webp":{"800":…,"1600":…},"jpg":{"1600":…}}`), `alt_text` and `caption` (250), `sha256` of the uploaded file (repeat uploads return the existing row), `bytes`, `mime_in`, `uploaded_by`, `deleted_at` (soft delete, refused while used). Only re-encoded variants are stored, in the public uploads folder; the original upload is never kept |
| `cms_items` | One row per service, portfolio project, FAQ, policy or page. `entity`, `slug` (unique per entity; a page or policy uses its fixed key; fixed once `published_at` is set), `status` (`draft`, `published`, `unpublished`), `sort`, JSON `live`, `draft` and `prev` (one earlier live version), `version`, `published_at` (first publication, UTC), `live_updated_at`, `draft_updated_at`, `draft_updated_by`, `created_by`. Portfolio consent (`own_work`, `consent_images`, `consent_client`, `consent_note`) and any `client_id` are kept in the JSON and never projected |

The business profile is not a table: it is the `business_*`, `socials` and `journal_enabled` keys in `settings` ([API-SPEC.md](API-SPEC.md#phase-4-settings-keys)). Nothing is seeded: an empty profile and no content mean the public site hides those sections.

## Home hero slides (schema_phase28)

Branch `feat/redesign-dark-luxury` (D-023). `cms_items.entity` gains `'slide'`; slides use the same `live`, `draft` and `prev` JSON and the same `sort` order as other CMS items. No new table and no seeded rows. Fields and limits: [API-SPEC.md](API-SPEC.md#cmsphp-staff).

## Phase 5 tables and columns (schema_phase27)

Branch `feat/phase5-company-orders`. Additive and re-runnable (`IF NOT EXISTS` throughout); existing jobs keep `job_kind = 'individual'` and are unchanged. Numbered 27 because the Phase 4 `schema_phase27` was not needed ([DECISIONS.md](DECISIONS.md) D-022). A company order is one `tailoring_orders` row with `job_kind = 'company'`; groups (`tailoring_groups`) stay "coordinated, separate payers" and are not the company parent.

| Table or column | Columns and rules |
|---|---|
| `companies` | `name`, `company_ref`, invoice details (`invoice_name`, `invoice_address`, `invoice_email`, `tax_id`), `notes_internal` (staff only, never in a portal answer), soft delete `deleted_at` |
| `company_contacts` | A `customers` row acting for a company: `role_title`, `can_view_jobs` (default 1), `can_approve_samples` (0), `is_invoice_recipient` (0), `active` (1). Unique per company and customer. An inactive contact can do nothing from the next request |
| `tailoring_orders` (added) | `job_kind` (`individual` or `company`), `company_id`, `po_number`, `invoice_contact_id`, `measurement_method` (`individual`, `sizes`, `mixed`), `sample_status` (`not_required`, `pending`, `submitted`, `approved`, `changes_requested`). For a company job `customer_id` is the primary contact and `quantity` is kept equal to the active items' total |
| `job_items` | Lines of a company job: `description`, `garment_type`, `service_key`, `qty`, `size_label`, the wearer (`wearer_customer_id`, staff-only `wearer_label`), `measurement_set_id` (an approved set of that wearer), `wearer_consent_at` (UTC), `item_stage` (`pending`, `in_production`, `ready`, `handed_over`, `cancelled`), `qty_ready`, `qty_handed_over`, `request_key`, `lock_version` |
| `job_samples` | Sample versions per job (`version` unique per job), `status` (`submitted`, `approved`, `changes_requested`, `withdrawn`), the recorded decision (`decided_channel`: `portal`, `in_person`, `whatsapp`, `email`, `phone`; contact or staff user; note; `decided_at` UTC), `request_key` |
| `job_handover_items` | Which items, and how many of each, went out in a `job_handovers` row |
| `quotes` (added) | `bill_to_company_id`, `po_number`, `bill_to_snapshot` (JSON `{name, invoice_name, address, email, tax_id, po_number, recipient}`, frozen when the quote is sent) |

Privacy (BR-28): wearers are ordinary `customers` rows with their own measurement sets; a company contact never sees a wearer or a measurement, and a wearer sees only their own garment. Both portal views are allowlists in `php-api/_company.php`, tested by key set.
