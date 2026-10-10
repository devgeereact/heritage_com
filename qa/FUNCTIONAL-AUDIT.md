# Functional Audit

Evidence for functional behaviour. Strategy and commands: [docs/06-quality/TEST-STRATEGY.md](../docs/06-quality/TEST-STRATEGY.md). Journeys and requirements: [docs/01-product/](../docs/01-product/PRODUCT-SPEC.md#functional-requirements).

## Local staging API smoke checks (10 October 2026, `feat/phase1b-staging`)

Environment: local staging ([LOCAL-STAGING.md](../docs/07-operations/LOCAL-STAGING.md)), synthetic records, direct API requests. No browser.

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

## Phase 2 owner journey in the browser (10 October 2026, `feat/phase2-daily-records`)

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
