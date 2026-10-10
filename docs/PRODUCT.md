# Product

HeritOS is a daily assistant for one person running a men's fashion and tailoring business in Lagos. It puts enquiries, appointments, clients, measurements, jobs, payments and delivery first, and it drives a website that explains the real services and shows real finished work. This file owns the business scope, owner decisions, journeys and feature priorities. Technical facts live in [ARCHITECTURE.md](ARCHITECTURE.md); look and feel in [DESIGN.md](DESIGN.md); order of work in [ROADMAP.md](ROADMAP.md).

## How confident each statement is

| Label | Meaning |
|---|---|
| Verified | Checked in the repository; file and line cited |
| Owner-confirmed | Stated by the owner, with the date |
| Proposed | Approved as direction, but the exact detail still needs the owner or a test |
| Unknown | Needs the owner, the live server or a test before anyone relies on it |

The owner approved the Plans 2026 package on 10 October 2026. Approval turned its recommendations into the agreed direction. Where a recommendation still depends on a business fact the owner has not given (hours, prices, capacity), it stays Proposed until that fact arrives.

## Confirmed business

- Herit Clothing, Lagos, men's fashion and sewing, run by one self-employed operator. Owner-confirmed 10 October 2026.
- Customers are individuals, or company contacts commissioning garments for several people.
- Operating timezone: Africa/Lagos. Owner-confirmed 10 October 2026.
- Not confirmed: exact garment range, business address, safe appointment location, delivery coverage, appointment hours, weekly capacity and company production capacity. Existing website copy is not proof of any of these.

## Owner decisions

| Date | Decision |
|---|---|
| 10 Oct 2026 | Scope is men's fashion and tailoring only. |
| 10 Oct 2026 | Design: Tesla-style structure (restraint, photography, spacing, type scale, motion) with Herit amber `#F59E0B` as the single accent. Amber buttons carry dark text; amber text uses `#B45309`; Tesla blue is not used. Inter for UI, Source Serif 4 for public headings. Detail in [DESIGN.md](DESIGN.md). |
| 10 Oct 2026 | The four named staff, the statistics (1200+ pieces, 18 countries, 98%), the four named testimonials, the free Lagos delivery offer and the HERIT10 offer are not real and will be removed. Any future offer is a deliberate owner decision, enforced in code before it is advertised. |
| 10 Oct 2026 | The "Tack Stitch" dashed-amber edge and warm-shadow rule is retired. It was never implemented (finding A23). |
| 10 Oct 2026 | Plans 2026 approved as a whole, including the points below. |
| 10 Oct 2026 | Men's tailoring and fashion lead the website. Shop stays secondary and only if there is verified ready-to-wear stock. |
| 10 Oct 2026 | Core navigation: Today, Enquiries, Appointments, Clients, Jobs, Payments, Website. Settings sits separately. |
| 10 Oct 2026 | Keep the current React, Bootstrap, PHP and MySQL architecture. No framework migration, microservices, TypeScript or Laravel conversion, and no full accounting system. |
| 10 Oct 2026 | Customers use a reference to find their job, then verify control of their contact channel before private access or changes. A reference alone never unlocks measurements. |
| 10 Oct 2026 | Safety and record integrity come before public bookings and promotion. A limited pilot comes before more order volume. |
| 10 Oct 2026 | Social profile material is drafted only. Publishing, account creation, migrations, deployment, merges and deletion each need a later authorised task. |
| 10 Oct 2026 | Accepted decisions move into this flat set of docs; the temporary plan folder is removed only with explicit deletion approval. |

## Product boundary

One owner, one business. No multi-tenant platform, marketplace, factory planning engine, payroll, CRM scoring or custom social network.

Keep existing public URLs where practical. Navigation labels can improve before routes are renamed; any later rename needs redirects and checks of saved links, emails and customer references.

## Services to confirm

Core advertised service: men's fashion and tailoring (Owner-confirmed). Everything else below is a candidate the owner must approve one by one before it appears anywhere public.

| Candidate | Status |
|---|---|
| Shirts, trousers, coordinated two-piece sets, traditional occasion wear | Proposed |
| Alterations and repairs | Proposed |
| Group or event outfits | Proposed |
| Business or team garments (company orders) | Proposed, within confirmed capacity only |
| Ready-to-wear shop | Optional, only with verified stock |

Do not assume suits, embroidery, printing, corporate uniforms, women's wear, worldwide shipping or same-day work. No automatic bulk discounts or minimum order quantities until the owner confirms them.

## Daily navigation

