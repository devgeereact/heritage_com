# Build spec: Phase 4 (website, CMS, tokens) and Phase 5 (company orders)

Status: working spec for the remaining build, written 10 October 2026 from the code at the time. Temporary: delete this file when Phase 5 is merged, after its decisions are recorded in [DECISIONS.md](DECISIONS.md).

Already built on `feat/phase4-website`: section 4.1 to 4.3 (token layer, public components, motion) and the server side of 4.4 to 4.6 (CMS, uploads, public projection, sitemap). See [ROADMAP.md](ROADMAP.md) for live status; where this spec and the code differ, the code and ROADMAP win. Schema numbering below was planned before Phase 3 shipped as phases 23 to 25.


## 0. Facts that shape the design

1. **Schema numbering conflict.** The brief says Phase 3 ends at `schema_phase23`, but the Phase 2–3 spec actually uses numbers 18 to 25:
   - 18 jobs, 19 measurements, 20 quotes, 21 ledger, 22 handovers, 23 appointments, 24 access, 25 messages.
   - Starting Phase 4 at 24 would collide. This spec therefore uses `schema_phase26.sql` and `schema_phase27.sql` for Phase 4, and `schema_phase28.sql` for Phase 5.
   - If Phase 2–3 really ship as 18–23, renumber to 24/25/26. File contents do not depend on the number.
2. **Admin CSS loads on every public page.** `src/App.jsx` imports all of `app.scss` and `heritos-admin.css`, which become one 443 KB `index-*.css` file.
   - `router.jsx` imports `AdminLayout` statically.
   - Public routes are already lazy-loaded (`routes/index.jsx:21-32`).
3. **Third-party icon fetches.** `IconifyIcon` uses `@iconify/react` with string names, so it fetches icons from api.iconify.design at runtime on public pages.
4. **The public site follows the admin dark theme.** `LayoutProvider` sets `data-bs-theme` on `<html>` on every route.
5. **Invented content and fallbacks.**
   - `HomePage.jsx`: marquee, `stats`, `team`, and slides offering worldwide shipping and ₦18,500.
   - `content.js`: `FALLBACK_POSTS` and `FALLBACK_TESTIMONIALS`.
   - `products.js`: `STATIC_PRODUCTS`.
   - `SiteLayout.jsx` footer: HERIT10 newsletter, "Ajuwon Market", "shipped worldwide", and the `SOCIAL_DEFS.fallback` URLs.
   - `store.php`: `$FREE_SHIP_OVER` (free delivery offer) and the `$CATALOGUE` fallback.
6. **`tailoring_groups` (phase 13).** One organiser, N independent jobs (each with its own customer, price and deposit), and an automatic `discount_pct`. There is no group-level quote, ledger, handover or portal link.
7. **Missing server pieces.**
   - There is no upload code anywhere in `php-api`. GD, exif and fileinfo are available locally; the server is Unknown.
   - The only `.htaccess` is `php-api/.htaccess` (SPA fallback, uploaded by hand).
8. **Robots and sitemap.** `robots.txt` advertises `/sitemap.xml`, which does not exist. Its disallow list names removed routes and misses current admin routes.
9. **No frontend test runner** and no Playwright in `package.json`.

---

# PHASE 4: website, shared CMS and design tokens

## 4.1 One token layer

**Files**
- New `src/assets/tokens/_tokens.scss`: a Sass map holding every value once (the only file allowed to contain hex values).
- New `src/assets/tokens/tokens.scss`: emits CSS custom properties from the map.
- New `scripts/check-tokens.mjs`: fails CI if `site.css`, `heritos-admin.css` or any public JSX contains a hex or `rgb(` outside the tokens folder. Add it to `npm run lint`.

**Custom properties.** Declared on `:root` and redeclared on `.hc` so the public site always stays light.

| Group | Tokens |
|---|---|
| Colour | `--hc-surface:#FFFFFF`<br>`--hc-surface-alt:#F4F4F4`<br>`--hc-text:#171A20`<br>`--hc-text-body:#393C41`<br>`--hc-text-muted:#5C5E62`<br>`--hc-divider:#D0D1D2`<br>`--hc-control-border:#8E8E8E`<br>`--hc-accent:#F59E0B`<br>`--hc-accent-hover:#D97706`<br>`--hc-on-accent:#171A20`<br>`--hc-accent-text:#B45309`<br>`--hc-focus:#171A20` |
| Status (text / tint) | success `#15803D` / `#F0FDF4`<br>warning `#B45309` / `#FFFBEB`<br>danger `#991B1B` / `#FEF2F2`<br>pending `#5C5E62` / `#F4F4F4` |
| Font | `--hc-font-sans:"Inter",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif`<br>`--hc-font-serif:"Source Serif 4",Georgia,serif` |
| Type scale | xs 0.8125rem (13px)<br>sm 0.875rem<br>base 1rem<br>md 1.125rem<br>lg 1.25rem<br>xl 1.5rem<br>2xl 1.75rem<br>3xl 2rem<br>4xl 2.5rem<br>hero `clamp(2.25rem,1.6rem + 2.8vw,3.5rem)` |
| Leading | `--hc-lh-body:1.6`<br>`--hc-lh-heading:1.2`<br>`--hc-lh-hero:1.08` |
| Weights | `--hc-w-regular:400`<br>`--hc-w-medium:500`<br>`--hc-w-semibold:600` (serif headings 500, app H1 600) |
| Spacing | `--hc-space-1..9` = 4, 8, 12, 16, 24, 32, 48, 64, 96px<br>`--hc-section-y:clamp(40px,7vw,96px)` |
| Layout | `--hc-container:1200px`<br>`--hc-measure:65ch`<br>`--hc-gutter:clamp(16px,4vw,32px)`<br>`--hc-header-h:64px` |
| Radius | `--hc-radius-control:4px`<br>`--hc-radius-card:12px`<br>`--hc-radius-chip:999px` |
| Controls | `--hc-touch:44px`<br>`--hc-control-h:48px` |
| Motion | `--hc-dur-ui:200ms`<br>`--hc-dur-color:330ms`<br>`--hc-dur-reveal:360ms`<br>`--hc-dur-hero:700ms`<br>`--hc-ease:cubic-bezier(.2,.7,.2,1)`<br>`--hc-ease-emph:cubic-bezier(.16,1,.3,1)`<br>`--hc-ease-curtain:cubic-bezier(.65,0,.35,1)` |
| Elevation | `--hc-shadow-overlay:0 8px 24px rgba(23,26,32,.12)`, for dropdowns and dialogs only |

The status tint pairs are calculated at 4.8:1 or better. They must be re-measured on rendered pages.

**Mapping the Larkon SCSS (`config/_variables.scss`).** Import the map, then set:
- `$primary: map.get($hc,'accent')`, with `$color-contrast-dark:#171A20` and `$min-contrast-ratio:4.5`, so `.btn-primary` is amber with dark text.
- `$secondary` and `$dark` = `#171A20`.
- `$body-color:#393C41` and `$headings-color:#171A20`.
- `$gray-100:#F4F4F4`, replacing the cream `#FFFBEB`.
- `$border-color:#D0D1D2`, `$input-border-color:#8E8E8E` and `$input-focus-border-color:#171A20`.
- `$focus-ring-color:rgba(#171A20,.9)`.
- `$link-color:#B45309` and `$link-decoration:underline`.
- `$component-active-bg` amber, with `$component-active-color:#171A20`.
- `$border-radius:4px`, `$card-border-radius:12px` and `$btn-font-weight:500`.
- `$success:#15803D`, `$warning:#B45309`, `$danger:#991B1B`.
- `$font-family-monospace`: system monospace. Drop IBM Plex Mono.

