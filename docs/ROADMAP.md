# Roadmap

Remaining work in dependency order, with the evidence each phase needs and where it stands. Production confidence is PARTIAL: the source holds a lot of real work, but a successful build does not prove that the deployed APIs, database, appointments, customer access or payments work safely together. Do not give a launch date based on file counts; first reproduce the critical workflows in staging and measure the gaps.

Status as of 10 October 2026. Phase 1 is in progress on branch `feat/plans-2026-phase1`, continued by `feat/phase1b-staging` (stacked on it).

## Phases

| Phase | Work | Completion evidence | Status |
|---|---|---|---|
| 0: Agree the product | Men's scope, amber accent on a Tesla-style layout, removal of invented claims (decided). Still to confirm: garment range, public details, hours and location, capacity, payment and change terms, whether any retail stays. | One approved scope and decision table; every public claim owner-confirmed or removed | Partly done. Decisions recorded in [PRODUCT.md](PRODUCT.md#owner-decisions); open items in [PRODUCT.md](PRODUCT.md#remaining-owner-decisions) |
| 1: Safe baseline | Staging API and synthetic data (A01). JS/JSX lint (A13). Deploy waits for CI on one Node version (A14). Release manifest for all endpoints in use (A02). Customer login throttle, generic errors, non-guessable reference (A03, A06). Remove production localhost CORS (A15). Blog update fix and HTML sanitising (A04, A21). Payment write in a transaction (A05). Backups and rollback route. | Local and staging writes isolated; lint reports real files; restore verified; key access and content tests pass | In progress on `feat/plans-2026-phase1`: docs migration, lint, deploy gate, A03 throttle and generic errors, A04, A05, A15, A21. Continued on `feat/phase1b-staging`: local staging (A01), non-guessable reference (A06), company field (A11), plain enquiry error (A17), demo routes removed (A18), shop hidden from public navigation. Not started: release manifest (A02), backups |
| 2: Connect daily records | Today, enquiry conversion, one Clients area, dated measurements, job snapshots, quotes, payment ledger, production history, delivery | Owner completes a synthetic job from enquiry to handover with consistent records and recovery from errors | Not started |
| 3: Appointments and client access | Persistent availability, slot conflict checks, cancel and reschedule, contact verification, private messages, controlled update requests, feedback | Two-device slot test; customer and company isolation; expired access; a customer change never silently changes work | Not started |
| 4: Website and shared CMS | Tesla-based tokens and merged token layer, real imagery, service and portfolio pages, true business details, verified links, sanitised publication, sitemap, SEO and responsive checks; removal of invented claims | Owner approves screenshots; publish and unpublish work; enquiry and booking usable on a phone; no fabricated proof | Not started |
| 5: Company-order pilot | Parent job with member list where needed, sample approval, company quote and PO field, partial handover, wearer privacy | One small agreed company job completed end to end; no capacity overpromise | Not started |
| 6: Release and promotion | Staging sign-off, production manifest, backup, deploy and rollback, smoke checks, limited real pilot, final social drafts and verified accounts | Release gate passes; pilot reviewed; each external publication individually authorised | Not started |
| 7: Learn and simplify | Review friction, failed saves and reminders, enquiry conversion, overdue jobs, unused sections; add only requested features | Confirmed unused runtime surface removed safely; no feature without a repeated need | Not started |

Suggested local batches, each with its own acceptance criteria and rollback: baseline checks; access and content safety; ledger integrity; enquiry, client and job flow; measurements; appointments; customer portal; design tokens and navigation; public services and portfolio; CMS settings; company workflow; release proof. Public copy and photo preparation can run while records are made safe, without exposing unready booking or payment controls.

## Findings

From the 10 October 2026 audit, every row re-checked by file and line. P0 means a safety, integrity or truthful-launch prerequisite, not necessarily a confirmed exploited incident. Findings from source inspection still need runtime reproduction where applicable.

