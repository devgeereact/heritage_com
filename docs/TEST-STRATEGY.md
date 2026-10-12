# Test Strategy

This file owns how HeritOS is checked: the risk priorities, the commands and their latest results, the coverage plan, and the baseline audit record of 10 October 2026. Audit evidence for each area lives in the root [qa/](../qa/) files; the launch verification matrix is in [LAUNCH-CHECKLIST.md](../qa/LAUNCH-CHECKLIST.md). Results use PASS, FAIL, PARTIAL, NOT APPLICABLE, NOT TESTED or BLOCKED.

## Risk priorities

- **Critical user journeys:** enquiry to job conversion, measurements and snapshots, appointments, payments, customer access ([USER-JOURNEYS.md](USER-JOURNEYS.md)).
- **Security and data-loss risks:** cross-customer access (A03), stored script (A04), lost payments (A05), development writing to production (A01), unknown deployed endpoints (A02), backups never restored (A20).
- **Business-rule failures:** double bookings, changed measurements on an existing job, wrong totals ([BUSINESS-RULES.md](BUSINESS-RULES.md)).
- **Supported environments:** local staging for all functional testing; production only for post-release smoke checks with designated test records. Browsers and devices at the widths in [ACCESSIBILITY.md](ACCESSIBILITY.md).

## Commands and latest results

