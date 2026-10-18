# Data Privacy

This file owns personal-data handling: categories, purposes, retention, rights requests, AI boundaries and the Nigeria privacy position. It is planning input from Plans 2026 (04), not a compliance certification; privacy and terms drafts need appropriate professional review.

## Position

- **Controller:** Herit Clothing, the owner's business in Lagos (Owner-confirmed 10 October 2026). Legal entity form, registration and contact details for the privacy notice: Unknown.
- **Jurisdiction:** Nigeria. The Nigeria Data Protection Act and current NDPC guidance are the starting sources ([PRODUCT-SPEC.md](PRODUCT-SPEC.md#external-references)). Do not import UK-only rules or assume a sole-trader exemption. Confirm registration and compliance duties against the real scale and categories of data before launch. Status: Unknown, review not done.
- Phone numbers, addresses, measurements, messages and photos are private client information. Measurements are personal data when tied to a person; they are not automatically medical data. Do not collect identity documents just to issue a reference.

## Data categories

Legal bases and periods are Proposed for owner and legal review; none is decided.

| Data category | Purpose | Legal basis | Source | Retention | Recipients | Deletion or export |
|---|---|---|---|---|---|---|
| Enquiry contact and brief | Reply, quote | To decide (service request) | Visitor | Short expiry for abandoned enquiries (Proposed) | Owner | Manual request workflow |
| Client contact and preferences | Deliver the service | To decide (contract) | Client, owner | Review when inactive (Proposed) | Owner; WhatsApp or mail provider when messaging | Manual request workflow |
| Body measurements | Make garments | To decide (contract) | Owner, client proposals | Periodic review of inactive profiles (Proposed) | Owner only; never company organisers by default (BR-27) | Manual request workflow |
| Reference images and job photos | Production, quality | To decide | Client, owner | Periodic review (Proposed) | Owner | Manual request workflow |
| Payments and receipts | Accounting, disputes | To decide (legal obligation) | Owner | Statutory period, Unknown | Owner; gateway if one is enabled | Kept for the statutory period |
| Messages and feedback | Service, quality | To decide | Client | Unknown | Owner | Manual request workflow. Phase 3 branch: internal notes never reach the client; feedback keeps the consent wording the client saw |
| Public reviews and portfolio photos | Marketing | Separate consent (BR-33) | Client | While published | Public | Withdraw consent, unpublish |
| Marketing opt-in | Promotion | Consent, separate from service messages (BR-35) | Client | Until withdrawn | Owner | Unsubscribe |
| Staff accounts and audit log | Security | To decide | Owner | Unknown | Owner | Not applicable |
| Customer sessions and access attempts (Phase 3) | Secure portal access | To decide | Client, server | Sessions expire after `customer_session_days` (default 7); attempt rows hold hashes, IP and time, retention Unknown (Proposed: purge after 90 days) | Owner | Not applicable; codes and tokens are stored only as hashes |

Never keep everything for ever, and never promise immediate deletion of records the law requires to remain.

## Privacy notice

Prepare a short notice: who runs the business, what is collected and why, service providers, disclosures and transfers, retention, rights and contact. Choose lawful grounds for service records separately from marketing consent. Portfolio and review publication need separate permission, never bundled into order acceptance. Cookies and analytics: evaluate the actual position rather than assuming cookieless analytics needs no consent ([CONTENT.md](CONTENT.md#analytics)).

## Rights requests and incidents

- A manual request workflow for access, correction and deletion, with identity verification and a logged decision. Remove or anonymise eligible data in the live database, exports and backup rotation, documenting lawful exceptions.
- Keep an incident contact and checklist, and verify notification obligations if an incident occurs ([DEPLOYMENT.md](DEPLOYMENT.md#monitoring)).

## Processors and AI

- Processors in use when configured: hosting provider, mail host, Meta (WhatsApp Cloud API), payment gateway, OpenRouter and image AI providers ([ARCHITECTURE.md](ARCHITECTURE.md#integrations)).
- Correction (17 October 2026, Verified `src/app/(admin)/enquiries/components/AiReplyModal.jsx:25-31`): the staff "Draft a reply" button on an enquiry sends that enquiry's name, interest and message to OpenRouter. Nothing is sent unless a staff member presses it. Dashboard and report prompts send totals only. Owner decision D-024 (17 October 2026): the prompt now carries only the enquiry type and a short interest line (up to 80 characters); the name is filled in locally and the message is never sent (K-12).
- Image AI receives staff-written prompts only. If any further customer processing is approved, document the providers and international transfer arrangements first.

## Inventory, 17 October 2026

From a code read and a browser run on local staging (Playwright, 17 October 2026). Evidence is file and line; "Verified" means seen in code or at runtime, NOT TESTED means not run.

### Collection points

| Form | Fields | Stored in | Notice at the form |
|---|---|---|---|
| Contact (`SiteContactForm.jsx`) | Name, contact choice, phone, email, company, interest, message | `enquiries` (`contact.php`) | Purpose line and privacy link once a policy is published (Verified in browser) |
| Company brief (`CompanyBriefForm.jsx`) | Company, name, role, garment, phone, email, quantity, date, material, brief | `enquiries` | Same (source) |
| Booking (`BookPage.jsx`) | Visit type, slot, name, phone, email, note | `appointments` and a linked `enquiries` row (`booking.php`) | Same (source; online booking is off on staging, so NOT TESTED in a browser) |
| Access and track (`portal/AccessForm.jsx`, `TrackPage.jsx`) | Reference, phone or email, then a 6-digit code | `customer_access_challenges` with IP (`access.php`) | None. The legacy order lookup puts the phone in a GET query string, so it reaches server access logs (K-14) |
| Portal feedback (`portal/sections.jsx`) | Rating, comment, contact and publication consents (unticked) | `job_feedback`, with the consent wording shown | Consent wording stored (BR-33) |
| Account (`AccountPage.jsx`) | Measurements, birthday with year, NPS score | `customers`, `nps_responses` | None |
| Retail shop (checkout, reviews, waitlist) | Name, phone, email, address, notes, gift message; review name and phone | `customers`, `orders`, `abandoned_carts`, `reviews`, `waitlist` | None. Off for visitors while `shop_enabled` is off (UI and server, 17 October 2026) |

No newsletter and no marketing opt-in field exist anywhere in the schema or the forms.

### Cookies and browser storage

None of these is used for advertising or cross-site tracking. No analytics, pixels, maps, video embeds or CAPTCHA load on public pages, and since 17 October 2026 fonts are served from the site itself (no request to Google). Categories are provisional and REQUIRE LEGAL REVIEW against GAID Article 19.

| Name | Kind | Set by | Purpose | Lifetime | Category (provisional) | Evidence |
|---|---|---|---|---|---|---|
| `_LARKON_AUTH_KEY_` | First-party cookie, readable by script | Staff sign-in | Staff session (user and bearer token) | 7 days | Strictly necessary (staff only) | `context/useAuthContext.jsx:24-26`; A15 open |
| `herit_customer_token` | sessionStorage | Portal sign-in | Customer portal session | Until the tab closes | Strictly necessary | `helpers/heritApi.js:62-87` |
| `herit_portal_notice` | sessionStorage | Portal | One-off notice state | Tab | Strictly necessary | `portal/session.js` |
| `herit_chunk_reload` | sessionStorage | Error screen | Reload once after a deploy | Tab | Strictly necessary | `components/AppErrorBoundary.jsx` |
| `herit_cart_v1` | localStorage | Shop | Bag contents | Until cleared | Functional | `site/cart.js` |
| `herit_ref`, `herit_src`, `herit_camp` | localStorage | Any public page with `?ref=` or `?utm_*` | Referral code and campaign attribution for checkout | 30 days, then removed (D-024) | Analytics or attribution: consent may be needed, REQUIRES LEGAL REVIEW (K-13) | `site/attribution.js`, `site/SiteLayout.jsx` |
| `__REBACK_NEXT_CONFIG__` | localStorage | Admin | Admin theme settings | Until cleared | Preferences (staff) | `context/useLayoutContext.jsx:29` |
| `herit_pos_catalogue`, `herit_pos_queue` | localStorage | Staff POS | Offline catalogue and queued sales (may hold customer data) | Until synced | Strictly necessary (staff) | `app/(admin)/pos/offline.js` |
| `heritos-v1` | Cache Storage | Service worker (production only) | App shell and static files; never PHP answers | Until the cache name changes | Strictly necessary | `public/sw.js` |

The server sets no cookies (`setcookie` and `session_start` are not used).

### Recipients and transfers

| Recipient | What it receives | When | Evidence |
|---|---|---|---|
| Hosting (Namecheap cPanel) | Everything stored, server logs | Always | CLAUDE.md |
| Cloudflare (DNS only, grey cloud) | DNS lookups, no page traffic | Always | CLAUDE.md |
| Mail host (SMTP or PHP `mail()`) | Recipient address, access codes, staff mail; each send logs recipient and subject in `audit_log` | On send | `_mail.php:67-80` |
| Meta (WhatsApp Cloud API) | Phone number and message text; every message logged in `whatsapp_messages` | Order confirmations, broadcasts, waitlist and abandoned-cart nudges | `_lib.php:151-193`, `whatsapp.php:175-198`, `engage.php` |
| OpenRouter | Enquiry type and a short interest line when staff press "Draft a reply" (no name or message since D-024); totals for reports | Staff action | `AiReplyModal.jsx` (K-12) |
| OpenAI or Stability (image AI) | Staff prompts | Staff action | `ai_image.php` |
| Paystack, Flutterwave or Stripe | Email, amount, order code | Shop checkout, if a gateway is configured | `store.php:418-476` |
| Open-Meteo | No personal data | Weather tile | `weather.php` |

Transfers outside Nigeria: Meta, OpenRouter, the image AI providers and the payment gateways are likely to process data abroad. The transfer basis under NDPA Part VIII and GAID Article 45 is REQUIRES LEGAL REVIEW.

### Marketing

- No marketing opt-in is collected anywhere. Owner decision D-024 (17 October 2026): promotional WhatsApp sends are off. `whatsapp.php?action=broadcast` and `engage.php` waitlist and abandoned-cart nudges answer 403 and their admin buttons are disabled; one-to-one service messages are unchanged (K-11). Turning them back on needs a recorded opt-in (a schema change with an unticked box and an unsubscribe route) and a new decision.
- Abandoned-cart capture saves name, phone, email and basket once ten phone digits are typed, before the customer submits (`CheckoutPage.jsx:55-66`). It is off for visitors while the shop is off; before switching the shop on, the owner decides whether to keep it and how to disclose it (K-11).

### Retention schedule

The periods below are not decided. Proposed periods follow data minimisation and all REQUIRE OWNER INPUT and LEGAL REVIEW.

Mechanism (K-18, branch `feat/hardening-2026-10-18`, 18 October 2026): a command-line job, `php-api/retention.php`, deletes rows older than a period the owner sets in Settings > Data retention, one `retention_*_days` key per category ([API-SPEC.md](API-SPEC.md#data-retention-settings-keys-k-18)). Empty or 0 means keep forever, so nothing is deleted until the owner chooses. The one exception is expired staff sign-in tokens and legacy portal tokens (`auth_tokens`, `customer_tokens`), which start at 30 days past their own expiry because they are not personal history. Without `--apply` the job is a dry run that only counts; with it, it deletes in batches of 500 and writes one `retention_purge` audit entry per category with the count. It never deletes jobs, payments, the ledger, quotes, orders, measurements, appointments or client records: those are business and tax records, out of scope here and listed as protected in `php-api/_retention.php`. Messages and feedback belong to jobs and are not covered. The job runs only once the owner adds the cron line ([DEPLOYMENT.md](DEPLOYMENT.md#retention-job)). Verified on local staging only; NOT TESTED on the live server.

| Data | System of record | Proposed period | Trigger | Method | Status |
|---|---|---|---|---|---|
| Unconverted enquiries and booking requests | `enquiries`, `appointments` | 12 months | Last activity | Delete or anonymise | Enquiries: built, off until set (`retention_closed_enquiries_days`; closed, never converted and not linked to a quote, job or appointment). Booking requests: not built |
| Client records, measurements, job photos | `customers`, measurement sets, job files | Review after 3 years inactive | Last job | Owner review, then delete or anonymise | Not built |
| Payments, receipts, ledger | `ledger`, quotes, orders | Statutory period, Unknown | Financial year end | Keep; anonymise contact fields after the period | REQUIRES LEGAL REVIEW |
| Messages and feedback | `messages`, `job_feedback` | 3 years | Job closed | Delete; keep consent records while a review is published | Not built |
| Customer sessions, access challenges, staff tokens | `customer_sessions`, `customer_access_challenges`, `auth_tokens` (and legacy `customer_tokens`) | 90 days after expiry | Expiry | Delete | Built: staff and legacy tokens 30 days after expiry by default; sessions and access challenges off until set |
| IP and throttle rows, mail and audit logs | `audit_log` | 12 months; security events may need longer | Created | Delete | Built, off until set (90 days at least) |
| WhatsApp message log | `whatsapp_messages` | 12 months | Sent | Delete | Built, off until set |
| Abandoned carts, waitlist | `abandoned_carts`, `waitlist` | 30 days, or on order | Created (carts: last change) | Delete | Built, off until set (two keys) |
| Backups | cPanel | Rotation Unknown | Backup date | Rotation | REQUIRES OWNER INPUT (A20) |

Backups keep deleted data until they rotate out; the notice must say so.

### Rights and deletion

There is no self-service export or deletion, and customer deletion in the admin is a soft delete (`deleted_at`). Requests go to the business by its published contact route and are handled by hand (see [Rights requests and incidents](#rights-requests-and-incidents)). A self-service flow was not built: it depends on undecided retention and statutory-record rules.

## Draft privacy notice

A draft notice for the owner and counsel is in [PRIVACY-NOTICE-DRAFT.md](PRIVACY-NOTICE-DRAFT.md). It is not publication-ready. The site's `/privacy` and `/terms` pages publish only what the owner enters in Website, and publishing is refused while placeholders remain (`_cms.php`).

## Sources

Accessed 17 October 2026. Article titles only were read for the GAID; the substance of each article REQUIRES LEGAL REVIEW.

| Source | Issuer | Link | Supports |
|---|---|---|---|
| Nigeria Data Protection Act 2023 | National Assembly; administered by the Nigeria Data Protection Commission (NDPC) | https://ndpc.gov.ng/resources/ | Jurisdiction, lawful bases, rights, transfers |
| General Application and Implementation Directive (GAID) 2025, issued 20 March 2025, in force 19 September 2025 | NDPC | https://ndpc.gov.ng/wp-content/uploads/2025/07/NDP-ACT-GAID-2025-MARCH-20TH.pdf | Article 19 (consent to cookies and other tracking tools), Article 27 (information to data subjects), Articles 36 to 40 (rights and the Standard Notice to Address Grievance), Article 33 (breach notification), Article 45 (cross-border transfer); registration of data controllers of major importance |

## Owner input required

1. Legal name, entity type and registration number (if any) of the business that runs the site.
2. Privacy contact: an email address (and phone, if wanted) that is checked, and a postal or workshop address to publish.
3. Whether the business must register with the NDPC as a data controller of major importance, given its real volume of clients (counsel to confirm).
4. Retention periods in the schedule above, and the statutory period for financial records.
5. Decided 17 October 2026 (D-024): promotional WhatsApp sends off (K-11); AI drafter without personal data (K-12).
6. Decided 17 October 2026 (D-024): attribution kept 30 days (K-13); whether that needs consent is still for counsel.
7. Who handles rights requests, and how identity is checked (proposed: a code sent to the phone or email already on file, never identity documents).
8. Commercial terms for the Terms page: deposits, payment timing, alterations, cancellation and refunds, collection and delivery, liability, governing law. The Terms draft is BLOCKED until these exist.

