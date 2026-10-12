# UX Specification

This file owns navigation, the screen-by-screen purpose and primary action, required states, and the form, data and modal patterns. Journeys behind each screen are in [USER-JOURNEYS.md](USER-JOURNEYS.md); visual tokens in [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md); public page content in [CONTENT.md](CONTENT.md). The target below is approved direction (Plans 2026, owner approval 10 October 2026). What exists in code is under [As built (Phase 2)](#as-built-phase-2).

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

Purpose and primary action for the seven core screens come from the approved plan. Secondary actions, the per-screen state lists and the Settings row are Proposed, derived from the journeys; the owner usability review of the built screens is still to run ([qa/FUNCTIONAL-AUDIT.md](../qa/FUNCTIONAL-AUDIT.md#usability)).

On a phone, show Today, Jobs, Appointments and More. The daily page answers "What do I need to do next?" without revenue charts or setup prompts. Desktop uses a predictable sidebar with a clear current location.

### As built (Phase 2)

Built on `feat/phase2-daily-records` (PR #9, open), 10 October 2026. Routes are registered in `src/routes/index.jsx`, the menu in `src/assets/data/menu-items.js`, the phone bar in `src/components/layout/BottomNav.jsx`, and access in `src/helpers/roles.js`.

- **Sidebar (laptop, 992px and wider):** DAILY: Today `/today`, Enquiries `/enquiries`, Appointments `/appointments`, Clients `/clients`, Jobs `/jobs`, Payments `/payments`, Website `/website` (owner roles and editor; since `feat/phase4-website`, before that `/content`). SETTINGS: Settings `/settings`. A collapsed **More tools** group holds Reports `/reports` (the old dashboard), Finance, Catalogue, Orders, Market Sales, Inventory, Suppliers, Marketing, Brand Studio, Analytics, Re-engagement, Loyalty and Gifts, Coupons, Reviews, Journal and testimonials (`/content`), Inbox, WhatsApp, Weather and Ops, Team and Access, Permissions, Store and Channels, and Profile. Nothing was removed.
- **Phone (below 992px):** bottom bar with Today, Jobs, Appointments and More. More opens a bottom sheet with Enquiries, Clients, Payments, Website, Settings, More tools (opens the sidebar) and Sign out. Items follow the role rules. The sidebar closes after navigating and no longer opens by itself.
- **Landing after sign-in:** owner roles go to Today; tailors to Jobs; employees to Enquiries; editors to Catalogue; sellers to WhatsApp. Sign-in returns to the deep link that was requested.
- **Old URLs redirect** with their parameters and query: `/dashboard` to `/today`, `/tailoring` to `/jobs`, `/tailoring/groups` to `/jobs/groups`, `/tailoring/:id` to `/jobs/:id`, `/crm` to `/clients`, `/crm/:id` to `/clients/:id`.
- **Detail pages:** `/enquiries/:id`, `/enquiries/:id/convert` (three-step wizard), `/clients/:id` (Jobs, Measurements, Payments for owners, Details; Messages disabled until Phase 3), `/clients/:id/measurements/new`, `/jobs/:id` (Overview, Measurements, Quote and Payments for owners, Handover, Timeline), `/print/:doc/:id` for quote, invoice, receipt and measurement sheet.
- **Appointments** was a placeholder in Phase 2; Phase 3 replaces it (below).
- **Role parity (K-01):** each section opens only for roles that every endpoint the page needs accepts (`src/helpers/roles.js`). Tailors never see money tabs or amounts.
- **Patterns used:** one amber primary action per screen with ink text; 16px inputs and 44px targets; persistent labels with help text; inline errors plus a summary; saving, saved and failed lines; typed values kept on failure; status chips as text, icon and colour; tabular figures for money; dates in Lagos time; modals only for short actions (add enquiry, add client, add job, record payment, approve or reject measurements, reverse an entry); measurement entry, conversion and settings are full pages.

### As built (Phase 3)

Built on `feat/phase3-appointments-portal`, 11 October 2026. Browser journeys at 390px and 1280px: [qa/FUNCTIONAL-AUDIT.md](../qa/FUNCTIONAL-AUDIT.md#phase-3-journeys-in-the-browser-11-october-2026).

- **Navigation:** Messages `/messages` joins the DAILY sidebar group after Appointments and the phone More sheet after Enquiries (owner roles). The bell counts new enquiries plus unread client messages and links to Messages.
- **Appointments `/appointments`:** primary action Book appointment. Tabs: Schedule (a seven-day week strip with counts, Day or Week list, previous, today and next week, a switch to show cancelled and expired), Requests (owner; confirm in one tap or decline with a reason; the tab shows the count) and Blocked time (whole days or times with a reason; existing bookings inside a block are reported, not moved). Each appointment opens a short dialog with details, history (from and to status or time, reason, who) and the actions its status allows: confirm, decline, mark completed, no-show, cancel with a reason, and move with a reason. Booking and moving offer free times from the slot list, a typed time, or a whole day; a typed time that clashes shows what clashes and asks for a reason before "Book anyway" or "Move anyway". `?id=` opens one appointment; `?tab=` and `?date=` keep the view. Tailors see the schedule only. `/apps/calendar` redirects here.
- **Settings:** an Availability section (`/settings#availability`): working windows per weekday, where breaks are the gaps between windows; lengths per type; gap between appointments, minimum notice, horizon, request hold and start-time step; which types clients can request; and the online request switch with a plain explanation that every request waits for the owner. Server errors (400) show per field and in a summary. A Client portal section holds session length, quote acceptance and measurement visibility switches, and the two feedback consent wordings.
- **Messages `/messages`:** tabs Conversations (jobs with messages, unread first, with counts), Change requests (open ones, each decided in place) and Feedback (rating, comment, the three consents, follow-up, and Add to testimonials only when publication consent, a rating and a comment exist).
- **Job detail:** a Messages tab for owner roles, after Overview: open change requests first, then the conversation. Internal notes have a grey dashed style and the label "Internal note, client cannot see this". Compose chooses Client (reply, by portal, WhatsApp, email, or a record of a phone call or visit) or Internal note. Opening the tab marks client messages read. Deciding a change request takes a reply, an optional price effect and new promised date; the server's 422 after cutting is shown in place.
- **Client detail:** Details shows Client portal access (Send access link, Sign out everywhere). The disabled Messages tab is gone; messages live on each job.
- **Access link dialog** (from a client or a Today row): Create link, then Send by WhatsApp, the message text to copy, and Copy link only. Nothing is sent automatically.
- **Today:** Appointments today lists real appointments (time, type, client); new blocks for appointment requests, unread messages, change requests, clients waiting for an access link (the row opens the access link dialog) and feedback to follow up.
- **Public `/book`:** shown in public navigation as Book appointment only while online requests are switched on and ready; otherwise the page says "Online booking is not open yet" with a link to Contact. Steps: type (skipped when only consultations are offered), time (free times grouped by day, Lagos time stated), details (name, phone or email, note, hidden honeypot), then "Request sent, not yet confirmed".
- **Public `/track` and `/account`:** a two-step access form (reference plus registered phone or email, then "Check your email" and a six-digit code field with a numeric keyboard and one-time-code autofill). Every reply is generic. `/track` keeps the older shop-order lookup under "Tracking a shop order?". `/account` shows the client's jobs (stage, promised date, paid and left to pay) and shop orders, sign out and sign out on all devices; the shop extras (reorder, returns, wishlist, birthday, referral) appear only while the shop is on. An invite link (`/account?invite=` or `/access/:invite`) is exchanged at once and taken out of the address bar.
- **Public `/account/jobs/:ref`:** progress and timeline, messages (send), appointments (ask for one, or ask to move one, from free times), ask for a change (garment, delivery address, other; the form says changes after cutting may change price or date), payments and receipts, the quote (accept only when the setting allows it, with a confirm box), measurements (own sets only when the setting allows; new measurements are always "for review") and feedback after handover (rating, comment, and separate choices for contact, publishing and photos, each with the owner's wording). Another client's reference, or a missing one, shows "We could not find that order". An ended session returns to the access form with a plain message.

## Public navigation

Services, Our work, How it works, About, Contact, with a Book appointment button and a quieter Track your job link. The mobile menu shows both actions; navigation collapses to a menu below 1024px (six links do not fit at 768px). The header is always opaque. Page-by-page content: [CONTENT.md](CONTENT.md#site-architecture).

As built (`feat/phase4-website`, 12 October 2026, D-024 and D-025): a thin contact bar (area, hours, phone) sits above the header from 1024px; the header shows at most four links (Services, Our work, How it works, About; Shop while the shop is on), each only while that page or list has published content (`site.php` config `nav` flags); then Track your job (from 1200px) and the primary button: Book a fitting while online requests are open, otherwise Request a fitting (to `/contact?type=fitting`). Company orders, Questions, Journal and Contact are in the menu sheet and the footer. The bag appears only while the shop is on. Footer (Footer 7 layout): brand, statement and verified socials; Explore (at most five published pages); Help (Track your job, Questions, Journal, Contact); Studio (filled-in details only); Privacy, Terms and the staff link inline in the bottom row.

Public pages on the CMS (as built): `/` Home (blended layout, D-023; hero D-025: dark animated slider with a floating outfit stack (home message, a service, company orders), principles row, services, story with checklist, process band on ink, our work, company orders, shop, reviews, questions, journal, closing band on ink; services, story, process and company sections use standing copy until their content is published; work, reviews, questions, journal and shop stay hidden while empty), `/services` (intro page, service cards; with no services only the intro and the actions), `/services/:slug` (summary, body, what's included, pricing note, process link, related work, "Ask about this service" to `/contact?service=`), `/work` (cards; service filter chips as `aria-pressed` buttons when two or more services have work), `/work/:slug` (first image eager, facts list, gallery figures, related service), `/how-it-works` and `/about` (CMS pages), `/company-orders` (CMS page above the brief form; the form works while the page is unpublished), `/contact` (CMS page when published, channels from the profile, the enquiry form always; `?type=fitting|company|general` preselects the subject and `?service=<slug>` names the service), `/faqs` (details and summary grouped by category, `FAQPage` JSON-LD), `/privacy` and `/terms` (title, effective date in `<time>`, body), `/journal` and `/journal/:slug` (only while `journal_enabled` is on and posts exist). Unpublished or unknown items show a not-found page with noindex; `?preview=1` with a staff session shows drafts under a "Preview, not published" bar.

## Required states

Every screen and journey defines: loading; empty (one clear next step); success; validation error (inline plus summary, typed values kept); service error (plain message, Retry, technical detail in logs or console only); permission denied (plain message, no data leak); offline (writes blocked, see [ARCHITECTURE.md](ARCHITECTURE.md#offline-behaviour)); session expired (sign in again without losing typed values where possible).

Key actions show saving and saved immediately; a failed form keeps what was typed; empty screens show one next step.

## Forms

Persistent labels; help or example text below the field; required fields marked; grouped sections; inline errors plus an error summary. Visible saving, saved and failed states. No placeholder-only fields. A failed submit keeps everything the person typed. Measurement inputs use a numeric keyboard, accept decimals and keep the unit visible. No editable spreadsheet for everyday measurement capture.

## Status, data and modals

- Status labels: pending, confirmed, due, overdue, ready, each as text plus icon plus colour ([DESIGN-SYSTEM.md](DESIGN-SYSTEM.md#status-colours-proposed)).
- Data: short readable rows or cards; clear amounts, units and dates; tabular figures; secondary data collapsed on phones.
- Modals: short actions only. Large client or job edits use full pages. Focus handling: [ACCESSIBILITY.md](ACCESSIBILITY.md).

## Interface writing

Sentence case, British and Nigerian spelling, Naira as `₦18,500`, and the other copy rules in [CONTENT.md](CONTENT.md#copy-rules) apply inside the app as well.

Test comprehension, navigation, form recovery, session expiry and permission denial ([qa/FUNCTIONAL-AUDIT.md](../qa/FUNCTIONAL-AUDIT.md#usability)). Remove decorative complexity that competes with the user's next step.

## Apple adaptation, 12 October 2026 (D-026)

The Home hero now presents one headline and one published CMS image, with a published-work image fallback and a text-only state. The primary label uses the existing short fitting action; its configured destination and booking rules do not change. The secondary action opens Our work when populated, otherwise Services or the configured company action. Autoplay, slide navigation and pointer tilt are removed. Public header routes, mobile menu behaviour and footer conditional links are retained.

Website hub adds three summaries from existing lists: content slots (including fixed keys not yet written), published records and records with drafts. View website opens `/` in a new tab. No new route, permission or endpoint is introduced. Editing, preview, publishing and existing safeguards remain the same. Shared shell, controls and content rows use the adapted design tokens.