| Command | What it does | Status |
|---|---|---|
| `npm run build` | Vite production build to `dist/` | PASS on 10 Oct 2026 (`chore/cleanup-docs-sync`); Sass deprecation and large-chunk warnings remain |
| `npm run lint` | ESLint, then `scripts/check-tokens.mjs` (raw colours in the token stylesheets and public JSX) | Lints `src/**/*.{js,jsx}` (browser globals, JSX, react-hooks, react-refresh), `public/sw.js` (service worker globals) and the root `*.js` config files (Node). Must exit 0 with 0 errors; warnings are allowed. Result on `feat/phase4-website`, 11 October 2026: PASS, 0 errors, 69 `react-refresh/only-export-components` warnings (A13) |
| `php php-api/tests/run.php` | 251 pure checks for `_lib.php` and `_domain.php` (sanitiser, CORS decision, throttle maths, payments, references and codes, kobo money, stage transitions, request keys; on the Phase 3 branch also availability validation, Lagos slot windows, buffers, blocks, minimum notice, horizon, access-code hashing and expiry, and the portal projection's exact key set); no database or network | PASS on 10 Oct 2026 (251 passed, 0 failed, `feat/phase3-appointments-portal`); PASS on 11 Oct 2026 with the Phase 4 website checks in `php-api/tests/cms_cases.php` (slugs, social and WhatsApp links, profile, JSON-LD, sanitising, publish rules, the draft, publish and rollback state machine, projection key sets, sitemap XML, upload types, image widths): 323 passed, 0 failed (`feat/phase4-website`) |
| `php -l` on `php-api/*.php` and `php-api/tests/*.php` | PHP syntax | PASS for all 48 files on 10 Oct 2026 (`feat/phase3-appointments-portal`); PASS for all 54 files on 11 Oct 2026 (`feat/phase4-website`); not functional proof |
| `bash scripts/staging/e2e-phase2.sh` | Phase 2 API journeys against local staging ([LOCAL-STAGING.md](LOCAL-STAGING.md#end-to-end-checks)) | PASS, 48 of 48 on two runs, 10 Oct 2026 (`feat/phase2-daily-records`); PASS 48 of 48 again on `feat/phase3-appointments-portal` |
| `bash scripts/staging/e2e-phase3.sh` | Phase 3 API journeys: appointments, public requests, customer access, portal isolation, messages, change requests, feedback ([qa/FUNCTIONAL-AUDIT.md](../qa/FUNCTIONAL-AUDIT.md#phase-3-api-checks-on-staging-10-october-2026)) | PASS, 93 of 93 on two runs after a fresh `staging:setup`, 10 Oct 2026 (`feat/phase3-appointments-portal`) |
| `bash scripts/staging/e2e-phase4.sh` | Phase 4 website API: CMS draft, publish, rollback and unpublish, public projection, sitemap, robots, uploads, consent ([qa/FUNCTIONAL-AUDIT.md](../qa/FUNCTIONAL-AUDIT.md#phase-4-api-checks-on-staging-11-october-2026)) | PASS, 62 of 62 on two runs after a fresh `staging:setup`, 11 Oct 2026 (`feat/phase4-website`); `e2e-phase2.sh` 48 of 48 and `e2e-phase3.sh` 93 of 93 on the same database |
| `bash scripts/staging/e2e-phase5.sh` | Phase 5 company orders against local staging: company and wearer portal views, sample decisions, item handover, bill-to, contact deactivation and the `company_portal_enabled` switch | 25 of 25 PASS on `feat/phase5-company-orders`, 12 October 2026 |
| `node scripts/check-docs.mjs` | Broken Markdown links and anchors, em dashes in live docs, mentions of missing `docs/` or `qa/` paths | PASS on 10 Oct 2026; runs in CI |
| `npm run preview` | Serves the production build locally | The production build uses relative API paths, so it does not reach the live API |
| Browser journeys | Playwright against `npm run dev` and local staging at 390px and 1280px | Phase 2 owner journey PASS, 10 Oct 2026; Phase 3 owner, public and client journeys PASS (23 steps at each width), 11 Oct 2026 ([qa/FUNCTIONAL-AUDIT.md](../qa/FUNCTIONAL-AUDIT.md#phase-3-journeys-in-the-browser-11-october-2026)); scripts kept outside the repository |

There is no committed frontend test script and no type check (JavaScript project). CI runs lint, the build, PHP syntax, helper tests and the documentation check on every pull request to `main`; the deploy job repeats lint, PHP checks and the build ([DEPLOYMENT.md](DEPLOYMENT.md#ci-and-deploy)).

## Coverage plan

| Level | Purpose | Target behaviour | Environment | Command or method | Owner |
|---|---|---|---|---|---|
| Unit | Rules and boundary cases | `_lib.php` and `_domain.php` helpers: sanitiser, throttle, CORS, payments, references, money, stages, slots, access codes, portal projection | Local, CI | `php php-api/tests/run.php` | Owner |
| Integration | Data, API and service boundaries | Endpoint requests against seeded data, including forbidden cross-role and cross-customer cases | Local staging | `scripts/staging/e2e-phase2.sh` for Phase 2; `e2e-phase3.sh` for Phase 3, including cross-customer cases; each later phase adds its own script | Owner |
| End to end | Critical user journeys | J-01 to J-08 on phone and laptop | Local staging with synthetic records | Playwright walkthrough per phase (Phase 2 owner journey PASS; other journeys not built or NOT TESTED) | Owner |
| Regression | Previously failed behaviour | A03, A04, A05, A06, A11, A17, A21 and every later fix | Local staging | Recorded in [qa/REGRESSION-AUDIT.md](../qa/REGRESSION-AUDIT.md) | Owner |
| Static | Lint, syntax and docs | All JS/JSX and PHP; all Markdown | CI | `npm run lint`, `php -l`, `node scripts/check-docs.mjs` | Owner |

Every requirement needs a planned proof method. Include manual accessibility, responsive, recovery, PWA network and production smoke checks where applicable.

## Baseline audit record (10 October 2026)

| Check | Result | Meaning |
|---|---|---|
| `git status --short` before work | PASS | Tracked worktree initially clean |
| Worktrees and branches | PASS | One worktree on `main` at d91951c; only `main` locally, cached `origin/main` |
| `npm run build` | PASS | Exit 0; Sass deprecation and large-chunk warnings |
| `php php-api/tests/run.php` | PASS | 34 of 34 pure helper checks at baseline (70 after PR #7, 166 after PR #9) |
| `php -l` on top-level php-api files | PASS | 32 files; syntax only |
| `npm run lint` | FAIL (coverage) | Exit 0 but checks no source files (A13); JS/JSX lint applied later on `feat/phase4-website` |
| getdesign CLI | PASS | Tesla reference saved in `docs/Plans 2026/`; no active rules overwritten |
| Local production preview | PASS (startup) | Bound 127.0.0.1:5113; relative API paths |
| Chrome DevTools and Computer Use | BLOCKED | Occupied browser profile; in-app browser unavailable; no browser was stopped |
| Rendered browser and device audit | NOT TESTED | Blocked tooling |
| API, database, booking and client end-to-end | NOT TESTED | Needs staging and synthetic records |
| Production and remote account audit | NOT TESTED | No deployment, live probing or connected accounts used |
| Dependency vulnerability audit | NOT TESTED | Runtime risk review still to do; no blind upgrades |
| Backup restoration | NOT TESTED | Needs an authorised separate environment |
| Re-check of A01 to A20 by file and line | PASS | All true in substance; A06 downgraded, A03 and A13 upgraded, A12 and A19 corrected; A21 to A24 added |
| Local staging API checks (PR #7) | PASS | Staff login, tailoring list and create, enquiry with company, honeypot, tracking and customer login by public reference, legacy-code flag, code collision retry; synthetic data only |
| `npm run build` after A18 (PR #7) | PASS | JS 1,553,500 bytes in 98 files (was 4,985,796 in 259); `dist` 10,212 KB (was 15,396 KB) |

## Audit coverage and limits

The 10 October 2026 audit read the project routing, task and MCP contracts, the preserved CLAUDE knowledge, README and old docs; enumerated repository files, app pages, PHP endpoints, schema tables, public assets, branches and worktrees. Critical paths inspected: route registration and frontend role guards; the API client and token storage; shared PHP authentication and CORS; public contact submission and the staff enquiry page; tailoring creation, stages, measurements, payments and fitting; customer measurement updates; customer portal login and profile; retail tracking; CMS blog save and published reads; website content fallbacks, hero, team, statistics, navigation and social links; calendar state and demo data; the service worker; ESLint and CI and deploy files. Catalogue, stock, suppliers, finance, marketing, AI and inbox were surveyed through routes and API references, not exercised against a database.

It was risk-based, not a line-by-line review of all 774 tracked files, a penetration test, a live operational audit or a WCAG certification. Still needed: phone and laptop screenshots of critical flows; every active endpoint and schema version; customer object ownership; unsafe HTML and upload denial; concurrent booking, payment and reference behaviour; real notification states; owner recovery; backup restore.
