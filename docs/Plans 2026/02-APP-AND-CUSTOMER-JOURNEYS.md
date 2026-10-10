# App and customer journeys

## Product boundary

One owner, one business, men's tailoring in Lagos (owner-confirmed 10 October 2026). Customers may be individuals or company contacts commissioning garments for several people. No multi-tenant platform, marketplace, factory planning engine, payroll, CRM scoring or custom social network.

Keep existing public URLs where practical. Navigation labels can improve before routes are renamed. Any later rename needs redirects and checks of saved links, emails and customer references.

## Daily navigation

| Area | First screen | Primary action |
|---|---|---|
| Today | Appointments today, overdue jobs, next deliveries, unread enquiries/messages, outstanding balances | Add enquiry or job |
| Enquiries | New, awaiting reply, quote sent, accepted, closed | Reply / prepare quote |
| Appointments | Today/week list, availability and blocked time | Book appointment |
| Clients | Search name, phone, client ID or company | Add client |
| Jobs | Active jobs, due date, next action and progress | Add job |
| Payments | Due balances, received payments, receipts | Record payment |
| Website | Services, portfolio, reviews, business details, optional Journal | Preview / publish |

On a phone, show Today, Jobs, Appointments and More in a compact navigation. Clients, enquiries, payments and website remain reachable through More. The daily page should answer “What do I need to do next?” without revenue charts or setup prompts.

## Enquiry to delivery

1. Visitor chooses a service or sends a company brief. Capture name, contact channel, garment/service, desired date and short brief. Quantity/company fields appear when relevant.
2. Save an enquiry and show an acknowledgement and reference. Do not claim an appointment, price or deadline is confirmed yet.
3. Owner reviews capacity, asks questions, links or creates a client, and sends a versioned quote.
4. Client accepts the exact quote scope and terms. Record acceptance time and channel. Quote edits require a new version and acceptance.
5. Owner books measurement/consultation or approves a public slot request. Capture measurements and fit preferences.
6. Record deposit, if required under approved terms. Confirm the job and agreed delivery date.
7. Progress through production, fitting, quality check and ready. Keep internal tasks separate from public progress.
8. Collect balance under agreed terms; record pickup or dispatch and delivery/collection evidence.
9. Invite private feedback, ask separate permission for a public review/photo, and offer an easy repeat enquiry.

Acceptance: a synthetic enquiry can become one client and one linked job without retyping contact data, and its history survives refresh and session changes.

## Clients and measurements

Use a stable internal client ID and a readable client reference. Do not use phone number as the permanent primary key. Store preferred contact, minimal address when needed, notes, communication preference and linked history. Duplicate phone/email warnings help the owner choose an existing record; never silently merge people sharing a household or company phone.

A measurement set needs garment template, date taken, units (cm or inches), source (owner/customer), fit preference, status (pending/approved/superseded), and who approved it. Keep only garment-relevant values: chest, waist, hip/seat, shoulder, sleeve, garment length, neck and trouser inside/outside leg where needed. The owner approves exact field names and measuring method. Avoid weight, date of birth, ID documents and health history unless a specific service requires them.

Each job takes an immutable snapshot of the approved version used for cutting. Later client changes must not change that job automatically. Customer submissions are proposed updates until the owner reviews them. Show “Measurements taken 12 May, please recheck fit before repeat work” rather than pretending they are valid indefinitely.

Owner workflow: open Clients > client > Measurements > choose garment > enter values > review unit and summary > save. Support a printable measurement sheet and a short measuring guide. Phone inputs use numeric keyboards, allow decimals and retain the unit visibly. Missing values remain missing, never zero by default. Flag implausible entries for review rather than forcing unvalidated universal body limits.

Proposed starting templates (owner approves the field names, measuring method and garment list before build):

| Garment | Fields |
|---|---|
| Shirt | Neck, chest, waist, shoulder, sleeve length, cuff/wrist, shirt length |
| Trousers | Waist, seat/hip, thigh, knee, bottom/ankle opening, outside leg, inside leg |
| Jacket or two-piece top | Chest, waist, seat, shoulder, sleeve length, back length, front length |
| Native top (for example kaftan or senator) | Neck, chest, shoulder, sleeve length, top length, cuff |
| Long gown style (for example agbada) | Shoulder width, full length, chest, neck |

