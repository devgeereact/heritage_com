# Known Issues

Open defects and gaps. Audit findings A01 to A24 are owned by [docs/ROADMAP.md](docs/ROADMAP.md#findings); this file summarises the ones still open and holds issues found since (K-numbers). Severity uses the audit's P0 to P2 scale. "In code" means fixed on an open pull request that is not merged or deployed yet.

## Open

| ID | Severity | Area | Evidence | Workaround | Owner | Status |
|---|---|---|---|---|---|---|
| A01 | P0 | Environments | Local staging built (PR #7); no shared staging server | Use local staging only | Business owner | Partly fixed |
| A02 | P0 | Deploy | 22 endpoints uploaded by hand; live versions Unknown | List manual uploads in every pull request and in [DEPLOYMENT.md](docs/DEPLOYMENT.md#owner-actions-per-pull-request) | Business owner | Open |
| A03 | P0 | Customer access | Contact-channel verification not built | Throttle and generic errors (PR #6) | Business owner | Partly fixed; verification in Phase 3 |
| A07 | P0 | Website | Invented claims and offers still on the home page | None | Business owner | Open (Phase 4) |
| A13 | P0 | Quality | Lint checks no JS/JSX files | JS/JSX config written and tested; owner to apply | Business owner | Blocked |
| A20 | P0 | Operations | Backups and deployed config not certified | None | Business owner | Open |
| A08 | P1 | Appointments | Calendar is demo data in browser memory; Appointments page is a placeholder | Book outside the app | Business owner | Open (Phase 3) |
| A09 | P1 | Customer access | Tailoring clients cannot see their job | Owner shares status directly | Business owner | Open (Phase 3) |
| A12 | P1 | Website | Social links fall back to platform home pages | None | Business owner | Open (Phase 4) |
| A15 | P1 | Security | Tokens in JS-readable cookie and localStorage | CORS gate (PR #6) | Business owner | Partly fixed; token storage Open |
| A16 | P1 | PWA | Writes not blocked offline | None | Business owner | Open |
| A22 | P2 | Promotions | HERIT10 has no first-order check | Resolved when A07 removes the offer | Business owner | Open |
| A23 | P2 | Design | Separate token sets: public site, admin, and the Phase 2 `--hd-*` set | None | Business owner | Open (Phase 4) |
| A24 | P2 | SEO | No sitemap; robots.txt points at a missing one | None | Business owner | Open (Phase 4) |
| K-04 | P2 | Auth | `/auth/reset-pass` shows a form whose submit does nothing (`ResetPassword.jsx:33`, `handleSubmit(() => {})`); there is no recovery endpoint | Owner password reset by hash in phpMyAdmin ([DEPLOYMENT.md](docs/DEPLOYMENT.md#database-and-schema-files)) | Business owner | Open; owner recovery is launch core ([SECURITY.md](docs/SECURITY.md#staff)) |

## Fixed in code, awaiting merge and deploy

| ID | Severity | Area | Fix | Evidence | Status |
|---|---|---|---|---|---|
| A04 | P0 | Content safety | Server allowlist sanitiser (PR #6) | Helper tests PASS; rendered page NOT TESTED | In code |
| A05 | P0 | Payments | Transaction (PR #6), then append-only ledger with request keys (PR #9) | Staging API PASS; concurrency NOT TESTED | In code |
| A10 | P1 | Measurements | Dated measurement sets, owner approval, job snapshots (PR #9) | Staging API and browser PASS | In code |
| A21 | P1 | Content | Blog UPDATE bind types (PR #6) | Source; browser save-then-edit NOT TESTED | In code |
| K-01 | P2 | Permissions | `roles.js` sections match the server gates of the endpoints each page needs (PR #9) | Source; tailor role PASS in a browser; other roles NOT TESTED | In code |
| K-02 | P2 | UX | Jobs and Groups show a plain message with Retry (`LoadError`, PR #9) | Source; error state not rendered in the browser run | In code |
| K-03 | P2 | PWA | Needle H icons; manifest colours and description match the brand and scope (commit f1e8960, PR #9) | `public/manifest.webmanifest`; install on a device NOT TESTED | In code |

Fixed findings A06, A11, A14, A17, A18 and A19 are recorded in [docs/ROADMAP.md](docs/ROADMAP.md#findings).
