# Product Specification

This file owns the product promise, scope and feature priorities, the services awaiting confirmation, what happens to each existing area, and the owner decisions still open. Business context is in [PROJECT-CONTEXT.md](../00-foundation/PROJECT-CONTEXT.md); dated owner decisions are in [DECISIONS.md](../08-change-management/DECISIONS.md); order of work is in [ROADMAP.md](../08-change-management/ROADMAP.md).

## Product promise

HeritOS lets the owner of a one-person men's tailoring business in Lagos take an enquiry through measurements, quote, payment, production and handover without retyping data or losing history, and lets clients find, follow and act on their own job safely. The website explains the real services, shows real finished work and leads to one working enquiry or booking path. Owner-confirmed direction, 10 October 2026 (D-001, D-005).

## First-release proof

- **User outcome to prove:** the owner completes a synthetic job from enquiry to handover with consistent records and recovery from errors (Phase 2 evidence), then a limited real pilot with a few consenting customers (Phase 6). Proposed.
- **Evidence that counts:** the launch verification matrix in [LAUNCH-CHECKLIST.md](../09-release/LAUNCH-CHECKLIST.md) and the owner usability review in [qa/UX-AUDIT.md](../../qa/UX-AUDIT.md). A passing `npm run build` never counts.
- **Failure threshold:** any unresolved P0 finding, or any core gate in [RELEASE-REPORT.md](../09-release/RELEASE-REPORT.md) without evidence, means NO-GO.

## Scope

| Priority | Features |
|---|---|
| Launch core (must have) | Today dashboard; enquiry capture and follow-up; client ID and search; dated measurements and job snapshots; persistent appointments and availability; individual jobs; quotes and acceptance; deposits, balances and receipts; due-date reminders; linked messages; manual delivery and collection tracking; private feedback; safe client access; services and portfolio CMS; basic export; tested backup and restore; owner recovery |
| Next after pilot (should have) | Company or coordinated job list; sample approval; partial handover; alteration and rework record; client merge with reviewed provenance; garment care notes; material consumption and cost notes; repeat-client enquiry; appointment calendar download; saved response templates; small overdue and payment report |
| Optional only if used | Real ready-to-wear catalogue and checkout; monthly Journal; basic supplier contacts; one hosted gateway; owner-approved WhatsApp reminders; limited CSV import with preview |
| Defer (will not build now) | Eight-role operations; POS offline sync; multiple warehouses; carrier APIs; automated promotions; loyalty, referrals and gift cards; extensive AI tools; advanced segmentation; recurring subscriptions; two-way calendar sync; live chat infrastructure; SMS or WhatsApp campaign builder; machine scheduling; 3D previews; multilingual expansion without demand |

A new feature should solve a repeated owner or client problem, reuse an existing record and have a clear failure state. A useful manual step beats an unreliable integration.

## Functional requirements

Each requirement points to the journey that defines its steps and acceptance. Status reflects [ROADMAP.md](../08-change-management/ROADMAP.md).

