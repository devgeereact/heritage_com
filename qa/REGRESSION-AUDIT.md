# Regression Audit

Each material change, what it could break, and how it was checked. Strategy: [docs/06-quality/TEST-STRATEGY.md](../docs/06-quality/TEST-STRATEGY.md).

| Change | Affected behaviour | Adjacent behaviour | Test | Result | Evidence |
|---|---|---|---|---|---|
| Blog sanitiser, payment lock, customer throttle, localhost CORS gate (c859ea6, A03 A04 A05 A15) | Blog save, deposits, customer login, CORS | Blog rendering, tailoring timeline, tracking | Helper tests; `php -l` | PARTIAL: unit PASS; rendered and concurrent behaviour NOT TESTED | `php-api/tests/run.php` |
| CI runs PHP checks; deploy on Node 22 verifies before upload (ea1d3c4, A14) | Deploy job | Upload order | Workflow review | NOT TESTED in GitHub Actions from this branch | `.github/workflows/` |
| Random public references and collision-safe codes (710d492, A06) | Tracking, customer login, checkout, codes | Payment start uses staff code | Staging smoke checks | PASS (API) | [FUNCTIONAL-AUDIT.md](FUNCTIONAL-AUDIT.md) |
| Real company field and renamed honeypot (e73ca1d, A11) | Public enquiry form, staff Enquiries | Spam filtering | Staging smoke checks | PASS (API) | [FUNCTIONAL-AUDIT.md](FUNCTIONAL-AUDIT.md) |
| Plain enquiry error with Retry (fa016cc, A17) | Enquiries page error state | Other pages with upload instructions (K-02) | Source review | NOT TESTED in a browser | `enquiries/page.jsx` |
| Local staging; dev no longer calls production (743d470, A01) | Development API target | Production builds stay same-origin | Staging smoke checks; build | PASS (API and build) | [FUNCTIONAL-AUDIT.md](FUNCTIONAL-AUDIT.md) |
| Larkon demo routes removed (f976fa5, A18) | Admin routes and menu | Remaining kit pages `/apps/calendar`, `/settings`, `/review` | `npm run build` | PASS (build); navigation NOT TESTED in a browser | Build output |
| Shop hidden behind `shop_enabled` (deef585) | Public navigation | Shop routes by direct URL | Source review | NOT TESTED in a browser | `settings.php`, `store.php` |
| Documentation moved to the GEE OS hierarchy (this branch) | Links in docs and entry files | None at runtime | Relative-link and anchor check over all Markdown; `npm run build` | PASS: 451 links, 0 broken; build exit 0 (10 Oct 2026) | `feat/docs-gee-os` |

Record intentional changes separately from regressions. No regression has been reported so far.
