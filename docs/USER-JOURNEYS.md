# User Journeys

This file owns the step-by-step journeys and their acceptance criteria. Rules they rely on are in [BUSINESS-RULES.md](BUSINESS-RULES.md) and cited by ID. Screen-level navigation and states are in [UX-SPEC.md](UX-SPEC.md). All journeys are approved direction (Plans 2026, owner approval 10 October 2026) and none is built in its target form yet; current status is in [ROADMAP.md](ROADMAP.md).

| ID | Person | Trigger | Successful outcome | Recovery path | Evidence |
|---|---|---|---|---|---|
| J-01 | Visitor, owner | Enquiry or company brief | One client and one linked job, delivered and paid | Failed submit keeps typed values; retried conversion is idempotent (BR-02) | Scenario test required |
| J-02 | Owner, client | New client or repeat work | Approved measurement set and job snapshot | Pending customer proposals; superseded sets kept | Scenario test required |
| J-03 | Visitor, owner | Appointment request | Confirmed, conflict-free appointment | Reschedule, cancel, expiry, owner override with reason | Two-device test required |
| J-04 | Owner, company contact | Confirmed work | Job progresses through stages to handover | Stage history; partial handover | Scenario test required |
| J-05 | Owner, client | Quote and payment | Accepted quote, correct ledger and receipts | Reversal and adjustment entries | Concurrency test required |
| J-06 | Owner, client | Job ready | Handover recorded with evidence | Rework linked to original job | Scenario test required |
| J-07 | Client, company contact | Wants to see or change a job | Verified private access to own records only | Expiry, logout, revocation, recovery through verified contact | Isolation test required |
| J-08 | Owner, client | Message or completed job | Linked conversation and private feedback | Failed message shown as failed; manual fallback | Scenario test required |

