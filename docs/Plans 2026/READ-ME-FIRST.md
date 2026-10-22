> Plan of record approved 10 October 2026. Live status and any later decisions are in [docs/ROADMAP.md](../ROADMAP.md) and [DECISIONS.md](../DECISIONS.md); where they differ, those files win.

# Herit Clothing: Plans 2026

Prepared 10 October 2026. Baseline: main, d91951c. Status: PROPOSED, awaiting owner approval. Verification pass completed 10 October 2026 (see below). This folder is a planning package, not permission to implement or deploy.

## The recommendation

Make HeritOS a dependable daily assistant for one person running a men's fashion and tailoring business in Lagos. Keep the useful work already built. Put enquiries, appointments, clients, measurements, jobs, payments and delivery first. Make the website explain the real services and show real finished work. Accept company enquiries through a clear quotation and sample approval process rather than promising automatic bulk fulfilment.

The owner confirmed: Herit Clothing, Lagos, men's fashion and sewing. The exact garment range, business address, delivery coverage, appointment hours and company production capacity still need confirmation. Existing website assertions are not proof of these facts.

The source contains considerable implementation, but production readiness is PARTIAL. A successful build does not establish that the deployed APIs, database, appointments, customer access or payment workflows work safely together. Launch should follow the gates in the roadmap.

## How confident is each statement

Every statement in this package carries one of four labels, stated or implied by its section:

| Label | Meaning |
|---|---|
| Verified | Checked in the repository on 10 October 2026; the file and line are cited |
| Owner-confirmed | Stated by the owner, with the date |
| Proposed | A recommendation awaiting approval |
| Unknown | Needs the owner, the live server or a test before anyone relies on it |

Nothing in the package is presented as fact without one of the first two labels.

## Owner decisions recorded 10 October 2026

1. Scope: men's fashion and tailoring only.
2. Design: Tesla-style structure (restraint, photography, spacing, type scale, motion) with Herit amber kept as the single accent. Tesla blue is not used. Amber buttons carry dark text; amber is never used as text on white.
3. Website claims: the four named staff, the statistics (1200+ pieces, 18 countries, 98%), the four named testimonials, the free Lagos delivery offer and the HERIT10 offer are not real and will be removed.
4. This package is corrected in place; nothing useful is discarded.

## Read the package

| File | Purpose |
|---|---|
| [01-AUDIT-AND-DRIFT.md](01-AUDIT-AND-DRIFT.md) | Baseline evidence, findings, module review and plan drift |
| [02-APP-AND-CUSTOMER-JOURNEYS.md](02-APP-AND-CUSTOMER-JOURNEYS.md) | Daily app, measurements, appointments, company jobs, client portal and feature priorities |
| [03-WEBSITE-CMS-AND-DESIGN.md](03-WEBSITE-CMS-AND-DESIGN.md) | Website structure, draft hooks, CMS links, shared design and motion |
| [04-DATA-SAFETY-AND-OPERATIONS.md](04-DATA-SAFETY-AND-OPERATIONS.md) | Data model, privacy, access, deployment, recovery and verification |
| [05-SOCIAL-PROFILES-AND-CONTENT.md](05-SOCIAL-PROFILES-AND-CONTENT.md) | Instagram, Facebook, LinkedIn, TikTok and WhatsApp profile drafts and practical content schedule |
| [06-DELIVERY-AND-FILE-GOVERNANCE.md](06-DELIVERY-AND-FILE-GOVERNANCE.md) | Ordered delivery, acceptance gates, worktrees, folder cleanup and instruction alignment |
| [07-RESEARCH-AND-COVERAGE.md](07-RESEARCH-AND-COVERAGE.md) | Sources, assumptions, inspected surfaces, limitations and repeatable audit checks |
| [TESLA-DESIGN-REFERENCE.md](TESLA-DESIGN-REFERENCE.md) | Requested getdesign template, reference material rather than an active project rule |

## Decisions to approve

1. Men's tailoring and fashion lead the website. Shop remains secondary if there is verified ready-to-wear stock.
2. Core navigation: Today, Enquiries, Appointments, Clients, Jobs, Payments, Website. Settings sits separately.
3. Keep the current React/Bootstrap/PHP/MySQL architecture. No framework migration, microservices or full accounting system.
4. Customers use a reference to find their job, then verify control of their contact channel before private access or changes. A reference alone does not unlock measurements.
5. Tesla's restrained layouts, photography, spacing and motion become the rebuild reference, with Herit amber as the one accent (owner-confirmed). Document 03 lists every deviation from the Tesla template and the measured contrast for each colour pair.
6. Implement safety and record integrity before public bookings and promotion. Use a limited pilot before increasing order volume.
7. Social account material is drafted here. Publishing, account creation, migrations, deployment, merges and deletion need a later authorised task.
8. After approval, migrate the accepted decisions into a small flat set of permanent docs, validate links and instructions, and only then remove this temporary folder with explicit deletion approval.

## Evidence in brief

PASS (re-run 10 October 2026): production build exit 0; 34 of 34 pure PHP helper tests; syntax checks on all 32 top-level PHP files; one worktree on main at d91951c.

FAIL (coverage): `npm run lint` exits 0 but its configuration matches only TS/TSX, while src contains 473 JS/JSX and zero TS/TSX files. It checks no source files, so the CI lint gate is empty (A13).

Verified gaps found on 10 October 2026: CI deploys only 9 of 31 endpoints, leaving 22 dependent on manual upload (A02); customer login has no throttle and uses guessable order codes (A03); editing an existing blog post fails because of a bind mismatch (A21); localhost origins are allowed by CORS in production (A15); no appointments table exists yet (A08).

BLOCKED: rendered browser audit, because Chrome DevTools reported an occupied browser profile and Computer Use could not open the available browser. No browser process was stopped. Visual quality and cross-device behaviour remain NOT TESTED.

NOT TESTED: deployed database/schema, production endpoint inventory, real customer permissions, bookings, email, gateways, backups, restoration, complete end-to-end flows, accessibility conformance and real-device usability. No production records were submitted or changed.

No application source was changed. The requested design CLI wrote only its reference document here; build output is ignored. No existing plan folder was present at the start of this audit. Older planning sources are docs/features.md, docs/nav-map.md, docs/brief.json, docs/seo-analytics.md and both HeritOS.html files.
