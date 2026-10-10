# Permissions

This file owns the resource-by-role access rules: the approved target, and what the client and server enforce today. Roles and their purpose are in [USER-ROLES.md](../01-product/USER-ROLES.md). Default to deny until a business rule grants access.

## Approved target (Plans 2026, approved 10 October 2026)

| Role | Resource | Read | Create | Change | Delete | Approve | Server policy | Test |
|---|---|---|---|---|---|---|---|---|
| Owner | All business records and settings | Allow | Allow | Allow | Allow (history kept; payments reversed, never deleted, BR-21) | Allow | `require_auth` with the owner role | Required |
| Future helper | Only the functions granted | Granted only | Granted only | Granted only | Deny | Deny | Least privilege; no finance or export by default | Required |
| Client | Own jobs, quotes, payment summaries, messages, appointment requests | Own only | Messages, requests, proposals | Own proposals only | Deny | Own quote acceptance | Ownership check on every request | Cross-customer swap test |
| Client | Own measurements | Own only | Proposals only (BR-07) | Deny | Deny | Deny | Ownership check | Required |
| Company contact | Authorised parent jobs | Agreed job-level fields | Messages, requests | Deny | Deny | Sample approval where agreed | Ownership check; no wearer profiles (BR-27) | Company isolation test |
| Anonymous | Public pages, free slots | Public projection only | Enquiry, slot request | Deny | Deny | Deny | Throttle, honeypot, validation | Required |

## Current enforcement (Verified 10 October 2026)

The server enforces staff access with `require_auth($roles)` in each endpoint; the file-level role lists are in [API-SPEC.md](../02-architecture/API-SPEC.md#endpoint-inventory). `src/helpers/roles.js` only hides menu items and blocks routes in the UI; anything it does not list defaults to admin-only (`roles.js:11-44`). The Permissions page is generated from roles.js, so it cannot drift from client gating, but it does not show server rules.

Client and server lists disagree in four places (Verified from source; behaviour NOT TESTED; tracked as K-01 in [KNOWN-ISSUES.md](../../KNOWN-ISSUES.md)):

| Section | Client (`roles.js`) | Server (file-level gate) | Effect |
|---|---|---|---|
| Tailoring | super_admin, admin, manager, tailor | `tailoring.php:17` adds employee | Employee is refused the page but allowed by the API |
| Catalogue | adds editor, employee, seller | `products.php:18` has no seller | Seller sees the page; API refuses |
| Content | super_admin, admin, manager, editor | `content.php:19` has no editor | Editor sees the page; API refuses |
| Dashboard | all seven roles | `stats.php:10` has no seller | Seller's dashboard numbers fail to load |

Customer access today: `account.php` checks the customer token but not yet the full ownership model above (A03, A09, A10).

Test allowed and forbidden cross-user and cross-role cases against the real data boundary before any release ([LAUNCH-CHECKLIST.md](../09-release/LAUNCH-CHECKLIST.md)).
