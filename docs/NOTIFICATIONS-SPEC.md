# Notifications Specification

This file owns which messages HeritOS sends to customers, through which channel, and the rules for them, and how email is sent and read (under [Email](#email)). Setting names are in [DEPLOYMENT.md](DEPLOYMENT.md#server-configuration); the WhatsApp boundary is in [ARCHITECTURE.md](ARCHITECTURE.md#integrations). Default to the least interruptive channel.

## Current sends (Verified from source, 10 October 2026)

All current customer messages go through `wa_dispatch()` (`_lib.php:173`): the Meta Cloud API when `WHATSAPP_TOKEN` is set, otherwise the message is logged and offered to staff as a wa.me link. Each send is recorded in `whatsapp_messages` with its template name and status (`_lib.php:193`).

| Event | Audience | Channel | Timing | Preference | Duplicate control | Failure path |
|---|---|---|---|---|---|---|
| `order_confirmation` (`store.php:400`) | Shop customer | WhatsApp | On checkout | None | None verified | Logged; wa.me fallback |
| `dispatch` (`orders.php:219`) | Retail customer | WhatsApp | When staff mark an order dispatched | None | None verified | Logged; wa.me fallback |
| `tailoring_reminder` (`tailoring.php:712`) | Tailoring client | WhatsApp | Staff action | None | None verified | Logged; wa.me fallback |
| `restock` (`engage.php:70`) | Waitlist customer | WhatsApp | Staff action | Joined waitlist | None verified | Logged; wa.me fallback |
| `abandoned_cart` (`engage.php:111`) | Shop visitor | WhatsApp | Staff action | None | None verified | Logged; wa.me fallback |
| Manual message (`whatsapp.php:153`) | Any customer | WhatsApp | Staff action | None | None | Logged; wa.me fallback |
| `broadcast` (`whatsapp.php:177`) | Many customers | WhatsApp | Staff action | None verified | None verified | Logged per recipient |

Restock, abandoned-cart and broadcast messages are promotional; under the approved plan promotions and re-engagement are deferred ([PRODUCT-SPEC.md](PRODUCT-SPEC.md#scope)) and any bulk or promotional send needs an owner check and marketing consent ([BR-35](BUSINESS-RULES.md)).

## Planned job templates (Plans 2026, approved 10 October 2026)

| Event | Audience | Channel | Timing | Preference | Duplicate control | Failure path |
|---|---|---|---|---|---|---|
| Enquiry acknowledgement | Visitor | On screen; message channel to decide | On submit | Service message | One per enquiry | Shown on screen regardless |
| Quote ready | Client | To decide | Owner sends | Service message | One per quote version | Failed shown to owner |
| Appointment confirmation | Client | To decide | Owner confirms | Service message | One per confirmation | Failed shown; booking stays valid (BR-15) |
| Fitting reminder | Client | To decide | Before fitting; timing Unknown | Optional | One per appointment | Queued, sent, failed or manual recorded (BR-15) |
| Delay update | Client | To decide | Owner sends | Service message | Owner judgement | Failed shown to owner |
| Ready for collection | Client | To decide | Job reaches ready | Service message | One per job | Failed shown to owner |
| Balance reminder | Client | To decide | Owner sends | Service message | Owner judgement | Failed shown to owner |
| Feedback request | Client | To decide | After handover | Service message | One per job | Failed shown to owner |

All need an owner check before bulk or promotional sending. Templates must never promise automatic sync of personal WhatsApp. Owner-visible list of failed notifications: [DEPLOYMENT.md](DEPLOYMENT.md#monitoring). Phase 2 sends no new automatic messages. Channels, timing, quiet periods and expiry for each template: Unknown until Phase 3 design.

## Email

- **Applicability:** Applicable, staff-initiated only. The app has no automatic transactional email today (Verified: no endpoint calls `mail.php` or `smtp_send()` outside `mail.php` itself).
- **Verified sender and reply addresses:** mailbox hello@heritclothing.com on the hosting mail server (recorded previously; the live `SMTP_FROM` value is Unknown). `mail.php` sends from `SMTP_FROM`, falling back to `SMTP_USER`, with display name `SMTP_FROM_NAME` (default "HeritOS") and `Reply-To` defaulting to the sender (`mail.php:36-46`). SPF, DKIM and DMARC for the domain: Unknown.
- **Sending:** `POST /mail.php?action=send` with `to`, `subject`, `body` and optional `cc`, `reply_to`, `in_reply_to`, `references` for threading (`mail.php:5-6`). Hand-rolled SMTP client (SSL 465, STARTTLS 587, AUTH LOGIN); blank `SMTP_HOST` falls back to PHP `mail()`. Every send is written to the audit log (`mail.php:73`).
- **Reading:** `inbox.php` over IMAP (PHP imap extension): list, get, mark seen. Returns a clean 501 when `IMAP_HOST` is blank.
- **Transactional messages and triggers:** none automatic today. The planned job templates (quote ready, appointment confirmation and the rest) are channel-neutral and listed in [NOTIFICATIONS-SPEC.md](NOTIFICATIONS-SPEC.md); whether any of them goes by email is not decided.
- **Consent and unsubscribe rules:** service messages and marketing opt-in are kept apart ([BR-35](BUSINESS-RULES.md)). No marketing email exists; any future marketing email needs consent and an unsubscribe route.
- **Delivery, bounce and complaint monitoring:** none. A send that fails returns an error to the staff user (502 for `mail()` failure, `mail.php:64`); bounces arrive in the mailbox only.
- **Failure and retry behaviour:** no automatic retry. Delivered, failed and manual are distinct states in the target design ([PRODUCT-SPEC.md](PRODUCT-SPEC.md#what-happens-to-each-existing-area)). In local staging, PHP `mail()` writes to `scripts/staging/.logs/mail.log`.

Never invent identity, contact or legal details in email content.
