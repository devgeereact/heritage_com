# Changelog

Notable changes to HeritOS, grouped by pull request. Dates are when the work was committed; nothing below is released until it is merged to `main` and deployed. Live status: [docs/ROADMAP.md](docs/ROADMAP.md). Owner actions at each merge: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#owner-actions-per-pull-request).

## Unreleased

### Staff sign-in with Clerk, 30 October 2026

Decision D-033.

Added

- `php-api/_clerk.php`: checks a Clerk session token (RS256, signing keys cached, issuer, expiry, not-before and authorised-party checks) and maps it to an active staff row; `require_auth()` accepts it beside the existing tokens.
- `schema_phase33.sql`: `users.clerk_user_id` (unique, nullable; additive, re-runnable); marker added to the release manifest; `_clerk.php` added to the CI upload list.
- Sign-in page shows Clerk's email-code form when `VITE_CLERK_PUBLISHABLE_KEY` is set; unset keeps email and password. People whose email is not a staff record see "No access yet".
- Tests: `php-api/tests/clerk_cases.php` (token checks), `clerk_link.php` (linking, throwaway database), `src/__tests__/clerk.test.js`.

Not done: removing the old password, reset and cookie-session code; deciding whether the PIN sign-in stays; nothing is deployed.

### Repository consolidation, 22 October 2026

- Fixed: `e2e-phase4.sh` check U7 expected image variants 800 and 1600; since D-030 a 2000px upload also gets a 2000px variant (never upscaled), so it now expects 800, 1600 and 2000. Phase 4 e2e: 63 of 63.
- Changed: the whole stacked branch chain (Phases 1 to 7, hardening, release readiness, landing redesign, CMS Workroom) is merged into `main` in one merge commit. Superseded local branches, stale agent branches and the stacked remote branches are retired; a full bundle backup was taken first.

### CMS Workroom on `feat/real-content`, 20 October 2026

Decision D-032.

Added

- Home studio at `/website/home`: the 13 Home sections as a map with their state, each section's fields saved as page drafts while you type, a preview in the site's look, and a bar that publishes every unpublished draft (D-032).
- Jump-to palette (Ctrl or Cmd+K) in the topbar, limited to the screens the role may open (D-032).
- Rolling Today figures (`RollNumber`); Business details warns on a placeholder-looking number (K-32) and previews the footer (D-032).

Changed

- The admin sidebar is ink with a tape-measure edge and line icons; the dead topbar search box is gone (D-032).
- Grid cards stretch to their cell only when they are its one card, so stacked cards no longer overlap (D-032).

### Home landing "the cutting table" on `feat/real-content`, 19 October 2026

Decision D-031. Issue K-32.

Added

- Home sections in `landing.jsx`: two ways to order, the cloth (pinned sideways run from 1024px), the measurement docket (example values, cm and inches, rows light their line on the garment), how it works on a stitch line, the mission quote on ink, and the enquire band with business details and the enquiry form (D-031).
- `homeMap.js`: every Home section, its CMS source, its edit link and when it shows; the Home page renders from it, and the Website hub lists it in a new "Home page, section by section" card (D-031).
- Tape-measure scroll strip under the header on every public page (D-031).
- Phone and WhatsApp +234123456789 in the real-content profile, to confirm before the live load (K-32).
- Fuller real content: two-paragraph fabric sections, services with "At your appointment" and "Your quote and fittings" sections, a structured company orders page, a contact page with what to include, ten questions (six new) and journal posts with headed sections; no new claims, prices or durations (D-031).
- Today: blocks with nothing waiting share one compact "All clear" card instead of one tall card each (D-031).

Changed

- Home no longer shows the promise band, the company band, the fabric card grid, the process rail or the closing action; their content moved into the new sections (D-031).
- Header tape is always shown: a 16px ruler under the navigation with a number every 10cm, as in the approved concept (D-031).
- The hero's place line moved from under the buttons into the slider bar beside the counter (D-031).
- Footer: the woven print strip and the divider under the columns are gone, and the outlined wordmark is no longer clipped (D-031).
- Forms: single-line inputs are 48px like selects, and the phone or email note runs under both fields, so paired fields line up (D-031).
- Section spacing token `--hc-section-y` tightened to `clamp(56px, 7vw, 112px)`; the landing uses its own tighter rhythm (D-031).
- CMS: card headings share one size and weight, links are ink with a quiet underline (gold on hover), side panels keep their own height and stay in view, and the admin footer drops the template heart icon (D-031).

### Real content and African prints on `feat/real-content`, 19 October 2026

Stacked on #21. Decision D-026.

Added

- African print art (`PrintArt`, `PrintRule`, print tokens) used as section art and as the fallback wherever a section has no photograph (D-026).
- Full landing built from the CMS: hero slides, fabric story (new `fabrics` page), services, how it works, company orders, about and mission, questions, journal, contact call to action.
- Edit controls on public sections for signed-in staff, each opening the matching Website editor; the editor opens services and projects by web address.
- `scripts/content/load-real-content.php` loads the real company content and 14 rendered print illustrations through the CMS API as the owner; idempotent, localhost only unless `--allow-remote`.
- Royalty-free mood photographs (Unsplash and Pexels) for the 14 website image slots, listed with credits in `scripts/content/stock-photos.json`; `scripts/content/stock-manifest.mjs` checks them and writes the loader manifest; prints stay the fallback (D-028).
- Warm paper design after the Oura reference (D-030): cream paper surfaces with ink bands, logo gold `#FFB800` as the one accent, Newsreader and Hanken Grotesk self-hosted (Fraunces and Inter removed), 12px button corners and 8px card corners, quiet overlines, light or dark logo by surface; admin themes take the same fonts and gold.
- Footer Visit column: address one part per line (Ajuwon Market, Lagos State, Nigeria), then email, Instagram @heritclothing and the WhatsApp number, each with its icon; the loader now saves the Instagram link and merges social links with the owner's (`siteFooter.test.jsx`).
- Website images: a 2400px WebP variant and quality 86 (JPEG 88); re-uploading an image made before rebuilds its variants (`_cms.php`, `_media.php`, D-030).
- Lenis smooth scrolling on public pages, driven by GSAP's ticker; off under reduced motion and while the mobile menu is open (D-027).

Changed