| Area | First screen | Primary action |
|---|---|---|
| Today | Appointments today, overdue jobs, next deliveries, unread enquiries and messages, outstanding balances | Add enquiry or job |
| Enquiries | New, awaiting reply, quote sent, accepted, closed | Reply or prepare quote |
| Appointments | Today and week list, availability and blocked time | Book appointment |
| Clients | Search by name, phone, client ID or company | Add client |
| Jobs | Active jobs, due date, next action and progress | Add job |
| Payments | Due balances, received payments, receipts | Record payment |
| Website | Services, portfolio, reviews, business details, optional Journal | Preview or publish |

On a phone, show Today, Jobs, Appointments and More. Clients, Enquiries, Payments and Website sit under More. The daily page answers "What do I need to do next?" without revenue charts or setup prompts.

## Journeys

### Enquiry to delivery

1. The visitor chooses a service or sends a company brief: name, contact channel, garment or service, desired date and short brief. Quantity and company fields appear when relevant.
2. Save the enquiry and show an acknowledgement and reference. Never claim an appointment, price or deadline is confirmed at this point.
3. The owner reviews capacity, asks questions, links or creates a client, and sends a versioned quote.
4. The client accepts the exact quote scope and terms. Record acceptance time and channel. Any quote edit needs a new version and a new acceptance.
5. The owner books a measurement or consultation, or approves a public slot request, and captures measurements and fit preferences.
6. Record the deposit if the approved terms require one. Confirm the job and the agreed delivery date.
7. Progress through production, fitting, quality check and ready. Internal tasks stay separate from public progress.
8. Collect the balance under the agreed terms; record pickup or dispatch and the delivery or collection evidence.
9. Invite private feedback, ask separately for permission to publish a review or photo, and offer an easy repeat enquiry.

Acceptance: a synthetic enquiry becomes one client and one linked job without retyping contact data, and its history survives refresh and session changes.

### Clients and measurements

Each client has a stable internal ID and a readable client reference. Phone number is never the permanent primary key. Store preferred contact, a minimal address when needed, notes, communication preference and linked history. Duplicate phone or email warnings help the owner pick an existing record; never silently merge people who share a household or company phone.

A measurement set records garment template, date taken, unit (cm or inches), source (owner or customer), fit preference, status (pending, approved, superseded) and who approved it. Keep only garment-relevant values. Avoid weight, date of birth, identity documents and health history unless a specific service needs them.

Each job takes an immutable snapshot of the approved set used for cutting. Later client changes never alter that job. Customer submissions are proposed updates until the owner reviews them. Show "Measurements taken 12 May, please recheck fit before repeat work" rather than treating old values as valid for ever.

Owner flow: Clients > client > Measurements > choose garment > enter values > review unit and summary > save. Provide a printable measurement sheet and a short measuring guide. Phone inputs use numeric keyboards, allow decimals and keep the unit visible. Missing values stay missing, never zero. Flag implausible entries for review rather than enforcing universal body limits.

Proposed starting templates. The owner approves field names, measuring method and garment list before build.

| Garment | Fields |
|---|---|
| Shirt | Neck, chest, waist, shoulder, sleeve length, cuff or wrist, shirt length |
| Trousers | Waist, seat or hip, thigh, knee, bottom or ankle opening, outside leg, inside leg |
| Jacket or two-piece top | Chest, waist, seat, shoulder, sleeve length, back length, front length |
| Native top (for example kaftan or senator) | Neck, chest, shoulder, sleeve length, top length, cuff |
| Long gown style (for example agbada) | Shoulder width, full length, chest, neck |

Today the schema stores one free JSON field per customer and per job (Verified, finding A10), so templates add structure without losing anything. Old values migrate as an "imported, unverified" measurement set.

Acceptance: change a client's approved profile and confirm an earlier job keeps its original values; mix cm and inches and verify explicit conversion; a duplicate save creates no duplicate version; an unauthorised client cannot read another person's data.

### Appointments and availability

Baseline (Verified 10 October 2026): no appointments table or endpoint exists. The admin calendar is a Larkon demo held in browser memory (A08). The only related field is `tailoring_orders.fitting_date`, a date with no time. Appointments are new work; existing fitting dates migrate in as all-day records.

- One calendar for the owner. Types: consultation or measurement, fitting, collection.
- Duration, working hours and buffer are owner settings. Proposed initial durations: 30, 45 and 60 minutes, to confirm before release.
- Store unambiguous timestamps; display in Africa/Lagos; show the timezone clearly to remote users.
- The owner defines weekly availability, breaks, closed dates, leave, minimum notice and booking horizon.
- Public visitors see free slots only, never names or other appointment details. Start with "Request this appointment"; the owner confirms capacity. Immediate confirmation, if approved later, needs atomic reservations and expiry for temporary holds.
- Pending requests reserve capacity until accepted, declined or expired under a clear rule. Before inserting or rescheduling, the server checks overlap (including buffers and blocked time) inside a transaction, using a simple single-owner lock rather than scheduling infrastructure. Only active statuses block a slot.
- States: requested, confirmed, completed, cancelled, no-show, expired. Rescheduling keeps history and swaps slots atomically. The owner may override with a warning and a reason, never a silent double booking.
- Reminders are optional and record queued, sent, failed or manual separately. A calendar download may come later; no two-way Google sync.