These replace nothing that exists today: the current schema stores one free JSON field per customer and per job (A10), so templates add structure without losing old values. Old values migrate as an "imported, unverified" measurement set.

Acceptance: change a client's approved profile, confirm an earlier job retains its original values; mix cm/inches and verify explicit conversion; duplicate save does not create duplicate versions; unauthorised clients cannot read another person's data.

## Appointments and availability

Baseline (verified 10 October 2026): no appointments table or endpoint exists. The admin calendar is a Larkon demo held in browser memory (A08), and the only related field is `tailoring_orders.fitting_date`, a date with no time. Appointments are therefore new work; existing fitting dates migrate into it as all-day records.

Start with one calendar for the owner. Types: consultation/measurement, fitting and collection. Duration, working hours and buffer are owner settings, not assumed business facts. Proposed initial design supports 30/45/60-minute durations; confirm actual durations before release. Use Africa/Lagos as the confirmed operating timezone and store unambiguous timestamps. Remote users see the timezone clearly.

Owner defines weekly availability, breaks, closed dates, leave, minimum notice and booking horizon. Public visitors see free slots only, never names or other appointment details. Initially use “Request this appointment”; the owner confirms capacity. If immediate confirmation is later approved, it needs atomic reservations and expiry for temporary holds.

Pending requests reserve capacity until accepted, declined or expired under a clear rule. Before inserting or rescheduling, the server checks overlap including buffers and blocked time inside a transaction. Use a simple single-owner lock/serialised reservation approach rather than introducing scheduling infrastructure. Only active reservation statuses block the slot.

States: requested, confirmed, completed, cancelled, no-show, expired. Rescheduling keeps a history, releases the old slot and reserves the new slot atomically. Owner can make an explicit override with a warning and reason, never silently double-book. Reminders are optional and must record queued/sent/failed/manual separately. Calendar download can be added without two-way Google synchronisation.

Acceptance: two devices request the same slot and only one active reservation succeeds; cancelled appointments free availability; refresh preserves the appointment; outside-hours requests fail; failed reminder does not cancel a valid booking.

## Jobs and company orders

One Jobs area should cover individual bespoke work and coordinated/company work. Preserve retail orders separately in storage initially, with a unified owner view or links if helpful. Do not migrate both tables into a new universal engine before the simple workflows are proven.

A job includes client/company contact, garment description, quantity, fabric ownership, supplied/received material notes, reference images, approved quote, agreed dates, measurement snapshot, next action, costs, payments and timeline. Distinguish the customer's required event date from your promised completion date and internal next-action date.

Suggested owner stages: enquiry/quote, confirmed, measurements approved, cutting/sewing, fitting/adjustment, quality check, ready, collected/delivered, cancelled. Map these to existing database values through a controlled migration rather than silently replacing them. Payment state is separate: unpaid, part paid, paid, refunded. A paid job is not necessarily delivered.

For company orders add company name, authorised contact, invoicing details, purchase-order reference if supplied, garment list/quantity, sample approval, size or individual measurement method, agreed delivery batches and invoice recipient. Only collect each wearer's measurements if required. Company organisers must not receive every person's body measurements by default.

Use a single parent job and a simple member/item list when individual garments differ. Partial completion shows quantities ready/delivered and the remaining balance. No automatic bulk discounts or minimum order quantity until the owner confirms them. No claims of embroidery/printing/uniform manufacture unless genuinely offered.

Acceptance: a five-person coordinated job retains each person's private measurement link, supports one approved sample and a partial handover, while its company contact sees only agreed job-level information.

## Quotes, payments and receipts

Quote contains garment/work description, quantity, fabric responsibility, price, deposit amount/rate, due dates, delivery charge, fitting allowance, changes/exclusions and expiry. Proposed 50% deposits already appear in source comments; retain only after explicit owner approval. Do not assume a percentage applies to all jobs.

Record each receipt/payment as a separate entry with date, amount, currency, method, external reference, job and recorded-by. Confirm bank transfers before marking received. A screenshot is evidence to review, not proof of settlement. Correct mistakes with reversal/adjustment entries, not silent total edits. Reject accidental duplicate submission with an idempotency key.

Start with manual verified bank transfer/cash and one clear ledger. Activate one hosted gateway only if useful; do not make three providers a launch requirement. Never collect card details directly. Exact tax treatment, receipt particulars and record retention require confirmation for this business.

