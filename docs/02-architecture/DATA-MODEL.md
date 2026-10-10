# Data Model

This file owns the table and schema inventory, codes and references, the current state of measurements and payments, and the approved target record model with its rules. Schema import order and procedure are in [DEPLOYMENT.md](../07-operations/DEPLOYMENT.md#database-and-schema-files). Business rules the records enforce are in [BUSINESS-RULES.md](../01-product/BUSINESS-RULES.md). Retention and deletion are in [DATA-PRIVACY.md](../05-security/DATA-PRIVACY.md).

## Table inventory

35 tables from the `CREATE TABLE` statements in `php-api/*.sql` (Verified 10 October 2026). This is the source inventory, not proof of what the live database contains. There is no appointments table.

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
| `schema_phase17.sql` | | orders and tailoring_orders (`public_ref` CHAR(10), backfilled, UNIQUE), enquiries (`company`) |

## Codes and references

Implemented on `feat/phase1b-staging` (A06):

- Staff codes stay sequential and readable: retail `ORD-`, tailoring `HC-` and group `HCG-` come from `MAX(id)+1`. `insert_with_code()` in `_lib.php` retries with a fresh code when an insert hits a duplicate key (errno 1062), up to five times. store.php and orders.php share one `ORD-` sequence.
- Customers use a separate random `public_ref`: 10 characters from `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (no 0/O or 1/I/L), generated with `random_int` and UNIQUE on `orders` and `tailoring_orders` (`_lib.php:589-603`). `assign_public_ref()` sets it after insert and skips quietly if `schema_phase17.sql` is not imported yet. Rows that existed before the import get a SQL `RAND()` backfill, which is weaker.
- Where references are shown and how lookups work: [API-SPEC.md](API-SPEC.md#customer-lookups-and-references).

## Current state of sensitive records

- Measurements: one mutable JSON field per customer and per job, with no history; the job copy syncs to the customer only when `sync_customer` is set (A10).
- Deposits: a single total on `tailoring_orders`. On this branch the read, add, cap and write happen inside a transaction with `SELECT ... FOR UPDATE` (`tailoring.php:236-238`, A05); the cap and the missing ledger remain until Phase 2.
- Scheduling: only `tailoring_orders.fitting_date DATE` (`schema_phase4.sql:12`), no time or duration (A08).

## Target record model

Approved direction (Plans 2026, 04): one database, the current endpoints and API client, and only the records real workflows need. Existing tailoring records are extended, not replaced.

| Entity | Purpose and minimum contents | Sensitive fields | Retention | Relationships and invariants |
|---|---|---|---|---|
| Client | ID, readable reference, name, contact, preferences | Phone, email, address | [DATA-PRIVACY.md](../05-security/DATA-PRIVACY.md) | Many jobs and approved measurement sets; phone is not identity |
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
- Status transitions are validated centrally on the server and exposed with consistent labels. Today, Jobs and customer tracking never duplicate stage logic ([BR-16](../01-product/BUSINESS-RULES.md)).
- Timestamps are stored unambiguously and displayed in Africa/Lagos. Money uses consistent decimal or minor-unit rules, never browser floats.
- Migrations: versioned `php-api/schema_*.sql` files imported by hand; `CREATE TABLE IF NOT EXISTS` does not upgrade existing columns. Fixtures for staging come from `scripts/staging/seed.php` ([LOCAL-STAGING.md](../07-operations/LOCAL-STAGING.md)). Backup: [BACKUP-RECOVERY.md](../07-operations/BACKUP-RECOVERY.md).
- Every row-level access rule must trace to a role or business rule ([PERMISSIONS.md](../05-security/PERMISSIONS.md)).

## Phase 2 tables and columns (schema_phase18 to 22)

| File | Change |
|---|---|
| `schema_phase18.sql` | `tailoring_orders`: `job_stage` (the legacy `stage` is mapped and still dual-written; `done` becomes `ready` with `stage_review = 1`), `event_date`, `next_action`, `next_action_date`, `quantity`, `description`, `fabric_source`, `enquiry_id`, `quote_id`, `paid_total`, `payment_state`, `handed_over_qty`, `lock_version`. `tailoring_events`: `stage` is widened to 30, and `kind`, `meta` and `public` are added. `customers`: `client_ref` (unique, `CL-00042`), `phone_tail9`, `company_name`, `preferred_contact`, `comm_notes`. `enquiries`: the pipeline statuses (`contacted` kept as an alias), `quantity`, `desired_date`, `next_follow_up`, `closed_reason`, `owner_notes`, `client_id`, `job_id`, `conversion_key` (unique), `converted_at`, `converted_by` and `request_key` (unique). Settings defaults. |
| `schema_phase19.sql` | `measurement_templates`: five proposed templates plus a hidden `legacy` one. `measurement_sets`: immutable values; unit `cm`, `in` or `unknown`; statuses `pending`, `approved`, `superseded`, `rejected` and `imported_unverified`; `request_key` and `legacy_source` unique. Old JSON is imported once with unit `unknown`. Job snapshot columns `measurement_set_id`, `measurement_snapshot`, `measurement_snapshot_at` and `measurement_snapshot_by`. |
| `schema_phase20.sql` | `quotes` (shown as `Q-{series}-v{version}`; unique `(series_id, version)` and `request_key`; `content_hash` frozen on send) and `quote_items`. |
| `schema_phase21.sql` | `job_payments`: append-only and signed, with `request_key` and `reverses_id` unique. Opening entries come from the old deposit. `deposit` mirrors `paid_total` and is not capped. Retail `payments` stay separate. |
| `schema_phase22.sql` | `job_handovers`: collection or delivery with quantity, checklist, `balance_at_handover` and a unique `request_key`. |
