# HeritOS documentation

All substantive project documentation lives flat in this folder. Each fact has one home; other files link to it rather than repeat it. The owner approved this structure with the Plans 2026 package on 10 October 2026.

## Where each fact lives

| File | Owns |
|---|---|
| [PRODUCT.md](PRODUCT.md) | Business scope, owner decisions with dates, services to confirm, daily navigation, journeys, feature priorities, what happens to each existing area, superseded old-plan decisions, remaining owner decisions |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Runtime, PHP endpoint pattern, auth and roles, access and file-safety requirements, API, route and table inventories, data model target, integration boundaries, CMS-to-website links |
| [DESIGN.md](DESIGN.md) | The design contract: tokens with measured contrast, type, spacing, controls, forms, status, navigation, motion, responsive checks, photography, Tesla reference and every deviation |
| [OPERATIONS.md](OPERATIONS.md) | Hosting, local setup, checks, CI and deploy truth, server config settings, schema import, branches and machines, staging, release, rollback, backup, monitoring, launch verification matrix, privacy notes, troubleshooting |
| [CONTENT-AND-SOCIAL.md](CONTENT-AND-SOCIAL.md) | Website positioning and page plan, claims being removed, copy and photography rules, SEO and performance, social profile drafts, publishing rhythm, moderation |
| [ROADMAP.md](ROADMAP.md) | Phases 0 to 7 with evidence and status, findings A01 to A24 with status, owner usability review, release decision, baseline evidence, deletion candidates |

Outside this folder:

| File | Role |
|---|---|
| [../AGENTS.md](../AGENTS.md) | Shared agent entry: read order, commands, safety rules |
| [../CLAUDE.md](../CLAUDE.md) | Claude Code project memory: essentials every session |
| [../CODEX.md](../CODEX.md) | Codex adapter |
| [../README.md](../README.md) | Repository front page |
| [../.agent/PROJECT.yml](../.agent/PROJECT.yml) | GEE OS routing and risk |
| [../.agent/CURRENT-TASK.md](../.agent/CURRENT-TASK.md) | Current task contract and scope |
| [../.agent/MCP-PROFILE.yml](../.agent/MCP-PROFILE.yml) | Integration authority |
| [../php-api/README.md](../php-api/README.md) | Server file notes. Its claim that no PHP is auto-deployed is stale (finding A19); [OPERATIONS.md](OPERATIONS.md#ci-and-deploy) is correct. |
| Source code | The evidence of what is built. Documentation is checked against it. |

## Confidence labels

Statements carry one of four labels: **Verified** (checked in the repository, file and line cited), **Owner-confirmed** (stated by the owner, with the date), **Proposed** (agreed direction whose exact detail still needs the owner or a test), **Unknown** (needs the owner, the live server or a test). Runtime claims use PASS, FAIL, PARTIAL, NOT APPLICABLE, NOT TESTED or BLOCKED.

## Superseded files

This file is superseded, kept for reference and a deletion candidate pending owner approval. It is not a live source for anything; do not act on it.

| File | What it was | Replaced by |
|---|---|---|
| `GEE-OS.md` | GEE OS adoption note at version 0.9.0 with a provisional source map | This file and [../AGENTS.md](../AGENTS.md) |

Deleted on 10 October 2026 with owner approval (still in Git history): `features.md`, `nav-map.md`, `seo-analytics.md`, `brief.json`, `HeritOS.html` and the root `../HeritOS.html`. They described a different stack (React with TypeScript, a Laravel API on a subdomain, eight roles, multicurrency, offline POS); their still-valid decisions live in [PRODUCT.md](PRODUCT.md), [DESIGN.md](DESIGN.md) and [CONTENT-AND-SOCIAL.md](CONTENT-AND-SOCIAL.md).

The root `DESIGN-SYSTEM.md` has been removed; [DESIGN.md](DESIGN.md) holds every fact from it that is still valid. The temporary `Plans 2026` folder was removed on 10 October 2026 after every section was mapped into these docs.

## External references

These informed the approved plan. They do not show that the app already meets them.

| Source | Used for |
|---|---|
| [getdesign registry](https://www.npmjs.com/package/getdesign?activeTab=code) | The Tesla style reference behind DESIGN.md |
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
