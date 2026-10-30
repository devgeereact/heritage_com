# Product Specification

HeritOS is the operations app and public website for Herit Clothing. This file owns the business context and confirmed facts, the product promise, scope and feature priorities, the services awaiting confirmation, what happens to each existing area, the owner decisions still open, and who uses the product. Dated owner decisions are summarised in [DECISIONS.md](DECISIONS.md) (the 10 October 2026 decisions are D-001 to D-011 and D-013 to D-016); order of work and status are in [ROADMAP.md](ROADMAP.md). Statement labels are defined in [README.md](README.md#confidence-labels).

## Context

### Problem and outcome

- **Problem:** one self-employed operator runs a men's fashion and tailoring business and needs enquiries, appointments, clients, measurements, jobs, payments and delivery in one dependable place. The existing source grew into a retail and marketing platform for a business that does not exist, while measurements and fittings were secondary. Owner-confirmed 10 October 2026.
- **People affected:** the owner (daily operator), individual clients, and company contacts commissioning garments for several people. Owner-confirmed 10 October 2026.
- **Situation:** daily work on a phone and laptop in Lagos; customers arrive through the website, WhatsApp and social profiles.
- **Desired outcome:** a daily assistant that answers "What do I need to do next?", keeps client and job records safe and consistent, and a website that explains the real services and shows real finished work. Measurable acceptance is under [First-release proof](#first-release-proof).
- **Why now:** the 10 October 2026 audit found that development wrote to production, customer access was weak and the website made invented claims. Safety and record integrity come before promotion ([DECISIONS.md](DECISIONS.md), D-008).

### Confirmed business

| Statement | Label | Evidence |
|---|---|---|
| Herit Clothing, Lagos, men's fashion and sewing, run by one self-employed operator | Owner-confirmed | 10 October 2026 |
| Customers are individuals, or company contacts commissioning garments for several people | Owner-confirmed | 10 October 2026 |
| Operating timezone is Africa/Lagos | Owner-confirmed | 10 October 2026 |
| Domain heritclothing.com on Namecheap cPanel, DNS on Cloudflare | Verified | [CLAUDE.md](../CLAUDE.md), [DEPLOYMENT.md](DEPLOYMENT.md#hosting) |
| Exact garment range, business address, safe appointment location, delivery coverage, appointment hours, weekly capacity and company production capacity | Unknown | Owner to confirm; existing website copy is not proof of any of these. Tracked under [Remaining owner decisions](#remaining-owner-decisions) |

### Boundaries

- **Product boundary:** one owner, one business. No multi-tenant platform, marketplace, factory planning engine, payroll, CRM scoring or custom social network. Owner-confirmed 10 October 2026 (approval of Plans 2026).
- **First release:** the launch core under [Scope](#scope), proved through a limited pilot ([release decision](AUDIT.md#release-decision)).
- **Explicit exclusions:** framework migration, microservices, TypeScript or Laravel conversion, full accounting, and everything in the Defer row of the scope table ([DECISIONS.md](DECISIONS.md), D-007).
- **Constraints:** Namecheap shared hosting with PHP and MySQL; pushing `main` deploys; credentials only in server `config.php` and GitHub secrets ([DEPLOYMENT.md](DEPLOYMENT.md)). Budget and dates: Unknown. Legal: Nigeria privacy review pending ([DATA-PRIVACY.md](DATA-PRIVACY.md)).
- **Existing assets to preserve:** the React, Bootstrap, PHP and MySQL code; existing tailoring, customer, enquiry and CMS records; existing public URLs where practical. Keep the functional core, close unsafe data paths, connect the missing journeys and hide unused complexity rather than rebuilding (Plans 2026, 01 "Immediate interpretation").

### Fact register

| Statement | Status | Evidence or owner | Next check |
|---|---|---|---|
| Production confidence is PARTIAL | FACT | 10 October 2026 audit, [ROADMAP.md](ROADMAP.md) | Staging walkthrough of critical flows |
| Deployed endpoint versions and live schema | UNKNOWN | Finding A02, A20 | Approved read-only server review |
| Plans 2026 is the plan of record | DECISION | Owner, 10 October 2026, D-012 | None |
| Garment range, hours, capacity, terms | UNKNOWN | Owner (quote expiry, deposit wording and retention periods decided in D-025) | Owner decision list |

### External references

These informed the approved plan. They do not show that the app already meets them.

| Source | Used for |
|---|---|
| [getdesign registry](https://www.npmjs.com/package/getdesign?activeTab=code) | The Tesla style reference behind [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md); Context7 had no getdesign library, so the registry and the downloaded reference were used |
| [OWASP object-level authorisation](https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/) | Ownership checks on client, job, measurement and company records |
| [OWASP authorisation](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) | Consistent separation of owner, customer and company access |
| [OWASP file upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) | Private job photos and approved public images |
| [OWASP REST security](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html) | Staging, session and error review |
| [NDPC: Nigeria Data Protection Act](https://www.ndpc.gov.ng/ndp-act-2023/) and [NDPC FAQs](https://ndpc.gov.ng/faqs/) | Starting point for the Lagos privacy review; no compliance status asserted |
| [ICO storage limitation](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/) | Illustration of purpose-based retention only; not Nigerian authority |
| [W3C reflow](https://www.w3.org/WAI/WCAG21/Understanding/reflow), [target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) | Responsive, touch-target and reduced-motion rules |
| [Google Web Vitals](https://web.dev/articles/vitals) | LCP, INP and CLS targets |
| [Google LocalBusiness data](https://developers.google.com/search/docs/appearance/structured-data/local-business) and [JavaScript structured data](https://developers.google.com/search/docs/appearance/structured-data/generate-structured-data-with-javascript) | Structured data and SPA metadata decisions |
| [WhatsApp Business app](https://whatsappbusiness.com/products/business-app/), [Communities](https://faq.whatsapp.com/495856382464992), [privacy](https://faq.whatsapp.com/236979282604093) | Manual-first communication and optional Community |
| [LinkedIn Page setup](https://www.linkedin.com/help/linkedin/answer/a543852/creating-a-linkedin-page) | Truthful company page draft |
| [TikTok account types](https://support.tiktok.com/en/using-tiktok/growing-your-audience/switching-to-a-creator-or-business-account) | Business account and audio checks |

## Product promise

HeritOS lets the owner of a one-person men's tailoring business in Lagos take an enquiry through measurements, quote, payment, production and handover without retyping data or losing history, and lets clients find, follow and act on their own job safely. The website explains the real services, shows real finished work and leads to one working enquiry or booking path. Owner-confirmed direction, 10 October 2026 (D-001, D-005).

## First-release proof

- **User outcome to prove:** the owner completes a synthetic job from enquiry to handover with consistent records and recovery from errors (Phase 2 evidence), then a limited real pilot with a few consenting customers (Phase 6). Proposed.
- **Evidence that counts:** the launch verification matrix in [LAUNCH-CHECKLIST.md](AUDIT.md) and the owner usability review in [docs/AUDIT.md](AUDIT.md#usability). A passing `npm run build` never counts.
- **Failure threshold:** any unresolved P0 finding, or any core gate in [docs/AUDIT.md](AUDIT.md#release-decision) without evidence, means NO-GO.

## Scope

| Priority | Features |
|---|---|
| Launch core (must have) | Today dashboard; enquiry capture and follow-up; client ID and search; dated measurements and job snapshots; persistent appointments and availability; individual jobs; quotes and acceptance; deposits, balances and receipts; due-date reminders; linked messages; manual delivery and collection tracking; private feedback; safe client access; services and portfolio CMS; basic export; tested backup and restore; owner recovery |
| Next after pilot (should have) | Company or coordinated job list; sample approval; partial handover; alteration and rework record; client merge with reviewed provenance; garment care notes; material consumption and cost notes; repeat-client enquiry; appointment calendar download; saved response templates; small overdue and payment report |
| Optional only if used | Real ready-to-wear catalogue and checkout; monthly Journal; basic supplier contacts; one hosted gateway; owner-approved WhatsApp reminders; limited CSV import with preview |
| Defer (will not build now) | Eight-role operations; POS offline sync; multiple warehouses; carrier APIs; automated promotions; loyalty, referrals and gift cards; extensive AI tools; advanced segmentation; recurring subscriptions; two-way calendar sync; live chat infrastructure; SMS or WhatsApp campaign builder; machine scheduling; 3D previews; multilingual expansion without demand |

A new feature should solve a repeated owner or client problem, reuse an existing record and have a clear failure state. A useful manual step beats an unreliable integration.

## Functional requirements

Each requirement points to the journey that defines its steps and acceptance. Status reflects [ROADMAP.md](ROADMAP.md).

| ID | User outcome | Acceptance evidence | Priority | Status |
|---|---|---|---|---|
| FR-01 | Enquiry becomes one client and one linked job | [USER-JOURNEYS.md J-01](USER-JOURNEYS.md#j-01-enquiry-to-delivery) | Must | Built on the Phase 2 branch: pipeline, idempotent conversion, duplicate candidates (PASS in staging, browser and e2e) |
| FR-02 | Dated, unit-aware measurements with immutable job snapshots | [J-02](USER-JOURNEYS.md#j-02-clients-and-measurements) | Must | Built on the Phase 2 branch: measurement sets, owner approval, job snapshots (PASS in staging) |
| FR-03 | Conflict-safe appointments and availability | [J-03](USER-JOURNEYS.md#j-03-appointments-and-availability) | Must | Not started (Phase 3) |
| FR-04 | Individual jobs with stages and next action | [J-04](USER-JOURNEYS.md#j-04-jobs-and-company-orders) | Must | Built on the Phase 2 branch: stage rules, event and promised dates, next action, conflict check (PASS in staging) |
| FR-05 | Company or coordinated jobs with wearer privacy | [J-04](USER-JOURNEYS.md#j-04-jobs-and-company-orders) | Should | Not started (Phase 5) |
| FR-06 | Versioned quotes, append-only payment ledger, receipts | [J-05](USER-JOURNEYS.md#j-05-quotes-payments-and-receipts) | Must | Built on the Phase 2 branch: versioned quotes, append-only ledger with request keys, printable quote, invoice and receipt (PASS in staging) |
| FR-07 | Delivery and collection record, aftercare | [J-06](USER-JOURNEYS.md#j-06-delivery-collection-and-aftercare) | Must | Handover records built on the Phase 2 branch (planned, completed, partial); aftercare not started |
| FR-08 | Safe customer access over tailoring and retail jobs | [J-07](USER-JOURNEYS.md#j-07-customer-access) | Must | Throttle, generic errors and public reference done (A03, A06); contact verification not started (Phase 3) |
| FR-09 | Job-linked messages and private feedback | [J-08](USER-JOURNEYS.md#j-08-communication-and-feedback) | Must | Not started (Phase 3) |
| FR-10 | Truthful website with services and portfolio CMS | [CONTENT.md](CONTENT.md) | Must | Not started (Phase 4) |

## Non-functional requirements

Each has one home: security in [SECURITY.md](SECURITY.md), privacy in [DATA-PRIVACY.md](DATA-PRIVACY.md), accessibility in [ACCESSIBILITY.md](ACCESSIBILITY.md), performance targets in [CONTENT.md](CONTENT.md#seo-and-performance), offline behaviour in [ARCHITECTURE.md](ARCHITECTURE.md#offline-behaviour), backup and recovery in [DEPLOYMENT.md](DEPLOYMENT.md#backup-and-recovery). Supported devices: practical phone, tablet and laptop coverage, tested at the widths in [ACCESSIBILITY.md](ACCESSIBILITY.md); not an untested promise of every device.

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
| Dashboard, analytics, weather | Dedicated pages and endpoints | Replace the default view with due work, unread messages and appointments. Keep a small report page. Hide weather and complex charts. Phase 2 branch: Today is the home; the old dashboard is Reports under More tools. |
| Tailoring, detail, groups | Jobs, stages, snapshots, fitting date, deposits, event history | Core. Becomes Jobs (done on the Phase 2 branch, old URLs redirect); groups become company or coordinated jobs in Phase 5. |
| CRM and kit customer pages | Real customers.php; kit pages removed (A18) | One Clients area (done on the Phase 2 branch); link person, company and jobs. |
| Enquiries | Website form, `enquiries.php` pipeline | Core. Pipeline, follow-up and conversion built on the Phase 2 branch. |
| Calendar, chat, email, todo kit | Template components beside real Inbox and WhatsApp | Calendar needs persistence. Kit chat and todo are not working client infrastructure. |
| Inbox, mail, WhatsApp | IMAP/SMTP and manual or Cloud API messaging | Keep simple contact actions and a linked communication log. Delivered, failed and manual are distinct states. |
| Catalogue, products, variants, attributes, category | Real catalogue plus kit products pages | Optional ready-to-wear. Real catalogue is canonical; retire demo duplicates after dependency checks. |
| Retail orders and POS | orders.php, store.php; manual, market and web channels | Secondary navigation if used. Never force a tailoring job through a shopping cart. |
| Stock, warehouse, received orders | Real stock endpoint plus template screens | Simple fabric and material tracking later. No multi-warehouse for one operator. |
| Suppliers and purchases | Supplier and PO source | Supplier contacts and job material costs later; procurement suite deferred. |
| Finance, invoices, payments | `ledger.php` for jobs; retail `payments.php` stays separate | One payment ledger with printable quote, invoice and receipt (built on the Phase 2 branch). No full accounting or payroll. |
| Reviews, engage, referrals, loyalty | Moderation, NPS, loyalty, gift and referral source | Feedback is core; promotions, points, gift cards and re-engagement deferred. |
| Marketing, studio, AI, image AI | Campaign and AI proxy endpoints | Optional content drafts. Never send private measurements or client records to AI by default. No launch dependency. |
| CMS content, Journal, testimonials | content.php; published store.php feeds | Keep the shared CMS. Add services, portfolio and business settings before more blog work. |
| Channels and settings | Store and social config; Settings page | One Business settings page with only necessary controls. Phase 2 branch: Settings holds business details, quote defaults, payment rules and measurement templates; channels stay in Store and channels. |
| Home, About, Contact | Public brand and enquiry pages | Service-led men's tailoring site; truthful owner story; clear consultation path. |
| Shop, Product, Cart, Checkout, Gifting | Public retail flow | Optional. Hide unsupported promises rather than pretend stock or gifting exists. Hidden from public navigation behind `shop_enabled` (D-014). |
| Track and Account | Retail-reference status and customer screens | Extend to tailoring with stronger private access. |
| Blog and BlogPost | CMS publication plus baked-in fallback | Small Journal only if sustainable; sanitise; no fabricated fallback articles. |
| Kit demo routes (forms, charts, icons, maps, widgets, base UI) | Removed on 10 October 2026 (A18) | Done; see [ARCHITECTURE.md](ARCHITECTURE.md#route-inventory). |
| Coming soon, maintenance, 404, reset, sign-up, lock | Template utility screens | Keep genuine error and maintenance flows; verify recovery endpoints before showing usable controls. |

## Remaining owner decisions

Confirm: exact men's garment range; public business address and safe appointment location; hours, durations and buffers; realistic weekly job capacity; fabric supply options; fitting and change allowance; quote expiry and deposit policy; pickup and delivery area and charges; payment methods; company quantity and sample terms; real imagery and review permissions; a sustainable Journal and Community cadence; whether any retail stays; tax treatment and record retention; measurement template field names and measuring method.

Decided on 19 October 2026 by the lead developer under the owner's delegation ([D-025](DECISIONS.md)), all still editable in Settings: quote expiry (14 days by default); the deposit policy wording (it states the existing rule, work starts when the deposit on the quote is paid and the balance is due before collection, and names no amount, which stays per quote); and record retention for logs, sessions, carts, waitlist, closed enquiries and usage counts ([DATA-PRIVACY.md](DATA-PRIVACY.md#retention-schedule)). Not decided there, because they are facts or legal advice: the statutory period for financial records and tax treatment, the legal entity name, the privacy contact, the Terms commercial rules (payment timing, alterations, cancellation, refunds, collection and delivery, liability), counsel's view on GAID Article 19, the garment range, address, hours and capacity, and link-preview photographs. Those stay owner items.

Until confirmed, unknown business facts become editable settings and the website hides empty sections; nothing is invented (D-013). On the Phase 3 branch hours, breaks, buffer, durations, minimum notice, horizon and hold time are such settings, empty by default, so no slot is offered until the owner fills them in (D-021). Already settled and not to be asked again: brand, name, location, men's-only scope, amber accent, removal of invented website claims.

## User roles

Who uses HeritOS and what each kind of person is for. The resource-by-resource matrix, including what the server enforces today, is in [SECURITY.md](SECURITY.md#permissions). How each person signs in is in [SECURITY.md](SECURITY.md#authentication).

### Approved direction (Plans 2026, owner approval 10 October 2026)

| Role | Purpose | May view | May create or change | May approve or delete | Enforcement |
|---|---|---|---|---|---|
| Owner | Runs the business day to day | All business records and settings | All business records and settings | Quotes, measurement proposals, payments, publication, overrides with reason | Server: `super_admin` today. Last-owner lockout protection must stay (Verified guard at `users.php:144-147`; runtime NOT TESTED) |
| Future helper | Optional assistant if the owner hires one | Only the functions they need | Only the functions they need | Nothing by default; no finance or export access by default | Server-side, least privilege. Do not add roles because old schemas have them |
| Client (customer) | Follows and acts on their own jobs | Own jobs, dates, quotes, payment summaries, public progress, messages | Messages, reschedule requests, address corrections, measurement proposals, feedback | Accept their own quote; nothing else ([BR-31](BUSINESS-RULES.md)) | Server ownership check on every request; target design in [SECURITY.md](SECURITY.md#customers) |
| Company contact | Commissions garments for several wearers | Authorised parent jobs and agreed job-level information | Messages and requests on those jobs | Sample approval where agreed | Never individual wearer profiles ([BR-27](BUSINESS-RULES.md)) |
| Anonymous visitor | Learns about services, enquires, requests a slot | Public pages, free slots only | Enquiry, appointment request | Nothing | Throttles, honeypot, payload limits, generic responses |
| Service identities | GitHub Actions deploy; WhatsApp Cloud API webhook | Not applicable | Deploy uploads `dist/` and the PHP files listed in `deploy.yml` (16 on the Phase 2 branch); webhook posts inbound messages | Not applicable | FTP secrets in GitHub only. The webhook is public and unauthenticated by design (`whatsapp.php:12-16`); `WHATSAPP_VERIFY_TOKEN` in server config |

### Current implementation (Verified 10 October 2026)

Seven staff roles exist: `super_admin`, `admin`, `manager`, `tailor`, `editor`, `seller`, `employee` (`src/helpers/roles.js`, `STAFF_ROLES`). The server groups them in `php-api/_domain.php`: owner roles (super_admin, admin, manager), workshop roles (owner plus tailor), enquiry roles (owner plus employee) and client roles (workshop plus employee). In solo mode only the owner account is expected to be active; staff management sits under More tools but backend controls stay. Where each role lands after sign-in is in [UX-SPEC.md](UX-SPEC.md#as-built-phase-2). Customers sign in through `account.php`; there is no company-contact login yet. Denial behaviour must be explicit and tested; current status NOT TESTED.
