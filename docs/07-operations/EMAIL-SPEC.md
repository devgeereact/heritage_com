# Email Specification

This file owns email sending and reading. Setting names are in [DEPLOYMENT.md](DEPLOYMENT.md#server-configuration); the provider boundary is in [INTEGRATIONS.md](../02-architecture/INTEGRATIONS.md).

- **Applicability:** Applicable, staff-initiated only. The app has no automatic transactional email today (Verified: no endpoint calls `mail.php` or `smtp_send()` outside `mail.php` itself).
- **Verified sender and reply addresses:** mailbox hello@heritclothing.com on the hosting mail server (recorded previously; the live `SMTP_FROM` value is Unknown). `mail.php` sends from `SMTP_FROM`, falling back to `SMTP_USER`, with display name `SMTP_FROM_NAME` (default "HeritOS") and `Reply-To` defaulting to the sender (`mail.php:36-46`). SPF, DKIM and DMARC for the domain: Unknown.
- **Sending:** `POST /mail.php?action=send` with `to`, `subject`, `body` and optional `cc`, `reply_to`, `in_reply_to`, `references` for threading (`mail.php:5-6`). Hand-rolled SMTP client (SSL 465, STARTTLS 587, AUTH LOGIN); blank `SMTP_HOST` falls back to PHP `mail()`. Every send is written to the audit log (`mail.php:73`).
- **Reading:** `inbox.php` over IMAP (PHP imap extension): list, get, mark seen. Returns a clean 501 when `IMAP_HOST` is blank.
- **Transactional messages and triggers:** none automatic today. The planned job templates (quote ready, appointment confirmation and the rest) are channel-neutral and listed in [NOTIFICATIONS-SPEC.md](NOTIFICATIONS-SPEC.md); whether any of them goes by email is not decided.
- **Consent and unsubscribe rules:** service messages and marketing opt-in are kept apart ([BR-35](../01-product/BUSINESS-RULES.md)). No marketing email exists; any future marketing email needs consent and an unsubscribe route.
- **Delivery, bounce and complaint monitoring:** none. A send that fails returns an error to the staff user (502 for `mail()` failure, `mail.php:64`); bounces arrive in the mailbox only.
- **Failure and retry behaviour:** no automatic retry. Delivered, failed and manual are distinct states in the target design ([PRODUCT-SPEC.md](../01-product/PRODUCT-SPEC.md#what-happens-to-each-existing-area)). In local staging, PHP `mail()` writes to `scripts/staging/.logs/mail.log`.

Never invent identity, contact or legal details in email content.