**`heritos-admin.css`** is rewritten onto `var(--hc-*)`:
- Delete the warm shadows, the mono uppercase table headers (replace with Inter 600, 13px, sentence case) and the `--herit-*` definitions.
- Keep `--herit-*` only as aliases (`--herit-accent: var(--hc-accent)`) for one release.
- Add `.text-primary,.link-primary{color:var(--hc-accent-text)!important}`. Amber as text fails contrast, and there are 37 `text-primary` uses in JSX.

**`site.css`.** Delete lines 10–41 and every `--gold`, `--espresso` and `--shadow-*` use, then rebuild on the tokens. The fabric tile patterns (`hc-tile-*`) are retired.

**Dark mode.** Ship and test light first.
- `[data-bs-theme=dark]` remaps only the colour tokens: surface `#1C1A17`, surface-alt `#262320`, text `#FFFBEB`, body `#E7E1D6`, muted `#C9C2B5`, divider `#3A352E`, control-border `#7A736A`, accent-text `#F59E0B`. The accent fill and dark button text stay the same.
- Admin only, and marked "not verified" in DESIGN-SYSTEM.md.
- `.hc{color-scheme:light}` plus the light token redeclaration isolates the public site.

**Also update**
- `public/manifest.webmanifest`: background `#FFFFFF`, theme `#171A20`.
- `index.html`: the white splash, removed immediately on public paths.

## 4.2 Components (public)

All components go in `src/app/(public)/site/ui/`. No new dependencies.

- **`Button.jsx`** (`.hc-btn`)
  - 48px minimum height, padding `0 24px`, 4px radius, Inter 500 at 16px.
  - Transitions `background-color, border-color, color` over `--hc-dur-color`. No movement on hover.
  - Variants:
    - `primary`: amber with ink text; hover `#D97706`.
    - `secondary`: `#F4F4F4` fill with ink text and a 1px transparent border; hover border ink.
    - `quiet`: an ink text link with 4px underline offset.
  - Disabled uses `aria-disabled`, `#F4F4F4` with muted text.
  - At most two actions per block; they stack full-width below 600px.
- **Links in body copy:** `--hc-accent-text`, a 1px underline that becomes 2px on hover.
- **Cards**
  - `ServiceCard`: flat on surface-alt, image 3:2 with 12px radius, serif title at 24px, 16px summary, "View service" quiet link.
  - `WorkCard`: 4:5 image, Inter 500 title at 18px, muted fabric/fit line at 14px. The whole card is one link.
  - No shadows.
- **Forms:** `Field`, `TextArea`, `Select`, `RadioGroup` and `ErrorSummary`.
  - Label above (14px, 500); help text below in muted.
  - "(required)" is written as text, not an asterisk only.
  - 1px `#8E8E8E` border; focus is a 2px ink outline with 2px offset.
  - Inline errors in `#991B1B` with an icon, using `aria-invalid` and `aria-describedby`.
  - On failed submit, a summary with field links gets focus.
  - Success shows a `role="status"` panel. Typed values are kept on failure.
- **`StatusChip`:** 28px high, pill shape, 13px weight 500, icon plus text on the tint pair. Used by Track and the portal.
- **`Icon.jsx`:** about 14 inline stroke SVGs: menu, close, arrow-right, phone, whatsapp, mail, map-pin, clock, check, alert, instagram, facebook, tiktok, linkedin, youtube, x. This replaces Iconify on public routes.
- **`HcImage.jsx`:** a `<picture>` with AVIF when present, a WebP `srcset` (480, 960, 1600) and a JPEG fallback.
  - Takes `width`/`height` from the media record and a required `alt`.
  - `priority` gives `fetchpriority="high"` and `loading="eager"`; otherwise `loading="lazy"` and `decoding="async"`.
- **Header**
  - Sticky, opaque white, 64px. A 1px divider fades in once the page scrolls more than 8px (330ms colour transition).
  - Desktop (1024px and up): wordmark, links (Services · Companies · Our work · How it works · About · Contact), the quiet "Track your job" link, then the primary Book or Request button.
  - The 768–1023px menu collapse is a recorded deviation, because six links do not fit at 768.
  - Links whose page is unpublished are hidden. "Staff login" moves to the footer.
- **Mobile navigation:** a sheet below the header.
  - Opens with opacity plus translateY(-8px) over 200ms, or no motion under reduced motion.
  - Focus trap, Escape closes, body scroll lock, `aria-expanded` and `aria-controls`.
  - 56px rows, with Book (primary) and Track (secondary) pinned at the bottom.
- **Footer** on surface-alt, in four columns. Each item is hidden if empty:
  1. Business name, area text, hours.
  2. Phone (`tel:`), WhatsApp (`wa.me/<digits>`), email.
  3. Explore links.
  4. Privacy and Terms.

  Below the columns: verified social icons. Bottom row: "© year business_name" and a small "Staff sign in" link. No newsletter, no wordmark watermark, no "shipped worldwide".

## 4.3 Motion

**Home hero motion.** CSS only, in `site/ui/hero.css`.

- **Layout**
  - 1024px and up: a 12-column grid with text in columns 1–5 and the image in columns 6–12 (4:5 aspect, `max-height:min(78vh,760px)`). The text never sits on the photo, so no scrim is needed.
  - Below 1024px: text, actions, then the image full-bleed underneath.
- **Headline mask reveal**
  - The headline is split into words in React. Each word is an inline-block wrapper with `overflow:hidden` and `padding-bottom:.12em`, holding an inner span that animates `transform: translateY(110%) → 0`.
  - 700ms with `--hc-ease-emph`, start delay 80ms, 40ms stagger per word, staggering capped at 12 words.
  - Opacity stays at 1 throughout.
- **Image**
  - The `<img>` animates `scale(1.04) → 1` over 1200ms with `--hc-ease`, starting at 0.
  - A `::after` "curtain" in `--hc-surface-alt` animates `scaleY(1) → 0` from the top, 700ms with `--hc-ease-curtain` and a 120ms delay.
  - The image is painted from frame 1, so LCP is not delayed.
- **Following elements:** eyebrow, sub copy, actions and the proof line each animate `opacity 0 → 1` and `translateY(10px) → 0` over 360ms, at delays of 0, 380, 460 and 540ms. Everything finishes by about 1.2s.
- **Once per session:** the full sequence runs on the first home view per session (`sessionStorage.hc_hero_seen`). Later views render statically, as do the settings `hero_animation_enabled=0` and preview mode.
- **Fallback:** `animation-fill-mode:both`, plus `@media (prefers-reduced-motion: reduce){animation:none; .hc-hero-media::after{display:none}}`, which means a fully static hero. The sequence is visible without JavaScript.

**Section reveals.** Rework the existing `SiteLayout` IntersectionObserver.
- Only `[data-reveal]` cards and headings animate: opacity plus translateY(12px), 360ms, 60ms stagger, up to 4 items.
- The 3s safety net stays. Skipped under reduced motion.

**Signature detail: the measure line.** Under each section eyebrow, a 1px × 48px amber rule animates `scaleX(0 → 1)` from the left over 480ms on reveal.
- On How it works, a vertical step rule fills amber per step once it is revealed. This is triggered, not scroll-linked.
- No carousels, parallax, marquee, counters or cursor effects. Remove `HeroSlider`, `CounterBand`, `TeamCarousel`, `BrandStrip`, Swiper and `.hc-marquee`.