| ID | User outcome | Acceptance evidence | Priority | Status |
|---|---|---|---|---|
| FR-01 | Enquiry becomes one client and one linked job | [USER-JOURNEYS.md J-01](USER-JOURNEYS.md#j-01-enquiry-to-delivery) | Must | Not started (Phase 2) |
| FR-02 | Dated, unit-aware measurements with immutable job snapshots | [J-02](USER-JOURNEYS.md#j-02-clients-and-measurements) | Must | Not started (Phase 2) |
| FR-03 | Conflict-safe appointments and availability | [J-03](USER-JOURNEYS.md#j-03-appointments-and-availability) | Must | Not started (Phase 3) |
| FR-04 | Individual jobs with stages and next action | [J-04](USER-JOURNEYS.md#j-04-jobs-and-company-orders) | Must | Partly exists in `tailoring.php`; target not started |
| FR-05 | Company or coordinated jobs with wearer privacy | [J-04](USER-JOURNEYS.md#j-04-jobs-and-company-orders) | Should | Not started (Phase 5) |
| FR-06 | Versioned quotes, append-only payment ledger, receipts | [J-05](USER-JOURNEYS.md#j-05-quotes-payments-and-receipts) | Must | Deposit write locked in a transaction (A05); ledger not started |
| FR-07 | Delivery and collection record, aftercare | [J-06](USER-JOURNEYS.md#j-06-delivery-collection-and-aftercare) | Must | Not started |
| FR-08 | Safe customer access over tailoring and retail jobs | [J-07](USER-JOURNEYS.md#j-07-customer-access) | Must | Throttle, generic errors and public reference done (A03, A06); verification not started |
| FR-09 | Job-linked messages and private feedback | [J-08](USER-JOURNEYS.md#j-08-communication-and-feedback) | Must | Not started |
| FR-10 | Truthful website with services and portfolio CMS | [CONTENT.md](CONTENT.md) | Must | Not started (Phase 4) |

## Non-functional requirements

Each has one home: security in [SECURITY.md](../05-security/SECURITY.md), privacy in [DATA-PRIVACY.md](../05-security/DATA-PRIVACY.md), accessibility in [ACCESSIBILITY.md](../03-design/ACCESSIBILITY.md), performance targets in [CONTENT.md](CONTENT.md#seo-and-performance), offline behaviour in [OFFLINE-SPEC.md](../04-pwa/OFFLINE-SPEC.md), backup and recovery in [BACKUP-RECOVERY.md](../07-operations/BACKUP-RECOVERY.md). Supported devices: practical phone, tablet and laptop coverage, tested at the widths in [ACCESSIBILITY.md](../03-design/ACCESSIBILITY.md); not an untested promise of every device.

## Services to confirm

Core advertised service: men's fashion and tailoring (Owner-confirmed 10 October 2026). Everything else is a candidate the owner approves one by one before it appears anywhere public.

| Candidate | Status |
|---|---|
| Shirts, trousers, coordinated two-piece sets, traditional occasion wear | Proposed |
| Alterations and repairs | Proposed |
| Group or event outfits | Proposed |
| Business or team garments (company orders) | Proposed, within confirmed capacity only |
| Ready-to-wear shop | Optional, only with verified stock |

Do not assume suits, embroidery, printing, corporate uniforms, women's wear, worldwide shipping or same-day work. No automatic bulk discounts or minimum order quantities until the owner confirms them.

## What happens to each existing area

| Area | What exists in source | Decision |
|---|---|---|
| Staff auth, profile, permissions, team | PHP tokens and server role gates; frontend path policy | Keep owner login and recovery. Hide staff management in solo mode; keep backend controls. Verify last-owner protection. |
| Dashboard, analytics, weather | Dedicated pages and endpoints | Replace the default view with due work, unread messages and appointments. Keep a small report page. Hide weather and complex charts. |
| Tailoring, detail, groups | Jobs, stages, snapshots, fitting date, deposits, event history | Core. Becomes Jobs; groups become company or coordinated jobs when genuinely needed. |
| CRM and kit customer pages | Real customers.php plus kit surfaces | One Clients area; no duplicate customer pages. Link person, company and jobs. |
| Enquiries | Website form, PHP inbox, status updates | Core. Add follow-up, quote and conversion links. |
| Calendar, chat, email, todo kit | Template components beside real Inbox and WhatsApp | Calendar needs persistence. Kit chat and todo are not working client infrastructure. |
| Inbox, mail, WhatsApp | IMAP/SMTP and manual or Cloud API messaging | Keep simple contact actions and a linked communication log. Delivered, failed and manual are distinct states. |
| Catalogue, products, variants, attributes, category | Real catalogue plus kit products pages | Optional ready-to-wear. Real catalogue is canonical; retire demo duplicates after dependency checks. |
| Retail orders and POS | orders.php, store.php; manual, market and web channels | Secondary navigation if used. Never force a tailoring job through a shopping cart. |
| Stock, warehouse, received orders | Real stock endpoint plus template screens | Simple fabric and material tracking later. No multi-warehouse for one operator. |
| Suppliers and purchases | Supplier and PO source | Supplier contacts and job material costs later; procurement suite deferred. |
| Finance, invoices, payments | Real payment and expense endpoint plus kit invoices | One payment ledger; printable quote, invoice and receipt. No full accounting or payroll. |
| Reviews, engage, referrals, loyalty | Moderation, NPS, loyalty, gift and referral source | Feedback is core; promotions, points, gift cards and re-engagement deferred. |
| Marketing, studio, AI, image AI | Campaign and AI proxy endpoints | Optional content drafts. Never send private measurements or client records to AI by default. No launch dependency. |
| CMS content, Journal, testimonials | content.php; published store.php feeds | Keep the shared CMS. Add services, portfolio and business settings before more blog work. |
| Channels and settings | Store and social config | One Business settings page with only necessary controls. |
| Home, About, Contact | Public brand and enquiry pages | Service-led men's tailoring site; truthful owner story; clear consultation path. |
| Shop, Product, Cart, Checkout, Gifting | Public retail flow | Optional. Hide unsupported promises rather than pretend stock or gifting exists. Hidden from public navigation behind `shop_enabled` (D-014). |
| Track and Account | Retail-reference status and customer screens | Extend to tailoring with stronger private access. |
| Blog and BlogPost | CMS publication plus baked-in fallback | Small Journal only if sustainable; sanitise; no fabricated fallback articles. |
| Kit demo routes (forms, charts, icons, maps, widgets, base UI) | Removed on 10 October 2026 (A18) | Done; see [ARCHITECTURE.md](../02-architecture/ARCHITECTURE.md#route-inventory). |
| Coming soon, maintenance, 404, reset, sign-up, lock | Template utility screens | Keep genuine error and maintenance flows; verify recovery endpoints before showing usable controls. |

## Remaining owner decisions

Confirm: exact men's garment range; public business address and safe appointment location; hours, durations and buffers; realistic weekly job capacity; fabric supply options; fitting and change allowance; quote expiry and deposit policy; pickup and delivery area and charges; payment methods; company quantity and sample terms; real imagery and review permissions; a sustainable Journal and Community cadence; whether any retail stays; tax treatment and record retention; measurement template field names and measuring method.

Until confirmed, unknown business facts become editable settings and the website hides empty sections; nothing is invented (D-013). Already settled and not to be asked again: brand, name, location, men's-only scope, amber accent, removal of invented website claims.