Acceptance: deposits and balance sum correctly; duplicate/retried payment does not count twice; two simultaneous payments remain intact; overpayment is visible as credit/refund due rather than silently capped; printable documents agree with the ledger.

## Delivery, collection and aftercare

Capture collection vs delivery, agreed address, date/time, dispatch date, courier/contact, optional verified tracking URL and status. Support partial handover for company jobs. Record proof or owner confirmation and any outstanding balance. A simple manual courier update is adequate initially; carrier APIs are deferred.

Provide a final checklist for garment count, measurements/fit, finishing, packaging, accessories and client instructions. Alterations/rework are linked to the original job with reason and responsibility, not a new unconnected record. Save a final garment photo privately where appropriate; publishing it needs separate approval and consent.

Acceptance: a delivered job shows when/how it was handed over and whether anything remains; promised dates and delays remain visible in history; customers see a clear status without private owner notes.

## Reference-based customer access

A reference is a locator, not a password. Today's portal does the opposite: a phone number plus a sequential `ORD-` code issues a 30-day token, with no throttle and with error messages that reveal whether a phone has an account (A03, A06). Tailoring clients cannot use it at all, because it reads only retail orders (A09). The design below replaces that path. Screen one: reference + registered contact. Screen two: a short-lived single-use link/code sent through a verified channel. If no delivery provider is configured, allow the owner to manually approve an access invitation through an established contact, rather than weakening authentication.

Unauthenticated lookup returns no sensitive facts and uses a generic response. Private area shows only that customer's jobs, agreed dates, quotes, payment summaries, approved public progress, message thread, appointment requests and proposed profile changes. Measurements are restricted further by ownership. Personal identity documents and internal profit/cost notes never appear.

Customer can send a message, ask to reschedule, request an address correction, propose measurements and give feedback. After cutting starts, important garment/measurement changes need owner approval and a visible effect on price/date. Never allow a customer to mark a job paid, alter its production state, delete history or approve a changed quote accidentally.

Provide expiry, logout/revocation and recovery through verified contact. Avoid mandatory customer account/password registration at first. A company contact may access its authorised parent jobs; this does not grant access to individual wearer profiles.

Acceptance: reference guessing, wrong contact, expired link and cross-customer identifiers reveal no records; duplicate messages do not create duplicate submissions; every approved change is dated.

## Communication and feedback

Use a simple job-linked conversation thread with unread badges and explicit internal/private notes. WhatsApp and email buttons can open existing tools, with owner-entered summaries saved to the job. Do not promise automatic synchronisation of personal WhatsApp or all external messages. If an integration is used, document which directions and message types it actually captures.

Templates: enquiry acknowledgement, quote ready, appointment confirmation, fitting reminder, delay update, ready for collection, balance reminder and feedback request. All require an owner check before bulk or promotional sending. Distinguish service communication from marketing opt-in.

Feedback: rating optional, comment, permission to contact about a problem, separate public publication choice and optional photo consent. Negative feedback stays in the private record and can become a follow-up task. Never automatically publish names/photos or fabricate a positive review fallback.

## Complete practical feature list

| Priority | Features |
|---|---|
| Launch core | Today dashboard; enquiry capture and follow-up; client ID/search; dated measurements and job snapshots; persistent appointments/availability; individual jobs; quotes and acceptance; deposits/balances/receipts; due-date reminders; linked messages; manual delivery/collection tracking; private feedback; safe client access; services/portfolio CMS; basic export; tested backup/restore; owner recovery |
| Next after pilot | Company/coordinated job list; sample approval; partial handover; simple alteration/rework record; client merge with reviewed provenance; garment care notes; material consumption/cost notes; recurring client repeat enquiry; appointment calendar download; saved response templates; small overdue/payment report |
| Optional only if used | Real ready-to-wear catalogue and checkout; monthly Journal; basic supplier contacts; one hosted gateway; owner-approved WhatsApp reminders; limited CSV import with preview |
| Defer | Eight-role operations; POS offline sync; multiple warehouses; carrier APIs; automated promotions; loyalty/referrals/gift cards; extensive AI tools; advanced segmentation; recurring subscriptions; two-way calendar sync; live chat infrastructure; SMS/WhatsApp campaign builder; machine scheduling; 3D previews; multilingual expansion without demand |

New features should solve a repeated owner/client problem, reuse an existing record and have a clear failure state. A useful manual step is preferable to an unreliable integration.