Acceptance: two devices request the same slot and only one active reservation succeeds; cancelling frees the slot; refresh keeps the appointment; out-of-hours requests fail; a failed reminder does not cancel a valid booking.

### Jobs and company orders

One Jobs area covers individual bespoke work and coordinated or company work. Retail orders stay in their own storage at first, with a unified owner view or links if useful. Do not merge both tables into a universal engine before the simple workflows are proven.

A job holds client or company contact, garment description, quantity, fabric ownership, supplied material notes, reference images, approved quote, agreed dates, measurement snapshot, next action, costs, payments and timeline. Keep three dates apart: the customer's event date, the promised completion date and the internal next-action date.

Proposed stages: enquiry or quote, confirmed, measurements approved, cutting and sewing, fitting or adjustment, quality check, ready, collected or delivered, cancelled. Map them to existing database values through a controlled migration. Payment state is separate: unpaid, part paid, paid, refunded. A paid job is not necessarily delivered.

Company orders add company name, authorised contact, invoicing details, purchase-order reference if supplied, garment list and quantity, sample approval, size or individual measurement method, agreed delivery batches and invoice recipient. Collect each wearer's measurements only when required. A company organiser never sees every wearer's body measurements by default. Use one parent job with a simple member or item list where garments differ. Partial completion shows quantities ready and delivered and the remaining balance.

Acceptance: a five-person coordinated job keeps each person's private measurement link, supports one approved sample and a partial handover, and its company contact sees only agreed job-level information.

### Quotes, payments and receipts

A quote holds work description, quantity, fabric responsibility, price, deposit amount or rate, due dates, delivery charge, fitting allowance, changes and exclusions, and expiry. A 50% deposit appears in source comments; keep it only after explicit owner approval, and never assume one rate fits every job.

Each payment is its own entry: date, amount, currency, method, external reference, job and recorded-by. Confirm bank transfers before marking them received; a screenshot is evidence to review, not proof of settlement. Correct mistakes with reversal or adjustment entries, never silent edits to totals. Reject accidental duplicate submissions with an idempotency key.

Start with manually verified bank transfer and cash in one ledger. One hosted gateway may be added if useful; three providers are not a launch requirement. Never collect card details directly. Tax treatment, receipt particulars and record retention still need confirming.

Acceptance: deposits and balances sum correctly; a retried payment does not count twice; two simultaneous payments both survive; overpayment shows as credit or refund due rather than being silently capped; printed documents match the ledger.

### Delivery, collection and aftercare

Record collection or delivery, agreed address, date and time, dispatch date, courier or contact, optional verified tracking URL and status. Support partial handover for company jobs. Record proof or owner confirmation and any outstanding balance. Manual courier updates are enough at first; carrier APIs are deferred.

A final checklist covers garment count, measurements and fit, finishing, packaging, accessories and client instructions. Alterations and rework link back to the original job with reason and responsibility. A final garment photo may be kept privately; publishing it needs separate consent.

Acceptance: a delivered job shows when and how it was handed over and whether anything remains; promised dates and delays stay visible in history; customers see a clear status without private owner notes.

### Customer access

A reference is a locator, not a password. Today's portal does the opposite (Verified, A03, A06, A09): phone plus a sequential `ORD-` code issues a 30-day token, with no throttle, error messages that reveal whether a phone has an account, and no route at all for tailoring clients. The approved design replaces it:

1. Screen one: reference plus registered contact.
2. Screen two: a short-lived, single-use link or code sent through a verified channel. With no delivery provider configured, the owner approves an access invitation manually through an established contact rather than weakening authentication.

Unauthenticated lookup returns nothing sensitive and uses one generic response. The private area shows only that customer's jobs, agreed dates, quotes, payment summaries, approved public progress, message thread, appointment requests and proposed profile changes. Measurements are restricted further by ownership. Identity documents and internal cost or profit notes never appear.

Customers can send a message, ask to reschedule, request an address correction, propose measurements and give feedback. After cutting starts, important garment or measurement changes need owner approval with a visible effect on price or date. A customer can never mark a job paid, change its production state, delete history or approve a changed quote by accident.