| ID | Priority | Evidence | Finding | Required response | Status |
|---|---|---|---|---|---|
| A01 | P0 | src/context/constants.js:10-11; no Vite proxy | `API_BASE` is the live domain in development, so every local session reads and writes production | Staging API and synthetic data; prove no local write reaches production | Fixed locally on feat/phase1b-staging: `npm run staging:setup` / `staging:serve` give a local API and database with synthetic records; development defaults to it (`VITE_API_BASE` overrides). API smoke checks PASS; browser walkthrough NOT TESTED; a shared staging server is still Open |
| A02 | P0 | .github/workflows/deploy.yml:22-30 | CI deploys 9 PHP files; 22 endpoints depend on manual upload; deployed state Unknown | Inventory deployed versions with permission; one tested release manifest and rollback | Open |
| A03 | P0 | php-api/account.php:27-86, 151-158 | Phone (last 9 digits) plus a sequential `ORD-` code issues a 30-day token; no throttle on customer login or tracking; two error messages reveal whether a phone has an account; token can read and overwrite measurements | Verify contact channel; throttle; one generic failure; non-guessable reference; cross-customer test | In progress on feat/plans-2026-phase1 (throttle and generic errors); contact verification Open |
| A04 | P0 | content.php:56, 71-83; BlogPostPage.jsx:47 | Blog HTML stored raw and rendered with `dangerouslySetInnerHTML`; no sanitiser; stored XSS from a staff account | Server-side allowlist sanitising and URL validation; malicious-content checks | In progress on feat/plans-2026-phase1 |
| A05 | P0 | tailoring.php:223-247 | Deposit read, added, capped and written back with no transaction; timeline logs the uncapped amount; concurrent payments can be lost | Append entries; atomic totals; deduplication; explicit overpayment rule | In progress on feat/plans-2026-phase1 (transaction); ledger is Phase 2 |
| A06 | P1 | store.php:289-291; orders.php:96-98; tailoring.php:117-119, 359-360, 392-393 | Codes from MAX(id)+1; UNIQUE keys prevent duplicates but codes are sequential and guessable; store and orders share the `ORD-` sequence | Derive code from inserted ID or retry; non-guessable public reference | Fixed on feat/phase1b-staging: random 10-character `public_ref` for customer lookups (schema_phase17.sql, backfilled); ORD-, HC- and HCG- codes retry on duplicate key; old codes accepted while `ALLOW_LEGACY_ORDER_CODE_LOOKUP` is on (default on). Needs the SQL import and manual uploads in production |
| A07 | P0 | HomePage.jsx:62-99, 218; site/content.js:35-38; site/products.js:19-84 | Invented statistics, staff, testimonials, offers and fallbacks (Owner-confirmed not real) | Remove all, including both offers | Open (Phase 4) |
| A08 | P1 | apps/calendar/useCalendar.js:3, 8; data.js:1-20 | Calendar is Larkon sample data in React state; no appointments table or endpoint; only `fitting_date DATE` | Real appointment records with server conflict checks | Open (Phase 3) |
| A09 | P1 | store.php:630-631; account.php:50, 93-97 | Tracking and portal read only retail `orders`; tailoring clients cannot see their job | One customer access journey over both job types | Open (Phase 3) |
| A10 | P1 | customers.php:121-129; account.php:151-158; tailoring.php:200-221 | Measurements are one mutable JSON field per customer and per job; no history; customers can overwrite their own without review or audit | Dated, unit-aware measurement sets; job snapshots; customer edits pending | Open (Phase 2) |
| A11 | P1 | contact.php public submit | The `company` field is a honeypot; a corporate form reusing it would discard real enquiries | Rename the honeypot; real company field with server validation | Fixed on feat/phase1b-staging: honeypot renamed `website_url_confirm`; real optional `company` stored on enquiries (schema_phase17.sql) and shown to staff |
| A12 | P1 | SiteLayout.jsx:24-31 | Social links fall back to platform home pages or `wa.me/234`; Twitter and YouTube empty; no LinkedIn | Verified URLs in CMS; hide unconfigured; add LinkedIn | Open (Phase 4) |
| A13 | P0 | eslint.config.js:11; package.json:6-12 | Lint matches only TS/TSX while src has 473 JS/JSX files, so the CI lint gate checks nothing; no frontend tests | Lint JS/JSX; test critical flows; run helper tests in CI | Blocked: JS/JSX config written and tested (476 files, 0 errors) but needs the owner to apply it, because a local hook blocks agent edits to eslint.config.js |
| A14 | P1 | ci.yml:38; deploy.yml:3-5, 14 | CI on Node 22, deploy on Node 20; deploy runs on every push to main without waiting for CI | Align runtime; deploy waits for CI; confirm branch protection | Fixed on feat/plans-2026-phase1 (Node 22; deploy repeats lint, PHP checks and build before upload); branch protection Unknown |
| A15 | P1 | heritApi.js:13, 40; _lib.php:48-52 | Staff token in a JS-readable cookie; customer token in localStorage; CORS reflects any localhost origin in production | Remove production localhost allowance; review token exposure with a narrow migration | In progress on feat/plans-2026-phase1 (CORS behind `ALLOW_LOCALHOST_CORS`); token storage Open |
| A16 | P1 | public/sw.js:3-39 | Offline shell only; PHP and API never cached | Clear offline state; block writes offline; test update and recovery | Open |
| A17 | P1 | enquiries/page.jsx:61-63 | Owner sees a technical upload instruction as the error | Plain error, retry and support reference; diagnostics in logs | Fixed on feat/phase1b-staging: plain message with Retry; detail in the browser console |
| A18 | P2 | routes/index.jsx:872; router.jsx:19-28; menu-items.js:2-4 | Larkon demo routes registered in production, reachable by URL; Sass and chunk-size warnings | Remove confirmed unused routes after caller checks; measure public load | Fixed on feat/phase1b-staging: kit demo galleries and unused kit pages removed with 14 orphaned components; production JS 4,985,796 to 1,553,500 bytes (259 to 98 files). `/apps/calendar`, `/settings` and `/review` kit pages remain. Chunk-size warning remains |
| A19 | P2 | old CLAUDE.md:91, 105, 124, 226; php-api/README.md:3-4, 61; docs/README.md:17-18 | Deployment descriptions contradict each other | Consolidate facts; remove stale completeness and deploy claims | Fixed on feat/plans-2026-phase1 (CLAUDE.md, docs and php-api/README.md rewritten) |
| A20 | P0 | No server access used | Backups, private storage, deployed config and schema cannot be certified from the repo | Approved read-only environment review plus a restore exercise | Open |
| A21 | P1 | content.php:71-75 | Blog UPDATE binds 11 values with a 12-character type string; editing an existing post throws | Fix the type string; save-then-edit regression check | In progress on feat/plans-2026-phase1 |
| A22 | P2 | HomePage.jsx:96, 218; _lib.php:201-233 | HERIT10 advertised as first piece only, but `coupon_eval` has no first-order check | Moot once removed; enforce if a first-order offer returns | Open (resolved by A07) |
| A23 | P2 | old DESIGN-SYSTEM.md:16-17; site.css; heritos-admin.css | Tack Stitch documented but never implemented; two separate token sets | Retire the rule; merge token sets into one layer | In progress on feat/plans-2026-phase1 (rule retired in DESIGN.md); token merge Open (Phase 4) |
| A24 | P2 | public/ | robots.txt exists; no sitemap | Sitemap for public pages in the website phase | Open (Phase 4) |

