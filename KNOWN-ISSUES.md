# Known Issues

Open defects and gaps. Audit findings A01 to A24 are owned by [docs/08-change-management/ROADMAP.md](docs/08-change-management/ROADMAP.md#findings); this file summarises the open ones and holds issues found since (K-numbers). Severity uses the audit's P0 to P2 scale.

| ID | Severity | Area | Evidence | Workaround | Owner | Status |
|---|---|---|---|---|---|---|
| A01 | P0 | Environments | Local staging fixed; no shared staging server | Use local staging only | Business owner | Partly fixed |
| A02 | P0 | Deploy | 22 endpoints uploaded by hand; live versions Unknown | List manual uploads in every pull request | Business owner | Open |
| A03 | P0 | Customer access | Contact-channel verification not built | Throttle and generic errors in phase 1 | Business owner | In progress |
| A04 | P0 | Content safety | Sanitiser on branch; rendered checks not run | Only trusted staff write posts | Business owner | In progress |
| A05 | P0 | Payments | Transaction on branch; no ledger or idempotency | Record one payment at a time | Business owner | In progress |
| A07 | P0 | Website | Invented claims and offers still on the home page | None | Business owner | Open (Phase 4) |
| A13 | P0 | Quality | Lint checks no JS/JSX files | JS/JSX config written; owner to apply | Business owner | Blocked |
| A20 | P0 | Operations | Backups and deployed config not certified | None | Business owner | Open |
| A08 | P1 | Appointments | Calendar is demo data in browser memory | Book outside the app | Business owner | Open (Phase 3) |
| A09 | P1 | Customer access | Tailoring clients cannot see their job | Owner shares status directly | Business owner | Open (Phase 3) |
| A10 | P1 | Measurements | One mutable JSON field; no history | Owner re-checks before cutting | Business owner | Open (Phase 2) |
| A12 | P1 | Website | Social links fall back to platform home pages | None | Business owner | Open (Phase 4) |
| A15 | P1 | Security | Tokens in JS-readable cookie and localStorage | CORS gate in phase 1 | Business owner | In progress |
| A16 | P1 | PWA | Writes not blocked offline | None | Business owner | Open |
| A21 | P1 | Content | Blog edit failure | Fix on branch | Business owner | In progress |
| A22 | P2 | Promotions | HERIT10 has no first-order check | Resolved when A07 removes the offer | Business owner | Open |
| A23 | P2 | Design | Two token sets | None | Business owner | Open (Phase 4) |
| A24 | P2 | SEO | No sitemap; robots.txt points at a missing one | None | Business owner | Open (Phase 4) |
| K-01 | P2 | Permissions | Client and server role lists disagree for Tailoring, Catalogue, Content and Dashboard ([PERMISSIONS.md](docs/05-security/PERMISSIONS.md#current-enforcement-verified-10-october-2026)) | Only the owner account is active | Business owner | Open; found 10 Oct 2026 |
| K-02 | P2 | UX | Tailoring and Groups pages still show a technical upload instruction on load failure (`tailoring/page.jsx:207-210`, `tailoring/groups/page.jsx:152`) | Read it as "could not load" | Business owner | Open; found 10 Oct 2026 |
| K-03 | P2 | PWA | Manifest colours and description predate the current brand and scope (`public/manifest.webmanifest:4, 9-10`) | None needed | Business owner | Open (Phase 4) |
