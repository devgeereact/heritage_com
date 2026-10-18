# Launch Checklist

This file owns the launch verification matrix, the pre-launch checklist, the production check around each release and the release decision (the GEE OS Standard application profile keeps the launch checklist in `qa/`). Nothing below is ticked: unchecked boxes and scaffolding are not evidence.

## Launch verification matrix

Each scenario runs on staging with synthetic records before launch, and again with designated test records after release where safe (Plans 2026, 04).

| Scenario | Required proof | Status |
|---|---|---|
| Client isolation | Two synthetic customers; swapping every relevant ID or reference fails safely | NOT TESTED |
| Company isolation | An organiser cannot read individual measurements or another company's job | NOT TESTED |
| Booking integrity | Simultaneous slot requests, cancellation, reschedule and expiry behave atomically | NOT TESTED (no appointments yet) |
| Measurement integrity | An approved job stays unchanged after a profile update; units stay correct | PARTIAL: frozen job snapshot and units PASS on staging (API and browser, Phase 2 branch); production NOT TESTED |
| Record conversion | A retried enquiry conversion yields one linked job | PARTIAL: idempotent conversion PASS on staging (`e2e-phase2.sh`); production NOT TESTED |
| Payment integrity | Retry, concurrency, reversal and overpayment totals and receipts match | PARTIAL: duplicate request keys, reversal, refund and credit PASS on staging (API); concurrent requests NOT TESTED |
| Rich text and files | Script, unsafe URL and unexpected upload denied; private files need auth | PARTIAL: sanitiser helper tests PASS; rendered and upload checks NOT TESTED |
| Session recovery | Expired or revoked token blocked; owner recovery works | NOT TESTED |
| Failure handling | Offline, API timeout, failed email and missing config show plain, truthful states | NOT TESTED |
| Publication | Drafts private; unpublish effective; invalid URL rejected | NOT TESTED |
| Recovery | Backup restored and records and files verified in a separate environment | PARTIAL: `backup.sh` and `restore-check.sh` round trip PASS on local staging, 18 Oct 2026 (58 of 58 tables match, 99 upload files listed, scratch database dropped); hand check of one linked client, job, payment and photo NOT TESTED; production backup and restore NOT TESTED ([DEPLOYMENT.md](../docs/DEPLOYMENT.md#backup-and-recovery)) |
| Release | Endpoint and schema versions match the build; rollback rehearsed | PARTIAL: release manifest and `release_check.php` PASS locally, 18 Oct 2026 (59 files MATCH on the worktree; a copy with one manual file changed, one ci file changed and one manual file removed gave DIFFERENT, DIFFERENT, MISSING and exit 1; `--db` showed all 30 schema markers on `heritos_staging`); `smoke.sh` PASS on local staging (11 API checks) and on a `vite preview` of `dist/` (4 site checks); live endpoint versions, live schema markers, Apache header checks and a rollback rehearsal NOT TESTED ([DEPLOYMENT.md](../docs/DEPLOYMENT.md#release-procedure)) |

Helper tests and syntax checks do not substitute for this matrix.

## Checklist

- [ ] Product acceptance criteria in [USER-JOURNEYS.md](../docs/USER-JOURNEYS.md) are proved.
- [ ] Functional, UX, accessibility, performance, security and regression audits in [qa/](./) have decisions.
- [ ] Website launch: every public claim owner-confirmed or removed (A07); business details verified; social links verified (A12); sitemap and robots reviewed (A24); screenshots approved ([CONTENT.md](../docs/CONTENT.md)).
- [ ] PWA: manifest updated, offline shell and write blocking checked, upgrade from the previous build checked ([PERFORMANCE-AUDIT.md](PERFORMANCE-AUDIT.md#pwa)).
- [ ] Privacy notice, terms, consent and contact facts verified ([DATA-PRIVACY.md](../docs/DATA-PRIVACY.md)).
- [ ] Production build, release manifest, manual uploads and schema imports verified ([DEPLOYMENT.md](../docs/DEPLOYMENT.md)).
- [ ] Monitoring and failed-notification list operational ([DEPLOYMENT.md](../docs/DEPLOYMENT.md#monitoring)).
- [ ] Backup restored in a separate environment; rollback rehearsed ([DEPLOYMENT.md](../docs/DEPLOYMENT.md#backup-and-recovery)).
- [ ] Zero unresolved P0 findings ([ROADMAP.md](../docs/ROADMAP.md#findings)); other known issues have owners and accepted release decisions ([KNOWN-ISSUES.md](../KNOWN-ISSUES.md)).
- [ ] Social profiles: setup acceptance passed and each publication individually authorised ([SOCIAL.md](../docs/SOCIAL.md#setup-acceptance)).
- [ ] Release owner has recorded `GO`, `NO-GO` or `CONDITIONAL GO` with evidence under [Release decision](#release-decision).

## Production check

Checks run against production around a release. Do not infer production health from a local build. Use designated test records only; never real client records.

| Check | Status | Evidence | Owner | Date |
|---|---|---|---|---|
| Correct account, repository, branch (`main`) and cPanel document root confirmed before any mutation | NOT TESTED | None | Business owner | None |
| Deploy job green; every PHP file listed in `deploy.yml` uploaded | NOT TESTED | None | Business owner | None |
| Manual uploads and SQL imports applied in the order given in [DEPLOYMENT.md](../docs/DEPLOYMENT.md#owner-actions-per-pull-request) | NOT TESTED | None | Business owner | None |
| Backup set taken with `backup.sh` before the change and proved with `restore-check.sh` (every table MATCH) | NOT TESTED | None | Business owner | None |
| `release_check.php --db` before the change recorded (live endpoint versions and schema markers, A02) | NOT TESTED | None | Business owner | None |
| `release_check.php` after the hand uploads: every manual file MATCH | NOT TESTED | None | Business owner | None |
| `npm run release:smoke -- https://heritclothing.com` PASS (includes `api.php` returning a JSON array) | NOT TESTED | None | Business owner | None |
| Post-release flows with test records: login, enquiry, booking, client isolation, measurement snapshot, quote, payment, message, delivery | NOT TESTED | None | Business owner | None |
| Secrets, permissions and production settings: `GK_DEBUG` off, `ALLOW_LOCALHOST_CORS` off, HTTPS valid, Cloudflare grey cloud | NOT TESTED | None | Business owner | None |
| `ALLOW_LEGACY_ORDER_CODE_LOOKUP` set as decided for this release | NOT TESTED | None | Business owner | None |
| Monitoring, failed-notification list, backup snapshot taken and rollback trigger agreed | NOT TESTED | None | Business owner | None |

No production check has been run by any agent. Procedure and rollback: [DEPLOYMENT.md](../docs/DEPLOYMENT.md#release-procedure).

## Release decision

The release decision and its criteria. Allowed decisions are `GO`, `NO-GO` and `CONDITIONAL GO`.

- Version: none; the app has no release versioning yet ([DEPLOYMENT.md](../docs/DEPLOYMENT.md#environments-and-promotion-path))
- Candidate: none. Work is on stacked feature branches ([ROADMAP.md](../docs/ROADMAP.md))
- Environment: production (heritclothing.com)
- Decision: `NOT DECIDED`
- Decision owner and date: business owner; no date

### Decision criteria (Plans 2026, approved 10 October 2026)

GO only with evidence for every core gate: safe environment, owner access and recovery, customer isolation, persistent conflict-safe appointments, measurement snapshots, payment integrity, truthful website, accessible mobile forms, private-file protection, tested backup restore, release manifest and rollback. Zero unresolved P0 findings. Deferred retail and marketing features need not pass if they are absent from public navigation and safely disabled.

Pilot with the owner and a few consenting customers first, and check that communications, confirmations and delivery records match real practice. Company orders start within confirmed capacity, with an agreed sample and quote and achievable dates. Increase volume only after the pilot shows reliable service. If a gate fails, disable the affected public action and keep a truthful enquiry channel. A passing `npm run build` never makes the project "production-ready".

### Evidence summary

| Gate | Result | Evidence | Open risk |
|---|---|---|---|
| Functional | PARTIAL | Staging API checks; Phase 2 owner journey PASS in a browser ([FUNCTIONAL-AUDIT.md](FUNCTIONAL-AUDIT.md)) | Journeys J-03, J-07, J-08 not built; production NOT TESTED |
| Security | NOT TESTED | Helper tests PASS; P0 findings A02, A03 (verification), A20 open | Cross-customer access, unknown deployed endpoints |
| Accessibility | NOT TESTED | None ([qa/ACCESSIBILITY-AUDIT.md](ACCESSIBILITY-AUDIT.md)) | No rendered-page checks |
| Performance | NOT TESTED | Bundle size only ([qa/PERFORMANCE-AUDIT.md](PERFORMANCE-AUDIT.md)) | No lab or field measurements |
| Regression | PARTIAL | [REGRESSION-AUDIT.md](REGRESSION-AUDIT.md) | Flow script for Phase 2 only, not in CI |
| Website | NOT TESTED | Applicable; invented claims still live (A07) | Untruthful public content |
| PWA | NOT TESTED | Applicable, offline shell only ([ARCHITECTURE.md](../docs/ARCHITECTURE.md#pwa-offline-and-updates)) | No write blocking offline |

### Remaining risks and recovery

- Known issues accepted: `NONE APPROVED`
- Rollback trigger and owner: any failed post-release check under [Production check](#production-check); business owner
