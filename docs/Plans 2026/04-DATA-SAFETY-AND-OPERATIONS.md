# Data safety and operational readiness

## Principles

Use one database, the current PHP resource endpoints and the current API client. Add only the records needed for real workflows. Prepared statements and server role checks are useful existing safeguards, but do not prove object ownership, concurrency safety, private-file protection or recovery.

Treat phone numbers, addresses, measurements, messages and photos as private client information. Measurements are personal data when connected to a person; they are not automatically medical data. Do not collect identity documents simply to issue a client reference.

## Small coherent record model

| Record | Minimum contents | Relationships / invariants |
|---|---|---|
| Client | ID, readable reference, name, contact, preferences | Multiple jobs, approved measurement sets; phone not sole identity |
| Company | Name, authorised contact, invoice information | Linked people/jobs only as needed; no multi-tenant engine |
| Enquiry | Contact, service, brief, desired date, source, status, next follow-up | Optional client and converted job links; conversion idempotent |
| Quote/version | Work/items, amount/currency, terms, expiry, acceptance evidence | Job uses accepted version; edits produce a new version |
| Measurement set/version | Garment template, unit, values, source, date, approval | Job snapshot fixed at approval; pending client edits separate |
| Appointment | Type, start/end/timezone, buffer, status, client/job link | Server reserves one owner resource; no overlap among active reservations |
| Job | Reference, client/company, item/garment, scope, promised date, stage, next action | Existing tailoring records extended rather than replaced wholesale |
| Job item/member | Quantity or wearer link, snapshot, progress | Add only for multi-person/company jobs; privacy per wearer |
| Payment | Amount/currency, method, date, external ref, receipt, reversal link | Append ledger, unique request key, verified settlement |
| Message/note | Job/client link, author, public/internal, channel, time, delivery status | Only explicit client-visible messages leave private admin boundary |
| Delivery/collection | Method, date, carrier/reference, quantities, evidence | Partial fulfilment explicit; agreed address changes reviewed |
| Feedback/consent | Private comment, rating, publication choice, photo permission | Public review is curated separately |
| Portfolio/publication | Public images, copy, service, slug/status | No live projection of private notes; optional internal job reference |
| Activity history | Actor, action, target, time, minimal change summary | Do not copy full bodies/tokens/measurements into general logs |

Use database constraints for unique references and request IDs, foreign keys where practical and transactions for logically inseparable writes. Use a simple version/updated-at check when two screens edit a record: return a conflict and ask the owner to reload/review rather than silently overwriting another edit.

Record transitions centrally, validate them server-side, and expose consistent labels through the API. Do not duplicate stage logic across Jobs, Today and customer tracking. Stored timestamps are unambiguous; display operational dates in Africa/Lagos. Monetary calculations use consistent decimal/minor-unit rules, not ad hoc browser floats.

## Access and session requirements

Owner access covers business records and settings. Future helpers get only the specific needed functions, with no finance/export access by default. Do not introduce staff roles now just because old schemas have them. Retain tested server authorisation and prevent last-owner lockout.

Customer and company access must check ownership on every request, including detail, measurement, message, quote, attachment and export. UI hiding is not enforcement. References must never let one company contact read unrelated clients or wearer measurements.

Protect login, reference lookup, verification and public writes with throttles (verified: customer login and public tracking have none today, A03), generic failures, payload limits and server validation. Existing staff-login throttling does not establish customer login/public-form protection. Do not use CAPTCHAs until observed abuse justifies them; honeypot plus request limits is a simpler start.

Prefer a reviewed session strategy that reduces JavaScript-readable bearer tokens, with secure, HttpOnly cookies where appropriate, explicit expiry and revocation. Cookie auth requires a deliberate CSRF design and same-origin/staging configuration. Do not switch token handling blindly or assume SameSite solves every request type. HTTPS, production debug off, restricted origins and no token logging are prerequisites. Restricted origins means removing the localhost allowance that _lib.php:48-52 currently applies in production (A15).

Owner recovery must be usable and tested without bypassing access control. Assess MFA based on hosting/app capability before launch; at minimum protect hosting, source control, mailbox and social accounts with their supported MFA and recovery methods. Keep recovery codes outside repository and app content.

## Private files and CMS safety

Store private client reference images/proof outside the public document root or behind authenticated download handling. Validate actual MIME and allowed extensions, limit size/count, randomise storage names, disallow execution and avoid inline rendering of active content. Initial uploads can be JPEG/PNG/WebP and PDF only where necessary. Strip location metadata from public images and keep public derivatives separate.

Fix the blog update bind mismatch (content.php:75, A21) in the same safety batch, so publishing edits work before content is relied on. Sanitise allowed rich text on the server, limit tags/attributes, prohibit script/events/unsafe URLs and verify previews. Treat staff-entered content as untrusted for rendering. Attachments should never be accessible solely by guessing a filename. CSV exports need formula-injection protection; privileged exports are logged and downloaded securely.

## Nigeria privacy and operating policies

