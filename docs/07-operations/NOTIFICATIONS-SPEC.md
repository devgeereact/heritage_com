# Notifications Specification

This file owns which messages HeritOS sends to customers, through which channel, and the rules for them. Email mechanics are in [EMAIL-SPEC.md](EMAIL-SPEC.md); the WhatsApp boundary is in [INTEGRATIONS.md](../02-architecture/INTEGRATIONS.md). Default to the least interruptive channel.

## Current sends (Verified from source, 10 October 2026)

All current customer messages go through `wa_dispatch()` (`_lib.php:173`): the Meta Cloud API when `WHATSAPP_TOKEN` is set, otherwise the message is logged and offered to staff as a wa.me link. Each send is recorded in `whatsapp_messages` with its template name and status (`_lib.php:193`).

| Event | Audience | Channel | Timing | Preference | Duplicate control | Failure path |
|---|---|---|---|---|---|---|
| `order_confirmation` (`store.php:400`) | Shop customer | WhatsApp | On checkout | None | None verified | Logged; wa.me fallback |
| `dispatch` (`orders.php:219`) | Retail customer | WhatsApp | When staff mark an order dispatched | None | None verified | Logged; wa.me fallback |
| `tailoring_reminder` (`tailoring.php:327`) | Tailoring client | WhatsApp | Staff action | None | None verified | Logged; wa.me fallback |
| `restock` (`engage.php:70`) | Waitlist customer | WhatsApp | Staff action | Joined waitlist | None verified | Logged; wa.me fallback |
| `abandoned_cart` (`engage.php:111`) | Shop visitor | WhatsApp | Staff action | None | None verified | Logged; wa.me fallback |
| Manual message (`whatsapp.php:153`) | Any customer | WhatsApp | Staff action | None | None | Logged; wa.me fallback |
| `broadcast` (`whatsapp.php:177`) | Many customers | WhatsApp | Staff action | None verified | None verified | Logged per recipient |

Restock, abandoned-cart and broadcast messages are promotional; under the approved plan promotions and re-engagement are deferred ([PRODUCT-SPEC.md](../01-product/PRODUCT-SPEC.md#scope)) and any bulk or promotional send needs an owner check and marketing consent ([BR-35](../01-product/BUSINESS-RULES.md)).

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

All need an owner check before bulk or promotional sending. Templates must never promise automatic sync of personal WhatsApp. Owner-visible list of failed notifications: [MONITORING.md](MONITORING.md). Channels, timing, quiet periods and expiry for each template: Unknown until Phase 2 and 3 design.