Provide expiry, logout and revocation, and recovery through verified contact. No mandatory customer password at first. A company contact may see its authorised parent jobs, never individual wearer profiles.

Acceptance: guessed references, wrong contact, expired links and swapped identifiers reveal nothing; duplicate messages do not create duplicate submissions; every approved change is dated.

### Communication and feedback

A simple job-linked conversation thread with unread badges and clearly marked internal notes. WhatsApp and email buttons open the existing tools, and the owner saves a short summary to the job. Never promise automatic sync of personal WhatsApp or all external messages; if an integration is used, document which directions and message types it captures.

Templates: enquiry acknowledgement, quote ready, appointment confirmation, fitting reminder, delay update, ready for collection, balance reminder, feedback request. All need an owner check before bulk or promotional sending. Service messages and marketing opt-in are kept apart.

Feedback: optional rating, comment, permission to contact about a problem, a separate public-publication choice and optional photo consent. Negative feedback stays private and can become a follow-up task. Never auto-publish names or photos, and never fall back to a fabricated positive review.

## Feature priorities

| Priority | Features |
|---|---|
| Launch core | Today dashboard; enquiry capture and follow-up; client ID and search; dated measurements and job snapshots; persistent appointments and availability; individual jobs; quotes and acceptance; deposits, balances and receipts; due-date reminders; linked messages; manual delivery and collection tracking; private feedback; safe client access; services and portfolio CMS; basic export; tested backup and restore; owner recovery |
| Next after pilot | Company or coordinated job list; sample approval; partial handover; alteration and rework record; client merge with reviewed provenance; garment care notes; material consumption and cost notes; repeat-client enquiry; appointment calendar download; saved response templates; small overdue and payment report |
| Optional only if used | Real ready-to-wear catalogue and checkout; monthly Journal; basic supplier contacts; one hosted gateway; owner-approved WhatsApp reminders; limited CSV import with preview |
| Defer | Eight-role operations; POS offline sync; multiple warehouses; carrier APIs; automated promotions; loyalty, referrals and gift cards; extensive AI tools; advanced segmentation; recurring subscriptions; two-way calendar sync; live chat infrastructure; SMS or WhatsApp campaign builder; machine scheduling; 3D previews; multilingual expansion without demand |

A new feature should solve a repeated owner or client problem, reuse an existing record and have a clear failure state. A useful manual step beats an unreliable integration.

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
| Shop, Product, Cart, Checkout, Gifting | Public retail flow | Optional. Hide unsupported promises rather than pretend stock or gifting exists. |
| Track and Account | Retail-reference status and customer screens | Extend to tailoring with stronger private access. |
| Blog and BlogPost | CMS publication plus baked-in fallback | Small Journal only if sustainable; sanitise; no fabricated fallback articles. |
| Kit demo routes (forms, charts, icons, maps, widgets, base UI) | Large catalogue in src/routes/index.jsx | Developer reference only; remove from runtime after import checks. |
| Coming soon, maintenance, 404, reset, sign-up, lock | Template utility screens | Keep genuine error and maintenance flows; verify recovery endpoints before showing usable controls. |

## Superseded decisions from the old plans

The 2025 plans (features.md, nav-map.md, brief.json, seo-analytics.md and two HeritOS.html files, deleted on 10 October 2026 and kept only in Git history) described an omnichannel retail platform: eight roles, multicurrency, offline POS, international gateways, coupons and Laravel/TypeScript. The approved direction reverses their priorities, putting measurements and fittings first. Specifically retired:

- Omnichannel inventory, multicurrency, Laravel and offline POS from brief.json.
- Coupons and international gateways as launch priorities from features.md.
- "14 modules, 182 features" as a completeness measure. Repository source is evidence of what was built, not a launch certificate.
- The 14-day returns rule from the old checklist. It is not a confirmed policy for Nigerian bespoke work.
- The assumption that cookieless analytics needs no consent, and that URLs are greenfield. Both are evaluated afresh (see [CONTENT-AND-SOCIAL.md](CONTENT-AND-SOCIAL.md)).

Kept from the old brief: amber `#F59E0B` and Source Serif 4 with Inter as the established brand, British and Nigerian spelling, Naira first.

## Remaining owner decisions

Confirm: exact men's garment range; public business address and safe appointment location; hours, durations and buffers; realistic weekly job capacity; fabric supply options; fitting and change allowance; quote expiry and deposit policy; pickup and delivery area and charges; payment methods; company quantity and sample terms; real imagery and review permissions; a sustainable Journal and Community cadence; whether any retail stays; tax treatment and record retention.

Already settled and not to be asked again: brand, name, location, men's-only scope, amber accent, removal of invented website claims.