## Owner usability review

Try these on a phone without instruction: find today's fitting; add a walk-in client; reuse approved measurements; see which job is due tomorrow; record a verified payment; send a reply; mark a collection; correct a mistaken entry.

Proposed goals to test, not guaranteed outcomes: routine status and payment actions within a minute; a new enquiry or client within two minutes; no repeated contact entry. Watch where the owner hesitates and simplify labels and screens before adding help text. Key actions show saving and saved immediately; a failed form keeps what was typed; empty screens show one next step. Cross-device support means practical phone, tablet and laptop coverage.

## Release decision

GO only with evidence for every core gate: safe environment, owner access and recovery, customer isolation, persistent conflict-safe appointments, measurement snapshots, payment integrity, truthful website, accessible mobile forms, private-file protection, tested backup restore, release manifest and rollback. Zero unresolved P0 findings. Deferred retail and marketing features need not pass if they are absent from public navigation and safely disabled.

Pilot with the owner and a few consenting customers first, and check that communications, confirmations and delivery records match real practice. Company orders start within confirmed capacity, with an agreed sample and quote and achievable dates. Increase volume only after the pilot shows reliable service. A passing `npm run build` never makes the project "production-ready".

## Baseline evidence (10 October 2026)

| Check | Result | Meaning |
|---|---|---|
| `npm run build` | PASS | Exit 0; Sass deprecation and large-chunk warnings |
| `php php-api/tests/run.php` | PASS | 34 of 34 pure helper checks; no database or network |
| `php -l` on top-level php-api files | PASS | 32 files; syntax only |
| `npm run lint` | FAIL (coverage) | Exit 0 but checks no source files (A13) |
| Worktrees and branches | PASS | One worktree on `main` at d91951c; only `main` locally |
| Local production preview | PASS (startup) | Bound 127.0.0.1:5113; relative API paths |
| Rendered browser and device audit | BLOCKED, then NOT TESTED | Chrome profile in use and Computer Use unavailable; no browser was stopped |
| API, database, booking and client end-to-end | NOT TESTED | Needs staging and synthetic records |
| Production and remote account audit | NOT TESTED | No deployment, live probing or connected accounts used |
| Dependency vulnerability audit | NOT TESTED | Add a lockfile and runtime risk review in Phase 1; no blind upgrades |
| Backup restoration | NOT TESTED | Needs an authorised separate environment |
| Local staging API checks (feat/phase1b-staging) | PASS | Staff login, tailoring list and create, enquiry with company, honeypot, tracking and customer login by public reference, legacy-code flag, code collision retry; synthetic data only |
| `npm run build` after A18 (feat/phase1b-staging) | PASS | JS 1,553,500 bytes in 98 files (was 4,985,796 in 259); `dist` 10,212 KB (was 15,396 KB) |

The audit was risk-based across routes, API, schemas, public pages and critical paths, not a line-by-line review of all 774 tracked files, a penetration test or a WCAG certification. Still needed: phone and laptop screenshots of critical flows; every active endpoint and schema version; customer object ownership; unsafe HTML and upload denial; concurrent booking, payment and reference behaviour; real notification states; owner recovery; backup restore.

## Deletion candidates awaiting owner approval

Nothing below is deleted yet. Each needs explicit approval, and links must be re-checked afterwards. Deleted on 10 October 2026 with owner approval: the superseded 2025 plans, both `HeritOS.html` files and the Larkon demo routes (A18).

| Candidate | Reason |
|---|---|
| `docs/GEE-OS.md` | Adoption note at GEE OS 0.9.0; its source map is replaced by [docs/README.md](README.md) |
| Remaining Larkon kit pages `/settings` and `/review` | No API calls and not in the menu; kept on feat/phase1b-staging because the owner's keep list named them. Remove after confirming nobody uses them |
| Unused tsconfig and TypeScript-only lint leftovers | Revisit only with dependency and check evidence |
