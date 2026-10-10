# Business Rules

This file owns the rules that records and screens must obey. Journeys in [USER-JOURNEYS.md](USER-JOURNEYS.md) cite these IDs rather than restating them; record structures are in [DATA-MODEL.md](../02-architecture/DATA-MODEL.md). Unless a row says otherwise, each rule is direction approved with Plans 2026 on 10 October 2026 (D-005); its exact detail stays Proposed until the owner confirms the business fact it depends on. Enforcement "Target" means not built yet.

## Canonical terms

| Term | Meaning |
|---|---|
| Enquiry | A request from a visitor or client before any work is agreed |
| Client | A person with a stable internal ID and readable client reference; phone is never identity |
| Company | An organisation commissioning garments for several wearers through an authorised contact |
| Job | Agreed tailoring work for a client or company; extends `tailoring_orders` |
| Retail order | A shop or market sale in `orders`; kept separate from jobs |
| Measurement set | A dated, unit-aware set of values for one garment template |
| Snapshot | The fixed copy of an approved measurement set used for one job |
| Quote version | One priced scope; edits create a new version |
| Reference | A locator shown to customers; never a password |

## Rules

| ID | Rule | Source or owner | Exceptions | Enforcement | Test |
|---|---|---|---|---|---|
| BR-01 | Saving an enquiry never claims that an appointment, price or deadline is confirmed | Plans 2026 (02) | None | Target: enquiry acknowledgement copy | Enquiry submit shows reference and neutral wording |
| BR-02 | Converting an enquiry is idempotent: a retried conversion yields one client and one job | Plans 2026 (04) | None | Target: server request key | Launch matrix "Record conversion" |
| BR-03 | Phone number is never the permanent client key; duplicate phone or email only warns; people sharing a household or company phone are never merged silently | Plans 2026 (02) | Reviewed merge with provenance (next after pilot) | Target | Duplicate-warning scenario |
| BR-04 | A measurement set records garment template, date, unit (cm or inches), source (owner or customer), fit preference, status (pending, approved, superseded) and approver | Plans 2026 (02) | None | Target. Today one mutable JSON field per customer and per job (A10) | Unit and status checks |
| BR-05 | Keep only garment-relevant measurements; avoid weight, date of birth, identity documents and health history unless a specific service needs them | Plans 2026 (02, 04) | A confirmed service need | Target: form fields | Form review |
| BR-06 | Each job takes an immutable snapshot of the approved set used for cutting; later client changes never alter it | Plans 2026 (02) | None | Target | Change profile, earlier job unchanged |
| BR-07 | Customer measurement submissions are proposed updates until the owner approves them | Plans 2026 (02) | None | Target. Today a logged-in customer overwrites directly (A10) | Customer edit stays pending |
| BR-08 | Missing measurement values stay missing, never zero; implausible entries are flagged for review rather than blocked by universal body limits | Plans 2026 (02) | None | Target | Blank and outlier entry |
| BR-09 | Mixed units convert explicitly and visibly; the unit is always shown | Plans 2026 (02) | None | Target | Mixed cm and inches |
| BR-10 | Old JSON measurements migrate as an "imported, unverified" set | Plans 2026 (02) | None | Target migration | Migration check on staging |
| BR-11 | Appointment types: consultation or measurement, fitting, collection. Duration, working hours, buffers, breaks, closed dates, leave, minimum notice and booking horizon are owner settings | Plans 2026 (02) | None. Proposed initial durations 30, 45 and 60 minutes, to confirm | Target | Settings respected by slot search |
| BR-12 | No two active reservations overlap, including buffers and blocked time; the server checks inside a transaction with a single-owner lock. Only active statuses block a slot | Plans 2026 (02, 04) | Owner override with a warning and a recorded reason; never silent | Target | Two-device slot test |
| BR-13 | Appointment states: requested, confirmed, completed, cancelled, no-show, expired. Pending requests hold capacity until accepted, declined or expired under a clear rule. Rescheduling keeps history and swaps slots atomically | Plans 2026 (02) | None | Target | Cancel frees slot; expiry releases hold |
| BR-14 | Timestamps are stored unambiguously and displayed in Africa/Lagos; remote users see the timezone | Owner-confirmed timezone, 10 October 2026 | None | Target | Out-of-hours request fails |
| BR-15 | A failed reminder never cancels a valid booking; reminder states queued, sent, failed and manual are recorded separately | Plans 2026 (02) | None | Target | Forced reminder failure |
| BR-16 | Job stages: enquiry or quote, confirmed, measurements approved, cutting and sewing, fitting or adjustment, quality check, ready, collected or delivered, cancelled. Map to existing database values through a controlled migration. Transitions are validated centrally on the server | Plans 2026 (02, 04) | None | Target. Today `tailoring.php` holds its own stage list | Invalid transition refused |
| BR-17 | Payment state (unpaid, part paid, paid, refunded) is separate from job stage; a paid job is not necessarily delivered | Plans 2026 (02) | None | Target | Paid but undelivered job |
| BR-18 | Keep three dates apart: the customer's event date, the promised completion date and the internal next-action date | Plans 2026 (02) | None | Target | Job form review |
| BR-19 | Any quote edit creates a new version and needs a new acceptance; acceptance records time and channel | Plans 2026 (02) | None | Target | Edit after acceptance |
| BR-20 | Deposit policy is owner-approved per job; a 50% deposit appears only in source comments and is not assumed | Plans 2026 (02) | None | Target: owner setting | Quote with and without deposit |
| BR-21 | Each payment is its own append-only entry (date, amount, currency, method, external reference, job, recorded-by); mistakes are corrected with reversal or adjustment entries | Plans 2026 (02, 04) | None | Target ledger. Today deposits are a single total, now updated inside a transaction with a row lock (tailoring.php:236-238, A05) | Reversal keeps history |
| BR-22 | Duplicate submissions are rejected with an idempotency key; two simultaneous payments both survive | Plans 2026 (02) | None | Target | Launch matrix "Payment integrity" |
| BR-23 | Bank transfers are confirmed before marking received; a screenshot is evidence to review, not settlement | Plans 2026 (02) | None | Target: owner action | Transfer pending until confirmed |
| BR-24 | Overpayment shows as credit or refund due, never silently capped | Plans 2026 (02) | None | Target. Today the deposit is capped at the price (A05) | Overpayment scenario |
| BR-25 | Never collect card details directly; start with verified transfer and cash; at most one hosted gateway later | Plans 2026 (02) | None | Architecture | Code review |
| BR-26 | Money uses consistent decimal or minor-unit rules, never browser floats; Naira first, written `₦18,500` | Plans 2026 (04); old brief kept | None | Partly: `pay_minor_units()` in `_lib.php` | Helper tests |
| BR-27 | A company organiser never sees individual wearer measurements by default; collect each wearer's measurements only when required | Plans 2026 (02) | Wearer consent and an agreed need | Target | Launch matrix "Company isolation" |
| BR-28 | Company work uses one parent job with a member or item list only where garments differ; partial completion shows quantities ready and delivered and the remaining balance | Plans 2026 (02) | None | Target (Phase 5) | Five-person job scenario |
| BR-29 | No automatic bulk discounts or minimum order quantities until the owner confirms them | Plans 2026 (02) | Owner decision | Not built | None needed |
| BR-30 | After cutting starts, important garment or measurement changes need owner approval with a visible effect on price or date | Plans 2026 (02) | None | Target | Customer change after cutting |
| BR-31 | A customer can never mark a job paid, change its production state, delete history or approve a changed quote by accident | Plans 2026 (02) | None | Target: server permission | Forbidden customer actions |
| BR-32 | Alterations and rework link back to the original job with reason and responsibility | Plans 2026 (02) | None | Target | Rework record |
| BR-33 | Feedback is private by default; public review and photo publication need separate, recorded consent; negative feedback never auto-publishes; no fabricated positive fallback | Plans 2026 (02, 03) | None | Target | Unpublished review stays private |
| BR-34 | Any offer is a deliberate owner decision, enforced in code before it is advertised. HERIT10 and free Lagos delivery are not real and are removed | Owner-confirmed, 10 October 2026 (D-003) | None | Removal pending (A07, A22) | Coupon rules match advertised terms |
| BR-35 | Service messages and marketing opt-in are kept apart; templates need an owner check before bulk or promotional sending | Plans 2026 (02) | None | Target | Opt-in check |
| BR-36 | Staff codes (`ORD-`, `HC-`, `HCG-`) stay readable and internal; customers use the random public reference | Implemented on `feat/phase1b-staging` (A06) | Legacy `ORD-` lookup while `ALLOW_LEGACY_ORDER_CODE_LOOKUP` is true | Verified in `_lib.php` (`order_by_customer_ref()`) | Staging smoke checks |

Never infer a material rule from interface copy alone. A 14-day returns rule from the old checklist is not a confirmed policy for Nigerian bespoke work (D-017).