## 4.4 CMS data (`schema_phase26.sql`, additive and idempotent)

**Content tables.** These all share a set of common columns, written as `{common}` below:
`status ENUM('draft','published','unpublished') DEFAULT 'draft'`, `draft JSON NULL`, `draft_updated_at DATETIME NULL`, `draft_updated_by INT NULL`, `version INT UNSIGNED DEFAULT 0`, `published_at DATETIME NULL`, `seo_title VARCHAR(70) NULL`, `seo_description VARCHAR(170) NULL`, `sort INT DEFAULT 0`, and timestamps.

| Table | Columns |
|---|---|
| `media_assets` | `id`; `base_name CHAR(32) UNIQUE` (random hex); `width`, `height`; `variants JSON` (`{"webp":{"480":"…"},"jpg":{"1600":"…"},"og":"…-og.jpg","avif":{…}?}`); `alt_text VARCHAR(250)`; `caption VARCHAR(250)`; `rights ENUM('own_work','client_consented','licensed') NULL`; `consent_note VARCHAR(255)` (staff only); `sha256 CHAR(64) UNIQUE`; `bytes INT`; `uploaded_by`; `created_at`; `deleted_at` |
| `services` | `id`; `service_key VARCHAR(40) UNIQUE` (stable, never renamed); `slug UNIQUE`; `title`; `summary VARCHAR(300)`; `who_for TEXT`; `includes JSON`; `options JSON`; `price_note VARCHAR(255)`; `hero_media_id`; `is_company TINYINT`; `enquiry_type VARCHAR(20)`; `retired_at`; {common} |
| `portfolio_projects` | `id`; `slug UNIQUE`; `title`; `garment VARCHAR(120)`; `fabric VARCHAR(120)`; `fit_notes TEXT`; `brief TEXT`; `result TEXT`; `occasion VARCHAR(120)`; `show_occasion TINYINT DEFAULT 0`; `service_id`; `cover_media_id`; `featured TINYINT`; `consent ENUM('none','own_work','client_written','client_recorded') DEFAULT 'none'`; `consent_recorded_at`; `consent_recorded_by`; `consent_evidence VARCHAR(255)` (private); `source_job_id INT NULL` (private, never projected); {common} |
| `portfolio_images` | `project_id`; `media_id`; `role ENUM('front','back','detail','process','other')`; `alt_override`; `sort`; primary key `(project_id, media_id)` |
| `faqs` | `id`; `question VARCHAR(255)`; `answer TEXT` (sanitised HTML); `category VARCHAR(40)`; `service_id NULL`; `show_on_home TINYINT`; {common} |
| `site_pages` | `page_key VARCHAR(30) PK` (`home`, `about`, `how_it_works`, `company`, `services_intro`, `contact`); `content JSON`; {common} |
| `policies` | `policy_key VARCHAR(20) PK` (`privacy`, `terms`); `title`; `body MEDIUMTEXT` (sanitised); `effective_date DATE`; {common} |
| `cms_revisions` | `id`; `entity VARCHAR(20)`; `entity_id VARCHAR(40)`; `version INT`; `data JSON`; `action ENUM('superseded','unpublished','rolled_back','setting')`; `created_by`; `created_at`; key `(entity, entity_id, version)` |

**Seeds.** `INSERT IGNORE` the six `site_pages` and two `policies` rows as **draft**, with the copy drafts from §4.7. Policies get headings only plus `[owner: …]` markers. Publishing is blocked while any marker remains.

**`schema_phase27.sql`**
- `testimonials`:
  - Add `consent_type ENUM('none','anonymous','first_name','full_name') DEFAULT 'none'`, `consent_recorded_at`, `source_feedback_id`.
  - `UPDATE testimonials SET status='hidden' WHERE consent_recorded_at IS NULL`.
- `blog_posts`: add `cover_media_id`, `seo_description`, `draft JSON`, `version`.
- `enquiries`: add `contact_role VARCHAR(80)`, `material_responsibility ENUM('client','herit','unsure') NULL`, `service_key VARCHAR(40) NULL`. Phase 2 adds `quantity`, `desired_date` and `company_name`; use `IF NOT EXISTS`.

