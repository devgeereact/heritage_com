# User Roles

This file owns who uses HeritOS and what each kind of person is for. The resource-by-resource matrix, including what the server enforces today, is in [PERMISSIONS.md](../05-security/PERMISSIONS.md). How each person signs in is in [AUTH-MODEL.md](../05-security/AUTH-MODEL.md).

## Approved direction (Plans 2026, owner approval 10 October 2026)

| Role | Purpose | May view | May create or change | May approve or delete | Enforcement |
|---|---|---|---|---|---|
| Owner | Runs the business day to day | All business records and settings | All business records and settings | Quotes, measurement proposals, payments, publication, overrides with reason | Server: `super_admin` today. Last-owner lockout protection must stay (Verified guard at `users.php:144-147`; runtime NOT TESTED) |
| Future helper | Optional assistant if the owner hires one | Only the functions they need | Only the functions they need | Nothing by default; no finance or export access by default | Server-side, least privilege. Do not add roles because old schemas have them |
| Client (customer) | Follows and acts on their own jobs | Own jobs, dates, quotes, payment summaries, public progress, messages | Messages, reschedule requests, address corrections, measurement proposals, feedback | Accept their own quote; nothing else ([BR-31](BUSINESS-RULES.md)) | Server ownership check on every request; target design in [AUTH-MODEL.md](../05-security/AUTH-MODEL.md#customers) |
| Company contact | Commissions garments for several wearers | Authorised parent jobs and agreed job-level information | Messages and requests on those jobs | Sample approval where agreed | Never individual wearer profiles ([BR-27](BUSINESS-RULES.md)) |
| Anonymous visitor | Learns about services, enquires, requests a slot | Public pages, free slots only | Enquiry, appointment request | Nothing | Throttles, honeypot, payload limits, generic responses |
| Service identities | GitHub Actions deploy; WhatsApp Cloud API webhook | Not applicable | Deploy uploads `dist/` and nine PHP files; webhook posts inbound messages | Not applicable | FTP secrets in GitHub only. The webhook is public and unauthenticated by design (`whatsapp.php:12-16`); `WHATSAPP_VERIFY_TOKEN` in server config |

## Current implementation (Verified 10 October 2026)

Seven staff roles exist: `super_admin`, `admin`, `manager`, `tailor`, `editor`, `seller`, `employee` (`src/helpers/roles.js:47`). In solo mode only the owner account is expected to be active; staff management is hidden in the target design but backend controls stay. Customers sign in through `account.php`; there is no company-contact login yet. Denial behaviour must be explicit and tested; current status NOT TESTED.
