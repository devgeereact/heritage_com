# Audit log

Every audit, review and checklist run for this project, newest first. Add new results here as a dated section; do not create separate audit files.

## 2026-10-19 · Launch Checklist

_Merged from `docs/AUDIT.md` on 2026-10-30._

## Launch Checklist

This file owns the launch verification matrix, the pre-launch checklist, the production check around each release and the release decision (the GEE OS Standard application profile keeps the launch checklist in `qa/`). Nothing below is ticked: unchecked boxes and scaffolding are not evidence.

### Launch verification matrix

Each scenario runs on staging with synthetic records before launch, and again with designated test records after release where safe (Plans 2026, 04).

| Scenario | Required proof | Status |
|---|---|---|
| Client isolation | Two synthetic customers; swapping every relevant ID or reference fails safely | PARTIAL: PASS on staging, 31 of 31 checks (`e2e-launch.sh`, 18 October 2026, two runs): with verified portal sessions, customer B swapping in A's job reference, thread, change requests, appointment, measurement set, quote, sample, retail order and receipt, and replaying A's request keys, gets the missing-record answer with none of A's data, and nothing is written; production NOT TESTED |
| Company isolation | An organiser cannot read individual measurements or another company's job | PARTIAL: PASS on staging, 15 of 15 checks (`e2e-launch.sh`, 18 October 2026, two runs): with wearer measurements attached to the items, the organiser's job, list and measurement views carry no wearer value or name, measurement and owner-only actions answer 404, another company's job, thread, messages and samples answer like a missing job both ways, and the switch off hides everything; production NOT TESTED |
| Booking integrity | Simultaneous slot requests, cancellation, reschedule and expiry behave atomically | PARTIAL: PASS on staging, 15 of 15 checks (`e2e-launch.sh`, 18 October 2026, two runs): four simultaneous public requests and two simultaneous portal requests for one slot each give exactly one booking; two simultaneous reschedules into one slot give one move; a cancelled slot is offered again and the cancelled appointment cannot be moved; an expired hold frees the slot and cannot be confirmed; production NOT TESTED |
| Measurement integrity | An approved job stays unchanged after a profile update; units stay correct | PARTIAL: frozen job snapshot and units PASS on staging (API and browser, Phase 2 branch); production NOT TESTED |
| Record conversion | A retried enquiry conversion yields one linked job | PARTIAL: idempotent conversion PASS on staging (`e2e-phase2.sh`); production NOT TESTED |
| Payment integrity | Retry, concurrency, reversal and overpayment totals and receipts match | PARTIAL: PASS on staging (API). Duplicate request keys, reversal, refund and credit; and concurrency, 15 of 15 checks (`e2e-launch.sh`, 152 of 152 on the integrated `feat/release-readiness`, 18 October 2026): five simultaneous posts with one key record once, five with different keys all count, cached totals equal the ledger, overpayment becomes credit, refund above credit refused, receipts and the client's totals agree, and of two simultaneous reversals of one entry one is stored and the loser answers 409 (K-29: `ledger.php` took the job lock after reading the entry and the loser answered 500; fixed by locking first). Production NOT TESTED |
| Rich text and files | Script, unsafe URL and unexpected upload denied; private files need auth | PARTIAL: sanitiser helper tests PASS; scripts, event handlers and `javascript:`, `//host`, `/\host`, `data:` and tab-split links stripped from the public service projection PASS on staging (`e2e-launch.sh`, 18 October 2026, two runs, W3); rendered pages and upload checks NOT TESTED by that script |
| Session recovery | Expired or revoked token blocked; owner recovery works | PARTIAL: PASS on staging, 19 of 19 checks (`e2e-launch.sh`, 18 October 2026, two runs): expired, logged-out and revoked staff tokens 401, logout ends one device only, no cross-user revoke, suspension ends a live session and blocks sign-in and reset; a synthetic owner (super_admin) resets the password by email, both signed-in devices are signed out and the owner signs in again; expired, signed-out-everywhere and deleted-client portal sessions 401; production and recovery without the owner's mailbox NOT TESTED |
| Failure handling | Offline, API timeout, failed email and missing config show plain, truthful states | PARTIAL: PASS on staging, 40 of 40 API checks (`e2e-launch.sh`, 152 of 152 on the integrated `feat/release-readiness`, 18 October 2026): missing fields plain 400, bodies that are not JSON refused plainly, unknown actions plain 404, missing sessions plain 401, missing AI configuration plain 503, and a list or object where text or a number belongs answers 400 (K-30; it gave a 500 or was stored as "Array"). A failed reset-link send answers like an unknown address (K-25, `e2e-reset.sh`). Offline, API timeout and failed email states in the app NOT TESTED |
| Publication | Drafts private; unpublish effective; invalid URL rejected | PARTIAL: PASS on staging, 17 of 17 checks (`e2e-launch.sh`, 18 October 2026, two runs): a draft is absent from its address, the list and the sitemap; publish shows it; a new draft over live stays private; unpublish removes it at once; unsafe links in rich text are stripped; slide button links `javascript:`, `//host`, `/\host`, outside and `..` paths and a `javascript:` social link are refused; production NOT TESTED |
| Recovery | Backup restored and records and files verified in a separate environment | PARTIAL: `backup.sh` and `restore-check.sh` round trip PASS on local staging, 18 Oct 2026 (58 of 58 tables match, 99 upload files listed, scratch database dropped); hand check of one linked client, job, payment and photo NOT TESTED; production backup and restore NOT TESTED ([DEPLOYMENT.md](DEPLOYMENT.md#backup-and-recovery)) |
| Release | Endpoint and schema versions match the build; rollback rehearsed | PARTIAL: release manifest and `release_check.php` PASS locally, 18 Oct 2026 (59 files MATCH on the worktree; a copy with one manual file changed, one ci file changed and one manual file removed gave DIFFERENT, DIFFERENT, MISSING and exit 1; `--db` showed all 30 schema markers on `heritos_staging`); `smoke.sh` PASS on local staging (11 API checks) and on a `vite preview` of `dist/` (4 site checks); live endpoint versions, live schema markers, Apache header checks and a rollback rehearsal NOT TESTED ([DEPLOYMENT.md](DEPLOYMENT.md#release-procedure)) |

Helper tests and syntax checks do not substitute for this matrix.

### Checklist

- [ ] Product acceptance criteria in [USER-JOURNEYS.md](USER-JOURNEYS.md) are proved.
- [ ] Functional, UX, accessibility, performance, security and regression audits in this file have decisions.
- [ ] Website launch: every public claim owner-confirmed or removed (A07); business details verified; social links verified (A12); sitemap and robots reviewed (A24); screenshots approved ([CONTENT.md](CONTENT.md)).
- [ ] PWA: manifest updated, offline shell and write blocking checked, upgrade from the previous build checked ([PERFORMANCE-AUDIT.md](AUDIT.md#pwa)).
- [ ] Privacy notice, terms, consent and contact facts verified ([DATA-PRIVACY.md](DATA-PRIVACY.md)).
- [ ] Production build, release manifest, manual uploads and schema imports verified ([DEPLOYMENT.md](DEPLOYMENT.md)).
- [ ] Monitoring and failed-notification list operational ([DEPLOYMENT.md](DEPLOYMENT.md#monitoring)).
- [ ] Backup restored in a separate environment; rollback rehearsed ([DEPLOYMENT.md](DEPLOYMENT.md#backup-and-recovery)).
- [ ] Zero unresolved P0 findings ([ROADMAP.md](ROADMAP.md#findings)); other known issues have owners and accepted release decisions ([KNOWN-ISSUES.md](KNOWN-ISSUES.md)).
- [ ] Social profiles: setup acceptance passed and each publication individually authorised ([SOCIAL.md](SOCIAL.md#setup-acceptance)).
- [ ] Release owner has recorded `GO`, `NO-GO` or `CONDITIONAL GO` with evidence under [Release decision](#release-decision).

### Production check

Checks run against production around a release. Do not infer production health from a local build. Use designated test records only; never real client records.

| Check | Status | Evidence | Owner | Date |
|---|---|---|---|---|
| Correct account, repository, branch (`main`) and cPanel document root confirmed before any mutation | NOT TESTED | None | Business owner | None |
| Deploy job green; every PHP file listed in `deploy.yml` uploaded | NOT TESTED | None | Business owner | None |
| Manual uploads and SQL imports applied in the order given in [DEPLOYMENT.md](DEPLOYMENT.md#owner-actions-per-pull-request) | NOT TESTED | None | Business owner | None |
| Backup set taken with `backup.sh` before the change and proved with `restore-check.sh` (every table MATCH) | NOT TESTED | None | Business owner | None |
| `release_check.php --db` before the change recorded (live endpoint versions and schema markers, A02) | NOT TESTED | None | Business owner | None |
| `release_check.php` after the hand uploads: every manual file MATCH | NOT TESTED | None | Business owner | None |
| `npm run release:smoke -- https://heritclothing.com` PASS (includes `api.php` returning a JSON array) | NOT TESTED | None | Business owner | None |
| Post-release flows with test records: login, enquiry, booking, client isolation, measurement snapshot, quote, payment, message, delivery | NOT TESTED | None | Business owner | None |
| Secrets, permissions and production settings: `GK_DEBUG` off, `ALLOW_LOCALHOST_CORS` off, HTTPS valid, Cloudflare grey cloud | NOT TESTED | None | Business owner | None |
| `ALLOW_LEGACY_ORDER_CODE_LOOKUP` set as decided for this release | NOT TESTED | None | Business owner | None |
| Monitoring, failed-notification list, backup snapshot taken and rollback trigger agreed | NOT TESTED | None | Business owner | None |

No production check has been run by any agent. Procedure and rollback: [DEPLOYMENT.md](DEPLOYMENT.md#release-procedure).

### Release decision

The release decision and its criteria. Allowed decisions are `GO`, `NO-GO` and `CONDITIONAL GO`.

- Version: none; the app has no release versioning yet ([DEPLOYMENT.md](DEPLOYMENT.md#environments-and-promotion-path))
- Candidate: none. Work is on stacked feature branches ([ROADMAP.md](ROADMAP.md))
- Environment: production (heritclothing.com)
- Decision: `NO-GO` today: production checks not yet run. GO when: the release procedure in [DEPLOYMENT.md](DEPLOYMENT.md#release-procedure) has been run with the owner at cPanel (backup and restore proved, `release_check.php` all MATCH, schema imports to phase 32, smoke PASS) and the pilot is reviewed.
- Decision owner and date: lead developer under the owner's delegation ([D-025](DECISIONS.md)), 19 October 2026. The business owner stays the release owner for the cPanel steps.

#### Decision criteria (Plans 2026, approved 10 October 2026)

GO only with evidence for every core gate: safe environment, owner access and recovery, customer isolation, persistent conflict-safe appointments, measurement snapshots, payment integrity, truthful website, accessible mobile forms, private-file protection, tested backup restore, release manifest and rollback. Zero unresolved P0 findings. Deferred retail and marketing features need not pass if they are absent from public navigation and safely disabled.

Pilot with the owner and a few consenting customers first, and check that communications, confirmations and delivery records match real practice. Company orders start within confirmed capacity, with an agreed sample and quote and achievable dates. Increase volume only after the pilot shows reliable service. If a gate fails, disable the affected public action and keep a truthful enquiry channel. A passing `npm run build` never makes the project "production-ready".

#### Evidence summary

| Gate | Result | Evidence | Open risk |
|---|---|---|---|
| Functional | PARTIAL | Staging API checks; Phase 2 owner journey PASS in a browser ([FUNCTIONAL-AUDIT.md](AUDIT.md)) | Journeys J-03, J-07, J-08 not built; production NOT TESTED |
| Security | NOT TESTED | Helper tests PASS; P0 findings A02, A03 (verification), A20 open | Cross-customer access, unknown deployed endpoints |
| Accessibility | NOT TESTED | None ([docs/AUDIT.md](AUDIT.md)) | No rendered-page checks |
| Performance | NOT TESTED | Bundle size only ([docs/AUDIT.md](AUDIT.md)) | No lab or field measurements |
| Regression | PARTIAL | [REGRESSION-AUDIT.md](AUDIT.md) | Flow script for Phase 2 only, not in CI |
| Website | NOT TESTED | Applicable; invented claims still live (A07) | Untruthful public content |
| PWA | NOT TESTED | Applicable, offline shell only ([ARCHITECTURE.md](ARCHITECTURE.md#pwa-offline-and-updates)) | No write blocking offline |

#### Remaining risks and recovery

- Known issues accepted: `NONE APPROVED`
- Rollback trigger and owner: any failed post-release check under [Production check](#production-check); business owner

## 2026-10-18 · Functional Audit

_Merged from `docs/AUDIT.md` on 2026-10-30._

## Functional Audit

Evidence for functional behaviour. Strategy and commands: [docs/TEST-STRATEGY.md](TEST-STRATEGY.md). Journeys and requirements: [docs/PRODUCT-SPEC.md](PRODUCT-SPEC.md#functional-requirements). Usability evidence is in the last section.

### Local staging API smoke checks (10 October 2026, PR #7)

Environment: local staging ([LOCAL-STAGING.md](LOCAL-STAGING.md)), synthetic records, direct API requests. No browser.

| Requirement or journey | Environment | Test | Expected | Observed | Status | Evidence |
|---|---|---|---|---|---|---|
| Staff sign-in | Local staging | Correct password, wrong password, suspended real-domain seed account | Only the correct, active account signs in | As expected | PASS | Agent run, 10 Oct 2026 |
| FR-04 jobs | Local staging | Tailoring list; create | 7 seeded jobs across every stage; create returns `HC-` code and `public_ref` | As expected | PASS | Agent run, 10 Oct 2026 |
| FR-05 groups | Local staging | Group create | Group created | As expected | PASS | Agent run, 10 Oct 2026 |
| A11 enquiries | Local staging | Enquiry with company; honeypot filled | Company stored and shown to staff; honeypot accepted silently, not stored | As expected | PASS | Agent run, 10 Oct 2026 |
| A06 tracking | Local staging | Track by public reference; by old code with legacy flag on and off; wrong phone | Public ref works; old code only with flag on; wrong phone refused | As expected | PASS | Agent run, 10 Oct 2026 |
| FR-08 customer sign-in | Local staging | Customer login by public reference | Token issued | As expected | PASS | Agent run, 10 Oct 2026 |
| Checkout reference | Local staging | Checkout | Returns a public reference | As expected | PASS | Agent run, 10 Oct 2026 |
| A06 code collision | Local staging | Forced `ORD-` collision | Retries to the next code | As expected | PASS | Agent run, 10 Oct 2026 |
| Staging router safety | Local staging | Request `config.local.php`, `config.php`, `_lib.php`, `config.sample.php` | All refused | As expected | PASS | Agent run, 10 Oct 2026 |
| CORS for local app | Local staging | Origin `http://localhost:5112` | Allowed | As expected | PASS | Agent run, 10 Oct 2026 |
| Browser walkthrough of the app against staging | Local staging | See the Phase 2 section below | Journeys usable on phone and laptop | Owner journey run at 390px and 1280px | PASS (Phase 2 owner journey only) | Agent run, 10 Oct 2026 |
| FR-01 to FR-10 end to end | Local staging | None | Journey acceptance criteria | Not built or not run | NOT TESTED | None |

The original command output was not saved to the repository; these rows are the recorded results. Cover loading, empty, success, validation, service failure, permission denial, session expiry and recovery for every journey once built.

### Phase 2 owner journey in the browser (10 October 2026, PR #9)

Environment: `npm run dev` (Vite, port 5112) against local staging on 127.0.0.1:8088, synthetic records, headless Chromium 153 through Playwright, timezone Africa/Lagos. Signed in through the real sign-in form as `staging-admin@example.test` (super_admin). A tailor-entered set was created through the API with a minted local token, then approved in the browser. Screenshots and the per-run JSON results were kept in the agent scratchpad (not in the repository).

| Step | 1280px | 390px | Notes |
|---|---|---|---|
| Sign in lands on Today; phone bottom bar shown only below 992px; More sheet opens | PASS | PASS | |
| Add enquiry from Today (staff-entered, request key) | PASS | PASS | Opens the new enquiry |
| Enquiry pipeline tabs with counts | PASS | PASS | |
| Convert to client and job (wizard, one request key) | PASS | PASS | Lands on the job with "Client and job created." |
| Add measurement set as owner (approved on save, cm visible, review step) | PASS | PASS | |
| Approve a pending set entered by a tailor | PASS | PASS | |
| Attach the approved set to the job (frozen copy) | PASS | PASS | |
| Quote: draft, mark as sent, record acceptance (content hash) | PASS | PASS | Job moves to Confirmed, price ₦150,000 |
| Record ₦75,000 cash deposit | PASS | PASS | Verified on entry (cash) |
| Stage through measurements approved, cutting and sewing, quality check, ready | PASS | PASS | |
| Handover: plan collection, checklist, complete | PASS | PASS | "1 of 1 handed over", job complete |
| Receipt print view (screen and print media) | PASS | PASS | RCT number, balance ₦75,000 |
| Old URLs redirect (`/tailoring/:id`, `/crm/:id`, `/dashboard`) | PASS | PASS | |

Edge checks, same environment:

| Check | Result |
|---|---|
| Add client with an existing phone shows the candidates (409), with open-existing and add-as-new choices | PASS |
| Saving job details after another change gives "This job was changed elsewhere. Reload to see the latest." (409 on `lock_version`) | PASS |
| A closed enquiry offers only the moves the server allows | PASS |
| Tailor (390px) lands on Jobs; /today and /payments send them back; no Quote or Payments tabs and no ₦ amounts on a job | PASS |
| `npm run build` | PASS (exit 0) |
| `npm run lint` | PASS (exit 0; the config still lints no JS/JSX, A13) |
| `php php-api/tests/run.php` | PASS (166) |
| `bash scripts/staging/e2e-phase2.sh` | PASS (48) |

Console: the only browser console error on every page, including the unchanged Finance page, is React's development warning about `UNSAFE_componentWillMount` from `react-helmet` (PageTitle). It predates Phase 2 and does not appear in production builds. Expected 409 responses during the edge checks are logged by the browser as failed requests.

NOT TESTED: decline, withdraw and revise of quotes in the browser (API covered by E4); refund and reversal in the browser (API covered by E7 and E8); partial handover in the browser (API covered by E12); session expiry; offline; screen readers; widths other than 390 and 1280; dark theme; real phones.


### Phase 3 API checks on staging (10 October 2026)

Branch `feat/phase3-appointments-portal`, backend only (no screens yet). Fresh `npm run staging:setup` (26 schema files, no errors, Phase 2 and 3 migrations replayed), then `bash scripts/staging/e2e-phase3.sh` twice: 93 of 93 PASS each time. `e2e-phase2.sh` 48 of 48 PASS on the same database; `php php-api/tests/run.php` 251 PASS; `php -l` 48 files PASS; `npm run build` exit 0.

| Area | Checks | Result |
|---|---|---|
| Availability | Save and validate (50 minutes refused); ready per type | PASS |
| Slots | 09:00 and 11:00 kept, 09:15 to 10:45 dropped around a 10:00 booking with a 15 minute buffer; booked names never shown | PASS |
| Owner clash | 409 with `can_override` until a reason is given; reason stored | PASS |
| Concurrency | Two parallel public requests for one slot: one 201, one 409, one row | PASS |
| Holds, cancel, reschedule | Expired hold frees the slot with history; declined request frees it; reschedule keeps one from-and-to row and frees the old time | PASS |
| Rules | Lunch break and evening 422 `outside_hours`; 40 days out 422 `too_far`; notice 422 `too_soon`; nothing stored | PASS |
| All-day fitting | Job fitting date becomes an all-day appointment; timed slots unchanged | PASS |
| Public switch off | Config `enabled:false`; slots and requests 503 | PASS |
| Access start | Match, wrong contact, guessed reference and malformed reference give identical replies; decoys stored; code emailed (staging mail log); code and challenge never stored in plain text | PASS |
| Access verify | Wrong code 5 times then the right one refused; reused, expired and unknown give the one generic 400; token stored only as sha256 | PASS |
| Throttles | Sixth start for one reference and eleventh from one IP answer 429 | PASS |
| Owner invite | Client without email waits for the owner; invite link single use | PASS |
| Isolation | Client A asking for B's job, messages, change requests, feedback or appointment gets the missing-record 404; A's lists and measurements hold only A's records; a client token cannot reach staff endpoints | PASS |
| Private fields | Portal job JSON has no costs, notes, staff code, tailor, lock version or unverified payment | PASS |
| Messages | Internal note absent from the portal; repeated request key stores one message; HTML kept as text; Today and unread counts | PASS |
| Change requests | Address correction approved with a visible response; after cutting a measurement approval needs a price or date effect; proposal and approval leave the job snapshot unchanged | PASS |
| Feedback | Refused before handover; consents and wording stored; low rating opens a follow-up; second feedback 409; publish refused without consent and allowed with it (hidden testimonial, first name) | PASS |
| Sessions | Logout, owner revoke and expiry give 401; legacy login (flag on) issues a hashed session | PASS |

Not covered: screens (not built), real email delivery, real WhatsApp sends, `ALLOW_LEGACY_ORDER_CODE_LOOKUP` switched off, and two devices in a browser.

### Phase 3 journeys in the browser (11 October 2026)

Branch `feat/phase3-appointments-portal`, screens built. Environment: `npm run dev` against local staging on 127.0.0.1:8088, synthetic records, headless Chromium through Playwright, timezone Africa/Lagos. Five separate browser contexts (owner, public visitor, client A, a feedback client, client B), so the owner and clients act as separate devices. The owner signed in through the real form; clients signed in through `/track` with the code read from the staging-only code log. The journey script and its JSON results were kept in the agent scratchpad (not in the repository). Each width used different clients, so the two runs did not share records.

| Step | 390px | 1280px | Notes |
|---|---|---|---|
| Owner saves availability: an out-of-range gap shows the server's 400 next to the field; then saves and switches public requests on | PASS | PASS | |
| Public `/book`: Book appointment in the nav (desktop), free times by day in Lagos time, inline "Enter your name", "This is a request" notice, "Request sent, not yet confirmed" | PASS | PASS | Honeypot left empty |
| Owner confirms the request from the Requests tab | PASS | PASS | Status `confirmed` in the database |
| Owner moves it to 23:00 today: clash shown (outside hours), reason to book anyway, history shows the move and reason | PASS | PASS | 409 `can_override`, then 200 |
| Today, Appointments today lists it | PASS | PASS | |
| Client A: `/track`, reference plus email, "Check your email", six-digit code (numeric keyboard, one-time-code autofill), lands on `/account` | PASS | PASS | |
| Client A sends a message and a garment change request | PASS | PASS | |
| Owner: Today Unread messages, bell badge (desktop), Messages inbox with "new"; replies to the client and adds an internal note in the job's Messages tab | PASS | PASS | |
| Client A sees the reply and not the internal note | PASS | PASS | |
| Owner approves the change request without an effect: the 422 "Cutting has started" shows in place; with price effect 0 it is approved | PASS | PASS | Job in production |
| A handed-over client leaves feedback: rating 2, comment, separate publish and photo choices with the owner's wording | PASS | PASS | |
| Owner sees it under Messages, Feedback; Add to testimonials (hidden); Mark followed up | PASS | PASS | |
| Owner creates an access link from client details: WhatsApp link and message text | PASS | PASS | |
| Client B opens the invite link: portal opens and the invite leaves the URL | PASS | PASS | |
| Client B opens client A's job URL: "We could not find that order" | PASS | PASS | 404 from the server |
| Owner signs client B out everywhere: client B's next page shows "Your sign-in has ended" and the access form | PASS | PASS | 401 cleared the token |
| Older shop-order tracking (reference plus phone) under `/track` still works | PASS | PASS | |
| Public requests switched off: `/book` says "Online booking is not open yet" and the nav link is gone | PASS | PASS | |
| No horizontal scroll on `/appointments`, `/messages`, `/settings`, `/book`, `/account/jobs/:ref` | PASS | PASS | |

Console: React's development warning about `UNSAFE_componentWillMount` from `react-helmet` (as in Phase 2), and the failed-request lines for the responses the journey provoked on purpose (400 availability, 409 clash, 422 change decision, 404 other client's job, 401 after revocation). No other errors.

Found and fixed during the run: `messages.php?action=inbox` answered 500 on MariaDB because it sorted by an expression over an aggregate alias (K-05).

Also run on the same branch: `npm run build` exit 0; `npm run lint` exit 0 (lints no JS/JSX, A13); the tested JS/JSX config, run over `src` from a temporary copy, reports no errors and, among the changed files, only the existing `react-refresh` warnings in `routes/index.jsx`; `php php-api/tests/run.php` 251 PASS; `e2e-phase3.sh` 93 of 93 and `e2e-phase2.sh` 48 of 48 on a fresh `staging:setup` (see [TEST-STRATEGY.md](TEST-STRATEGY.md#commands-and-latest-results)).

NOT TESTED: real email delivery of codes and replies; WhatsApp sends; real phones and screen readers; the dark theme on the new screens; widths other than 390 and 1280; quote acceptance in the portal (switch off by default) and the measurements view (switch off); a tailor's read-only Appointments view in the browser; `ALLOW_LEGACY_ORDER_CODE_LOOKUP` off.

### Phase 4 API checks on staging (11 October 2026)

Branch `feat/phase4-website`, server only (the website screens are built separately). Fresh `npm run staging:setup` (27 schema files, no errors, Phase 2 to 4 migrations replayed, `seed.php --phase4`), then `bash scripts/staging/e2e-phase4.sh` twice: 62 of 62 PASS each time. `e2e-phase2.sh` 48 of 48 and `e2e-phase3.sh` 93 of 93 PASS on the same database; `php php-api/tests/run.php` 323 of 323.

| Area | Checks | Result |
|---|---|---|
| Public config | Staging facts only, private address hidden, checked socials, JSON-LD without ratings, ETag 304 | PASS |
| Business profile | Phone change reaches the public config; http, look-alike host, `javascript:` and short wa.me links refused (also through `settings.php`); editor refused | PASS |
| Draft and publish | Draft 404 publicly and absent from the sitemap; preview 401 without staff; publish visible and in the sitemap; a second draft leaves v1 public; v2 publish keeps the earlier version; rollback restores v1; slug locked; published item not deletable; unpublish gives 404 and leaves the sitemap and list | PASS |
| Rich text | Script, `onclick`, `onerror`, `javascript:` and iframe stripped in the draft and the public FAQ; placeholder text blocks publishing (422) | PASS |
| Uploads | PHP renamed `.jpg` 415; 13 MB 413; no token 401; JPEG with PHP appended re-encoded without it; EXIF Make and GPS present in the source and absent from every served variant; random hex names; 800 and 1600 WebP plus a JPEG; `/uploads/site/evil.php` 404 with no output; repeat upload recognised | PASS |
| Portfolio | Publish refused without consent and alt text (422); phone number in public text needs confirmation (409); consented project public without consent or client fields; image in use cannot be deleted | PASS |
| Roles | Editor reads the CMS but cannot unpublish a policy (403); tailor has no CMS access (403) | PASS |
| Projection | No `draft`, `prev`, `live`, consent, client, customer, staff or file-hash fields across ten public answers; unpublished page and unknown policy 404; POST 405 | PASS |
| Sitemap and robots | `application/xml`, parses, lists published items only, no admin or portal paths; journal entries follow `journal_enabled`; robots served with the sitemap line and admin and portal disallows | PASS |
| Invented offers | Catalogue `free_ship_over` null; a slug from the removed fallback list refused at checkout; seeded HERIT10 and FREESHIP switched off | PASS |

NOT TESTED: the uploads `.htaccess` on the live Apache or LiteSpeed host, live PHP upload limits and GD build, the website screens in a browser, real photographs.

### Phase 4 website pages and Website admin in the browser (11 October 2026)

Branch `feat/phase4-website`, local staging (synthetic data), Vite dev server on 5112 against the staging API on 8088, Chromium driven through the Playwright MCP. Viewport about 390 to 430px wide (phone).

| Journey | Result |
|---|---|
| Home from the CMS: hero headline from the published home page, services, work, owner note, questions, final action; nav shows only Services, Our work, About and Contact (the other pages are unpublished); title, description, canonical and LocalBusiness JSON-LD set; no sideways scroll | PASS |
| `/services`, `/services/:slug` (what's included, pricing, related work, `Service` JSON-LD), `/work` and `/work/:slug` (image loads with alt text, width and height; facts list), `/company-orders`, `/about`, `/faqs` (4 grouped questions), `/privacy` (effective date in `<time>`), `/terms`, `/journal` and a post | PASS |
| Unpublished `/how-it-works`, unknown `/services/nope` and `/journal/nope`: not-found page with `robots=noindex` | PASS |
| Company brief: empty submit focuses the error summary with three linked errors; a filled brief is stored as a `wholesale` enquiry with company, quantity, role and fabric responsibility | PASS |
| Contact with `?type=fitting&service=<slug>`: subject and service prefilled, five profile channels, stored as `fitting` (previously every subject was saved as `general`) | PASS |
| Website admin as super_admin: hub shows published counts; create a service, save draft, preview in the frame ("Preview, not published" bar, draft list rendered), publish; `site.php` then serves the body with the list and the link | PASS |
| Publishing a project with no images or consent is refused and the reasons are listed in plain words | PASS |
| Business details: an Instagram link on another host is refused with a labelled error; the original value saves again | PASS |
| Upload of a 3000 by 2000 photo: downscaled in the browser and stored at 2400 by 1600 | PASS |

NOT TESTED: screen readers, desktop widths for the admin editor, the editor as the `editor` role (owner-only buttons hidden by role; the server enforces it), real photographs, dark theme on the new admin screens.

### Redesign: dark luxury (13 October 2026)

Branch `feat/redesign-dark-luxury` (D-023), local staging with synthetic data, Vite dev server on 5112 against the staging API on 8088, Chromium through the Playwright MCP. To exercise the slider, five labelled placeholder photographs were uploaded to staging through `cms.php?action=media_upload` and attached to the home page and four services (staging only; no production call).

| Check | Result |
|---|---|
| `npm run lint` (0 errors; the 87 warnings are in untouched files), `check-tokens` (5 stylesheets, 58 public scripts), `npm run build` | PASS |
| Home at 1440px: full-screen hero under the transparent header, five slides (home plus four services), headline word reveal, progress bars advance, counter and arrows; header turns solid on scroll | PASS |
| Home at 1440px: service cards equal height with the footer row aligned; work cards with captions; ivory bands for questions; closing band over the dimmed photograph; footer with action, columns and wordmark | PASS |
| Home at 390px: hero copy at the bottom over the scrim, stacked actions, bars and arrows on one row, no sideways scroll (`scrollWidth` 375 within a 390 window) | PASS |
| Admin Today at 1440px (light): Fraunces title, four summary tiles from the existing `today.php` counts, white cards on ivory, tinted chips, amber-tint active item | PASS |
| Admin Jobs at 1440px (dark): ink surfaces, readable chips and rows, logo box aligned with the 64px topbar | PASS |
| Console | No new errors; the one error is the existing `UNSAFE_componentWillMount` warning from `SideEffect` (react-helmet) |

Fixed during the check: a 1px line under the transparent header (its gradient repeated into the transparent border), the questions list centred under a left-aligned heading, and the admin logo box at 100px against a 64px topbar.

NOT TESTED: reduced motion on the new hero, keyboard and swipe on a real phone, screen readers, every other public page and admin screen in both themes, tablet widths, real photographs, production.

Second pass, 14 October 2026, same setup at 1440px: swept `/services`, `/services/:slug`, `/work`, `/contact`, `/track`, `/journal`, `/auth/sign-in`, `/website` and a job page. Found and fixed: closing-band buttons touching their heading (`Actions` had no top margin inside `.hc-cta-band`), four service cards leaving one alone in a three-column grid, sparse "What's included" and "Pricing" bands, unstyled journal cards, the select box shorter than the inputs, the old patterned sign-in panel, the tan Bootstrap warning alert and the admin footer in link colour. Rechecked after the fix: service page, sign-in and journal cards PASS.

Third pass, 14 October 2026: shared bands built to match the prototype. Checked in the browser on staging: home at 1440px (every prototype section in order) and 390px (process steps stack, no sideways scroll, `scrollWidth` 375 in a 390 window), a service page with the "At a glance" card, About and Company orders (company band, process, brief form; no console errors). PASS. Added after that check and not re-screenshotted: the "What happens next" card beside the company brief. NOT TESTED: How it works (unpublished on staging), Our work after this pass, tablet widths.

Fourth pass, 14 October 2026 (owner compared the build with the prototype): split section heads, the prototype footer and the rotating testimonial. Two synthetic reviews ("Staging Client A/B") were added to the local staging `testimonials` table to render the quote. Checked at 1440px on the home page: services head split, testimonial with dots and caption, footer columns and bottom bar. PASS. NOT TESTED: these three at phone width, the testimonial label after its font fix.

Consistency pass, 14 October 2026: checked at 1440px on staging: Questions (split groups, closing band), Track (shared header, form beside the account card; the card alignment fix was not re-screenshotted), a work piece (header band with facts and service link, process, closing band; the empty-band fix was not re-screenshotted). PASS. NOT TESTED: Journal list and post, Privacy and Terms (none published on staging), Account, Book, the portal job page and the shop pages after the header change, phone widths for this pass.

Build pass, 14 October 2026: at 390px, `scrollWidth` 375 in a 390 window and an h1 rendered on all 14 public routes (home, services, a service, work, a piece, about, company orders, questions, contact, journal, track, account, book, privacy). PASS. At 1440px: Booking with the "How booking works" card, Website admin with the hero slides preview (5 slides, crossfade, thumbnails, edit links) and Clients in the light theme. PASS. NOT TESTED: the Business details shortcut list after it was added, My account signed in, admin screens in dark beyond Jobs. Lint 0 errors, check-tokens, build and check-docs PASS.

Admin (CMS) pass, 14 October 2026, same setup: Jobs board at 1440px light (five stage columns with counts, late days in red, payment chips) and 390px (board scrolls inside itself, page `scrollWidth` within the window); Payments at 1440px (three tiles: ₦778,000 received this month, ₦1,834,000 across 54 jobs to collect, 17 to verify, matching the Balances due total); Today at 390px ("Good afternoon, Staging"); Clients at 390px in dark (79 avatars, no sideways scroll). Found and fixed: tile figures broke across two lines at 390px; the Payments tile first read "Owed on open jobs" although the due list includes collected jobs, now "Balances to collect". Checks: lint 0 errors, check-tokens, build, 374 helper tests PASS. NOT TESTED: Enquiries avatars on screen (code only), the board with the stage filter set, keyboard use of the List or Board switch, screen readers, real phones.

Job page pass, 16 October 2026, same setup, job HC-0006 (part paid): at 1440px light the stage bar sits above the tabs, Overview shows the stage and dates on the left and the Money card on the right (₦120,000 price, ₦60,000 verified, ₦60,000 balance, 50% paid); at 390px dark the Money card comes first, no sideways scroll, and on loading `?tab=payments` the stage bar scrolls the current step into view. Found and fixed: every card in the Overview row stretched to the row height (admin equal-height rule), now `.hd-stack`. NOT TESTED: a tailor account (no Money card, full-width column), a company job, a job without a price, keyboard and screen readers.

Admin sweep, 16 October 2026, 390px in dark on staging: Enquiries, Appointments, Messages, Website, Hero slides, Settings, Companies and Aso-ebi groups load with an h1, no error alert and no sideways page scroll (tab strips scroll inside themselves by design). Groups had the old Larkon heading (an h4, no `.hd` wrapper); moved to the shared page header. Console: only the known react-helmet `UNSAFE_componentWillMount` warning. NOT TESTED: forms and modals on these screens at 390px, real phones.

Publish bar, method filter and tab pills, 16 October 2026, staging: Website at 1440px shows "9 items have changes that are not live yet" with links to Our work (1) and Questions (8), matching the list chips below; Payments Recent offers All methods, Bank transfer, Not recorded and Cash (the methods present), Bank transfer narrows 76 rows to 17 and sets `?tab=recent&method=transfer`; Enquiries at 390px in dark shows count pills (25, 10, 1, 9, 1), no sideways page scroll. NOT TESTED: the publish bar with nothing waiting (staging has drafts), the filter on To verify, keyboard and screen readers.

Gap checks, 16 October 2026, staging: tailor account (`tailor` role) on job HC-0006: no Money card, no naira amounts, full-width column, tabs Overview, Measurements, Handover and Timeline, stage bar shown; the tailor's Jobs board shows 42 cards and no payment states (PASS). Company job HC-0038 as owner: tabs Overview, Items, Sample, Company, Messages, Quote, Payments, Handover, Timeline; stage bar; Money card shows "No price yet" for a job without a price; no sideways scroll (PASS). Home hero under emulated `prefers-reduced-motion: reduce`: no Ken Burns zoom (`animation: none`, `transform: none`), headline words shown without the reveal (opacity 1) (PASS). Autoplay under reduced motion: Verified in code only (`src/app/(public)/site/ui/Hero.jsx` line 65, `still` pauses the slider); staging has one published slide, so it was not observed in the browser.

Offline (A16), 16 October 2026, local staging, browser set offline through Playwright: Contact at 390px shows the offline bar, Send enquiry is refused with the offline message and the typed name stays in the field; back online shows "Back online. You can save again." and it clears after about four seconds (PASS). Admin Payments: Verify while offline is refused with the message (banner and save state) (PASS). Switching a Payments tab offline shows "You are offline, so payments cannot load. Retry once the connection is back."; Retry after reconnecting loads 76 rows (PASS). Opening Appointments offline before its code had loaded first blanked the whole app (found in this check); now the "This page could not open" screen shows with Try again, which opened Appointments once back online (PASS). NOT TESTED: a real phone, the production service worker, slow and intermittent connections, screen readers.

Those offline checks ran on #17's own implementation. At the 18 October 2026 merge of #14 that implementation was replaced by #14's (staff banner only, no "Back online", `AppErrorBoundary` instead of `RouteErrorBoundary`); the checks were rerun on the merged branch the same day, below.

Merged branch, 18 October 2026: a development build of `sync/offline-a16` served by `vite preview` against a staging API on this branch, Chromium through Playwright, browser set offline. Signed in, Today loads; offline, the staff banner shows "You are offline. You can still read what is on screen..." (PASS); moving to Payments, whose code had not loaded, shows the error screen with the offline sentence instead of a blank app (PASS); Back returns to Today with the error screen cleared and the banner still showing (PASS); back online the banner goes (PASS). A save attempted offline throws "You are offline, so nothing was saved" with `network` and `offline` set (PASS, through `heritApi` in the page). NOT TESTED: the `LoadError` offline sentence on screen, the website and sign-in (no banner by design), a real phone, the production service worker. A page that failed to load stays failed until Reload (React keeps a failed lazy import), which the screen tells the user to do.

### Audit fixes (17 October 2026)

Branch `feat/redesign-dark-luxury`, Vite dev server on 5112 against the staging API on 8088, Chromium through Playwright. API results are in [SECURITY-AUDIT.md](AUDIT.md#audit-fixes-17-october-2026).

| Check | Result |
|---|---|
| An unknown URL, `/pages-404`, `/auth/sign-up` and `/auth/lock-screen` show "Page not found" with noindex | PASS |
| Shop routes show the not-found page to a visitor while the shop is off, and open for signed-in staff | PASS |
| `/auth/reset-pass` shows text and no form | PASS |
| Contact shows the privacy note and the `/privacy` link | PASS |
| Track, Account, the portal job page, Invite, Cart and Checkout carry noindex | PASS |
| Home hero with two synthetic slides: one `h1`, one `h2`, pause stops advance | PASS |
| No sideways scroll at 320px on home, contact, book, company orders, track, account and not-found | PASS |
| Only localhost and the staging API requested; console 0 errors | PASS |

NOT TESTED: the privacy note on Book step 2 (online booking is off on staging), the error boundary and its one-time reload, real phones, screen readers.

### Usability

Usability evidence (formerly `qa/UX-AUDIT.md`). Specification: [docs/UX-SPEC.md](UX-SPEC.md).

#### Owner usability review (planned)

Try these on a phone without instruction: find today's fitting; add a walk-in client; reuse approved measurements; see which job is due tomorrow; record a verified payment; send a reply; mark a collection; correct a mistaken entry.

Proposed goals to test, not guaranteed outcomes: routine status and payment actions within a minute; a new enquiry or client within two minutes; no repeated contact entry. Watch where the owner hesitates and simplify labels and screens before adding help text. Key actions show saving and saved immediately; a failed form keeps what was typed; empty screens show one next step. Cross-device support means practical phone, tablet and laptop coverage.

#### Findings

| Journey or screen | Device | Finding | Evidence | Severity | Recommendation | Status |
|---|---|---|---|---|---|---|
| Enquiries error state | Any | Technical upload instruction shown to the owner (A17) | `enquiries/page.jsx:61-63` (audit) | Medium | Plain message and Retry | Fixed on `feat/phase1b-staging`; browser NOT TESTED |
| Tailoring and Groups error states | Any | Same upload instruction pattern remains (K-02) | `tailoring/page.jsx:207-210`, `tailoring/groups/page.jsx:152` | Medium | Same fix as A17 | Fixed on `feat/phase2-daily-records`: plain message and Retry (`LoadError`); error state not rendered in the browser run |
| Public home page | Mobile and desktop | Invented statistics, staff, testimonials and offers (A07) | HomePage.jsx:62-99, 218 | High | Remove in Phase 4 | Fixed on `feat/phase4-website`: Home shows published CMS content only; owner copy and photographs still to come |
| Owner usability review | Phone | Not run | None | Unknown | Run after Phase 2 | NOT TESTED |
| Rendered screens | 390px and 1280px | Phase 2 owner journey captured end to end | Headless Chromium screenshots, 10 Oct 2026 (agent scratchpad) | Unknown | Keep capturing per phase | PASS for the Phase 2 journey; other screens NOT TESTED |
| Phone sidebar opened by itself | 390px | Every route change toggled the off-canvas sidebar, so in-page links and the new bottom bar opened it over the page and blocked taps | Browser run, 10 Oct 2026 | High | Close on navigation only | Fixed (`LeftSideBarToggle.jsx`) and re-run PASS |
| Ledger rows on phones | 390px | Entry text squeezed into a narrow column beside the action buttons | Screenshot, 10 Oct 2026 | Low | Wrap actions below the text | Fixed and re-checked |
| Job tabs on phones | 390px | Tab strip scrolls sideways; later tabs are off screen | Screenshot, 10 Oct 2026 | Low | Keep the active tab scrolled into view | Fixed; owner review still needed |
| Quote card after acceptance | 1280px | Card briefly hidden while the quote reloads | Screenshot, 10 Oct 2026 | Low | Keep the card while reloading | Fixed |
| Today | 390px and 1280px | Blocks with work first, counts, one-tap rows, one next step when empty, no charts | Screenshots, 10 Oct 2026 | None | Owner to confirm block order | Built; owner review NOT TESTED |

Check comprehension, hierarchy, navigation, calls to action, forms, feedback, error recovery, trust, overflow, touch behaviour and the next step.

### Offline behaviour, 17 October 2026 (A16)

Chromium (Playwright) offline mode, `npm run dev` against local staging, `feat/redesign-dark-luxury`.

| Check | Result |
|---|---|
| Staff screen (`/today`) online, offline, online again | PASS: offline banner hidden, shown, hidden |
| Contact form submitted while offline | PASS: no request to `contact.php`; alert "You are offline, so nothing was saved. Reconnect and try again." |
| Gift card issued on staging (synthetic) | PASS: `HG-` plus 16 hex characters; `gift_check` accepts it |
| POS offline queue | Source only: `isNetworkError` also accepts the new `network` flag; NOT TESTED in a browser |
| Real phones, flaky connections, update after a deploy | NOT TESTED |

## 2026-10-17 · Accessibility Audit

_Merged from `docs/AUDIT.md` on 2026-10-30._

## Accessibility Audit

Evidence for accessibility. Requirements: [docs/ACCESSIBILITY.md](ACCESSIBILITY.md).

### Automated evidence

The GEE OS automated gate (`./scripts/project accessibility` writing `.agent/evidence/accessibility.json`) is not set up in this project (Verified 10 October 2026). No axe or other automated scan has been run. Automated checks would cover only automatically testable rules, not complete WCAG compliance.

### Manual assurance

| Area | Method | Expected | Observed | Status | Evidence |
|---|---|---|---|---|---|
| Colour contrast of tokens | WCAG formula on token values | Text pairs at least 4.5:1, controls 3:1 | Table in DESIGN-SYSTEM.md | PARTIAL: calculated, not measured on rendered pages | [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md#colour-and-contrast) |
| Keyboard and focus | Manual | Complete operability and visible focus | Not run | NOT TESTED | None |
| Reflow and 200% zoom | Manual at 320 to 1440px | No loss of content, no page overflow | Not run | NOT TESTED | None |
| Touch targets | Manual | 44px preferred, 48px primary form controls | Not run | NOT TESTED | None |
| Screen reader | Manual on phone and laptop | Labels, errors and status announced | Not run | NOT TESTED | None |
| Reduced motion | Manual | Static equivalents | Not run | NOT TESTED | None |

The 10 October 2026 rendered audit was BLOCKED (occupied browser profile, in-app browser unavailable). The old claim that both themes pass WCAG AA had no runtime evidence and is withdrawn.

### Audit fixes, 17 October 2026

Chromium (Playwright) against `npm run dev` on 5112 with the staging API on 8088, `feat/redesign-dark-luxury`. Changes are described in [UX-SPEC.md](UX-SPEC.md#public-navigation) and [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md#colour-and-contrast).

| Check | Result |
|---|---|
| Home hero with two synthetic slides: one `h1`, one `h2`; pause stops advance for 9s; button 48 by 48px; slide counter live region `off` while moving, `polite` when paused | PASS |
| Paper success token `#166534` on ivory: 6.34:1 (was `#15803D` at 4.46:1) | PASS (calculated) |
| No sideways scroll at 320px on home, contact, book, company orders, track, account and the not-found page | PASS |
| Sign-in: show password is a button with `aria-label` and `aria-pressed`; field autocomplete set | PASS (source and rendered) |
| Console | PASS: 0 errors |

NOT TESTED: testimonial pause in the browser beyond source, screen readers, real phones, keyboard-only use of the new pause buttons.


#### Second batch, 17 October 2026 (K-16)

| Check | Result |
|---|---|
| Access form, empty submit | PASS: focus moves to Reference; error ids are linked only while shown |
| Contact form, successful send (synthetic enquiry, then deleted) | PASS: focus moves to the thank-you panel (`role=status`) |
| Booking steps and errors | Source only: focus moves to each step heading and to the first invalid field; NOT TESTED in a browser (online booking off on staging) |
| Track lookup | Source only: phone input `type=tel`, error `role=alert`, result takes focus; NOT TESTED (legacy lookup) |
| Shop inputs (notify, question, promo, gift, referral) | Source only: accessible names added; shop off for visitors |

### Phase 4 public foundation, 11 October 2026

Chromium (Playwright 1.63) against `npm run dev` with local staging, `feat/phase4-website`. Pages `/`, `/about`, `/contact`, `/track`, `/book` at 320, 390, 768, 1024 and 1440px, with the staff dark theme saved in the browser. Screenshots are kept outside the repository (agent scratchpad `phase4-shots/foundation/`).

| Check | Result |
|---|---|
| No horizontal scroll (`scrollWidth <= innerWidth`) | PASS, 25 of 25 |
| One `h1` per page | PASS |
| Header, footer, form and button targets at least 44px | PASS after the `/track` shop-order inputs moved to the shared 48px input |
| No text in amber `rgb(245, 158, 11)` | PASS |
| Public page stays light with the staff dark theme saved (`data-bs-theme="light"`, white surface), also after visiting `/today` in dark mode | PASS |
| First Tab reaches "Skip to main content"; focus outline 2px solid `rgb(23, 26, 32)` | PASS |
| Mobile menu: `aria-expanded`, focus moves into the sheet, page scroll locked, Escape closes and returns focus to the Menu button | PASS |
| Reduced motion: `document.getAnimations().length` is 0 and no content left hidden | PASS on all five pages |
| No request to api.iconify.design or heritclothing.com | PASS |
| Forbidden-claims pattern (HERIT10, 1200+, 18 countries, 98%, staff names, Free Lagos delivery, worldwide, Ajuwon) and "undefined", `[owner`, `{{` | PASS |
| Images have alt, width and height | PASS (the logo is the only image) |
| Screen reader, 200% zoom, real phones | NOT TESTED |

### Phase 4 CMS pages, 11 October 2026

Branch `feat/phase4-website`, local staging, Chromium through the Playwright MCP. Routes: `/`, `/services`, a service, `/work`, a project, `/company-orders`, `/about`, `/contact`, `/faqs`, `/privacy`, `/terms`, `/journal`, `/track`, `/book`, `/how-it-works` (unpublished: not-found page). Widths 320, 390, 768, 1024 and 1440px (75 page loads).

| Check | Result |
|---|---|
| No element wider than the viewport (measured per element, because `.hc` clips horizontal overflow and would hide it from a scroll-width test) | FAIL at 320px on Home: the hero button label "Request a measurement appointment" did not wrap and pushed the hero to 352px, clipped. Fixed (buttons wrap below 600px; hero grid column `minmax(0, 1fr)`); re-run PASS at all five widths, the wrapped button 56px tall |
| Header, footer and form controls at least 44px tall; inputs 52px | PASS |
| Exactly one `h1` in `main` | PASS |
| No text in amber `#F59E0B` | PASS |
| Every image has alt, width and height | PASS |
| No request to api.iconify.design | PASS (0) |
| Forbidden-claims pattern (BUILD-SPEC 4.11) and `undefined`, `[owner`, `{{` absent | PASS; the detector was proved by injecting a claim |
| Reduced motion: no running animations on Home | PASS (0) |
| Keyboard focus visible | PASS (2px solid outline) |
| Admin screens `robots=noindex, nofollow`; public pages indexable | PASS |

NOT TESTED: screen readers, 200% zoom, the empty-CMS run from BUILD-SPEC 4.11 (Home with nothing published), real photographs.

## 2026-10-17 · Performance Audit

_Merged from `docs/AUDIT.md` on 2026-10-30._

## Performance Audit

Evidence for performance. Targets: [docs/CONTENT.md](CONTENT.md#seo-and-performance).

- Agreed budgets: LCP 2.5s or less, INP 200ms or less, CLS 0.1 or less at the 75th percentile, where field data exists (Plans 2026, approved 10 October 2026). No byte budget agreed.
- Tested build, route, device and network: production build only; no route measured.
- Lab evidence: NOT TESTED.
- Field evidence: N/A until real traffic is measured.

| Measure | Budget | Observed | Status | Evidence | Action |
|---|---|---|---|---|---|
| Largest content rendering (LCP) | 2.5s | Not measured | NOT TESTED | None | Lab check of the public home page in Phase 4 |
| Interaction delay (INP) | 200ms | Not measured | NOT TESTED | None | Lab check of forms |
| Layout stability (CLS) | 0.1 | Not measured | NOT TESTED | None | Lab check |
| Public initial CSS and JS | None agreed; spec suggests about 180 KB gzip JS | Home `/`: CSS 3 files 429.2 KB raw (63.0 KB gzip) before, 2 files 33.1 KB (6.5 KB gzip) after; JS 487.1 KB raw (155.7 KB gzip) before, 331.5 KB (107.4 KB gzip) after. `/contact` JS 120.9 to 106.3 KB gzip; `/track` CSS 61.9 to 7.7 KB gzip. Third-party hosts before: Google Fonts, api.iconify.design, and Google Maps on `/contact`; after: Google Fonts only | Recorded (lab, transferred body sizes, local `vite preview`) | Playwright in Chromium, 11 Oct 2026, `feat/phase4-website`, admin CSS split from public routes, Iconify replaced by bundled icons, Swiper and the map removed | Fonts self-hosted on 17 Oct 2026 (below); a manifest-based bundle check (spec 4.9) is not written yet |
| Production JavaScript | None agreed | 1,550,879 bytes in 109 files; `dist` 2,592 KB (was 10,212 KB after A18 and 15,396 KB before it; JS was 4,985,796 bytes in 259 files before A18) | Recorded | `npm run build`, 10 Oct 2026, `chore/cleanup-docs-sync` after unused packages, images, fonts and style partials were removed | Large-chunk warning remains; measure the public initial load. On `feat/phase3-appointments-portal`, 11 Oct 2026, with the Phase 3 screens added and the calendar packages gone: 1,296,727 bytes in 115 files, `dist` 2,364 KB |

Fonts, 17 October 2026 (`feat/redesign-dark-luxury`): Inter and Fraunces now load from `public/fonts` (variable WOFF2, latin, latin-ext and Vietnamese subsets, two latin files preloaded), so the Google Fonts stylesheet and font hosts are gone. Browser network log on the dev server against staging: only localhost and the staging API requested (PASS). `php-api/.htaccess` caches `.woff2` for a month, hashed build files for a year (`immutable`) and sends `no-cache` for `index.html`, `sw.js` and the manifest, with `mod_deflate` compression; checked on local Apache 2.4.67 (PASS). LCP and font swap timing NOT TESTED.

Inspect image and font weight, script cost, caching, critical rendering, interaction delay and layout stability. A slow-network enquiry or booking must stay clear and recoverable.

### PWA

Evidence for the installable shell (formerly `qa/PWA-AUDIT.md`). Specification: [docs/ARCHITECTURE.md](ARCHITECTURE.md#pwa-offline-and-updates).

- Applicability: Applicable, offline shell only (D-016).
- Tested version and environment: none. The service worker does not register on localhost (`index.html:101`), so local staging cannot exercise it.
- Devices and browsers: none tested.
- Network conditions: online, slow, intermittent, offline and restored all NOT TESTED.

| Gate | Expected | Observed | Status | Evidence |
|---|---|---|---|---|
| Manifest valid and installable | Install prompt available; icons render | Not run | NOT TESTED | None |
| Offline shell | Navigation offline shows the cached app shell | Not run | NOT TESTED | `public/sw.js:28-30` (source) |
| API never cached | `.php` and `/api` bypass the cache | Source matches | PASS (source review only) | `public/sw.js:25` |
| Writes blocked offline | Plain offline message; no false success | Not implemented | FAIL (not built) | [ARCHITECTURE.md](ARCHITECTURE.md#offline-behaviour) |
| Upgrade from previous build | New build served; old caches removed | Not run | NOT TESTED | [ARCHITECTURE.md](ARCHITECTURE.md#updates) |

Blockers: write blocking offline is not built (A16). Recommendation: NO-GO for any claim of offline capability until the gates above pass.

## 2026-10-17 · Security Audit

_Merged from `docs/AUDIT.md` on 2026-10-30._

## Security Audit

Evidence for security controls. Threat model and controls: [docs/SECURITY.md](SECURITY.md). Findings and status: [ROADMAP.md](ROADMAP.md#findings).

### Automated evidence

The GEE OS automated gate (`./scripts/project security` writing `.agent/evidence/security.json`) is not set up in this project: neither path exists (Verified 10 October 2026). Automated checks available today: `php php-api/tests/run.php` (166 helper checks on the Phase 2 branch, including the HTML sanitiser, CORS decision and throttle maths; PASS on 10 October 2026) and `php -l`. No dependency vulnerability audit has been run (NOT TESTED). These are not a threat model, penetration test or proof of complete application security.

### Manual assurance

| Area | Threat or control | Test performed | Result | Severity | Evidence | Owner |
|---|---|---|---|---|---|---|
| Secrets | Client, source and history exposure | Source review: `config.php` gitignored, only `VITE_*` reaches the browser | PARTIAL: Git history not scanned | Critical until checked | `.gitignore`, `.env.example` | Business owner |
| Customer authentication | Guessable references, enumeration (A03, A06) | Staging smoke checks for public reference, legacy flag, wrong phone | PARTIAL: throttle and generic errors in source; contact verification not built | P0 | [FUNCTIONAL-AUDIT.md](AUDIT.md) | Business owner |
| Authorisation | Cross-customer and cross-role access | None | NOT TESTED | P0 | None | Business owner |
| Client and server role drift | UI and API disagree (K-01) | Source comparison; tailor role in a browser | PASS for source and the tailor role (Phase 2 branch); other roles NOT TESTED | Low | [SECURITY.md](SECURITY.md#permissions) | Business owner |
| Output encoding | Stored script in blog HTML (A04) | Helper tests of `sanitize_html()` | PARTIAL: rendered page NOT TESTED | P0 | `php-api/tests/run.php` | Business owner |
| Payment integrity | Lost or double-counted payments (A05) | Transaction and row lock (PR #6); append-only ledger with request keys checked by `e2e-phase2.sh` (PR #9) | PARTIAL: duplicate submits PASS on staging; concurrency NOT TESTED | P0 | `ledger.php`, `scripts/staging/e2e-phase2.sh` | Business owner |
| Shared includes | Direct requests to `_*.php` or `config*.php` | `php-api/.htaccess` rule (Phase 2 branch); staging router refuses them | PASS on staging; live `.htaccess` NOT TESTED | P1 | `php-api/.htaccess`, `scripts/staging/router.php` | Business owner |
| CORS | Localhost origins in production (A15) | Helper tests of the CORS decision | PASS (unit); live server NOT TESTED | P1 | `php-api/tests/run.php` | Business owner |
| Deployed state | Unknown hand-uploaded endpoints (A02, A20) | None | NOT TESTED | P0 | None | Business owner |
| Uploads, CSRF, headers, cookies | Per SECURITY.md | Headers: see below. Uploads, CSRF, cookies: none | Headers PARTIAL (local Apache); others NOT TESTED | Unknown | None | Business owner |

### Audit fixes, 17 October 2026

Branch `feat/redesign-dark-luxury`, local staging. Controls are described in [SECURITY.md](SECURITY.md#audit-fixes-17-october-2026).

| Area | Test performed | Result |
|---|---|---|
| Helper tests and syntax | `php php-api/tests/run.php`; `php -l` on every PHP file | PASS: 374 passed, 0 failed; syntax OK |
| API journeys | `e2e-phase2.sh`, `e2e-phase3.sh`, `e2e-phase4.sh` (new O2a: shop writes 403 while the shop is off) | PASS: 48 of 48, 93 of 93, 63 of 63. `e2e-phase5.sh` BLOCKED on macOS (bash 3.2 has no `mapfile`; C1 to C5 passed before it stopped) |
| `.htaccess` headers and redirect | Local Apache 2.4.67 on port 8099 with `php-api/.htaccess` | PASS: HTTP answers 301 to HTTPS; nosniff, Referrer-Policy, X-Frame-Options, `frame-ancestors` CSP and Permissions-Policy present; hashed build files `immutable`, `index.html` `no-cache`. HSTS under real TLS NOT TESTED |
| WhatsApp webhook signature | None at runtime | NOT TESTED (source review only) |
| AI daily caps | None at runtime (no key on staging) | NOT TESTED (source review only) |
| Third-party requests | Browser network log on public pages | PASS: only localhost and the staging API requested; no Google Fonts |
| Live seed tailors | Check the live `users` table | NOT TESTED: owner action ([DEPLOYMENT.md](DEPLOYMENT.md#owner-actions-per-pull-request)) |

Open items not fixed are listed in [SECURITY.md](SECURITY.md#open-items-not-fixed).

#### Second batch, 17 October 2026

| Area | Test performed | Result |
|---|---|---|
| Staff token storage (K-15) | Sign in a synthetic `example.test` tailor on staging; compare `auth_tokens` with the raw and the SHA-256 token; call `me` and `sessions`; log out | PASS: 64-character token returned, only its SHA-256 stored, `me` 200, current session marked, row gone and `me` 401 after logout |
| Login timing (K-23) | Two wrong-password sign-ins each for an existing and an unknown email | PASS: 0.18s for both (was 0.19s and 0.05s) |
| End-to-end with hashed tokens | `e2e-phase3.sh`, `e2e-phase4.sh`, `e2e-phase5.sh`, `e2e-phase2.sh` | PASS 93, 63, 25; phase 2 47 of 48 (E15c, K-07 staging data) |
| Sitemap with the shop on (K-20) | Switch `shop_enabled` on in staging, fetch `sitemap.php`, restore | PASS: `/shop`, `/gifting` and published products listed only while on |

#### Owner decisions D-024, 17 October 2026

| Check | Result |
|---|---|
| Promotional sends refused (K-11) | PASS: `whatsapp.php?action=broadcast`, `engage.php?action=waitlist_notify` and `abandoned_nudge` answer 403 with the D-024 message for a staff token; broadcast without a token 401 |
| Attribution expiry (K-13) | PASS: Node check of `attribution.js` for fresh, 29-day, 31-day, legacy plain, missing and blocked-storage cases |
| Manifest on staff pages only (K-20) | PASS in Chromium: no manifest link on `/`; manifest with `start_url` `/today` on `/auth/sign-in` |
| AI drafter prompt (K-12) | Source only; NOT TESTED at runtime (no AI key on staging) |
| Regression | Helper tests 374; e2e phase3 93, phase4 63, phase5 25; phase2 46 of 48 (E9b and E15c: Today's 20-item cap on accumulated staging data, K-07); lint 0 errors; build |

#### Shared PINs, 17 October 2026 (K-23)

Two synthetic `example.test` tailors on local staging (script in the session scratchpad; PINs cleared afterwards).

| Check | Result |
|---|---|
| Second user sets a PIN the first already uses | PASS: 409 "That PIN cannot be used. Choose a different one." |
| Sign-in with a unique PIN | PASS: 200 |
| Sign-in with a PIN forced onto both accounts in the database | PASS: 401, `pin_login_ambiguous` audited |
| Repeated refusals | PASS: 409 four more times, then 429 |

#### Content Security Policy, 17 October 2026 (K-23)

Production build (`vite preview`) with the policy added to every page by Playwright, API calls passed through to local staging.

| Check | Result |
|---|---|
| Public pages `/`, `/contact`, `/services`, `/work`, `/book`, `/account`, `/company-orders`, an unknown URL | PASS: 0 CSP violations; pages render with their h1 |
| Staff pages `/today`, `/enquiries`, `/jobs`, `/website`, `/whatsapp` | PASS: 0 violations; Iconify icons render; splash fades; manifest linked; staff title |
| Injected inline script on `/contact` | PASS: blocked, violation reported |
| `php-api/.htaccess` in local Apache 2.4 | PASS: syntax OK; CSP header on the page; `boot.js` served as JavaScript |
| Live site, payment gateway redirects, real phones | NOT TESTED |

## 2026-10-10 · Regression Audit

_Merged from `docs/AUDIT.md` on 2026-10-30._

## Regression Audit

Each material change, what it could break, and how it was checked. Strategy: [docs/TEST-STRATEGY.md](TEST-STRATEGY.md).

| Change | Affected behaviour | Adjacent behaviour | Test | Result | Evidence |
|---|---|---|---|---|---|
| Blog sanitiser, payment lock, customer throttle, localhost CORS gate (c859ea6, A03 A04 A05 A15) | Blog save, deposits, customer login, CORS | Blog rendering, tailoring timeline, tracking | Helper tests; `php -l` | PARTIAL: unit PASS; rendered and concurrent behaviour NOT TESTED | `php-api/tests/run.php` |
| CI runs PHP checks; deploy on Node 22 verifies before upload (ea1d3c4, A14) | Deploy job | Upload order | Workflow review | NOT TESTED in GitHub Actions from this branch | `.github/workflows/` |
| Random public references and collision-safe codes (710d492, A06) | Tracking, customer login, checkout, codes | Payment start uses staff code | Staging smoke checks | PASS (API) | [FUNCTIONAL-AUDIT.md](AUDIT.md) |
| Real company field and renamed honeypot (e73ca1d, A11) | Public enquiry form, staff Enquiries | Spam filtering | Staging smoke checks | PASS (API) | [FUNCTIONAL-AUDIT.md](AUDIT.md) |
| Plain enquiry error with Retry (fa016cc, A17) | Enquiries page error state | Other pages with upload instructions (K-02) | Source review | NOT TESTED in a browser | `enquiries/page.jsx` |
| Local staging; dev no longer calls production (743d470, A01) | Development API target | Production builds stay same-origin | Staging smoke checks; build | PASS (API and build) | [FUNCTIONAL-AUDIT.md](AUDIT.md) |
| Larkon demo routes removed (f976fa5, A18) | Admin routes and menu | Remaining kit pages `/apps/calendar`, `/settings`, `/review` (the last two later replaced or removed) | `npm run build` | PASS (build); navigation NOT TESTED in a browser | Build output |
| Shop hidden behind `shop_enabled` (deef585) | Public navigation | Shop routes by direct URL | Source review | NOT TESTED in a browser | `settings.php`, `store.php` |
| Documentation moved to the GEE OS hierarchy (PR #8) | Links in docs and entry files | None at runtime | Relative-link and anchor check over all Markdown; `npm run build` | PASS: 451 links, 0 broken; build exit 0 (10 Oct 2026) | `feat/docs-gee-os` |
| Phase 2 daily records (PR #9): Today, enquiries, clients, measurement sets, quotes, ledger, handovers, navigation and redirects | Tailoring, customers, contact and stats endpoints; every admin route | Old URLs, legacy `stage` values, legacy measurement JSON, deposits, customer portal measurements | Helper tests; `e2e-phase2.sh`; schema replay over seeded data; Playwright owner journey at 390px and 1280px; tailor role check | PASS (166 tests, 48 of 48 checks, every journey step); other roles NOT TESTED | [FUNCTIONAL-AUDIT.md](AUDIT.md) |
| Phone sidebar no longer opens on navigation (0c9bd7a) | Admin layout on phones | Desktop sidebar | Browser at 390px | PASS | [FUNCTIONAL-AUDIT.md](AUDIT.md#usability) |
| Needle H favicon, app icons and manifest (f1e8960, K-03) | Browser tab, install icons | Service worker precache of `/icon.svg` | Build; files present | PASS (build); install on a device NOT TESTED | `public/` |
| Unused code, packages and assets removed; fake backend and axios removed; jsconfig replaces tsconfig (`chore/cleanup-docs-sync`) | Build, imports, sign-in | Calendar page, ESLint config | `npm run build`; `npm run lint` | PASS (build exit 0, `dist` 2,592 KB); browser NOT TESTED by the docs agent | Commits 6f3f5ce to 224627f |
| Documentation flattened; docs check added to CI (`chore/cleanup-docs-sync`) | Links in docs, entry files, workflows | None at runtime | `node scripts/check-docs.mjs` | PASS (10 Oct 2026) | `scripts/check-docs.mjs` |

Record intentional changes separately from regressions. No regression has been reported so far.