Every journey specifies loading, empty, success, validation error, service error, permission denied, offline and session-expired states as set out in [UX-SPEC.md](UX-SPEC.md#required-states).

## J-01 Enquiry to delivery

1. The visitor chooses a service or sends a company brief: name, contact channel, garment or service, desired date and short brief. Quantity and company fields appear when relevant ([CONTENT.md](CONTENT.md#company-order-hook)).
2. Save the enquiry and show an acknowledgement and reference (BR-01).
3. The owner reviews capacity, asks questions, links or creates a client (BR-03), and sends a versioned quote (BR-19).
4. The client accepts the exact quote scope and terms; acceptance time and channel are recorded.
5. The owner books a measurement or consultation (J-03), or approves a public slot request, and captures measurements and fit preferences (J-02).
6. Record the deposit if the approved terms require one (BR-20). Confirm the job and the agreed delivery date (BR-18).
7. Progress through production, fitting, quality check and ready (BR-16). Internal tasks stay separate from public progress.
8. Collect the balance under the agreed terms; record pickup or dispatch and the delivery or collection evidence (J-06).
9. Invite private feedback, ask separately for permission to publish a review or photo (BR-33), and offer an easy repeat enquiry.

Acceptance: a synthetic enquiry becomes one client and one linked job without retyping contact data, and its history survives refresh and session changes.

## J-02 Clients and measurements

Each client has a stable internal ID and a readable client reference (BR-03). Store preferred contact, a minimal address when needed, notes, communication preference and linked history.

Owner flow: Clients > client > Measurements > choose garment > enter values > review unit and summary > save. Provide a printable measurement sheet and a short measuring guide. Phone inputs use numeric keyboards, allow decimals and keep the unit visible (BR-09). Rules for sets, snapshots, missing values and customer proposals: BR-04 to BR-10. Show "Measurements taken 12 May, please recheck fit before repeat work" rather than treating old values as valid for ever.

Proposed starting templates. The owner approves field names, measuring method and garment list before build.

| Garment | Fields |
|---|---|
| Shirt | Neck, chest, waist, shoulder, sleeve length, cuff or wrist, shirt length |
| Trousers | Waist, seat or hip, thigh, knee, bottom or ankle opening, outside leg, inside leg |
| Jacket or two-piece top | Chest, waist, seat, shoulder, sleeve length, back length, front length |
| Native top (for example kaftan or senator) | Neck, chest, shoulder, sleeve length, top length, cuff |
| Long gown style (for example agbada) | Shoulder width, full length, chest, neck |

Acceptance: change a client's approved profile and confirm an earlier job keeps its original values; mix cm and inches and verify explicit conversion; a duplicate save creates no duplicate version; an unauthorised client cannot read another person's data.

## J-03 Appointments and availability

Baseline (Verified 10 October 2026): no appointments table or endpoint exists. The admin calendar is a Larkon demo held in browser memory (A08). The only related field is `tailoring_orders.fitting_date`, a date with no time. Appointments are new work; existing fitting dates migrate in as all-day records.

1. The owner sets weekly availability and the settings in BR-11.
2. Public visitors see free slots only, never names or other appointment details, and start with "Request this appointment"; the owner confirms capacity. Immediate confirmation, if approved later, needs atomic reservations and expiry for temporary holds.
3. The server checks overlap before insert or reschedule (BR-12) and applies the state rules in BR-13 and the timezone rule in BR-14.
4. Reminders are optional (BR-15). A calendar download may come later; no two-way Google sync.

Acceptance: two devices request the same slot and only one active reservation succeeds; cancelling frees the slot; refresh keeps the appointment; out-of-hours requests fail; a failed reminder does not cancel a valid booking.

## J-04 Jobs and company orders

One Jobs area covers individual bespoke work and coordinated or company work. Retail orders stay in their own storage at first, with a unified owner view or links if useful. Do not merge both tables into a universal engine before the simple workflows are proven.

A job holds client or company contact, garment description, quantity, fabric ownership, supplied material notes, reference images, approved quote, agreed dates (BR-18), measurement snapshot (BR-06), next action, costs, payments and timeline. Stages and payment state: BR-16, BR-17.

Company orders add company name, authorised contact, invoicing details, purchase-order reference if supplied, garment list and quantity, sample approval, size or individual measurement method, agreed delivery batches and invoice recipient. Wearer privacy and structure: BR-27, BR-28.

Acceptance: a five-person coordinated job keeps each person's private measurement link, supports one approved sample and a partial handover, and its company contact sees only agreed job-level information.

## J-05 Quotes, payments and receipts

A quote holds work description, quantity, fabric responsibility, price, deposit amount or rate (BR-20), due dates, delivery charge, fitting allowance, changes and exclusions, and expiry. Payments follow BR-21 to BR-26. Tax treatment, receipt particulars and record retention still need confirming.

Acceptance: deposits and balances sum correctly; a retried payment does not count twice; two simultaneous payments both survive; overpayment shows as credit or refund due rather than being silently capped; printed documents match the ledger.

## J-06 Delivery, collection and aftercare

Record collection or delivery, agreed address, date and time, dispatch date, courier or contact, optional verified tracking URL and status. Support partial handover for company jobs. Record proof or owner confirmation and any outstanding balance. Manual courier updates are enough at first; carrier APIs are deferred.

A final checklist covers garment count, measurements and fit, finishing, packaging, accessories and client instructions. Rework links back (BR-32). A final garment photo may be kept privately; publishing it needs separate consent (BR-33).

Acceptance: a delivered job shows when and how it was handed over and whether anything remains; promised dates and delays stay visible in history; customers see a clear status without private owner notes.

## J-07 Customer access

The access mechanism (reference plus verified contact channel, short-lived single-use link, generic responses) is specified in [SECURITY.md](SECURITY.md#customers). What the customer can see and do once verified:

- See only their own jobs, agreed dates, quotes, payment summaries, approved public progress, message thread, appointment requests and proposed profile changes. Measurements are restricted further by ownership. Identity documents and internal cost or profit notes never appear.
- Send a message, ask to reschedule, request an address correction, propose measurements (BR-07) and give feedback. Changes after cutting follow BR-30; forbidden actions are listed in BR-31.
- A company contact may see its authorised parent jobs, never individual wearer profiles (BR-27).

Acceptance: guessed references, wrong contact, expired links and swapped identifiers reveal nothing; duplicate messages do not create duplicate submissions; every approved change is dated.

## J-08 Communication and feedback

A simple job-linked conversation thread with unread badges and clearly marked internal notes. WhatsApp and email buttons open the existing tools, and the owner saves a short summary to the job. Never promise automatic sync of personal WhatsApp or all external messages; if an integration is used, document which directions and message types it captures ([ARCHITECTURE.md](ARCHITECTURE.md#integrations)). Message templates and their sending rules are in [NOTIFICATIONS-SPEC.md](NOTIFICATIONS-SPEC.md).

Feedback: optional rating, comment, permission to contact about a problem, a separate public-publication choice and optional photo consent (BR-33). Negative feedback stays private and can become a follow-up task.

Acceptance (Proposed; the plan gives no explicit criterion for this journey, so this is derived from its rules): a failed message shows as failed, not sent; feedback never appears publicly without its recorded consent.