The confirmed Lagos business needs a Nigeria-focused privacy review. NDPC's Act and current guidance are the starting sources. Do not import UK-only rules or claim exemption based solely on being a sole trader. Confirm applicable registration/compliance obligations against the actual scale/categories of data and current NDPC guidance before launch.

Prepare a short privacy notice: who operates the business, what is collected, why, service providers, disclosure/transfers, retention, rights and contact. Choose and document lawful grounds for service records separately from marketing consent. Obtain separate permission for portfolio/review publication and avoid bundling it into order acceptance.

Set justified retention periods by record type. Proposal for owner/legal review: short expiry/review for abandoned enquiries; periodic review of inactive measurement profiles and project reference images; financial evidence retained for the applicable statutory requirement. Exact periods remain undecided until business/legal requirements are confirmed. Do not keep everything forever or promise immediate deletion of records legally required to remain.

Support a manual request workflow for access/correction/deletion with identity verification and a logged decision. Remove/anonymise eligible data in the live database, exports and scheduled backup rotation, while documenting lawful exceptions. Keep a concise incident response contact/checklist and verify notification obligations if an incident occurs.

No private customer content should be sent to OpenRouter/image AI by default. Public draft copy can be an optional owner-reviewed tool. Document providers and international transfer arrangements if any customer processing is approved later. The research here is a launch planning input, not a compliance certification.

## Environments and deployment

1. Establish a non-production environment with synthetic clients and no real payment/email/WhatsApp actions. Confirm API URL, database and sender mode visibly before tests.
2. Compare required endpoint names and schema versions with the approved release manifest. Do not copy config.php or discover credentials through this audit.
3. Retain versioned SQL changes in php-api. Record applied versions and dependencies. CREATE TABLE IF NOT EXISTS alone does not upgrade existing columns or make every rerun safe.
4. Make application and required PHP release versions consistent. Verified 10 October 2026: deploy.yml copies 9 PHP files, so 22 of the 31 endpoints (all but config.sample.php) reach the server only by hand (A02). The release manifest must list every endpoint still in use and say which are retired. Do not glob-upload all files, schemas/tests/sample config. Include an explicit endpoint list and exclude private files.
5. Align CI/deploy runtime and required checks. Include meaningful JS/JSX lint, PHP syntax/helper tests and critical flow tests. Branch protection and deploy sequencing must be verified in the remote environment when authorised.
6. Before any production mutation: snapshot database/files, verify restoration route, record current version, use backward-compatible schema changes, and prepare maintenance/read-only handling.
7. After release: verify login, enquiry, booking, client isolation, measurement snapshot, quote, payment, message and delivery using designated test records. Confirm rollback triggers and monitoring.

No remote Git operations were performed during this planning audit. Pushing main triggers deployment, so committing/pushing is not a routine next step here.

## Backups and recovery

Proposed target to confirm with the hosting plan: daily encrypted database and private-file backup, separate from the live host; retention with recent daily and longer periodic copies. Start with recoverable 24-hour maximum data loss and a four-hour restoration target only if realistically supported. These are proposed objectives, not achieved guarantees.

Perform a restore into a separate environment, verify record counts and a linked client/job/payment/photo, and record time taken. Repeat after major storage/schema changes and periodically. A downloaded SQL file is not proof of a usable backup. Ensure backup credentials and encryption keys remain outside Git and are recoverable by the owner.

Keep a short runbook for host/database outage, accidental edit, payment mismatch, failed reminders and suspected data exposure. During outages block unsafe writes, retain unsent form values temporarily in memory and tell the user what happened. Do not persist private drafts on shared devices by default.

## Monitoring without an operations platform

Use hosting error logs, a simple public uptime check and an owner-visible list of failed notifications. Log request IDs, endpoint/error category and minimum useful context, never tokens or full measurement bodies. Weekly review: unread enquiries, overdue jobs, pending payment reconciliation, failed messages and successful backup status. Monthly: restore sample, accounts/access and published service promises.

## Launch verification matrix

| Scenario | Required proof |
|---|---|
| Client isolation | Two synthetic customers; swapping every relevant ID/ref fails safely |
| Company isolation | Organiser cannot read individual measurements or other company's job |
| Booking integrity | Simultaneous slot requests, cancellation/reschedule and expiry behave atomically |
| Measurement integrity | Approved job stays unchanged after profile update; units remain correct |
| Record conversion | Retried enquiry conversion yields one linked job |
| Payment integrity | Retry/concurrency/reversal/overpayment totals and receipts match |
| Rich text/files | Script/unsafe URL and unexpected upload denied; private files need auth |
| Session recovery | Expired/revoked token blocked; owner recovery works |
| Failure handling | Offline, API timeout, failed email and missing config show plain truthful states |
| Publication | Drafts private; unpublish effective; invalid URL rejected |
| Recovery | Backup restored and records/files verified in separate environment |
| Release | Required endpoint/schema version matches build; rollback rehearsed |

Current status of this matrix: NOT TESTED. Pure helper tests and syntax checks do not substitute for it.
