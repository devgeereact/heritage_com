# Release Report

This file owns the release decision and its criteria. Allowed decisions are `GO`, `NO-GO` and `CONDITIONAL GO`.

- Version: none; the app has no release versioning yet ([DEPLOYMENT.md](../07-operations/DEPLOYMENT.md#environments-and-promotion-path))
- Candidate: none. Work is on stacked feature branches ([ROADMAP.md](../08-change-management/ROADMAP.md))
- Environment: production (heritclothing.com)
- Decision: `NOT DECIDED`
- Decision owner and date: business owner; no date

## Decision criteria (Plans 2026, approved 10 October 2026)

GO only with evidence for every core gate: safe environment, owner access and recovery, customer isolation, persistent conflict-safe appointments, measurement snapshots, payment integrity, truthful website, accessible mobile forms, private-file protection, tested backup restore, release manifest and rollback. Zero unresolved P0 findings. Deferred retail and marketing features need not pass if they are absent from public navigation and safely disabled.

Pilot with the owner and a few consenting customers first, and check that communications, confirmations and delivery records match real practice. Company orders start within confirmed capacity, with an agreed sample and quote and achievable dates. Increase volume only after the pilot shows reliable service. If a gate fails, disable the affected public action and keep a truthful enquiry channel. A passing `npm run build` never makes the project "production-ready".

## Evidence summary

| Gate | Result | Evidence | Open risk |
|---|---|---|---|
| Functional | NOT TESTED | Staging API smoke checks only ([qa/FUNCTIONAL-AUDIT.md](../../qa/FUNCTIONAL-AUDIT.md)) | Journeys J-01 to J-08 not built or not walked through |
| Security | NOT TESTED | Helper tests PASS; P0 findings A02, A03 (verification), A20 open | Cross-customer access, unknown deployed endpoints |
| Accessibility | NOT TESTED | None ([qa/ACCESSIBILITY-AUDIT.md](../../qa/ACCESSIBILITY-AUDIT.md)) | No rendered-page checks |
| Performance | NOT TESTED | Bundle size only ([qa/PERFORMANCE-AUDIT.md](../../qa/PERFORMANCE-AUDIT.md)) | No lab or field measurements |
| Regression | PARTIAL | [qa/REGRESSION-AUDIT.md](../../qa/REGRESSION-AUDIT.md) | No automated flow tests |
| Website | NOT TESTED | Applicable; invented claims still live (A07) | Untruthful public content |
| PWA | NOT TESTED | Applicable, offline shell only ([PWA-SPEC.md](../04-pwa/PWA-SPEC.md)) | No write blocking offline |

## Remaining risks and recovery

- Known issues accepted: `NONE APPROVED`
- Rollback trigger and owner: any failed post-release check in [PRODUCTION-CHECK.md](PRODUCTION-CHECK.md); business owner
- Post-release checks: [PRODUCTION-CHECK.md](PRODUCTION-CHECK.md)
