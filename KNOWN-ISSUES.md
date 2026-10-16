# Known Issues

Open defects and gaps. Audit findings A01 to A24 are owned by [docs/ROADMAP.md](docs/ROADMAP.md#findings); this file summarises the ones still open and holds issues found since (K-numbers). Severity uses the audit's P0 to P2 scale. "In code" means fixed on an open pull request that is not merged or deployed yet.

## Open

| ID | Severity | Area | Evidence | Workaround | Owner | Status |
|---|---|---|---|---|---|---|
| A01 | P0 | Environments | Local staging built (PR #7); no shared staging server | Use local staging only | Business owner | Partly fixed |
| A02 | P0 | Deploy | 22 endpoints uploaded by hand; live versions Unknown | List manual uploads in every pull request and in [DEPLOYMENT.md](docs/DEPLOYMENT.md#owner-actions-per-pull-request) | Business owner | Open |
| A03 | P0 | Customer access | Contact-channel verification built on `feat/phase3-appointments-portal` (staging API and browser PASS); real email delivery NOT TESTED; legacy login stays while `ALLOW_LEGACY_ORDER_CODE_LOOKUP` is on | Throttle and generic errors (PR #6) | Business owner | Partly fixed (in code) |
| A07 | P0 | Website | Invented claims, fallbacks and offers removed from the public pages (`feat/phase4-website`); real copy and photography still to come from the owner through the CMS | Pages hide empty sections | Business owner | Partly fixed (in code) |
| A13 | P0 | Quality | JS/JSX lint applied on `feat/phase4-website` (0 errors); no frontend flow tests yet | Staging end-to-end scripts cover the API | Developer | Partly fixed (in code) |
| A20 | P0 | Operations | Backups and deployed config not certified | None | Business owner | Open |
| A12 | P1 | Website | Server refuses and hides unverified social links (`feat/phase4-website`); the footer now shows only https links on the platform's own domain, with no fallbacks | None | Business owner | Partly fixed (in code) |
| A15 | P1 | Security | Staff token in a JS-readable cookie; customer token moves to sessionStorage on `feat/phase3-appointments-portal` | CORS gate (PR #6) | Business owner | Partly fixed; staff token storage Open |
| A16 | P1 | PWA | Writes not blocked offline | None | Business owner | Open |
| K-07 | P2 | Today | Today's enquiry block lists `new` enquiries first and stops at 20 (`today.php:29`, order `status = 'new' DESC, next_follow_up`), so with more than 20 unanswered enquiries a due follow-up drops off the list (the count still includes it). Found when staging test data passed 20 new enquiries: `e2e-phase2.sh` E15c fails on that data, 12 October 2026 | Open Enquiries and filter by follow-up | Business owner (ordering is a Phase 2 rule) | Open |

## Fixed in code, awaiting merge and deploy

| ID | Severity | Area | Fix | Evidence | Status |
|---|---|---|---|---|---|
| K-06 | P2 | SEO | Public defaults in the `index.html` head (title, description, Open Graph) for every crawler; `spa.php` fills each service, project and page from published content, off behind `SPA_HEAD_INJECTION` until a live share test needs it (`feat/link-previews`) | 13 helper tests; `spa.php` run on and off against local staging data (own title, description, type and canonical per page; defaults for unknown and staff paths; plain page when the config is missing); a real WhatsApp or Facebook share NOT TESTED | In code; switch-on is an owner decision after a live share |
| K-04 | P2 | Auth | Staff password reset by email: `reset_request` and `reset_confirm` in `auth.php`, `password_resets` (`schema_phase29.sql`), a two-step `/auth/reset-pass` screen (`feat/staff-password-reset`) | `e2e-reset.sh` 19 of 19 on local staging; screens at 390px in a browser PASS; real email delivery NOT TESTED | In code; needs the import and working outgoing email |
| A22 | P2 | Promotions | HERIT10 and FREESHIP no longer seeded; switched off where unused (`schema_phase26.sql`, `feat/phase4-website`) | Staging check PASS | In code |
| A24 | P2 | SEO | `sitemap.php` at `/sitemap.xml`, published content only; robots.txt rewritten (`feat/phase4-website`) | Staging check PASS; live `.htaccess` rewrite NOT TESTED | In code |
| A04 | P0 | Content safety | Server allowlist sanitiser (PR #6) | Helper tests PASS; rendered page NOT TESTED | In code |
| A05 | P0 | Payments | Transaction (PR #6), then append-only ledger with request keys (PR #9) | Staging API PASS; concurrency NOT TESTED | In code |
| A08 | P1 | Appointments | Real appointments, availability, requests and blocked time; the demo calendar retired (`feat/phase3-appointments-portal`) | Staging API and browser PASS at 390px and 1280px | In code |
| A09 | P1 | Customer access | Tailoring clients see their jobs in the verified portal, with object-level checks (`feat/phase3-appointments-portal`) | Staging API and browser PASS, including a second client refused | In code |
| K-05 | P1 | Messages | `messages.php?action=inbox` answered 500 on MariaDB (ordered by an expression over the `unread` aggregate alias); now orders by the aggregate itself (`feat/phase3-appointments-portal`) | Browser Messages inbox PASS; `e2e-phase3.sh` did not call `inbox` | In code |
| A10 | P1 | Measurements | Dated measurement sets, owner approval, job snapshots (PR #9) | Staging API and browser PASS | In code |
| A21 | P1 | Content | Blog UPDATE bind types (PR #6) | Source; browser save-then-edit NOT TESTED | In code |
| K-01 | P2 | Permissions | `roles.js` sections match the server gates of the endpoints each page needs (PR #9) | Source; tailor role PASS in a browser; other roles NOT TESTED | In code |
| K-02 | P2 | UX | Jobs and Groups show a plain message with Retry (`LoadError`, PR #9) | Source; error state not rendered in the browser run | In code |
| A23 | P2 | Design | One `--hc-*` token layer read by the public site, admin SCSS, `heritos-admin.css`, `--hd-*` and `portal.css` (`feat/phase4-website`) | Build PASS; admin dark mode on rendered pages only partly checked | In code |
| K-03 | P2 | PWA | Needle H icons; manifest colours and description match the brand and scope (commit f1e8960, PR #9) | `public/manifest.webmanifest`; install on a device NOT TESTED | In code |

Fixed findings A06, A11, A14, A17, A18 and A19 are recorded in [docs/ROADMAP.md](docs/ROADMAP.md#findings).
