# Functional Audit

Evidence for functional behaviour. Strategy and commands: [docs/TEST-STRATEGY.md](../docs/TEST-STRATEGY.md). Journeys and requirements: [docs/PRODUCT-SPEC.md](../docs/PRODUCT-SPEC.md#functional-requirements). Usability evidence is in the last section.

## Local staging API smoke checks (10 October 2026, PR #7)

Environment: local staging ([LOCAL-STAGING.md](../docs/LOCAL-STAGING.md)), synthetic records, direct API requests. No browser.

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

## Phase 2 owner journey in the browser (10 October 2026, PR #9)

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


## Phase 3 API checks on staging (10 October 2026)

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

## Phase 3 journeys in the browser (11 October 2026)

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

Also run on the same branch: `npm run build` exit 0; `npm run lint` exit 0 (lints no JS/JSX, A13); the tested JS/JSX config, run over `src` from a temporary copy, reports no errors and, among the changed files, only the existing `react-refresh` warnings in `routes/index.jsx`; `php php-api/tests/run.php` 251 PASS; `e2e-phase3.sh` 93 of 93 and `e2e-phase2.sh` 48 of 48 on a fresh `staging:setup` (see [TEST-STRATEGY.md](../docs/TEST-STRATEGY.md#commands-and-latest-results)).

NOT TESTED: real email delivery of codes and replies; WhatsApp sends; real phones and screen readers; the dark theme on the new screens; widths other than 390 and 1280; quote acceptance in the portal (switch off by default) and the measurements view (switch off); a tailor's read-only Appointments view in the browser; `ALLOW_LEGACY_ORDER_CODE_LOOKUP` off.

## Phase 4 API checks on staging (11 October 2026)

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

## Phase 4 website pages and Website admin in the browser (11 October 2026)

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

## Redesign: dark luxury (13 October 2026)

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

Third pass, 14 October 2026: shared bands built to match the prototype. Checked in the browser on staging: home at 1440px (every prototype section in order) and 390px (process steps stack, no sideways scroll, `scrollWidth` 375 in a 390 window), a service page with the "At a glance" card, About and Company orders (company band, process, brief form; no console errors). PASS. Added after that check and not re-screenshotted: the "What happens next" card beside the company brief. NOT TESTED: How it works (unpublished on staging), Our work after this pass, tablet widths. Lint 0 errors, check-tokens, build and check-docs PASS.

## Usability

Usability evidence (formerly `qa/UX-AUDIT.md`). Specification: [docs/UX-SPEC.md](../docs/UX-SPEC.md).

### Owner usability review (planned)

Try these on a phone without instruction: find today's fitting; add a walk-in client; reuse approved measurements; see which job is due tomorrow; record a verified payment; send a reply; mark a collection; correct a mistaken entry.

Proposed goals to test, not guaranteed outcomes: routine status and payment actions within a minute; a new enquiry or client within two minutes; no repeated contact entry. Watch where the owner hesitates and simplify labels and screens before adding help text. Key actions show saving and saved immediately; a failed form keeps what was typed; empty screens show one next step. Cross-device support means practical phone, tablet and laptop coverage.

### Findings

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
