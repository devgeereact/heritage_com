# Launch Checklist

This file owns the launch verification matrix and the pre-launch checklist. The release decision itself is recorded in [RELEASE-REPORT.md](RELEASE-REPORT.md). Nothing below is ticked: unchecked boxes and scaffolding are not evidence.

## Launch verification matrix

Each scenario runs on staging with synthetic records before launch, and again with designated test records after release where safe (Plans 2026, 04).

| Scenario | Required proof | Status |
|---|---|---|
| Client isolation | Two synthetic customers; swapping every relevant ID or reference fails safely | NOT TESTED |
| Company isolation | An organiser cannot read individual measurements or another company's job | NOT TESTED |
| Booking integrity | Simultaneous slot requests, cancellation, reschedule and expiry behave atomically | NOT TESTED (no appointments yet) |
| Measurement integrity | An approved job stays unchanged after a profile update; units stay correct | NOT TESTED |
| Record conversion | A retried enquiry conversion yields one linked job | NOT TESTED |
| Payment integrity | Retry, concurrency, reversal and overpayment totals and receipts match | NOT TESTED |
| Rich text and files | Script, unsafe URL and unexpected upload denied; private files need auth | PARTIAL: sanitiser helper tests PASS; rendered and upload checks NOT TESTED |
| Session recovery | Expired or revoked token blocked; owner recovery works | NOT TESTED |
| Failure handling | Offline, API timeout, failed email and missing config show plain, truthful states | NOT TESTED |
| Publication | Drafts private; unpublish effective; invalid URL rejected | NOT TESTED |
| Recovery | Backup restored and records and files verified in a separate environment | NOT TESTED |
| Release | Endpoint and schema versions match the build; rollback rehearsed | NOT TESTED |

Helper tests and syntax checks do not substitute for this matrix.

## Checklist

- [ ] Product acceptance criteria in [USER-JOURNEYS.md](../01-product/USER-JOURNEYS.md) are proved.
- [ ] Functional, UX, accessibility, performance, security and regression audits in [qa/](../../qa/) have decisions.
- [ ] Website launch: every public claim owner-confirmed or removed (A07); business details verified; social links verified (A12); sitemap and robots reviewed (A24); screenshots approved ([CONTENT.md](../01-product/CONTENT.md)).
- [ ] PWA: manifest updated, offline shell and write blocking checked, upgrade from the previous build checked ([qa/PWA-AUDIT.md](../../qa/PWA-AUDIT.md)).
- [ ] Privacy notice, terms, consent and contact facts verified ([DATA-PRIVACY.md](../05-security/DATA-PRIVACY.md)).
- [ ] Production build, release manifest, manual uploads and schema imports verified ([DEPLOYMENT.md](../07-operations/DEPLOYMENT.md)).
- [ ] Monitoring and failed-notification list operational ([MONITORING.md](../07-operations/MONITORING.md)).
- [ ] Backup restored in a separate environment; rollback rehearsed ([BACKUP-RECOVERY.md](../07-operations/BACKUP-RECOVERY.md)).
- [ ] Zero unresolved P0 findings ([ROADMAP.md](../08-change-management/ROADMAP.md#findings)); other known issues have owners and accepted release decisions ([KNOWN-ISSUES.md](../../KNOWN-ISSUES.md)).
- [ ] Social profiles: setup acceptance passed and each publication individually authorised ([SOCIAL.md](../01-product/SOCIAL.md#setup-acceptance)).
- [ ] Release owner has recorded `GO`, `NO-GO` or `CONDITIONAL GO` with evidence in [RELEASE-REPORT.md](RELEASE-REPORT.md).
