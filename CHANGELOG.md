# Changelog

Notable changes to HeritOS. Dates are when the work was committed; nothing below is released until it is merged to `main` and deployed. Live status: [docs/08-change-management/ROADMAP.md](docs/08-change-management/ROADMAP.md).

## Unreleased

Stacked branches `feat/plans-2026-phase1`, `feat/phase1b-staging` and `feat/docs-gee-os`, 10 October 2026.

### Added

- Local staging: `npm run staging:setup` and `staging:serve` give a local PHP API and database with synthetic records; development uses it by default (A01).
- Random 10-character public references for customer lookups, with `schema_phase17.sql` and collision-safe staff codes (A06).
- A real optional company field on enquiries, with the honeypot renamed (A11).
- Throttling and one generic failure message for customer sign-in and public tracking (A03, partial).
- Server-side HTML sanitiser for blog posts (A04, in progress).
- CI runs PHP syntax checks and the helper tests; the deploy job repeats lint, PHP checks and the build before uploading (A14).
- Documentation in the GEE OS Full Product hierarchy under `docs/00-foundation` to `docs/09-release`, root `qa/` audits, this changelog and `KNOWN-ISSUES.md` (D-012).

### Changed

- Deposit updates run inside a transaction with a row lock (A05, partial).
- Localhost CORS allowed only when `ALLOW_LOCALHOST_CORS` is on (A15, partial).
- Enquiries page shows a plain error with Retry instead of an upload instruction (A17).
- Retail shop links hidden from public navigation unless `shop_enabled` is on (D-014).
- Plans 2026 restored as the standing plan of record (D-012).

### Removed

- Larkon demo routes and unused kit pages, with 14 orphaned components; production JavaScript fell from 4,985,796 to 1,553,500 bytes (A18).
- Superseded 2025 plans and both `HeritOS.html` specifications (D-017).
- Flat documentation files, replaced by the numbered hierarchy (D-012).

### Fixed

- Editing an existing blog post: the UPDATE now binds 11 values with an 11-character type string (`content.php:76`); the save-then-edit regression check is still pending (A21).
- Contradictory deployment descriptions in project docs (A19).