- Fixed public copy speaks as "we", as on the live site.
- Website copy rewritten without AI-sounding phrasing: slogan pairs, empty praise, repeated labels and the journal posts' set-piece lines, facts unchanged (D-029). Loaded with `load-real-content.php --update`.
- Home: services shown as a numbered index beside one photograph that changes on hover or focus (GSAP); promise band facts numbered instead of icons; no accent stripe beside the mission; no print tags that repeat a title (D-029).
- `load-real-content.php` takes each image's caption from its manifest when given, so photographs carry a credit instead of the illustration caption (D-028).
- Home hero rebuilt on GSAP, still full screen: photograph settles in on load, wipe between slides, Ken Burns, React Bits SplitText headline, cleaner spacing and scrim, scroll drift from 1024px (D-027). New dependencies: `gsap`, `@gsap/react`, `lenis`.

### CEO decisions on `feat/ceo-decisions`, 19 October 2026

Stacked on #20 (this branch will be PR #21). Decisions: D-025 in [docs/DECISIONS.md](docs/DECISIONS.md). Owner actions: the "#21" row in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#owner-actions-per-pull-request).

Added

- `schema_phase32.sql` (D-025): policy defaults written only into settings that are still empty, so a saved value is never changed: the eight `retention_*_days` periods, `quote_validity_days` (14) and the `deposit_policy_text` wording, with the marker `policy_defaults_d025` for `release_check.php --db` (K-18).
- Failed saves are counted (K-31, D-025): `audit_failure()` in `_lib.php` writes one audit row for each lost race (`save_conflict`, the 409 from `db_tx`) and server error (`server_error`, the JSON 500), with the endpoint and its action only and at most 200 rows per kind per hour. `review.php` returns a `failed_saves` block and Owner review shows a Failed saves card.

Changed

