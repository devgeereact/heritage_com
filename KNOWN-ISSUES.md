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
| K-06 | P2 | SEO | Link previews for crawlers that do not run JavaScript (WhatsApp, Facebook) see only the static `index.html` title and description; `spa.php` head injection (BUILD-SPEC 4.6) is not built, by the spec's own rule that it waits for a live crawler test | None; owner can share pages with their own text | Developer | Open |
| K-04 | P2 | Auth | No password recovery endpoint. Since 17 October 2026 `/auth/reset-pass` says so plainly and tells staff and owner how to recover, instead of a form whose submit did nothing | Owner resets staff from Team; owner password reset by hash in phpMyAdmin ([DEPLOYMENT.md](docs/DEPLOYMENT.md#database-and-schema-files)) | Business owner | Open; dead form removed (in code); owner recovery is launch core ([SECURITY.md](docs/SECURITY.md#staff)) |
| K-11 | P1 | Privacy | No marketing opt-in exists, yet `whatsapp.php?action=broadcast` sends to every customer (or a segment) with a phone and `engage.php` sends waitlist and abandoned-cart nudges; conflicts with BR-35 ([DATA-PRIVACY.md](docs/DATA-PRIVACY.md#marketing)). Abandoned-cart capture saves contact details before checkout is submitted (shop off for visitors since 17 October 2026) | Do not send broadcasts until decided | Business owner | Open: switch off or approve a consent field (schema change) |
| K-12 | P2 | Privacy | The staff "Draft a reply" button sends an enquiry's name and message to OpenRouter (`AiReplyModal.jsx:25-31`); DATA-PRIVACY.md said no customer content goes there (corrected 17 October 2026) | Staff do not press it | Business owner | Open: keep and disclose, strip the content, or remove |
| K-13 | P2 | Privacy | `herit_ref`, `herit_src`, `herit_camp` keep referral and campaign codes in localStorage with no expiry (`SiteLayout.jsx:49-53`); consent may be needed (GAID Article 19) | None | Business owner, counsel | Open |
| K-14 | P2 | Privacy | The legacy order lookup sends the phone number in a GET query string (`TrackPage.jsx:46`, `store.php:627`), so it reaches server access logs | Switch off `ALLOW_LEGACY_ORDER_CODE_LOOKUP` (D-021) | Business owner | Open |
| K-18 | P2 | Privacy | No retention job exists: expired sessions, access attempts with IP, audit and WhatsApp logs, abandoned carts and old enquiries are kept indefinitely ([schedule](docs/DATA-PRIVACY.md#retention-schedule)) | Manual clean-up | Business owner, developer | Open: periods need owner and legal review |
| K-19 | P3 | SEO | No 1200x630 link-preview image; the default is the square brand icon (`icon-512.png`, small card) | Owner photographs per page through the CMS | Business owner | Open |
| K-20 | P3 | PWA | The manifest describes the staff app ("HeritOS", workshop description) while `start_url` is the public home, so public visitors are offered the staff app. Sitemap shop pages and service-worker caching fixed 17 October 2026 (in code) | None | Business owner (which app to offer) | Partly fixed (in code) |
| K-23 | P3 | Security | Two staff with the same PIN sign in as whoever matches first; gift-card codes are 32-bit; no script-src CSP. Login timing fixed 17 October 2026 (in code) | Throttles; gift checks throttled | Developer | Partly fixed (in code) |

## Fixed in code, awaiting merge and deploy

| ID | Severity | Area | Fix | Evidence | Status |
|---|---|---|---|---|---|
| K-15 | P2 | Security | Staff tokens stored as SHA-256 (`staff_token_hash`); older plain tokens accepted until they expire, then remove the fallback | Staging sign-in, `me`, sessions and logout PASS; e2e scripts mint hashed tokens | In code |
| K-16 | P2 | Accessibility | Booking moves focus to each step and the first invalid field; access form focuses the first error; track lookup `type=tel`, alert and focused result; contact and brief thank-you panels take focus; shop inputs named | Access form and contact success PASS in a browser; booking and track source only | In code |
| K-17 | P3 | Tests | `e2e-phase5.sh` no longer uses `mapfile` | 25 of 25 on macOS | In code |
| K-08 | P0 | Security | `schema.sql` seed tailors (tunde@, bola@heritclothing.com) had the known staging password; now hash `!` and suspended. Owner: check the live `users` table and lock them | Source; fresh import NOT TESTED | In code |
| K-09 | P1 | Security | Suspended staff blocked at sign-in and on every request, tokens revoked on suspension; super_admin guarded from admins; owner and admin off PIN sign-in; store credit only for the customer's verified session; WhatsApp webhook signature when `WA_APP_SECRET` is set | Staging API PASS (`scratchpad` checks, e2e 2, 3, 4); webhook signature NOT TESTED | In code |
| K-10 | P2 | Security | Throttles and length caps on shop writes and reviews; shop writes refused while the shop is off; CSV formula guard; AI daily caps; no transport errors returned; security headers, HTTPS redirect and caching in `.htaccess` | Staging API and local Apache PASS; HSTS under real TLS and AI caps NOT TESTED | In code |
| K-24 | P1 | Website | Catch-all not-found page (was a blank 200 page); root error screen; tab title no longer replaced by the staff title; one h1 on Home; hero and testimonial pause; noindex on private pages; shop pages off for visitors; privacy notes on forms; self-hosted fonts; paper success contrast; dead Larkon auth pages removed | Browser PASS on staging at 320px and 1280px ([qa/FUNCTIONAL-AUDIT.md](qa/FUNCTIONAL-AUDIT.md)); error screen and booking note NOT TESTED at runtime | In code |
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
