# UX Specification

This file owns navigation, the screen-by-screen purpose and primary action, required states, and the form, data and modal patterns. Journeys behind each screen are in [USER-JOURNEYS.md](../01-product/USER-JOURNEYS.md); visual tokens in [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md); public page content in [CONTENT.md](../01-product/CONTENT.md). Everything here is approved direction (Plans 2026, owner approval 10 October 2026); the current admin still uses the module menu listed in [ARCHITECTURE.md](../02-architecture/ARCHITECTURE.md#route-inventory).

## Daily navigation (app)

Core navigation: Today, Enquiries, Appointments, Clients, Jobs, Payments, Website. Settings sits separately (D-009).

| Screen or flow | Purpose | Primary action | Secondary action | Required states | Mobile decision | Desktop decision |
|---|---|---|---|---|---|---|
| Today | Appointments today, overdue jobs, next deliveries, unread enquiries and messages, outstanding balances | Add enquiry or job | Open the item due next | Loading, empty (one next step), error | Bottom navigation item | Sidebar item, default view |
| Enquiries | New, awaiting reply, quote sent, accepted, closed | Reply or prepare quote | Convert to client and job | Loading, empty, error with Retry (A17) | Under More | Sidebar |
| Appointments | Today and week list, availability and blocked time | Book appointment | Set availability | Loading, empty, conflict, error | Bottom navigation item | Sidebar |
| Clients | Search by name, phone, client ID or company | Add client | Open measurements | Loading, empty, duplicate warning, error | Under More | Sidebar |
| Jobs | Active jobs, due date, next action and progress | Add job | Move to next stage | Loading, empty, invalid transition, error | Bottom navigation item | Sidebar |
| Payments | Due balances, received payments, receipts | Record payment | Print receipt | Loading, empty, duplicate refused, error | Under More | Sidebar |
| Website | Services, portfolio, reviews, business details, optional Journal | Preview or publish | Unpublish | Draft, published, failed publish | Under More | Sidebar |
| Settings | Business details, hours, availability defaults | Save | None | Saving, saved, failed | Under More | Separate from core items |

Purpose and primary action for the seven core screens come from the approved plan. Secondary actions, the per-screen state lists and the Settings row are Proposed, derived from the journeys, and need the owner's review in Phase 2.

On a phone, show Today, Jobs, Appointments and More. The daily page answers "What do I need to do next?" without revenue charts or setup prompts. Desktop uses a predictable sidebar with a clear current location.

## Public navigation

Services, Our work, How it works, About, Contact, with a Book appointment button and a quieter Track your job link. The mobile menu shows both actions; navigation collapses to a menu below 768px. The header gains an opaque background whenever imagery would reduce text contrast. Page-by-page content: [CONTENT.md](../01-product/CONTENT.md#site-architecture).

## Required states

Every screen and journey defines: loading; empty (one clear next step); success; validation error (inline plus summary, typed values kept); service error (plain message, Retry, technical detail in logs or console only); permission denied (plain message, no data leak); offline (writes blocked, see [OFFLINE-SPEC.md](../04-pwa/OFFLINE-SPEC.md)); session expired (sign in again without losing typed values where possible).

Key actions show saving and saved immediately; a failed form keeps what was typed; empty screens show one next step.

## Forms

Persistent labels; help or example text below the field; required fields marked; grouped sections; inline errors plus an error summary. Visible saving, saved and failed states. No placeholder-only fields. A failed submit keeps everything the person typed. Measurement inputs use a numeric keyboard, accept decimals and keep the unit visible. No editable spreadsheet for everyday measurement capture.

## Status, data and modals

- Status labels: pending, confirmed, due, overdue, ready, each as text plus icon plus colour ([DESIGN-SYSTEM.md](DESIGN-SYSTEM.md#status-colours-proposed)).
- Data: short readable rows or cards; clear amounts, units and dates; tabular figures; secondary data collapsed on phones.
- Modals: short actions only. Large client or job edits use full pages. Focus handling: [ACCESSIBILITY.md](ACCESSIBILITY.md).

## Interface writing

Sentence case, British and Nigerian spelling, Naira as `₦18,500`, and the other copy rules in [CONTENT.md](../01-product/CONTENT.md#copy-rules) apply inside the app as well.

Test comprehension, navigation, form recovery, session expiry and permission denial ([qa/UX-AUDIT.md](../../qa/UX-AUDIT.md)). Remove decorative complexity that competes with the user's next step.
