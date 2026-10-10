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
| Browser walkthrough of the app against staging | Local staging | None | Journeys usable on phone and laptop | Not run | NOT TESTED | None |
| FR-01 to FR-10 end to end | Local staging | None | Journey acceptance criteria | Not built or not run | NOT TESTED | None |

The original command output was not saved to the repository; these rows are the recorded results. Cover loading, empty, success, validation, service failure, permission denial, session expiry and recovery for every journey once built.
