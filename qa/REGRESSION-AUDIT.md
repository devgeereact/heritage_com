# Regression Audit

Each material change, what it could break, and how it was checked. Strategy: [docs/TEST-STRATEGY.md](../docs/TEST-STRATEGY.md).

| Change | Affected behaviour | Adjacent behaviour | Test | Result | Evidence |
|---|---|---|---|---|---|
| Blog sanitiser, payment lock, customer throttle, localhost CORS gate (c859ea6, A03 A04 A05 A15) | Blog save, deposits, customer login, CORS | Blog rendering, tailoring timeline, tracking | Helper tests; `php -l` | PARTIAL: unit PASS; rendered and concurrent behaviour NOT TESTED | `php-api/tests/run.php` |
| CI runs PHP checks; deploy on Node 22 verifies before upload (ea1d3c4, A14) | Deploy job | Upload order | Workflow review | NOT TESTED in GitHub Actions from this branch | `.github/workflows/` |
| Random public references and collision-safe codes (710d492, A06) | Tracking, customer login, checkout, codes | Payment start uses staff code | Staging smoke checks | PASS (API) | [FUNCTIONAL-AUDIT.md](FUNCTIONAL-AUDIT.md) |
| Real company field and renamed honeypot (e73ca1d, A11) | Public enquiry form, staff Enquiries | Spam filtering | Staging smoke checks | PASS (API) | [FUNCTIONAL-AUDIT.md](FUNCTIONAL-AUDIT.md) |
| Plain enquiry error with Retry (fa016cc, A17) | Enquiries page error state | Other pages with upload instructions (K-02) | Source review | NOT TESTED in a browser | `enquiries/page.jsx` |
| Local staging; dev no longer calls production (743d470, A01) | Development API target | Production builds stay same-origin | Staging smoke checks; build | PASS (API and build) | [FUNCTIONAL-AUDIT.md](FUNCTIONAL-AUDIT.md) |
| Larkon demo routes removed (f976fa5, A18) | Admin routes and menu | Remaining kit pages `/apps/calendar`, `/settings`, `/review` (the last two later replaced or removed) | `npm run build` | PASS (build); navigation NOT TESTED in a browser | Build output |
| Shop hidden behind `shop_enabled` (deef585) | Public navigation | Shop routes by direct URL | Source review | NOT TESTED in a browser | `settings.php`, `store.php` |
| Documentation moved to the GEE OS hierarchy (PR #8) | Links in docs and entry files | None at runtime | Relative-link and anchor check over all Markdown; `npm run build` | PASS: 451 links, 0 broken; build exit 0 (10 Oct 2026) | `feat/docs-gee-os` |
| Phase 2 daily records (PR #9): Today, enquiries, clients, measurement sets, quotes, ledger, handovers, navigation and redirects | Tailoring, customers, contact and stats endpoints; every admin route | Old URLs, legacy `stage` values, legacy measurement JSON, deposits, customer portal measurements | Helper tests; `e2e-phase2.sh`; schema replay over seeded data; Playwright owner journey at 390px and 1280px; tailor role check | PASS (166 tests, 48 of 48 checks, every journey step); other roles NOT TESTED | [FUNCTIONAL-AUDIT.md](FUNCTIONAL-AUDIT.md) |
| Phone sidebar no longer opens on navigation (0c9bd7a) | Admin layout on phones | Desktop sidebar | Browser at 390px | PASS | [FUNCTIONAL-AUDIT.md](FUNCTIONAL-AUDIT.md#usability) |
| Needle H favicon, app icons and manifest (f1e8960, K-03) | Browser tab, install icons | Service worker precache of `/icon.svg` | Build; files present | PASS (build); install on a device NOT TESTED | `public/` |
| Unused code, packages and assets removed; fake backend and axios removed; jsconfig replaces tsconfig (`chore/cleanup-docs-sync`) | Build, imports, sign-in | Calendar page, ESLint config | `npm run build`; `npm run lint` | PASS (build exit 0, `dist` 2,592 KB); browser NOT TESTED by the docs agent | Commits 6f3f5ce to 224627f |
| Documentation flattened; docs check added to CI (`chore/cleanup-docs-sync`) | Links in docs, entry files, workflows | None at runtime | `node scripts/check-docs.mjs` | PASS (10 Oct 2026) | `scripts/check-docs.mjs` |

Record intentional changes separately from regressions. No regression has been reported so far.