**Settings keys** (business profile, shared with Phase 2's `business_*`):
- Business: `business_name`, `business_phone`, `business_whatsapp`, `business_email`, `business_address`, `business_address_public` (0/1).
- Area, hours and location: `business_area_text`, `business_hours` (JSON `{"mon":[["09:00","17:00"]],…}`), `business_hours_text`, `appointment_location_note`.
- Copy facts: `response_time_text`, `owner_display_name`, `typical_lead_time_text`, `company_min_qty_text`, `company_capacity_text`.
- Socials: `socials`, now `{"instagram":{"url":"…","verified":true},…}`. The legacy flat strings are read as unverified.
- Flags: `journal_enabled` (0), `nav_company_link` (1), `hero_animation_enabled` (1).
- `site_rev`: an integer bumped on every publish or profile save.
- Never placeholder values: empty means hidden.

## 4.5 Server

**`php-api/_cms.php`.** Pure, dependency-free helpers with tests:
- `slug_clean`
- `social_url_ok($platform,$url)`: https only, plus a host allowlist (instagram.com, facebook.com, tiktok.com, x.com, twitter.com, youtube.com, linkedin.com); WhatsApp is digits only.
- `phone_display_ng`
- `hours_valid`
- `cms_page_validate($key,$content)`: returns `[clean, errors]` against a fixed per-page field schema; unknown keys are dropped and lengths are enforced.
- `cms_has_placeholder($text)`: `/\[owner|\{\{|lorem/i`.
- `cms_private_leak_check($text)`: flags Nigerian phone patterns, email addresses, `HC-\d+`, `ORD-`, `HCG-`.
- `project_publishable($p,$images)`: consent is not `none`, `consent_recorded_at` is set, at least one image, every image has alt text of 5+ characters and `rights` set.
- `testimonial_publishable`
- Whitelist projections:
  - `public_service`: no `draft` or internal fields.
  - `public_project`: no `source_job_id`, consent fields or `customer_id`.
  - `public_testimonial`: name formatted per `consent_type`.
- `jsonld_local_business($profile,$siteUrl)`
- `sitemap_xml($urls)`
- `image_variant_plan($w)`: for example 3000 → [480, 960, 1600] and 800 → [480, 800].
- `upload_mime_ok($finfoMime)`

**`php-api/cms.php`** (staff; `require_auth(['super_admin','admin','manager','editor'])`; policy publishing and profile saves use `ROLES_OWNER`). Every write is audited.

- **Entities:** `service`, `project`, `faq`, `page`, `policy`, `post`, `testimonial`.
- **Actions**
  - `list&entity=`, `get&entity=&id=`.
  - `save_draft`: writes only `draft` JSON (validated, HTML through `sanitize_html`, URLs through `sanitize_url_ok`). Public columns are never touched.
  - `preview&entity=&id=`: returns the public projection built from the draft merged over the live row.
  - `publish`:
    1. `BEGIN`, then `SELECT … FOR UPDATE`.
    2. Validate, check placeholders, check for leaks (a leak warning needs `confirm_leak=1`), check publishable.
    3. Insert into `cms_revisions` (`superseded`, current published data).
    4. Copy the draft to the live columns, `version+1`, `draft=NULL`, `status='published'`.
    5. Bump `site_rev`, then `COMMIT`.
  - `unpublish`: keeps the content and writes a revision.
  - `rollback&entity=&id=`: applies the newest revision as a new version, recording the current one first.
  - `revisions`: the last 10; older ones are pruned.
  - `reorder`.
  - `delete`: only rows never published. Published services are `retire`d instead; the slug stays reserved and the public request returns 404.
- **Profile:** `profile_get`, and `profile_save` (validate each key, record the old values as a `setting` revision, bump `site_rev`). `settings.php` uses the same validator for keys it shares.
- **Media:** `media_upload` (multipart), `media_list`, `media_update` (alt, caption, rights), `media_delete` (soft; refused while referenced).

**Upload handling**
1. Check `$_FILES` for errors, then size against `MEDIA_MAX_MB` (default 8, else 413).
2. `finfo` must report jpeg, png or webp, and `getimagesize` must agree (else 415). The pixel count must be ≤ 40 MP.
3. `ini_set('memory_limit','256M')`.
4. Correct the orientation using EXIF `Orientation` when `exif_read_data` exists.
5. Re-encode with GD (`imagecreatefrom*`, then `imagewebp` at q78 per planned width, a JPEG at 1600 with q82, and a 1200×630 centre-crop `-og.jpg`). Add `imageavif` only if the function exists. Re-encoding drops all EXIF and GPS data. The original is never stored publicly.
6. Names are `bin2hex(random_bytes(16))-w960.webp` and so on, written to `cfg('PUBLIC_UPLOAD_DIR', DOCROOT.'/uploads/site')` with mode 0644.
7. The admin uploader downscales to 2400px in a canvas first, which reduces server memory use.
8. New `public/uploads/.htaccess`:
   - `Options -Indexes`
   - `RemoveHandler .php .phtml`
   - `php_flag engine off`
   - `<FilesMatch "(?i)\.(webp|jpe?g|png|avif)$"> Allow </FilesMatch>`, with everything else denied.
9. `deploy.yml`'s FTP step must exclude `uploads/**` so a deploy never deletes them.
10. The staging router serves `/uploads/*` and `/sitemap.xml`.

**`php-api/site.php`** (public, GET only)
- **Headers:** `Cache-Control: public, max-age=60, stale-while-revalidate=300`, `ETag: "site-<site_rev>"`, and 304 handling. It never emits drafts.
- **Actions**
  - `bootstrap`: `{business:{name, phone, whatsapp, email, address?, area, hours_text, hours, appointment_note, response_time}` (empty keys omitted), `socials:[{platform,url}]` (verified only), `nav:{about, work, how, company, faqs, journal, shop}` (booleans from published state and flags), `booking_enabled` (Phase 3 `availability.public_requests_enabled`), `site_url`, `jsonld`, `rev}`.
  - `home`: page content, up to 6 services, up to 6 featured projects, up to 4 home FAQs, consented testimonials.
  - `services`, `service&slug`: the service with its related projects and FAQs.
  - `work&service=`, `work_item&slug`.
  - `faqs`, `page&key`, `policy&key`.
  - Missing or unpublished items return a JSON 404.
- `store.php` `config`, `blog` and `testimonials` stay for compatibility. `testimonials` gains the same consent filter.

**`store.php` claim removal**
- Delete `$FREE_SHIP_OVER` (shipping becomes the flat rates only, or a future owner setting).
- Remove the `$CATALOGUE` listing fallback. Checkout rejects slugs that are not in the published `products` table.
- `products.js` returns `[]` with an `unavailable` state instead.

## 4.6 SEO

**`src/app/(public)/site/seo/useSeo.js`** (no dependencies)
- Takes `{title, description, path, image, type, noindex, jsonld}`.
- Upserts `<title>`, `meta[name=description]`, `link[rel=canonical]` (`site_url + path`, no query), `og:title`, `og:description`, `og:url`, `og:type`, `og:image` (the media `-og.jpg`, omitted if none), `twitter:card=summary_large_image` and `meta[name=robots]`.
- Upserts `<script type="application/ld+json" id="hc-jsonld">`. Restores the defaults on unmount.
- Titles follow `"{Page} | Herit Clothing"`; Home is "Herit Clothing | Men's tailoring in Lagos". Descriptions come from `seo_description`, else the summary cut at a word boundary before 155 characters.

**Other SEO changes**
- `index.html` static defaults: that title, a description, `og:site_name`, `og:type`. No IBM Plex Mono; fonts are Inter 400/500/600 and Source Serif 4 opsz 500/600 with no italics.
- **JSON-LD**
  - A `LocalBusiness` with `@id` `{site}/#business`, emitted on Home and Contact from `bootstrap.jsonld`.
  - It contains `name`, `url`, `telephone`, `email`, `address` (streetAddress only when `business_address_public=1`; `addressLocality:"Lagos"`, `addressCountry:"NG"`), `areaServed`, `openingHoursSpecification` (only from structured `business_hours`), `sameAs` (verified socials) and `image` (hero).
  - Never `aggregateRating`.
  - Service pages emit `Service` with a `provider` `@id`.
- **`php-api/sitemap.php`:** `application/xml`. Includes static routes only when their page is published, plus published services, projects and posts with `lastmod`. `.htaccess` adds `RewriteRule ^sitemap\.xml$ sitemap.php [L]` before the SPA fallback.
- **`robots.txt` rewrite**
  - Allow `/`.
  - Disallow `/auth`, `/account`, `/track`, `/cart`, `/checkout`, `/*?preview=`.
  - Disallow every admin segment: `/today`, `/enquiries`, `/appointments`, `/clients`, `/jobs`, `/payments`, `/website`, `/settings`, `/reports`, `/print`, `/tailoring`, `/crm`, `/catalogue`, `/stock`, `/suppliers`, `/finance`, `/analytics`, `/marketing`, `/pos`, `/studio`, `/content`, `/channels`, `/team`, `/inbox`, `/whatsapp`, `/coupons`, `/loyalty`, `/engage`, `/reviews`, `/weather`, `/sales`, `/profile`, `/permissions`, `/apps`.
  - Remove the dead entries.
  - Keep the `Sitemap:` line.
- **noindex everywhere private:** `AdminLayout` sets `robots=noindex`. `.htaccess` adds `<FilesMatch "\.php$">Header set X-Robots-Tag "noindex"</FilesMatch>`, with `sitemap.php` excepted.
- **Link previews for crawlers that don't run JavaScript** (WhatsApp, Facebook). `php-api/spa.php` is behind `cfg('SPA_HEAD_INJECTION', false)`.
  - When on, the SPA fallback rewrites to `spa.php`.
  - It reads `index.html`, resolves `/`, `/services/:slug`, `/work/:slug`, `/journal/:slug`, `/about`, `/company-orders` against published data, and replaces `<!--hc:head-->` with escaped meta and a hero `<link rel=preload as=image imagesrcset>`.
  - On any error it outputs plain `index.html`.
  - Turn it on only after the W-test below shows a missing preview, per the "SPA first" rule.

## 4.7 Pages

General rules for every page:
- Every section maps to CMS fields and **hides when empty or unpublished**.
- Copy uses the owner's first person.
- Unknown facts are never rendered.

Routes: add the new ones to `routes/index.jsx` (lazy), keeping all existing URLs.

| Route | Sections (driving field), in fixed order | Empty behaviour |
|---|---|---|
| `/` Home | 1 Hero (`home.hero{eyebrow, headline, sub, media_id}`; actions are automatic; proof line from `business_area_text` · `business_hours_text`)<br>2 Services preview (published services)<br>3 Company band (`company.hook{headline, body}`)<br>4 Our work (featured projects)<br>5 How it works (5 steps from `how_it_works.steps`)<br>6 Owner note (`about.short_intro`, `about.portrait_media_id`)<br>7 Reviews (consented testimonials)<br>8 FAQs (`show_on_home`)<br>9 Final action | Hero without an image becomes text-only on surface-alt. Sections 2–8 are hidden individually. Hero and final action are always shown |
| `/services` | Intro (`services_intro`), service cards, company callout | No services: the intro plus a contact CTA |
| `/services/:slug` | Header (title, summary, hero image), Who it's for, What's included, Options, Pricing (`price_note`), the short process with a link, related work, service FAQs, CTA ("Ask about this service" → `/contact?service=`) | Each block hidden if empty; unpublished gives a 404 page with noindex |
| `/work`, `/work/:slug` | Filter chips (only if 2+ services have work), grid. Detail: gallery (first image eager), facts list (Garment, Fabric, Fit, Occasion only when `show_occasion`), Brief, Result, related service, "Start something similar" | Nav link hidden when there are no projects |
| `/how-it-works` | Steps; "What to bring"; Timing (`typical_lead_time_text`); Deposits (Phase 2 `deposit_policy_text`); CTAs | Timing and deposit hidden if empty |
| `/company-orders` | Hook, "What I make for teams" (`is_company` services plus `company.scope`), process (Brief › Capacity check › Sample › Measurements or sizes › Written quote and PO › Production in batches › Handover and invoice), wearer privacy, "What I need from you", minimum quantity and capacity (settings), Brief form | Minimum quantity and capacity hidden (BR-29). Privacy copy is owner-approved before publishing |
| `/about` | Headline, `story_html` (sanitised), portrait, workshop images, working method, signature (`owner_display_name`) | Unpublished: nav hidden and 404 |
| `/contact` | Channels (each hidden if empty), hours, `appointment_location_note`, enquiry form (`?type=fitting\|company\|general`, `?service=`) | The form always works |
| `/book` | Phase 3 `BookPage`, restyled | Linked only when `booking_enabled` |
| `/track`, `/account` | Phase 3 `AccessForm` and portal, restyled with tokens and `StatusChip` |, |
| `/faqs` | `<details>` grouped by category | Hidden from the footer when there are none |
| `/privacy`, `/terms` | Title, effective date, version, body | Unpublished: 404 and footer links hidden |
| `/journal*` | Existing pages; fallbacks removed; cover from `cover_media_id`; a real 404 | Nav link only when `journal_enabled` and at least one post exists |
| Shop routes | Unchanged; hidden while `shop_enabled=0`. `STATIC_PRODUCTS` removed | Honest "unavailable" state |

**Primary action rule.** Implemented once in `ui/useActions.js`.
- `booking_enabled` → "Book a measurement appointment" linking to `/book`.
- Otherwise → "Request a measurement appointment" linking to `/contact?type=fitting`.
- The secondary action is always "Discuss a company order" → `/company-orders#brief`.

**Copy drafts** (Proposed; seeded as drafts, never auto-published)
- **Hero**
  - Eyebrow: "Men's tailoring · Lagos".
  - Headline: "Men's clothing, made with care in Lagos."
  - Sub: "Tell me what you want to make. I will discuss the fabric, fit and finish, arrange your measurements and agree the work before sewing begins."
- **How it works**
  1. Discuss: "Tell me the garment, the occasion and the date you need it. Bring the fabric if you already have it."
  2. Measure: "I take your measurements at an agreed appointment and record them for this piece."
  3. Agree: "You receive a written quote with the price, any deposit and the promised date. Work starts when you accept it."
  4. Sew and fit: "I cut and sew, and arrange a fitting where the garment needs one."
  5. Collect or deliver: "Collect when it is ready, or we agree a delivery arrangement."
- **Company**
  - Headline: "A clear process for coordinated men's clothing."
  - Body: "Share the garment type, number of pieces and required date. I will confirm whether the work fits my capacity, discuss a sample and measurement approach, and provide a written quote."
  - CTA: "Send your company brief".
- **Final action:** "Tell me what you want to make."
- **Enquiry acknowledgement (BR-01):** "Thank you, I have your message (reference {ref}). I will reply {response_time_text \| 'as soon as I can'}. Nothing is booked or priced until we agree it."

**Company brief form** (`site/CompanyBriefForm.jsx`)
- Fields:
  - Company name (required) and contact name (required).
  - Role, phone or email (one of the two required), garment type (published services plus "Other").
  - Approximate quantity (1–9999), required date (tomorrow or later).
  - Material responsibility (radio: we will supply fabric / please source fabric / not sure yet).
  - Brief (2000 characters or fewer).
  - Privacy notice link.
  - Honeypot `hp_url`.
- Posts to the Phase 2 public enquiry endpoint with `type` set to company or wholesale.

**Preview.** Public pages read through `usePublicData(siteFetcher, previewFetcher)`. `?preview=1` combined with a staff session calls `cms.php?action=preview`, shows a fixed "Preview, not published" bar and sets noindex.

## 4.8 Admin "Website" area

Paths are under Phase 2's `/website` section (MANAGE plus editor) and are added to `SECTIONS`.

| Path | Page |
|---|---|
| `/website` | Hub with a profile completeness checklist (each missing fact names the section it hides) and recent publishes |
| `/website/profile` | Business profile, hours editor, socials with a "Verified" tick per link |
| `/website/pages`, `/website/pages/:key` | Fixed section forms with Save draft, Preview (an iframe toggled between 390 and 1280px, plus "Open in tab"), Publish, Unpublish, and a Revisions drawer with Roll back |
| `/website/services`, `/website/services/:id` |, |
| `/website/work`, `/website/work/:id` | Image picker with role and alt, a Consent panel, private source-job link |
| `/website/faqs`, `/website/policies/:key` |, |
| `/website/media` | Upload, alt, rights |
| `/website/reviews` | Testimonials with consent fields |
| `/website/journal` | Redirects to the existing `/content` |

Files go in `src/app/(admin)/website/**` with shared `components/{PublishBar, RevisionsDrawer, MediaPicker, PreviewFrame, ConsentPanel}.jsx`. `heritApi.cms.*` and `heritApi.site.*` are added.

## 4.9 Performance

1. Move the `app.scss` and `heritos-admin.css` imports out of `App.jsx` and into `AdminLayout.jsx` and a new `AuthLayout.jsx`. Make `AdminLayout` lazy in `router.jsx`.
2. Add a `PublicLayout` that imports `tokens.scss` and `site.css` only. Lazy-load `AppProvidersWrapper` pieces (toastify) for admin only, or verify their weight is negligible.
3. Use the public `Icon.jsx` instead of Iconify. Remove Swiper from `sections.jsx`.
4. Set `vite.config.js` `build.manifest:true`. Add `scripts/check-public-bundle.mjs`, which walks the manifest from the public route chunks. It fails if `bootstrap`, `apexcharts`, `@fullcalendar`, `gridjs`, `swiper`, `@iconify` or `app*.css` are reachable, or if public JS exceeds a budget (about 180 KB gzip, to be confirmed against the first build).
5. Images as in §4.2. The hero image gets `sizes="(min-width:1024px) 58vw, 100vw"`.
6. `sw.js`: bump `CACHE` to `heritos-v2`. `/uploads/` is cache-first, which is safe because names are immutable.
7. Targets (lab only until field data exists): LCP ≤ 2.5s and CLS ≤ 0.1 on 390px at Fast 3G.

## 4.10 Accessibility checklist

**Global (every public page)**
- One `h1` and ordered headings.
- Landmarks: header, nav with `aria-label`, main, footer.
- A skip link to main.
- 2px ink `:focus-visible` that is never hidden by the sticky header (`scroll-padding-top:80px`).
- Targets 44px or larger; primary controls 48px.
- No amber text on light surfaces.
- 200% zoom and 320px reflow without horizontal scroll.
- Reduced motion is static.
- `lang="en-NG"`.

**Per page**

| Page | Checks |
|---|---|
| Home | Hero words remain one readable string (no `aria-hidden` duplicates); images have meaningful alt; the CTA order matches the visual order |
| Services, Work | Cards are a single link with an accessible name; filter chips are buttons with `aria-pressed`; the gallery uses `figure` and `figcaption` |
| Forms (Contact, Company, Book, Track) | Persistent labels; required stated in text; error summary is focused; `aria-live` for saving and saved; typed data survives errors; date input has a text hint (Lagos time) |
| FAQs | Native `details` and `summary` |
| Mobile nav | Focus trap, Escape, focus returns to the toggle |
| Policies | Readable 65-character measure; effective date in `<time>` |
| Track and portal | Status chip shows text plus icon, not colour alone |

## 4.11 Phase 4 tests

**Pure tests** (`php-api/tests/cms_cases.php`, required from `run.php`). Cover every `_cms.php` helper, including:
- `social_url_ok` rejects `javascript:`, `http:`, `instagram.com.evil.io` and `data:`.
- Exact key sets of the public projections (no `source_job_id`, consent or draft fields).
- `jsonld` omits empty fields and never contains `aggregateRating`.
- `sitemap_xml` output loads with `simplexml_load_string` and escapes `&`.
- `cms_has_placeholder` and `cms_private_leak_check` (for "0803 123 4567", `HC-0042`, `a@b.ng`).
- The `cms_page_validate` home schema.
- `image_variant_plan`.

**Staging checks** (`scripts/staging/e2e-phase4.sh`)

| # | Scenario | Expected |
|---|---|---|
| W1 | Change the profile phone | The new value appears in `bootstrap` and the footer |
| W2 | Save a draft | Leaves `site.php` unchanged |
| W3 | Call preview without a token | 401 |
| W4 | Publish, then roll back | Content returns to the previous version and the revision count grows |
| W5 | Unpublish a service | `site.php` returns 404 and the service is gone from `sitemap.xml` |
| W6 | Save a story containing `<script>`, `onerror` and a `javascript:` href | Stripped |
| W7 | Upload a `.php` renamed to `.jpg` | 415 |
| W8 | Upload 12 MB | 413 |
| W9 | Upload a JPEG with GPS EXIF | Served variants have no EXIF |
| W10 | GET `/uploads/site/x.php` | Not executed |
| W11 | Testimonial or project without consent | Absent, or publish returns 422 |
| W12 | grep the public JSON for `source_job_id\|customer_id\|consent_evidence\|draft` | Nothing |
| W13 | Fill the brief form honeypot | 200 and no row |
| W14 | `curl /sitemap.xml` | Valid XML with `application/xml` |
| W15 | `curl -A WhatsApp` on `/services/x` | Records whether the OG tags are present; this decides `SPA_HEAD_INJECTION` |

**Playwright checks** (planned script, to be added to the qa folder when written)
- Run with `npx --yes @playwright/test@<pinned>` against `vite preview` plus the staging API. It is not added to `package.json`; that needs owner approval. The fallback is the same script driven through the Playwright MCP, with screenshots saved to a local scratch folder (not committed).
- Widths 320, 390, 768, 1024 and 1440, for every public route, checking:
  - `scrollWidth <= innerWidth`.
  - Every link and button in header, footer and forms is at least 44×44.
  - The hero primary CTA is in the viewport at 390×844.
  - No computed text colour of `rgb(245,158,11)`.
  - Tabbing shows an outline of at least 2px.
  - `emulateMedia({reducedMotion:'reduce'})` gives `document.getAnimations().length===0`.
  - Every `img` has alt, width and height.
  - No requests to `api.iconify.design`.
  - The forbidden-claims regex finds nothing: `/HERIT10|1200\+|18 countries|98%|Amara|Tunde|Zainab|Chidi|Free Lagos delivery|worldwide|Ajuwon/`.
  - No "undefined", `[owner` or `{{` in any page.
- Run once against an **empty CMS database**: Home shows only the hero text and the final action, the nav hides About and Work, and the sitemap lists only `/`, `/services`, `/contact` and `/company-orders` if those are published.

## 4.12 Phase 4 commits

Branch `feat/phase4-website`, stacked on Phase 3. `php -l`, the tests and `npm run build` must pass at each commit.

1. `feat(design): shared token layer` (tokens, the `_variables` mapping, the `heritos-admin` rewrite, the `text-primary` override, manifest, `index.html` splash, `check-tokens`).
2. `perf(app): keep admin CSS and Iconify off public routes` (layouts, lazy `AdminLayout`, `Icon.jsx`, fonts, `check-public-bundle`).
3. `fix(site): remove invented claims and fallbacks` (HomePage, `content.js`, `products.js`, footer, `sections.jsx`, `store.php` free shipping and catalogue fallback). Fixes A07, A12 and A22.
4. `feat(db): schema_phase26 + _cms.php + tests`.
5. `feat(api): media upload` (`cms.php` media, `uploads/.htaccess`, staging router, deploy exclude).
6. `feat(api): CMS draft/publish/rollback, profile, site.php`.
7. `feat(site): UI kit, header, mobile nav, footer, useSeo, HcImage`.
8. `feat(site): home and hero motion`.
9. `feat(site): services, work, how it works, company orders + schema_phase27`.
10. `feat(site): about, contact, faqs, policies, journal, book/track restyle`.
11. `feat(admin): Website area`.
12. `feat(seo): sitemap.php, robots, .htaccess, JSON-LD, spa.php (flag off)`.
13. `test/docs`:
    - `e2e-phase4.sh`, Playwright, screenshots.
    - Docs: DESIGN-SYSTEM (exact tokens; deviations for the 1024px collapse and the measure line), ARCHITECTURE routes and CMS, API-SPEC (`cms`, `site`, `sitemap`, `spa`).
    - ROADMAP A07, A12, A23, A24.
    - Release manifest: `_cms.php`, `cms.php`, `site.php`, `sitemap.php`, `spa.php`, `uploads/.htaccess`, `.htaccess`, `robots.txt`.

---

# PHASE 5: company orders

## 5.1 Model decision

**Do not reuse `tailoring_groups` as the company parent.** Its members are separate jobs with separate prices and deposits. Phase 2 hangs quotes, the ledger, handovers and the portal on one `job_id`, but a company needs one quote, one PO and one invoice. The group's automatic `discount_pct` also breaks BR-29.

Instead:
- Keep groups as "Coordinated, separate payers" (aso-ebi). Default `discount_pct` to 0 and show "No automatic discount".
- A company order is **one `tailoring_orders` row** with `job_kind='company'`, plus `job_items` only where garments or wearers differ (BR-28).

## 5.2 Schema (`schema_phase28.sql`)

```sql
CREATE TABLE IF NOT EXISTS companies (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, company_ref VARCHAR(16) NULL UNIQUE,
  name VARCHAR(160) NOT NULL, invoice_name VARCHAR(160) NULL, invoice_address TEXT NULL, invoice_email VARCHAR(190) NULL,
  tax_id VARCHAR(40) NULL, notes_internal TEXT NULL, created_by INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, deleted_at DATETIME NULL);
CREATE TABLE IF NOT EXISTS company_contacts (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, company_id INT UNSIGNED NOT NULL,
  customer_id INT UNSIGNED NOT NULL, role_title VARCHAR(80) NULL, can_view_jobs TINYINT(1) NOT NULL DEFAULT 1,
  can_approve_samples TINYINT(1) NOT NULL DEFAULT 0, is_invoice_recipient TINYINT(1) NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY (company_id, customer_id));
ALTER TABLE tailoring_orders ADD COLUMN IF NOT EXISTS job_kind ENUM('individual','company') NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS company_id INT UNSIGNED NULL, ADD COLUMN IF NOT EXISTS po_number VARCHAR(60) NULL,
  ADD COLUMN IF NOT EXISTS invoice_contact_id INT UNSIGNED NULL,
  ADD COLUMN IF NOT EXISTS measurement_method ENUM('individual','sizes','mixed') NULL,
  ADD COLUMN IF NOT EXISTS sample_status ENUM('not_required','pending','submitted','approved','changes_requested') NOT NULL DEFAULT 'not_required',
  ADD KEY IF NOT EXISTS idx_company (company_id);
CREATE TABLE IF NOT EXISTS job_items (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, job_id INT UNSIGNED NOT NULL, sort SMALLINT NOT NULL DEFAULT 0,
  description VARCHAR(160) NOT NULL, garment_type VARCHAR(40) NULL, service_key VARCHAR(40) NULL, qty SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  size_label VARCHAR(20) NULL, wearer_customer_id INT UNSIGNED NULL, wearer_label VARCHAR(80) NULL, measurement_set_id INT UNSIGNED NULL,
  wearer_consent_at DATETIME NULL, item_stage ENUM('pending','in_production','ready','handed_over','cancelled') NOT NULL DEFAULT 'pending',
  qty_ready SMALLINT UNSIGNED NOT NULL DEFAULT 0, qty_handed_over SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  request_key VARCHAR(64) NULL UNIQUE, lock_version INT UNSIGNED NOT NULL DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY (job_id), KEY (wearer_customer_id));
CREATE TABLE IF NOT EXISTS job_samples (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, job_id INT UNSIGNED NOT NULL, item_id INT UNSIGNED NULL,
  version SMALLINT UNSIGNED NOT NULL, description VARCHAR(255) NOT NULL,
  status ENUM('submitted','approved','changes_requested','withdrawn') NOT NULL DEFAULT 'submitted',
  decided_channel ENUM('portal','in_person','whatsapp','email','phone') NULL, decided_contact_id INT UNSIGNED NULL,
  decided_by_user INT UNSIGNED NULL, decision_note VARCHAR(500) NULL, decided_at DATETIME NULL,
  request_key VARCHAR(64) NOT NULL UNIQUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY (job_id, version));
CREATE TABLE IF NOT EXISTS job_handover_items (handover_id INT UNSIGNED NOT NULL, item_id INT UNSIGNED NOT NULL,
  qty SMALLINT UNSIGNED NOT NULL, PRIMARY KEY (handover_id, item_id));
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS bill_to_company_id INT UNSIGNED NULL,
  ADD COLUMN IF NOT EXISTS po_number VARCHAR(60) NULL, ADD COLUMN IF NOT EXISTS bill_to_snapshot JSON NULL;
```

**How existing Phase 2 fields are reused for company jobs**
- `tailoring_orders.quantity` is kept equal to `SUM(job_items.qty)` (excluding cancelled items) by the server.
- `customer_id` on the job is the primary contact's customer row.
- Wearers are ordinary `customers` rows. Their measurement sets are Phase 2 `measurement_sets`, and a job item points to the snapshot.
- A company contact is never given access to these.
- `bill_to_snapshot` is frozen when the quote is sent: `{name, invoice_name, address, email, tax_id, po_number, recipient}`.

## 5.3 Pure helpers (`php-api/_company.php`, tested)

- `company_items_qty(items)`
- `job_items_rollup(items)`: suggests the job stage. All items handed over gives `handed_over`. All items at least `qty_ready=qty` gives `ready`. Any in production gives `in_production`.
- `handover_items_ok(items, request)`: each requested qty is above 0, the item belongs to the job, and qty ≤ `qty_ready - qty_handed_over`. Returns `[ok, errors]`.
- `sample_transition_ok(from, to)`
- `contact_can(contact, perm)`
- `company_job_public_view(job, items, samples, quote, ledger, handovers)`: a whitelist at job level.
  - Contains: ref, description, item lines aggregated by description with `qty`, `qty_ready` and `qty_handed_over`, size counts only when `measurement_method='sizes'`, the latest sample version, description and status, quote, payment summary, handover quantities and public messages.
  - Never contains: wearer ids, labels or names, measurements, `notes_internal`, costs, or other companies.
- `wearer_item_public_view(item, job)`: own garment description, own item stage, own appointments and own measurements (subject to the Phase 3 visibility setting). Never price, ledger, company contacts or other wearers.

## 5.4 Endpoints

**`companies.php`** (`ROLES_OWNER`)
- `list&q=`, `get&id=` (with contacts and jobs), `save`, `match&name=` (duplicate warning, no merge).
- `contact_save {company_id, customer_id|new person, permissions}`: duplicate-checked through Phase 2's `customer_candidates`.
- `contact_deactivate`: takes effect on the next portal request.

**`company_jobs.php`**
- Roles: `ROLES_OWNER`. Tailors get `items` without money, contacts or company fields.
- Every mutation uses `request_key`, `job_lock` and `job_event`.
- **Actions**
  - `create {company_id, contact_id, po_number, measurement_method, sample_required, items[], request_key}`. Also reachable through Phase 2 enquiry conversion with `as_company=1`.
  - `items&job_id=`.
  - `item_save`: description, qty, size and wearer are editable only while the item is `pending`. After `in_production`, BR-30 requires an owner-stated price or date effect.
  - `item_cancel`.
  - `item_progress {item_id, qty_ready}`.
  - `item_attach_measurement {item_id, measurement_set_id}`: an approved set belonging to `wearer_customer_id` only.
  - `wearer_invite {item_id}`: Phase 3 `invite` for the wearer's own customer row. Records `wearer_consent_at` when the wearer submits or accepts.
  - `sample_submit {description}`, which sets job `sample_status='submitted'`.
  - `sample_record_decision {sample_id, decision, channel, note}` for an owner recording a decision.
  - `handover {items:[{item_id, qty}], method, …, request_key}`: wraps Phase 2 `handover_complete`. It inserts `job_handover_items`, updates `qty_handed_over` and the rollup, and records the balance outstanding.
- Phase 2 `document`: when `job_kind='company'`, the bill-to comes from `bill_to_snapshot` (or the live company) and the PO number is shown. The invoice recipient is the contact with `is_invoice_recipient`, or `invoice_contact_id`.

**`portal.php` additions**
- `jobs`: adds company jobs where an `active` contact with `can_view_jobs` exists for `me`, and items where `wearer_customer_id = me` (listed as "Your garment").
- `job&ref=`: `company_job_public_view` for contacts and `wearer_item_public_view` for wearers. Any other caller gets the same 404 as a missing job.
- `sample_decide {ref, sample_id, decision: approve|changes, note, request_key}`: requires `can_approve_samples` and the latest `submitted` version. A forbidden caller gets 404.
- Company contacts can never propose measurements, see wearers, or mark items or payments.

## 5.5 UI

**Admin**
- `src/app/(admin)/clients/companies/page.jsx` (list) and `[id]/page.jsx` (profile, invoice details, contacts with permission toggles, jobs), routed as `/clients/companies` and `/clients/companies/:id`.
- On a company job, the job detail adds tabs:
  - **Items:** rows with the internal wearer, a measurement chip (missing, pending or attached), ready and handed quantities. Inline actions on desktop; cards below 768px.
  - **Sample:** versions with "Record decision".
  - **Company:** PO number, invoice recipient, bill-to preview.
  - **Handover:** the Phase 2 panel extended with per-item quantity steppers; it shows "2 of 5 handed over".
- New components: `NewCompanyJobModal.jsx` and the `CompanyBadge` shown in the Jobs list.

**Portal**
- `site/portal/CompanyJobDetail.jsx`: progress per line as qty bars with text, the sample card, quote, payments and handovers.
- `SampleDecision.jsx`: an explicit confirm step.
- `WearerItemDetail.jsx`.

## 5.6 Phase 5 tests

**Pure tests:** all helpers. `company_job_public_view` asserts the exact key set and recursively fails if any key matches `wearer|measure|customer_id|notes|cost`. Handover over-quantity, zero and foreign-item cases. Rollup cases. Sample transitions.

**Staging checks** (`scripts/staging/e2e-phase5.sh`)

| # | Scenario | Expected |
|---|---|---|
| C1 | Create a company with two contacts (A can approve, B cannot), five items and five wearers | Created |
| C2 | Contact A requests the job JSON | No wearer or measurement keys (grep) |
| C3 | Wearer W1 requests their view | Sees only their own item; no price |
| C4 | Contact B calls `sample_decide` | 404 |
| C5 | Contact A approves the sample | `approved`; event logged with channel `portal` |
| C6 | Hand over 2 of 5 | Job stays `ready`; portal shows 2/5 |
| C7 | Hand over 4 when only 3 remain | 422 |
| C8 | Same handover `request_key` sent twice | One row |
| C9 | Company X contact requests a Company Y ref | 404, identical to a missing ref |
| C10 | Deactivate a contact | Next portal call returns no jobs |
| C11 | Generate the invoice | Shows the bill-to snapshot, the PO and the recipient |
| C12 | New company job | No automatic discount |
| C13 | Edit an item after production starts without a stated effect | Refused |

**Playwright:** the company detail, the Items tab and the portal company view at the five widths, with the same overflow, touch-target and focus checks.

## 5.7 Phase 5 commits

Branch `feat/phase5-company-orders`.

14. `feat(db): schema_phase28 + _company.php + tests`.
15. `feat(api): companies.php`.
16. `feat(api): company jobs, items, samples, item handover, company documents`.
17. `feat(api): portal company and wearer projections + sample_decide`.
18. `feat(admin): Companies pages and company job tabs; groups labelled, discount off`.
19. `feat(portal): company and wearer views`.
20. `test/docs`: `e2e-phase5.sh`; updates to DATA-MODEL, PERMISSIONS, BUSINESS-RULES (BR-27, BR-28, BR-29 enforcement) and the manifest (`companies.php`, `company_jobs.php`, `_company.php`).

---

## Risks

- **Concurrent edits.** Phase 2–3 are being built now and touch `_lib.php`, `settings.php`, `contact.php`, `routes/index.jsx`, `roles.js`, `SiteContactForm.jsx`, `AccountPage.jsx` and `TrackPage.jsx`. Rebase after Phase 3 merges. New pure helpers go in `_cms.php` and `_company.php`, not `_domain.php`, to avoid conflicts.
- **Admin visual regression.** Changing Bootstrap `$primary` from ink to amber affects 68 primary buttons and 37 `text-primary` uses. Screenshot the admin before and after, and keep the contrast override.
- **Image processing on shared hosting.** GD memory there is Unknown, as is `imageavif`. Mitigated by the client-side downscale and the 40 MP cap.
- **Deploy.**
  - The FTP deploy could delete `uploads/`, so configure the exclude.
  - Many new files are uploaded by hand (A02), as are `.htaccess` changes.
- **SPA link previews.** WhatsApp previews will likely need `spa.php`, which hooks into every navigation. It is behind a flag with a raw-HTML fallback.
- **LCP versus hero motion.** The word mask can delay the text LCP on phones by up to about 0.7s. Measure it, and fall back to opacity-only if the budget is missed.
- **Cache staleness.** Public JSON can be up to 60s stale after an unpublish. This is documented and the ETag-based revalidation limits it.
- **Fonts.** Google Fonts privacy under Nigerian rules is unresearched (D-017).
- **Tests.** No frontend unit tests exist. Playwright is an ad hoc `npx` tool until the owner approves it.
- **Schema numbering.** See §0.
- **Consent records.** These are owner attestations, not legal proof.

## Owner decisions, as editable settings with defaults

| Setting | Default | Notes |
|---|---|---|
| Business contact and location: `business_phone`, `business_whatsapp`, `business_email`, `business_address` | All `""` (hidden) | `business_address_public=0` |
| Hours and coverage: `business_hours`, `business_hours_text`, `business_area_text`, `appointment_location_note`, `response_time_text` | All `""` |, |
| Lead times and company limits: `typical_lead_time_text`, `company_min_qty_text`, `company_capacity_text` | All `""` | BR-29: no minimum quantity shown |
| `owner_display_name` and the About story | Unpublished |, |
| `socials` | `{}` | Each link needs the "verified" tick |
| `nav_company_link` | 1 | 6th nav item, collapse below 1024px (a recorded deviation) |
| `journal_enabled` | 0 | `shop_enabled` stays 0 |
| `hero_animation_enabled` | 1 |, |
| `SPA_HEAD_INJECTION` | false | Decided by test W15 |
| `MEDIA_MAX_MB` | 8 |, |
| `SITE_URL` | `https://heritclothing.com` |, |
| Phase 5: `company_portal_enabled` | 0 | On for the pilot company only |
| Phase 5: `company_contact_default_approver` | 0 |, |
| Phase 5: `wearer_self_measure_enabled` | 0 |, |
| Phase 5: `company_sample_required_default` | 0 | Owner sets per job |

**Approvals needed**
- Wording of the hero, how it works, company page and wearer privacy text, and the privacy and terms bodies.
- Whether IBM Plex Mono and the Source Serif headings stay.
- Adding Playwright as a dev tool.
- Real photographs and their consent records.

### Critical files for implementation
- /Users/mrgee/WebstormProjects/heritage_com/src/app/(public)/site/SiteLayout.jsx (with HomePage.jsx, content.js, products.js, site.css, sections.jsx)
- /Users/mrgee/WebstormProjects/heritage_com/src/assets/scss/config/_variables.scss (with heritos-admin.css, src/App.jsx, src/routes/router.jsx, src/routes/index.jsx)
- /Users/mrgee/WebstormProjects/heritage_com/php-api/store.php (with new php-api/cms.php, site.php, sitemap.php, _cms.php; content.php, settings.php, contact.php)
- /Users/mrgee/WebstormProjects/heritage_com/php-api/tailoring.php (groups at lines 333–437; Phase 5 company jobs, handover and document hooks)
- /Users/mrgee/WebstormProjects/heritage_com/php-api/.htaccess and /Users/mrgee/WebstormProjects/heritage_com/public/robots.txt (sitemap rewrite, uploads protection, noindex)