- The release order is fixed (D-025): `STAFF_COOKIE_AUTH` is a required release step once HTTPS is confirmed (A15), `ALLOW_LEGACY_ORDER_CODE_LOOKUP` goes off 30 days after release (K-14), and `public_booking_enabled` stays off until the pilot is reviewed.
- Launch checklist: release decision recorded as NO-GO today, with the conditions for GO ([qa/LAUNCH-CHECKLIST.md](qa/LAUNCH-CHECKLIST.md#release-decision)).
- Roadmap: the sign-up and lock-screen kit screens are marked removed (commit `83a6d38`); the older module pages go after eight weeks with no visits on Owner review.
- Data privacy, API, data model and product spec docs now state the D-025 retention periods, quote validity and deposit wording, and which owner decisions remain facts for the owner.

### Phase 7 evidence on `feat/phase7-review`, 19 October 2026

Stacked on #19 (PR #20). Owner actions: the Phase 7 row in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#owner-actions-per-pull-request).

Added

- Owner review page `/review` (super_admin only) over `review.php`: enquiry conversion and median days to convert, overdue jobs, audited refusals, messages sent and failed, and section use, for 30 or 90 days; each card says what it does and does not prove (Phase 7).
- Section usage counts: `usage.php` stores day, section, role and a count only, at most once per section per browser per day (`usage_daily`, `schema_phase31.sql`); retention key `retention_usage_daily_days`, off until the owner sets it (Phase 7, K-18).

Changed

- `roles.js`: the old `review` key (a removed kit page managers could open) now gates Owner review to the owner only.

### Release readiness on `feat/release-readiness`, 18 October 2026

Stacked on PR #18 (`feat/hardening-2026-10-18`); the pull request will be #19. Owner actions: the "#19" row in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#owner-actions-per-pull-request). No schema change.

Added

- Release tools (A02, A20): `npm run release:manifest` (SHA-256 of every tracked server file, marked `ci` or `manual`, plus the schema files), `php-api/release_check.php` (command line only; MATCH, DIFFERENT or MISSING per file, `--db` reports which schema phases the database has), `npm run release:smoke` (GET and HEAD only), `scripts/release/backup.sh` (database dump, row counts, uploads archive, SHA-256 files; refuses a folder inside the document root) and `scripts/release/restore-check.sh` (restores into a scratch database and compares every table). The server `.htaccess` denies the command-line tools, the manifest and dump or archive files. Procedure: [Release procedure](docs/DEPLOYMENT.md#release-procedure). Local round trip: 58 of 58 tables match.
- `scripts/staging/e2e-launch.sh`: 152 checks for the launch verification matrix ([qa/LAUNCH-CHECKLIST.md](qa/LAUNCH-CHECKLIST.md#launch-verification-matrix)): client and company isolation, booking integrity, session recovery, payment integrity, publication and failure handling.
- `npm run check:php` (`scripts/check-php-calls.mjs`), in `ci.yml` and `deploy.yml`: fails when a PHP endpoint calls a helper from a file it does not load (K-30).

Changed

- Staff reset requests answer no sooner than `RESET_MIN_MS` (default 600 ms), and where PHP-FPM or LiteSpeed allows it the answer is sent before the link and email are made (K-25). The three-request lockout counts one address from one IP (`RESET_MAX_PER_ACCOUNT_IP`, 3), and `RESET_MAX_PER_ACCOUNT` is now an hourly ceiling per address (default 10, window `RESET_ACCOUNT_WINDOW`, 3600 s) (K-26). If the server `config.php` sets `RESET_MAX_PER_ACCOUNT`, remove it.
- Three staff GETs no longer change state (K-28): `whatsapp.php?action=thread` (POST `mark_seen`), `inbox.php?action=get` (IMAP `FT_PEEK`; POST `seen`) and `referrals.php?action=code` (POST `ensure_code`).
- Today and the menu badge count feedback follow-ups and unread messages with the same joins (a follow-up on a deleted job was counted but not listed), so the two numbers agree.
- `spa.php` serves paths that are not link-preview routes without opening the database.
- The error screen says "not opened on this device" only for a page chunk that failed to load.
- The end-to-end scripts accept only an exact `http://127.0.0.1:port` or `http://localhost:port` URL (a URL such as `http://localhost:1@evil.example` was accepted before).

Fixed

- A failed reset-link send answers like an unknown address instead of a 500 (K-25).
- Two simultaneous reversals of one payment gave the loser a 500 under MariaDB snapshot isolation: `ledger.php` read the entry before taking the job lock, in reverse and verify. It now locks first, and `db_tx` maps deadlock and lock-timeout errors (1213, 1020) to a 409 and logs them (K-29).
- A JSON list or object sent where text or a number belongs gave a 500, was stored as "Array" or was read as id 1. Requests now answer 400 through `in_str`, `in_int`, `in_num`, `in_scalar` and `in_text_only` in `_lib.php`, across every endpoint (K-30). The sweep briefly broke product create (`products.php` called `scalar_text()` without loading `_domain.php`); fixed in the same branch, and `npm run check:php` now catches a missing require.
- A retention run keeps the original deletion error when the audit write also fails.
- `e2e-phase3.sh` check B5c no longer fails now and then: the phone numbers it built (`0702$RANDOM`) sometimes had fewer than 7 digits (K-27).
- The restore guard read the dump with `grep -q` under pipefail, so a `--databases` dump bigger than the pipe buffer passed the USE or CREATE DATABASE check and could restore over the source. It now reads the whole stream and restores with `--one-database` (proved with a 600 KB dump). `backup.sh` checks `--out` before it changes any permission, so it can no longer set the document root or the home folder to 700 (A20).

### Hardening on `feat/hardening-2026-10-18`, 18 October 2026

Stacked on PR #17 (which carries #14 to #16). The work was integrated on this one branch; the earlier working branches for K-18, A15 and the review fixes are not separate pull requests. Owner actions: the "PR #18" row in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#owner-actions-per-pull-request).

Added

- Data retention job (K-18): `php-api/retention.php` (command line only), `_retention.php`, `schema_phase30.sql` and Settings > Data retention. One `retention_*_days` setting per category (expired sign-in tokens, customer sessions, access attempts, audit log, WhatsApp log, abandoned carts, waitlist, closed enquiries). Empty or 0 keeps the data forever; only expired staff and legacy portal tokens start at 30 days past their own expiry. The job is a dry run unless run with `--apply`, deletes in batches of 500 and writes one `retention_purge` audit entry per category. Only the owner can change a period, and the old and new values are audited. It never touches jobs, payments, the ledger, quotes, orders, measurements, appointments or client records. Token tables are compared on the server clock, and a CGI PHP binary is refused so cron cannot run it by mistake. The cron line is in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#retention-job).
- Staff session cookie (A15), behind `STAFF_COOKIE_AUTH` (default off): sign-in sets the token in an HttpOnly, SameSite=Strict cookie that page scripts cannot read, and every cookie-authenticated write must send an `X-Herit-CSRF` header equal to a second cookie. The browser keeps only a profile cookie without the token, for 14 days. On the live site the cookies are named `__Host-herit_staff` and `__Host-herit_csrf`. Nothing changes until the owner sets the switch on over HTTPS. Local trial through a same-origin Vite proxy: [docs/LOCAL-STAGING.md](docs/LOCAL-STAGING.md).
- First frontend test suite (A13): Vitest, jsdom and Testing Library, `npm test` (263 tests in 14 files on the integrated branch), covering the API client, role gates, formatting, the HTML sanitisers, sign-in, the offline banner and the public forms. It runs in `ci.yml` and in `deploy.yml` before the upload.

Fixed

- Today lists a due or overdue enquiry follow-up first, and every capped block returns `more` (items not listed) with an "And N more" link on the page (K-07).
- The order lookup sends the phone in a POST body instead of the query string; the old GET form answers only while `ALLOW_LEGACY_ORDER_CODE_LOOKUP` is on (K-14).
- A session cookie that is not valid JSON no longer blanks the whole app; `getSession` removes it and the app starts signed out (A13, found by the new tests).
- The sanitisers refuse `//host` and `/\host` links, which browsers read as protocol-relative, in the browser (`safeHtml.js`, `richText.js`) and on the server (`sanitize_url_ok`) (A13, A04). The server now accepts only http and https, mailto and tel (links only) and site paths with a single leading `/`, so fragment-only (`#top`) and bare relative (`page`) links are dropped on save and on public read, as the browser already did.
- A15 review fixes: sign-in accepts only JSON requests from the same origin; sign-out always ends the session, with or without the CSRF header; the `__Host-` cookie names are used on the live site; staff passwords and PINs share one bcrypt cost (12) and older hashes are upgraded at the next sign-in.

Changed

- `e2e-phase2.sh` seeds its own fixtures (an imported measurement set, a due follow-up) and has 52 checks, so it no longer depends on leftover staging rows (K-07).

### PR #17 `feat/offline-a16`, 16 October 2026

Added

- Offline behaviour (A16, D-016): a bar on the website, sign-in and admin says "You are offline. Changes cannot be saved until the connection returns." and then "Back online"; saves are refused while offline with that message and the typed values stay on screen; failed loads say the device is offline, with Retry; network failures read as plain sentences instead of "Failed to fetch".

Fixed

- Opening a page offline whose code had not loaded yet blanked the whole app; a route error boundary now shows "This page could not open" with Try again and Go back (found in the A16 browser check).

Changed (merge of #14 audit fixes, 18 October 2026)

- One offline implementation (A16): #14's write refusal, staff offline banner and root error screen are kept; from this PR only the offline load message and an offline-aware error screen that clears on navigation are carried over. The website and sign-in connection bar, "Back online" and `RouteErrorBoundary` are removed.

### PR #16 `feat/link-previews`, 16 October 2026

Added

- Link previews (K-06): the page head now carries public defaults (title "Herit Clothing | Men's tailoring in Lagos", a description and Open Graph tags) for every crawler, replacing the staff title "HeritOS | Herit Clothing". `spa.php` can fill each service, portfolio project and page with its own title, description and photograph for WhatsApp and Facebook; it stays off (`SPA_HEAD_INJECTION`) until a live share test needs it, and serves the plain page on any error. 13 new helper tests.

Changed (merge of #14 audit fixes, 18 October 2026)

- The `index.html` head keeps the link-preview markers with the audit's description, `og:locale` and brand-icon `og:image`, and no inline script (CSP, K-23); `spa.php` uses the same description and falls back to the brand icon when a page has no photograph (K-06, K-24). One new helper test.

### PR #15 `feat/staff-password-reset`, 16 October 2026

Added

- Staff password reset by email (K-04): "Reset password" on the sign-in page sends a single-use link that expires in 30 minutes; the request answers the same whether or not the address has an account; only a hash of the link token is stored (`password_resets`, `schema_phase29.sql`); a new request retires earlier links; choosing a new password signs the person out on every device; requests and failed attempts are throttled. `scripts/staging/e2e-reset.sh` checks it end to end on local staging.

Fixed (merge of #14 audit fixes, 18 October 2026)

- The reset page keeps the audit's plain wording and sign-in logo link, and offers the working email reset in place of the explanation; reset links are hashed with `staff_token_hash` and refused for suspended accounts, the same rules as sign-in (K-04, K-15, K-23).

### Audit fixes on `feat/redesign-dark-luxury`, 17 October 2026

Production-readiness and privacy audit. Evidence: [qa/SECURITY-AUDIT.md](qa/SECURITY-AUDIT.md), [qa/FUNCTIONAL-AUDIT.md](qa/FUNCTIONAL-AUDIT.md), [docs/DATA-PRIVACY.md](docs/DATA-PRIVACY.md#inventory-17-october-2026).

Fixed

- Seed tailor accounts in `schema.sql` no longer carry the known staging password (K-08).
- Suspended staff can no longer sign in or keep using a token; admins can no longer create, promote, reset or suspend a super_admin; owner and admin roles are kept off PIN sign-in (K-09).
- Store credit is no longer revealed or spent by typing someone's phone number; it needs the customer's verified session (K-09).
- WhatsApp webhook checks Meta's signature when `WA_APP_SECRET` is set; CSV exports neutralise spreadsheet formulas; AI calls have per-user daily caps; `ai.php` and `weather.php` no longer return transport errors (K-09, K-10).
- Public shop writes are throttled, length-capped and refused while the shop is off; the shop pages show the not-found page to visitors while it is off (K-10).
- Security headers, HTTPS redirect, caching and compression in `php-api/.htaccess` (K-10).
- Unknown URLs show a real noindex not-found page instead of a blank screen; a root error screen replaces white-screen failures (K-24).
- The public tab title no longer turns into the staff title after switching tabs (K-24).
- Home has one h1; hero and testimonials have a pause button and stop announcing every rotation; paper success colour meets 4.5:1 (K-24).
- Private pages (track, account, portal, bag, checkout) are noindex; default description and link-preview tags in `index.html` and `useSeo` (K-24).
- Sign-in password label, autocomplete and an accessible show-password button; the reset page now explains recovery honestly instead of a form that sent nothing (K-04 partly).

Added

- Privacy note beside the send button on the contact, booking and company brief forms, linking to the privacy notice once one is published (K-24).
- Cookie and storage inventory, recipients, retention schedule, sources and owner questions in [docs/DATA-PRIVACY.md](docs/DATA-PRIVACY.md); a draft notice in [docs/PRIVACY-NOTICE-DRAFT.md](docs/PRIVACY-NOTICE-DRAFT.md) (not publication-ready).

Changed

- Fonts are self-hosted from `public/fonts` (SIL OFL), so no visitor request goes to Google.

Removed

- Larkon template pages `/pages-404`, `/auth/sign-up` and `/auth/lock-screen`, whose forms did nothing.

Fixed (third batch, 17 October 2026)

- Saving is refused while the device is offline, with a plain message, and staff screens show an offline banner; connection failures read as plain sentences instead of "Failed to fetch" (A16, D-016).
- New gift card codes are 64-bit (K-23).
- Each staff PIN belongs to one person: a PIN already in use is refused, and a shared PIN signs in nobody (K-23).
- Content Security Policy: scripts only from this site, with the boot scripts moved out of `index.html` into `public/boot.js` (K-23).

Changed (owner decisions D-024, 17 October 2026)

- Promotional WhatsApp sends (broadcast, waitlist and abandoned-cart nudges) are switched off until customers can opt in; the admin buttons are disabled with an explanation (K-11).
- The AI reply drafter no longer sends the customer's name or message to the AI provider (K-12).
- Referral and campaign codes are kept in the browser for 30 days, then removed (K-13).
- Only staff pages offer the installable app, which opens at `/today` (K-20).

Fixed (second batch, 17 October 2026)

- Staff tokens are stored as SHA-256; tokens issued earlier keep working until they expire (K-15).
- Staff sign-in takes the same time whether or not the email exists (K-23).
- Form focus and announcements on booking, access, track, contact and company brief; names for shop inputs (K-16).
- `e2e-phase5.sh` runs on macOS (K-17).
- Stack verification recorded in `docs/TEST-STRATEGY.md`: local CI steps PASS on PR #14 and PR #17, e2e phases 2 to 5 PASS on fresh staging, and a note that stacked PRs get no GitHub CI (K-17).
- Sitemap lists the shop, gifting and products while the shop is on; the service worker caches only unchanging files and keeps a fresh offline shell (K-20).

### PR #14 `feat/redesign-dark-luxury`, 13 October 2026

Changed

- Design direction is dark luxury (D-023): new colour maps (`$hc-site`, `$hc-paper`, warmer `$hc-light` and `$hc-dark`, `$hc-media` for text and scrims over photographs), Fraunces replaces Source Serif 4, a larger type scale, 1240px container, 14px cards, 8px controls and pill public buttons. The public site is dark with ivory bands (`<Section tone="paper">`).
- Home hero is a full-screen photograph slider: home page first, then up to four services with a photograph; Ken Burns crossfade, word-by-word headline, progress bars, arrows, keys and swipe, paused on hover, focus and hidden tabs, static under reduced motion. The header floats transparent over it on the home page.
- Service cards are single links with equal heights and an aligned footer row; work cards carry the caption over the photograph; the closing band sits over a dimmed photograph; the footer gains the primary action and a large outline wordmark; eyebrows become small capitals with a leading amber rule.
- Admin: ivory page with white cards (ink and charcoal in dark), 64px topbar, 248px sidebar with an amber-tint active item, Fraunces page titles, tinted status chips, 14px cards, and four summary tiles on Today built from the counts `today.php` already returns.
- Hero slide editor, 14 October 2026: Website > Hero slides (new CMS entity `slide`, `schema_phase28.sql`) with draft, preview, publish, rollback and reorder; each slide has a headline, photograph, optional label, eyebrow, line and a button limited to an internal path. `site.php?action=home` returns `slides`; Home uses them and falls back to the automatic slides when none is published; the Website hub card shows your slides and links to add or manage them. 8 new helper tests (374 in all).
- Build pass, 14 October 2026: Website admin gets a "Home hero slides" card with a live crossfading preview of the slides visitors see (home page, then up to four photographed services), numbered rows with thumbnails and edit links, and the services still waiting for a photograph; the Business details card lists shortcuts instead of empty space. Booking shows its form beside a "How booking works" card; My account aligns with its header. A sideways-scroll check at 390px passes on all 14 public routes.
- Consistency pass, 14 October 2026 (owner: everything used on the home page must be consistent sitewide): one page header style and h1 size on every public page, including Track, Account, Book, Shop and the portal; Journal, a journal post, Privacy and Terms, a work piece and the not-found and error pages get the header band; long text sits in ivory reading bands; Questions uses the home split layout per group; Services, Questions, Journal, a post and a work piece end with the full closing band; Track shows the access form beside a "What your account shows" card; portal buttons are pills; a work piece without a story no longer shows an almost empty band.
- Fourth pass, 14 October 2026, after owner review against the prototype: section headings with a lead or links use the prototype's split layout (eyebrow and title left, lead, links and filters right); the footer becomes Brand, Explore, Clients and Visit columns with legal links, staff sign-in and socials in the bottom bar; "What clients say" is one large centred quote that rotates with dots (published, consented reviews only).
- Third pass, 14 October 2026, to match the approved prototype end to end: shared `PromiseBand`, `ProcessBand` and `CompanyBand` (copy in [docs/CONTENT.md](docs/CONTENT.md#fixed-copy-in-the-shared-bands-d-023)); home now runs hero, promise, services with price notes, work with service filter chips, process, company orders, about (photograph fallback), reviews, questions beside their heading, journal and the closing band; Services, a service (copy beside a sticky "At a glance" card, then work, process and a closing band over the service photograph), Our work, About, How it works and Company orders carry the same bands so no page is left as a lone heading.
- Second pass, 14 October 2026: staff sign-in, reset, lock and sign-up screens use the new heading and an ink side panel (no hard-coded colours, IBM Plex Mono or pattern; copy without em dashes); CMS page headers get a divider band and a rounded photograph; the service page shows "What's included" beside a pricing card on an ivory band; journal cards are cards; four cards in a three-column grid show four across; admin alerts and the admin footer use the token palette.
- Admin (CMS) pass, 14 October 2026, to the approved admin prototype: Today greets by Lagos time of day and first name; Jobs gets a List or Board switch (`?view=board`, one column per stage, cards with code, promised date or days late, garment, client, Company and the owner-only payment chip); Payments gets three summary tiles (received this month from verified entries less refunds, balances to collect, entries to verify) that link to their tabs; Jobs, Clients and Enquiries rows carry an initials avatar (`initials()` in `src/helpers/format.js`); summary-tile figures no longer break across lines at 390px.
- Job page, 16 October 2026, to the admin prototype: the stage bar sits under the header on every tab (`StageStepper`, moved out of the Overview stage card), and Overview shows a Money card for owner roles beside the stage and dates (price, verified paid, waiting to verify, balance or credit, a paid bar and a link to Payments); it comes first on phones. Columns that stack cards opt out of the admin equal-height rule (`.hd-stack`). Aso-ebi groups (`/jobs/groups`) moves to the shared page header, back link and card style. Website hub opens with a publish bar (how many items have changes that are not live yet, with links to their lists; green when everything is live); Payments Recent and To verify get a payment-method filter (`?method=`, only methods present in the view); Enquiries tab counts become pills; tab strips hide their scrollbar on phones.

Fixed

- A 1px line under the transparent home header, the home questions list centred under a left-aligned heading, and the admin logo box taller than the topbar (found in the browser check, [qa/FUNCTIONAL-AUDIT.md](qa/FUNCTIONAL-AUDIT.md#redesign-dark-luxury-13-october-2026)).

### PR #13 `feat/phase5-company-orders`, 12 October 2026

Added

- Portal screens for company orders: company orders and "Your garments" on the portal home, a company job page (progress per line with ready and handed-over counts, the latest sample with an explicit approve or ask-for-changes confirm step, messages, payments, quote) and a wearer's own garment page.
- Admin for company orders: Companies list and company page (details, contacts with permission switches, jobs, new company job with lines and optional wearers), company job tabs (Items, Sample, Company, Handover by item), a Company chip in the Jobs list, and `tailoring.php` lists return `job_kind`. Groups are labelled as separate payers with no automatic discount (BR-29).
- Portal for company orders behind `company_portal_enabled` (default off): company contacts see their company's jobs as lines and totals with the latest sample, approvers decide samples from the portal (`sample_decide`), wearers see only their own garment, and every other portal action stays limited to the job's own client. `scripts/staging/e2e-phase5.sh` (C1 to C13, tailor and switch checks): 25 of 25 on staging.
- `company_jobs.php`: create a company job with items and wearers (idempotent), job view with measurement state and a suggested stage, PO and invoice contact, item add, edit (an edit after production starts needs a stated price or date effect, BR-30), cancel and progress, measurements attached only from the wearer's approved sets, wearer invite links, sample versions with recorded decisions, and handover by item ("2 of 5 handed over", over-quantity refused, request keys). Company invoices and quotes carry the PO and a bill-to frozen when the quote is sent.
- `companies.php` (owner roles): company list, profile with contacts and jobs, a similar-name warning that never merges, contacts as ordinary clients with view, sample-approval and invoice permissions (Phase 2 duplicate check), and deactivation. Deployed by CI with `_company.php`.
- Company orders data model (`schema_phase27.sql`): companies, company contacts with permissions, company job columns on `tailoring_orders`, job items with wearers, sample versions, per-item handover quantities and a frozen bill-to on quotes. Pure helpers in `php-api/_company.php` (quantities, stage rollup, item handover checks, sample transitions, contact permissions, company and wearer portal views) with 43 tests in `tests/company_cases.php`.

Fixed

- Recorded K-07: with more than 20 new enquiries, Today hides due follow-ups (Phase 2 ordering; owner decision needed). `e2e-phase2.sh` E15c fails on staging data with 22 new enquiries (it passed earlier the same day, before test runs added new enquiries).
- `company_jobs.php` loaded `_company.php` twice (fatal "Cannot redeclare") once `_portal.php` included it too; every include of `_company.php` is now `require_once`. Found by `e2e-phase5.sh`.

Changed

- The handover completion helper moved from `tailoring.php` to `_jobs.php`, and the owner invite link from `access.php` to `customer_invite_create()` in `_portal.php`, unchanged, so company jobs reuse them (`e2e-phase2.sh` and `e2e-phase3.sh` still pass).

### PR #12 `feat/phase4-website`, 11 October 2026

Added

- Admin Website area (BUILD-SPEC 4.8) at `/website`: a hub listing missing business details and what each hides, business details with checked social links and the journal switch (owner saves), images with in-browser downscaling to 2400px, alt text and captions, lists for pages, services, work, questions and policies, and one editor with save draft, preview in a 390 or 1280px frame, publish (the server's reasons shown when it refuses; a private-details warning asks before publishing), unpublish, roll back, discard and delete. Text uses simple formatting (blank lines, `- ` lists, `## ` headings, `[text](url)` links) converted to HTML by `src/helpers/richText.js`. New `website` section in `roles.js` (owner roles and editor); the Website menu item now opens `/website` and the old content page moves under More tools as Journal and testimonials.
- `/faqs` (grouped details, `FAQPage` JSON-LD), `/privacy` and `/terms` (effective date, owner-published) on the CMS. `npm run check:tokens` now also scans every JS/JSX file under `src/app/(public)` and runs inside `npm run lint`, so CI enforces it (A23).
- Website pages on the CMS (BUILD-SPEC 4.7): `/services`, `/services/:slug` (with `Service` JSON-LD), `/work` (service filter chips), `/work/:slug` (gallery and facts), `/how-it-works` and `/company-orders` with the company brief form (posts to `contact.php` as a wholesale enquiry; D-022). Unpublished items show a noindex not-found page. The staff splash skips the new public paths.
- Handoff for a second computer: remaining build spec in `docs/BUILD-SPEC.md`, the tested JS/JSX lint config in `scripts/lint/eslint.config.proposed.js` (A13), and a "Continue on another computer" section in `.agent/CURRENT-TASK.md`.
- Public UI kit in `src/app/(public)/site/ui/` (Button, Section and SectionHead, Card, ServiceCard, WorkCard, Field and ErrorSummary, StatusChip, HcImage, Hero, Icon) and a motion layer: word-by-word headline mask reveal and image settle on the first home view per session, once-only fade-up reveals below the fold, the amber measure line under eyebrows, a filling step rule, growing link underlines and button press feedback, all static under reduced motion. New header (opaque, menu sheet with focus trap below 1024px) and footer that shows only filled-in business details and verified social links (A12). `npm run check:tokens` guards the stylesheets against raw colours (A23).

Changed

- SEO and deploy safety (BUILD-SPEC 4.6, A24): staff screens set `robots=noindex, nofollow` (`AdminLayout`); `php-api/.htaccess` sends `X-Robots-Tag: noindex` on PHP answers except the sitemap; `deploy.yml` excludes `uploads/site/**` from the FTP sync. Link previews for crawlers without JavaScript stay open (K-06).
- About is the published CMS page (interim copy removed); Contact shows the CMS contact page, profile channels and an address only when marked public, prefills from `?type=` and `?service=`, and carries the LocalBusiness JSON-LD; the journal list and posts use the UI kit with a real not-found page and drop the "join the family" call to action. Track, account, checkout, product, reviews, gifting and portal inline colours moved to tokens.
- Public site reads the website CMS (BUILD-SPEC 4.7): `heritApi.site.*` and `heritApi.cms.*`; `site/siteData.js` (cached `site.php` config, preview-aware loader for `?preview=1` with a staff session, image mapping); `useSeo` for title, description, canonical, Open Graph and JSON-LD; `useActions` for the two site actions. Home is built from published content (hero, services, company band, work, how it works, owner note, questions, final action), each section hidden while unpublished; header, footer and contact details come from the Website profile and published-content flags. CMS and journal HTML pass a browser allowlist (`safeHtml.js`) and `site.php` sanitises `body` and `answer` again on the way out. The journal follows `journal_enabled` (`site.php`).
- JS/JSX lint is on (A13): `eslint.config.js` lints `src/**/*.{js,jsx}`, `public/sw.js` and the root config files, and `npm run lint` reports 0 errors. The proposed copy in `scripts/lint/` is removed. `site/ui/Card.jsx` binds its `as` prop to a local so the rule sees it used.
- `site.css` rebuilt on the tokens: white and light-ash surfaces, thin dividers, Source Serif 4 headings at weight 500, Inter body; fabric pattern tiles, dark bands, shadows and the Tack Stitch leftovers are gone. Home, About and Contact use the UI kit; the contact form no longer needs react-bootstrap.

Fixed

- At 320px the Home hero was clipped to 352px by a button label that would not wrap; public buttons now wrap below 600px and the hero grid column cannot grow past the screen ([qa/ACCESSIBILITY-AUDIT.md](qa/ACCESSIBILITY-AUDIT.md#phase-4-cms-pages-11-october-2026)).
- Contact form subjects (`order`, `product`, `custom`, `gifting`) were not types `contact.php` accepts, so every enquiry was stored as `general`; each subject now maps to `fitting`, `bespoke`, `wholesale` or `general` (the subject is kept in the message). Gifting page text was white on a light surface after the dark band was removed.

Removed

- Invented public content (A07): the home marquee, three-slide hero with worldwide shipping and ₦18,500, stats, the four named staff, the press logo strip, the HERIT10 newsletter and offers, "Free Lagos delivery over ₦25,000", Ajuwon Market and "shipped worldwide" in the footer, About and Contact, the social fallback URLs, and the Contact page's map, shipping table and FAQ answers until the owner confirms them. Swiper is no longer imported (the package stays in `package.json`).

Performance

- Admin CSS kept off public routes: layouts are lazy and each loads its own CSS (`PublicLayout` tokens only; `AuthLayout` and `AdminLayout` Bootstrap, Larkon and `heritos-admin.css`). Public home initial CSS fell from 63.0 KB to 6.5 KB gzip and JS from 155.7 KB to 107.4 KB gzip ([qa/PERFORMANCE-AUDIT.md](qa/PERFORMANCE-AUDIT.md)).
- Public pages use bundled SVG icons (`site/ui/Icon.jsx`) instead of Iconify, so they make no request to api.iconify.design. Fonts: IBM Plex Mono dropped, Inter and Source Serif 4 as variable ranges with swap. The public site stays light whatever the staff theme is (`data-hc-public`). The staff splash is hidden on public paths; `lang` is `en-NG`.

Added

- Staging: `seed.php --phase4` (a business profile marked Staging, three services, three portfolio projects with generated STAGING swatches, FAQs, policies, two pages), the router serves `/uploads/site/`, `/sitemap.xml` and `/robots.txt`, and `scripts/staging/e2e-phase4.sh` adds 62 checks (PASS on two runs).
- Website CMS, server side: `schema_phase26.sql` (`media_assets`, `cms_items`), pure rules in `_cms.php` with 72 new helper tests (323 in total), `cms.php` for staff (services, portfolio projects, FAQs, privacy and terms, pages: draft, preview, publish, unpublish, one-step rollback, stable slugs, reorder; business profile; images), the public projection `site.php` (published content only, through whitelists; no drafts, consent records or client links) and `sitemap.php` at `/sitemap.xml` (A24).
- Image uploads (`_media.php`): staff only, JPEG, PNG or WebP checked by content, 8 MB and 40 megapixels at most, re-encoded with GD so EXIF and GPS are dropped, 800 and 1600 pixel WebP plus a JPEG, random names, stored under `uploads/site/` whose `.htaccess` serves image names only and switches PHP off.
- Business profile settings (name, phone, WhatsApp, email, address with a public switch, service area, hours text, socials including LinkedIn, journal switch), all empty by default; the public config omits empty facts and builds LocalBusiness JSON-LD only from facts that are set.

Removed

- Server-side invented offers and fallbacks (A07, A22): `store.php` loses the free Lagos delivery threshold and the built-in fallback catalogue (checkout refuses any slug that is not a published product; `free_ship_over` is now null); `schema_phase5.sql` no longer seeds HERIT10 and FREESHIP, and `schema_phase26.sql` switches those codes off where they were never used.
- Invented fallbacks (A07): the static products in `site/products.js` and the sample posts and testimonials in `site/content.js`. Empty or unreachable now means an empty list, and the pages show their empty state or hide the section. The shop pages lose the "Free Lagos delivery over ₦25,000", "Ships worldwide" and "14-day returns" claims and the Ajuwon Market pickup label.

Changed

- Social links (A12): `store.php?action=config`, `site.php` and `settings.php` accept and return only `https://` links on each platform's own host with an account path, and WhatsApp only as `https://wa.me/<digits>`; fallbacks and home-page links are left out. `robots.txt` now covers every current admin and portal path and points at the new sitemap.
- One design token layer (A23): `src/assets/tokens/` holds every colour once and emits `--hc-*` custom properties; Larkon's SCSS variables, `heritos-admin.css`, the Phase 2 `--hd-*` set and `portal.css` all read it. Admin primary buttons become amber with ink text, `.text-primary` uses the accessible amber text colour, and the warm shadows, glass topbar, gradients and mono uppercase labels are gone. The public site stays light whatever the admin theme is.

### PR #11 `feat/phase3-appointments-portal`, 10 October 2026

Added

- Pure Phase 3 rules in `_domain.php`: availability validation (empty means not set), Lagos slot windows, buffer-aware overlap, free slots, a slot check with reasons, appointment transitions, six-digit access codes stored only as an HMAC, challenge expiry and lockout, and `job_public_view()`, the allowlist projection the portal returns. 85 new helper tests (251 in total).
- Appointments (A08): `schema_phase23.sql` (appointments, history, blocked time, the booking lock; old fitting dates become all-day fittings), `appointments.php` for the owner (list, requests, create with override reason, confirm, decline, reschedule with history, complete, no-show, cancel, availability and blocks) and public `booking.php` (config, slots, consultation requests that also open an enquiry), off until `public_booking_enabled`. Every reservation runs under one lock with buffers, blocks, minimum notice, horizon and request holds. `tailoring.php` keeps the job fitting date as an all-day fitting appointment; `today.php` lists real appointments and requests. Phase 3 settings keys in `settings.php` (D-021).
- Verified customer access (A03): `schema_phase24.sql` (hashed `customer_sessions`, `customer_access_challenges`), `_portal.php` and `access.php`: reference plus registered contact, one generic reply, a single-use six-digit code by email (hashed, 10 minutes, 5 attempts), owner invite links when there is no email or mail fails, logout, logout everywhere and owner revocation, all throttled.
- Customer portal, messages, change requests and feedback (A09): `schema_phase25.sql`, `portal.php` (job view through the allowlist projection, client-visible thread, change requests, fitting or collection requests and reschedule requests, measurement proposals, feedback with separate consents, quote acceptance behind a switch) and `messages.php` for the owner (inbox, threads with internal notes, delivery status, change-request decisions with price or date effect after cutting, feedback follow-up and consent-checked publishing). Today adds access requests, unread messages, open change requests and feedback follow-ups.
- Staging: `seed.php --phase3` (staging-only availability, appointments, messages, a change request), a staging-only sign-in code log, and `scripts/staging/e2e-phase3.sh` with 93 checks (PASS on two runs).
- Appointments screens (A08), 11 October 2026: the Appointments page (week strip, day and week lists, request queue, booking with free times or a typed time and an override reason on a clash, move with a reason, confirm, decline, complete, no-show, cancel, history, blocked time) and Availability and Client portal sections in Settings, with the server's per-field errors.
- Messages screens (A09): `/messages` (conversations, change requests, feedback), a Messages tab on each job with client replies and clearly marked internal notes, change-request decisions showing the 422 after cutting, feedback follow-up and consent-checked publishing; the bell counts unread client messages.
- Customer access screens (A03, A09): the two-step access form on `/track` and `/account`, owner access links (WhatsApp link and copyable message) from Today and client details, sign out everywhere, invite links exchanged at once and taken out of the URL, and the client portal at `/account/jobs/:ref` (progress, messages, appointment and reschedule requests, change requests, payments, quote acceptance behind its switch, measurements and proposals for review, feedback with separate consents).
- Public `/book`: consultation requests from free times in Lagos time, clearly a request; linked in the public navigation only while requests are switched on and ready.
- Today: real appointments today, plus appointment requests, unread messages, change requests, clients waiting for an access link and feedback to follow up.

Fixed

- `messages.php?action=inbox` answered 500 on MariaDB because it ordered by an expression over an aggregate alias (K-05).

Changed

- The customer token is kept in sessionStorage instead of localStorage and cleared on any 401 (A15, partly).
- `/track` keeps the shop-order lookup under "Tracking a shop order?"; `/account` keeps the shop extras only while the shop is switched on.
- Messages joins the daily navigation (sidebar and the phone More sheet).

- `account.php` uses the shared hashed sessions; its phone plus order code login and old measurement form answer only while `ALLOW_LEGACY_ORDER_CODE_LOOKUP` is on, and the form still creates a pending proposal, never an overwrite (A10, D-021).
- Quotes: acceptance moved from `quotes.php` into `quote_accept()` in `_jobs.php` so the portal can reuse it; behaviour unchanged (`e2e-phase2.sh` 48 of 48).
- Mail: the SMTP client moved from `mail.php` into the shared include `_mail.php` with `mail_send_html()`, so other endpoints can send mail; `mail.php` is a thin endpoint over it and also audits failed sends. `_mail.php` is deployed by CI.

Removed

- The Larkon `/apps/calendar` demo (A08, A18): its route, seven files and `SelectFormInput.jsx`, and the packages only it used, the seven `@fullcalendar/*` packages and `react-select`. The old URL redirects to `/appointments`. The disabled Messages tab on client details.

### PR #10 `chore/cleanup-docs-sync`, 10 October 2026

Added

- `scripts/check-docs.mjs`, run in CI: fails on broken Markdown links or anchors, em dashes in live docs, and mentions of `docs/` or `qa/` paths that do not exist.
- Documentation-sync rule for every agent ([.claude/rules/docs-sync.md](.claude/rules/docs-sync.md)), summarised in `AGENTS.md` and pointed to from `CLAUDE.md` and `CODEX.md` (D-020).
- Owner actions per pull request in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#owner-actions-per-pull-request).

Changed

- Documentation flattened to the GEE OS Standard application profile: flat `docs/*.md`, `docs/Plans 2026/` the only subfolder; thin files merged (context and roles into PRODUCT-SPEC, integrations and PWA into ARCHITECTURE, auth and permissions into SECURITY, backup and monitoring into DEPLOYMENT, email into NOTIFICATIONS-SPEC, release files into `qa/LAUNCH-CHECKLIST.md`, UX and PWA audits into the functional and performance audits) (D-020).
- Every status brought up to date with PRs #6 to #9: roadmap phases, findings, known issues, navigation as built, endpoint and table inventories, test results.
- The three tsconfig files replaced by one `jsconfig.json`.

Removed

- Orphan Larkon components, helpers and type stubs; the unlinked `/review`, `/maintenance` and `/coming-soon` pages; 32 unused packages and their style partials; unused demo images, icon fonts and the light logo; the axios fake backend and axios. `dist` fell from 10.2 MB to 2.6 MB (A18).

### PR #9 `feat/phase2-daily-records` (Phase 2), 10 October 2026

Added

- Today page as the owner's home: overdue, due soon, ready, enquiries, balances, unverified payments and measurements awaiting approval (`today.php`).
- Enquiry pipeline with tabs, detail page and a retry-safe convert wizard that offers matching clients instead of merging silently (`enquiries.php`).
- One Clients area: search, duplicate warning, `client_ref`, detail tabs, and dated measurement sets on five editable templates with explicit units, owner approval and frozen job snapshots (`measurements.php`, A10).
- Jobs: stage rules, event and promised dates, next action, `lock_version` conflict messages, versioned quotes with recorded acceptance (`quotes.php`), append-only payment ledger with request keys and uncapped credit (`ledger.php`, A05), planned and partial handovers, printable quote, invoice, receipt and measurement sheet.
- Payments page; Settings for business details, quote defaults, payment rules and measurement templates.
- Schema files `schema_phase18.sql` to `schema_phase22.sql`; `_domain.php` and `_jobs.php` shared helpers; 166 helper tests; `scripts/staging/e2e-phase2.sh` (48 checks).
- Needle H favicon, app icons and an updated manifest (K-03).

Changed

- Navigation: Today, Enquiries, Appointments, Clients, Jobs, Payments, Website and Settings, with older modules under More tools; a bottom bar on phones; old URLs redirect (D-009).
- Page access matches the server role gates; tailors never see money (K-01).
- CI deploys the seven new PHP files with their callers; `php-api/.htaccess` blocks direct requests to `_*.php` and `config*.php`.

Fixed

- Jobs and Groups show a plain error with Retry instead of an upload instruction (K-02).
- The phone sidebar closes on navigation and no longer opens by itself.

### PR #8 `feat/docs-gee-os`, 10 October 2026

Changed

- Documentation moved into the GEE OS Full Product hierarchy, with root `qa/` audits, this changelog and `KNOWN-ISSUES.md` (D-012; flattened again by D-020).
- Plans 2026 restored as the standing plan of record (D-012).

### PR #7 `feat/phase1b-staging` (Phase 1b), 10 October 2026

Added

- Local staging: `npm run staging:setup` and `staging:serve` give a local PHP API and database with synthetic records; development uses it by default (A01).
- Random 10-character public references for customer lookups, with `schema_phase17.sql` and collision-safe staff codes (A06).
- A real optional company field on enquiries, with the honeypot renamed (A11).

Changed

- Enquiries page shows a plain error with Retry instead of an upload instruction (A17).
- Retail shop links hidden from public navigation unless `shop_enabled` is on (D-014).

Removed

- Larkon demo routes and unused kit pages, with 14 orphaned components; production JavaScript fell from 4,985,796 to 1,553,500 bytes (A18).
- Superseded 2025 plans and both `HeritOS.html` specifications (D-017).

### PR #6 `feat/plans-2026-phase1` (Phase 1), 10 October 2026

Added

- Throttling and one generic failure message for customer sign-in and public tracking (A03, partial).
- Server-side HTML sanitiser for blog posts (A04).
- CI runs PHP syntax checks and the helper tests; the deploy job repeats lint, PHP checks and the build before uploading (A14).

Changed

- Deposit updates run inside a transaction with a row lock (A05, later replaced by the ledger in PR #9).
- Localhost CORS allowed only when `ALLOW_LOCALHOST_CORS` is on (A15, partial).

Fixed

- Editing an existing blog post: the UPDATE now binds 11 values with an 11-character type string (A21).
- Contradictory deployment descriptions in project docs (A19).
