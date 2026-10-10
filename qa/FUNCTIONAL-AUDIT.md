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
| Public home page | Mobile and desktop | Invented statistics, staff, testimonials and offers (A07) | HomePage.jsx:62-99, 218 | High | Remove in Phase 4 | Open |
| Owner usability review | Phone | Not run | None | Unknown | Run after Phase 2 | NOT TESTED |
| Rendered screens | 390px and 1280px | Phase 2 owner journey captured end to end | Headless Chromium screenshots, 10 Oct 2026 (agent scratchpad) | Unknown | Keep capturing per phase | PASS for the Phase 2 journey; other screens NOT TESTED |
| Phone sidebar opened by itself | 390px | Every route change toggled the off-canvas sidebar, so in-page links and the new bottom bar opened it over the page and blocked taps | Browser run, 10 Oct 2026 | High | Close on navigation only | Fixed (`LeftSideBarToggle.jsx`) and re-run PASS |
| Ledger rows on phones | 390px | Entry text squeezed into a narrow column beside the action buttons | Screenshot, 10 Oct 2026 | Low | Wrap actions below the text | Fixed and re-checked |
| Job tabs on phones | 390px | Tab strip scrolls sideways; later tabs are off screen | Screenshot, 10 Oct 2026 | Low | Keep the active tab scrolled into view | Fixed; owner review still needed |
| Quote card after acceptance | 1280px | Card briefly hidden while the quote reloads | Screenshot, 10 Oct 2026 | Low | Keep the card while reloading | Fixed |
| Today | 390px and 1280px | Blocks with work first, counts, one-tap rows, one next step when empty, no charts | Screenshots, 10 Oct 2026 | None | Owner to confirm block order | Built; owner review NOT TESTED |

Check comprehension, hierarchy, navigation, calls to action, forms, feedback, error recovery, trust, overflow, touch behaviour and the next step.
