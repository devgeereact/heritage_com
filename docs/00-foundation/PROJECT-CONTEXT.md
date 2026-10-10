# Project Context

HeritOS is the operations app and public website for Herit Clothing. This file owns the problem, the confirmed business facts, the product boundary and the external sources that shaped the approved plan. Statement labels are defined in [docs/README.md](../README.md#confidence-labels).

## Problem and outcome

- **Problem:** one self-employed operator runs a men's fashion and tailoring business and needs enquiries, appointments, clients, measurements, jobs, payments and delivery in one dependable place. The existing source grew into a retail and marketing platform for a business that does not exist, while measurements and fittings were secondary. Owner-confirmed 10 October 2026.
- **People affected:** the owner (daily operator), individual clients, and company contacts commissioning garments for several people. Owner-confirmed 10 October 2026.
- **Situation:** daily work on a phone and laptop in Lagos; customers arrive through the website, WhatsApp and social profiles.
- **Desired outcome:** a daily assistant that answers "What do I need to do next?", keeps client and job records safe and consistent, and a website that explains the real services and shows real finished work. Measurable acceptance lives in [PRODUCT-SPEC.md](../01-product/PRODUCT-SPEC.md#first-release-proof).
- **Why now:** the 10 October 2026 audit found that development wrote to production, customer access was weak and the website made invented claims. Safety and record integrity come before promotion ([DECISIONS.md](../08-change-management/DECISIONS.md), D-008).

## Confirmed business

| Statement | Label | Evidence |
|---|---|---|
| Herit Clothing, Lagos, men's fashion and sewing, run by one self-employed operator | Owner-confirmed | 10 October 2026 |
| Customers are individuals, or company contacts commissioning garments for several people | Owner-confirmed | 10 October 2026 |
| Operating timezone is Africa/Lagos | Owner-confirmed | 10 October 2026 |
| Domain heritclothing.com on Namecheap cPanel, DNS on Cloudflare | Verified | [CLAUDE.md](../../CLAUDE.md), [DEPLOYMENT.md](../07-operations/DEPLOYMENT.md#hosting) |
| Exact garment range, business address, safe appointment location, delivery coverage, appointment hours, weekly capacity and company production capacity | Unknown | Owner to confirm; existing website copy is not proof of any of these. Tracked in [PRODUCT-SPEC.md](../01-product/PRODUCT-SPEC.md#remaining-owner-decisions) |

## Boundaries

- **Product boundary:** one owner, one business. No multi-tenant platform, marketplace, factory planning engine, payroll, CRM scoring or custom social network. Owner-confirmed 10 October 2026 (approval of Plans 2026).
- **First release:** the launch core in [PRODUCT-SPEC.md](../01-product/PRODUCT-SPEC.md#scope), proved through a limited pilot ([RELEASE-REPORT.md](../09-release/RELEASE-REPORT.md)).
- **Explicit exclusions:** framework migration, microservices, TypeScript or Laravel conversion, full accounting, and everything in the Defer row of the scope table ([DECISIONS.md](../08-change-management/DECISIONS.md), D-007).
- **Constraints:** Namecheap shared hosting with PHP and MySQL; pushing `main` deploys; credentials only in server `config.php` and GitHub secrets ([DEPLOYMENT.md](../07-operations/DEPLOYMENT.md)). Budget and dates: Unknown. Legal: Nigeria privacy review pending ([DATA-PRIVACY.md](../05-security/DATA-PRIVACY.md)).
- **Existing assets to preserve:** the React, Bootstrap, PHP and MySQL code; existing tailoring, customer, enquiry and CMS records; existing public URLs where practical. Keep the functional core, close unsafe data paths, connect the missing journeys and hide unused complexity rather than rebuilding (Plans 2026, 01 "Immediate interpretation").

## Fact register

| Statement | Status | Evidence or owner | Next check |
|---|---|---|---|
| Production confidence is PARTIAL | FACT | 10 October 2026 audit, [ROADMAP.md](../08-change-management/ROADMAP.md) | Staging walkthrough of critical flows |
| Deployed endpoint versions and live schema | UNKNOWN | Finding A02, A20 | Approved read-only server review |
| Plans 2026 is the plan of record | DECISION | Owner, 10 October 2026, D-012 | None |
| Garment range, hours, capacity, terms | UNKNOWN | Owner | Owner decision list |

## External references

These informed the approved plan. They do not show that the app already meets them.

| Source | Used for |
|---|---|
| [getdesign registry](https://www.npmjs.com/package/getdesign?activeTab=code) | The Tesla style reference behind [DESIGN-SYSTEM.md](../03-design/DESIGN-SYSTEM.md); Context7 had no getdesign library, so the registry and the downloaded reference were used |
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
