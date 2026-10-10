# Data Privacy

This file owns personal-data handling: categories, purposes, retention, rights requests, AI boundaries and the Nigeria privacy position. It is planning input from Plans 2026 (04), not a compliance certification; privacy and terms drafts need appropriate professional review.

## Position

- **Controller:** Herit Clothing, the owner's business in Lagos (Owner-confirmed 10 October 2026). Legal entity form, registration and contact details for the privacy notice: Unknown.
- **Jurisdiction:** Nigeria. The Nigeria Data Protection Act and current NDPC guidance are the starting sources ([PROJECT-CONTEXT.md](../00-foundation/PROJECT-CONTEXT.md#external-references)). Do not import UK-only rules or assume a sole-trader exemption. Confirm registration and compliance duties against the real scale and categories of data before launch. Status: Unknown, review not done.
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
| Messages and feedback | Service, quality | To decide | Client | Unknown | Owner | Manual request workflow |
| Public reviews and portfolio photos | Marketing | Separate consent (BR-33) | Client | While published | Public | Withdraw consent, unpublish |
| Marketing opt-in | Promotion | Consent, separate from service messages (BR-35) | Client | Until withdrawn | Owner | Unsubscribe |
| Staff accounts and audit log | Security | To decide | Owner | Unknown | Owner | Not applicable |

Never keep everything for ever, and never promise immediate deletion of records the law requires to remain.

## Privacy notice

Prepare a short notice: who runs the business, what is collected and why, service providers, disclosures and transfers, retention, rights and contact. Choose lawful grounds for service records separately from marketing consent. Portfolio and review publication need separate permission, never bundled into order acceptance. Cookies and analytics: evaluate the actual position rather than assuming cookieless analytics needs no consent ([CONTENT.md](../01-product/CONTENT.md#analytics)).

## Rights requests and incidents

- A manual request workflow for access, correction and deletion, with identity verification and a logged decision. Remove or anonymise eligible data in the live database, exports and backup rotation, documenting lawful exceptions.
- Keep an incident contact and checklist, and verify notification obligations if an incident occurs ([MONITORING.md](../07-operations/MONITORING.md)).

## Processors and AI

- Processors in use when configured: hosting provider, mail host, Meta (WhatsApp Cloud API), payment gateway, OpenRouter and image AI providers ([INTEGRATIONS.md](../02-architecture/INTEGRATIONS.md)).
- No private customer content goes to OpenRouter or image AI by default. If customer processing is ever approved, document the providers and international transfer arrangements first.
