# Design System

This is the single design contract for the HeritOS app and the public website. It owns principles, tokens and measured contrast, typography, spacing, surfaces, control styling, motion, the Tesla reference and every deviation from it. Screen behaviour, forms and navigation are in [UX-SPEC.md](UX-SPEC.md); keyboard, focus, touch-target, reduced-motion and test-width rules are in [ACCESSIBILITY.md](ACCESSIBILITY.md); copy and photography rules are in [CONTENT.md](CONTENT.md).

The direction since 13 October 2026 is **dark luxury** (D-023, which supersedes the white Tesla-style surfaces of D-002 and the Source Serif 4 choice of D-017): near-black ink and warm ivory, led by real photography, with Herit amber `#F59E0B` still the only accent. The owner approved it from two prototypes (a landing page and the admin) before the build. Built on `feat/redesign-dark-luxury`. Sections below that still describe the white palette are history unless they agree with [Dark luxury palette](#dark-luxury-palette-d-023).

Contrast figures are calculated from token values with the WCAG formula on 10 October 2026. They are not measurements of rendered pages. Visual quality and cross-device behaviour are NOT TESTED until screenshots and device checks exist ([qa/FUNCTIONAL-AUDIT.md](../qa/FUNCTIONAL-AUDIT.md#usability)).

## Principles

- **One brand, two dialects.** The public site is photography-led and spacious. The app is quiet precision: calm, fast, legible, with decoration treated as the enemy. Same tokens, different volume.
- **One accent per screen.** Amber marks the primary action or the active state, not both shouting at once. Fabric and garment photography carries the rest of the colour.
- **Real work only.** No generic fabric gradients, no AI garments presented as delivered work, no stock logos, no team carousel for a one-person business.
- **Function over flourish.** Forms and sensitive records get explicit Herit adaptations wherever the marketing-oriented Tesla reference falls short.

## Colour and contrast

### Dark luxury palette (D-023)

Verified in `src/assets/tokens/_tokens-map.scss`, 13 October 2026. Four colour maps share the same keys, so components never branch:

| Map | Applies to | Surface / alt / raised | Text / body / muted | Divider / control | Accent text |
|---|---|---|---|---|---|
| `$hc-site` | Public site (`.hc`, `html[data-hc-public]`) | `#0E0D0B` / `#171512` / `#1F1C18` | `#F3EEE4` / `#D9D2C5` / `#A79F92` | `#2E2A24` / `#6F685D` | `#F59E0B` |
| `$hc-paper` | Ivory bands inside the site (`.hc-paper`, `<Section tone="paper">`) | `#F6F1E8` / `#ECE5D8` / `#FFFFFF` | `#1A1713` / `#3A342C` / `#5E574C` | `#D8CFBF` / `#8A8275` | `#9A4A07` |
| `$hc-light` | Admin light (default), printed documents | `#FFFFFF` cards / `#F6F1E8` page / `#FBF8F2` | `#1A1713` / `#3A342C` / `#5E574C` | `#E4DCCD` / `#8A8275` | `#9A4A07` |
| `$hc-dark` | Admin dark | `#171512` cards / `#0E0D0B` page / `#1F1C18` | `#F3EEE4` / `#D9D2C5` / `#A79F92` | `#2E2A24` / `#6F685D` | `#F59E0B` |

`$hc-media` holds the values used over photographs in every theme: `--hc-on-image` `#F3EEE4`, `--hc-on-image-muted`, `--hc-on-image-line`, and the scrims `--hc-scrim-strong` (90% ink), `-mid` (55%), `-glass` (35%) and `-clear`. A new `--hc-accent-tint` key gives amber-tinted fills (active sidebar item, summary-tile icons). The amber fill keeps ink text in every map.

Calculated contrast (WCAG formula, 13 October 2026; not measured on rendered pages):

| Pair | Ratio |
|---|---|
| Ivory `#F3EEE4` on ink `#0E0D0B` | 16.80:1 |
| Body `#D9D2C5` on ink | 12.93:1 |
| Muted `#A79F92` on ink / on `#171512` / on `#1F1C18` | 7.42 / 6.96 / 6.48:1 |
| Amber `#F59E0B` as text on ink / on `#171512` | 9.04 / 8.48:1 |
| Ink on amber (buttons) | 9.04:1 (site), 8.32:1 with `#1A1713` |
| Ink `#1A1713` / body `#3A342C` / muted `#5E574C` on ivory `#F6F1E8` | 15.87 / 10.93 / 6.34:1 |
| Accent text `#9A4A07` on ivory / on white / on `#FDF0D5` | 5.56 / 6.26 / 5.54:1 |
| Control border `#6F685D` on ink; `#8A8275` on ivory / white | 3.53; 3.38 / 3.80:1 (non-text, 3:1 needed) |
| Dark status on tints: success / danger / warning | 9.12 / 8.91 / 9.47:1 |
| Light status on tints: success `#15803D` / danger `#991B1B` | 4.79 / 7.60:1 |

### Target palette (approved 10 October 2026, superseded by D-023)

| Role | Value | Use |
|---|---|---|
| Surface | `#FFFFFF` | Page and panels |
| Surface alternate | `#F4F4F4` | Section changes, quiet panels |
| Text primary | `#171A20` | Headings, navigation, text on amber |
| Text body | `#393C41` | Paragraphs |
| Text muted | `#5C5E62` | Secondary text, help text, placeholders |
| Divider | `#D0D1D2` | Thin decorative dividers only |
| Control border | `#8E8E8E` | Input and checkbox boundaries (Proposed, chosen for 3:1 non-text contrast) |
| Accent | `#F59E0B` | Primary button fill, active indicator. Always with `#171A20` text. |
| Accent hover | `#D97706` | Primary button hover, with `#171A20` text (Proposed, existing token) |
| Accent text | `#B45309` | Amber links and amber text on light surfaces |

Measured contrast:

| Pair | Ratio | Verdict |
|---|---|---|
| `#171A20` on `#F59E0B` | 8.11:1 | Pass, primary button |
| `#171A20` on `#D97706` | 5.47:1 | Pass, button hover |
| `#B45309` on `#FFFFFF` | 5.02:1 | Pass |
| `#B45309` on `#F4F4F4` | 4.57:1 | Pass, narrowly; avoid for small text |
| `#171A20` on `#FFFFFF` | 17.43:1 | Pass |
| `#171A20` on `#F4F4F4` | 15.84:1 | Pass |
| `#393C41` on `#FFFFFF` | 11.07:1 | Pass |
| `#5C5E62` on `#FFFFFF` | 6.5:1 | Pass |
| `#5C5E62` on `#F4F4F4` | 5.91:1 | Pass |
| `#8E8E8E` on `#FFFFFF` | 3.28:1 | Non-text only (control borders). Fails as text. |
| `#D0D1D2` on `#FFFFFF` | 1.53:1 | Decorative dividers only |
| `#F59E0B` on `#FFFFFF` | 2.15:1 | Fails. Amber is never text or a focus ring on white. |

### Status colours (Proposed)

The Tesla reference has no semantic colours; working forms need them. Status always pairs text and an icon with colour, never colour alone.

| State | Value | Contrast on white |
|---|---|---|
| Success, confirmed, ready | `#15803D` | 5.02:1 |
| Warning, due | `#B45309` | 5.02:1 |
| Error, overdue, danger | `#991B1B` (already in site.css) | 8.31:1 |
| Pending, neutral | `#5C5E62` | 6.5:1 |

### Tokens as built (Phase 4, `feat/phase4-website`)

One token layer replaces the four separate sets (A23). Verified in code, 11 October 2026:

- `src/assets/tokens/_tokens-map.scss` holds every colour value once, as Sass maps (`$hc-light`, `$hc-dark`) plus `$hc-scale` for type, spacing, layout, radius, controls and motion. It is the only file that should contain hex values.
- `src/assets/tokens/tokens.scss` emits them as `--hc-*` custom properties on `:root` (admin light plus `$hc-media`), remaps the colours under `html[data-bs-theme="dark"]`, applies `$hc-site` to `.hc` and `html[data-hc-public]` with `color-scheme: dark`, `$hc-paper` to `.hc-paper` and `$hc-light` to `.hd-print`, so the public site is dark whatever the admin theme is and printed documents stay light (D-023).
- Admin: Larkon's `scss/config/_variables.scss`, `_variables-dark.scss` and `_theme-mode.scss` read the same maps (`$primary` amber with `$color-contrast-dark` ink and `$min-contrast-ratio: 4.5`, so `.btn-primary` is amber with ink text; ink `$secondary`/`$dark`; graphite body; Tesla neutrals for the greys; ink focus ring; `#B45309` underlined links; 4px control and 12px card radius; system monospace). `heritos-admin.css` is rewritten on `var(--hc-*)`: flat cards, no warm shadows or glass, Inter 600 sentence-case table headers and page headings, a 3px amber rail on the active sidebar item only, and `.text-primary`/`.link-primary` set to `--hc-accent-text` (amber as text fails contrast). `--herit-*` remain as aliases for one release.
- Phase 2 and 3: `--hd-*` in `src/components/herit/herit-daily.css` are aliases of `--hc-*`; `portal.css` uses `--hc-*` directly.

| Group | Tokens |
|---|---|
| Colour | Per map, see [Dark luxury palette](#dark-luxury-palette-d-023): `--hc-surface`, `-surface-alt`, `-surface-raised`, `-text`, `-text-body`, `-text-muted`, `-divider`, `-control-border`, `-accent` `#F59E0B`, `-accent-hover`, `-on-accent`, `-accent-text`, `-accent-tint`, `-focus`; over photographs `--hc-on-image*` and `--hc-scrim-*` |
| Status (text / tint) | `--hc-success`, `--hc-warning`, `--hc-danger`, `--hc-pending`, each with a `-tint`; values per map |
| Font | `--hc-font-sans` (Inter, then system UI), `--hc-font-serif` (Fraunces, Georgia), `--hc-font-mono` (system monospace) |
| Type scale | `--hc-text-xs` 13px, `-sm` 14px, `-base` 16px, `-md` 18px, `-lg` 20px, `-xl` 24px, `-2xl` 28px, `-3xl` 32px, `-4xl` 40px, `-5xl` 56px, `--hc-text-hero` `clamp(2.75rem, 1.4rem + 5.2vw, 6rem)` |
| Leading and weight | `--hc-lh-body` 1.65, `--hc-lh-heading` 1.1, `--hc-lh-hero` 0.98; `--hc-w-regular` 400, `--hc-w-medium` 500, `--hc-w-semibold` 600 |
| Spacing | `--hc-space-1` to `--hc-space-10`: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px; `--hc-section-y` `clamp(64px, 10vw, 140px)` |
| Layout | `--hc-container` 1240px, `--hc-measure` 65ch, `--hc-gutter` `clamp(16px, 4vw, 48px)`, `--hc-header-h` 76px (public); admin topbar 64px and sidebar 248px (`_theme-mode.scss`) |
| Radius and controls | `--hc-radius-control` 8px, `--hc-radius-card` 14px, `--hc-radius-chip` 999px (public buttons are pills); `--hc-touch` 44px, `--hc-control-h` 48px |
| Motion | `--hc-dur-press` 180ms, `--hc-dur-ui` 200ms, `--hc-dur-color` 330ms, `--hc-dur-reveal` 360ms, `--hc-dur-hero` 700ms; `--hc-ease` `cubic-bezier(0.2, 0, 0, 1)`, `--hc-ease-emph` `cubic-bezier(0.16, 1, 0.3, 1)`, `--hc-ease-curtain` `cubic-bezier(0.65, 0, 0.35, 1)` |
| Elevation | `--hc-shadow-overlay` `0 8px 24px rgba(14, 13, 11, 0.18)`, dropdowns and dialogs only |

Status tint pairs are calculated at 4.8:1 or better; they still need measuring on rendered pages. The PWA manifest already uses `background_color` `#FFFFFF` and `theme_color` `#171A20` (commit f1e8960, K-03). Legacy values (Heritage Brown `#92400E`, Earth `#78350F`, espresso `#1A1714`, cream `#FFFBEB` as a surface) are gone from the admin layer; cream survives only as the warning tint and as dark-mode text.

Rules for tokens: components inherit tokens and never hard-code a hex. A rebrand is a change to `_tokens-map.scss` only.

### Themes

Since D-023 the public site is always dark (`$hc-site` on `.hc`, with ivory `.hc-paper` bands), whatever the admin theme; the public layout still keeps `data-bs-theme` off the page while a public route is open (see [ARCHITECTURE.md](ARCHITECTURE.md#route-inventory)). The admin starts in its warm light theme (ivory page, white cards, an amber-tint active sidebar item) and its dark theme remaps only colour tokens to ink and ivory (`$hc-dark`). The amber fill and its ink button text stay the same everywhere. Figures are in [Dark luxury palette](#dark-luxury-palette-d-023). Rendered checks on 13 October 2026: Today in light and Jobs in dark at 1440px on local staging ([qa/FUNCTIONAL-AUDIT.md](../qa/FUNCTIONAL-AUDIT.md#redesign-dark-luxury-13-october-2026)); other admin screens in dark are NOT TESTED.

## Typography

| Face | Use |
|---|---|
| Inter | App, forms, buttons, tables, labels and public body text. Use tabular figures for amounts, dates and measurements. |
| Fraunces | Display serif (D-023): public headings, the hero, the closing band, admin page titles and summary-tile figures. Tight tracking (-0.02 to -0.035em), italic used sparingly. Never long body copy. Replaced Source Serif 4 on 13 October 2026. |

IBM Plex Mono is no longer loaded (Phase 4); codes use the system monospace (`--hc-font-mono`). `index.html` loads Inter and Fraunces from Google Fonts as variable ranges (Inter 400 to 700; Fraunces optical size 9 to 144, weight 400 to 600, italic 400 to 500) with `font-display: swap` and preconnect. Self-hosting is a later improvement. Fonts are licence-safe, local or Google-hosted; never Tesla's proprietary Universal Sans.

| Role | Size | Notes |
|---|---|---|
| Public hero | 44px phone to 96px desktop | Fraunces 500 |
| Section heading | 28px to 56px | Fraunces 500 |
| App H1 | 26 to 34px | Fraunces 600 |
| Body and form text | 16px minimum | Comfortable line height |
| Caption and meta | 13 to 14px | |

## Spacing and layout

- Scale: 4, 8, 12, 16, 24, 32, 48, 64.
- App containers around 1200px. Public reading text around 65 characters per line.
- Section spacing: 40px on phones, 72 to 96px on desktop.
- Three volumes: generous on the public site, compact but breathing in the app, thumb-first on phone forms.

## Radius, borders and elevation

- Radius (Proposed, from the Tesla reference): 4px on buttons and inputs, about 12px on image cards. Current code uses 8 to 12px.
- Mostly flat, light neutral backgrounds with thin, useful dividers. Elevation is reserved for dropdowns and dialogs. No decorative dashed borders, no dashboard glass layers, no warm heritage-brown shadow ladder.
- The "Tack Stitch" (a 2px dashed amber rule on card edges with a warm shadow) is retired by owner decision on 10 October 2026 (D-004). It was documented but never implemented (A23), so retiring it changes no code.

## Control styling

- One primary action per task. Secondary buttons are outlined or neutral. Danger actions are separated and labelled.
- Hover: colour and border changes only, no scale or translate effects.
- Sizes and focus: [ACCESSIBILITY.md](ACCESSIBILITY.md).

## Motion

Built on `feat/phase4-website` (`src/app/(public)/site/ui/ui.css`, `Hero.jsx`, `useReveal.js`); dependency-free, CSS plus one small hook. Restrained and purposeful: it marks the first view and the user's own actions, nothing moves on its own afterwards.

| Element | Motion | Timing |
|---|---|---|
| Home hero (D-023) | Full screen (`min(100svh, 1100px)`) under a transparent header. Slides come from published content: the home page, then up to four services with a photograph. With two or more it is a slider: photographs crossfade and slowly zoom (Ken Burns, scale 1 to 1.12), progress bars fill per slide, arrows, the left and right keys and a swipe change slide. It pauses on hover, keyboard focus and a hidden tab | 7.5s per slide, 1.2s crossfade |
| Hero headline | Each word of the active slide rises out of a mask; screen readers get the whole headline from `aria-label` | 900ms `--hc-ease-emph`, 150ms start, 60ms stagger, capped at 12 words |
| Hero eyebrow, lead, actions, note | Fade up 12px with the active slide | 800ms at 100, 450, 600 and 700ms |
| Section content | `data-reveal` items that start below the fold fade up 12px on first view (IntersectionObserver, once); up to four entering together stagger 60ms; a 3s safety net reveals anything already passed | 360ms `--hc-ease` |
| Measure line | A 1px by 28px rule before each eyebrow (small capitals in the accent text colour) draws from the left when its heading block reveals; the signature detail | 480ms |
| Cards | Service cards lift 6px with an amber border and the image zooms 6%; work cards zoom 5% under a caption scrim | 450ms, 1s image |
| How it works | The vertical rule between numbered steps fills amber as each step reveals (triggered, not scroll-linked) | 600ms |
| Links | Header links: a 1px underline grows from the left on hover and marks the current page; body links thicken from 1px to 2px | 200ms |
| Buttons | Colour-only hover; press scales to 0.98 | 330ms colour, 80 to 180ms press |
| Mobile menu | Sheet fades in with an 8px drop | 200ms |
| Header | On the home page it is transparent over the hero; after 8px of scroll it turns ink with a blur and a 1px divider (every page) | 330 to 400ms |

- Content is never hidden without JavaScript: only items `useReveal` marks `pending` are hidden, and only when they start below the fold, so nothing on screen at load flashes.
- `prefers-reduced-motion: reduce` removes every animation and transition on public pages (verified 11 October 2026 before D-023); the hero slider never advances on its own and shows full progress bars. Rechecking the redesign under reduced motion is NOT TESTED.
- Admin: 180 to 250ms colour transitions and a 0.98 button press; the old card lift and settle-in animation are gone.
- Never: autoplay carousels other than the home hero (D-023), scroll hijacking, parallax, cursor effects, tickers or marquees, counters, forced viewport-height text clipping, animation during measurement entry or amount editing.

## Public components

Built in `src/app/(public)/site/ui/` (barrel `ui/index.js`), styled in `ui/ui.css`, tokens only. No new dependencies.

Since D-023 (13 and 14 October 2026) buttons are 48px pills in Inter 600 14px, secondary buttons are outlined (a glass fill over photographs), and cards use the 14px radius. Shared bands in `sections.jsx`, styled in `site.css`: `PromiseBand` (serif statement beside three facts with icons, ivory), `ProcessBand` (four steps on a 2px rail that fills amber as each step reveals, with a dot per step; four columns, two below 992px, one below 560px), `CompanyBand` (5:6 photograph beside copy and a ticked list), and `ClosingAction` (eyebrow, large serif title, text and two actions over a dimmed photograph). Service pages use `.hc-detail` (copy beside a sticky "At a glance" card). `SectionHead` on an h2 with a lead or links is split (eyebrow and title left, lead, links and filters right, bottom-aligned; one column below 860px; `split={false}` inside narrow columns). `Testimonials` is one centred serif quote rotating every 6.5s with dots, paused on hover and focus and still under reduced motion. The footer has Brand (name, line, primary action), Explore (up to five published pages), Clients (appointment, track, account, questions, contact) and Visit (address, hours, phone, WhatsApp, email), then the outline wordmark and a bottom bar with the year, legal links, staff sign-in and socials. A three-column grid holding exactly four cards shows four across. Copy for the bands: [CONTENT.md](CONTENT.md#fixed-copy-in-the-shared-bands-d-023). The table below is the Phase 4 contract; where it disagrees, this paragraph wins.

| Component | Contract |
|---|---|
| `Button` (`.hc-btn`) | 48px tall, `0 24px`, 4px radius, Inter 500 16px. `primary` amber with ink text, hover `#D97706`; `secondary` light ash with ink text, ink border on hover; `quiet` ink text link with a 4px underline offset. Disabled uses `aria-disabled`. `Actions` holds at most two and stacks them full width below 600px. Older class names `--ghost`, `--light` and `--onfill` render as secondary |
| `Section`, `SectionHead` | Section on white or `tone="alt"` light ash, `--hc-section-y` padding; heading block with eyebrow, measure line, serif title and lead |
| `Card`, `ServiceCard`, `WorkCard` | Flat on light ash, 12px radius, no shadows. Service: 3:2 image, serif title, summary, quiet link. Work: 4:5 image, title, muted fabric or fit line, the whole card one link |
| `Field`, `ErrorSummary` | Label above (14px, 500), "(required)" in text, help below in muted text, 16px input 48px tall with a 1px `#8E8E8E` border and a 2px ink focus outline; inline error in `#991B1B` with an icon via `aria-invalid` and `aria-describedby`; the summary links to fields and takes focus |
| `StatusChip` | 28px pill, 13px 500, icon plus text on the status tint pair |
| `HcImage` | Reserved aspect ratio, AVIF and WebP `srcset` when present, required `alt`, `priority` for the one hero image (eager, high priority), lazy and async otherwise |
| `Hero` | Text beside the photograph from 1024px (columns 1 to 5 and 6 to 12), above it below; never text on the photo, so no scrim. Text-only until real photography exists |
| `Icon` | About 60 inline stroke SVGs (24px grid, 1.75 stroke, `currentColor`, decorative unless `label` is given); older Iconify names map to them |
| Header (`SiteHeader.jsx`) | Sticky, opaque white, 64px; wordmark, links (Services, Companies, Our work, How it works, About, each shown only while its page has published content; Shop while the shop is on; Contact always), quiet "Track your job", primary "Book an appointment" (or "Request an appointment" while booking is off). Below 1024px a Menu button opens a sheet with 56px rows and Book and Track pinned at the bottom (a recorded deviation: the links do not fit at 768px) |
| Footer (`SiteFooter.jsx`) | Light ash, four columns, each shown only when it has content: business name, area and hours; phone, WhatsApp and email; explore links; policies. Verified social links only (https on the platform's own domain). Bottom row "© year name" and a small staff link. Details come from `useBusiness()` (`site/business.js`: the Website profile in `site.php?action=config`, falling back to `store.php` config on a server without `site.php`); explore and policy links follow the published-content flags |
| `useActions` (`ui/useActions.js`) | The two site actions in one place: primary "Book a measurement appointment" (`/book`) while public booking is on and ready, else "Request a measurement appointment" (`/contact?type=fitting`); secondary "Discuss a company order" (`/company-orders#brief` while that page is published, else `/contact?type=company`) |
| CMS blocks (`site/cmsBlocks.jsx`) | `Rich` (CMS rich text through `safeHtml()`), `PageHead` (h1, intro, optional hero image), `RichSection`, loading, not-found (noindex) and error pages, `MoreLink`. Empty content renders nothing |
| `useSeo` (`site/seo/useSeo.js`) | Title ("{Page} \| Herit Clothing", Home "Herit Clothing \| Men's tailoring in Lagos"), description, canonical, Open Graph (absolute image URL), Twitter card, robots and one JSON-LD block; restores defaults on unmount. Called once by `SiteLayout` from its `title`, `seo` and `noindex` props; preview mode is always noindex |

Older page markup (`.hc-card`, `.hc-product`, `.hc-journal-card`, `.hc-chip`, `.hc-table` and so on) is restyled on the tokens in `site.css`; fabric pattern tiles, the marquee, slider, counter, team and logo strip styles are gone. `npm run check:tokens` (`scripts/check-tokens.mjs`, also run by `npm run lint` and so in CI) fails if `site.css`, `ui.css`, `portal.css`, `heritos-admin.css`, `herit-daily.css` or any JS/JSX file under `src/app/(public)` holds a raw colour; inline styles use `var(--hc-*)`.

## Icon and image direction

- Icons: one family per surface, consistent stroke and size: the bundled `Icon` set on public pages, Iconify (Solar) in the admin. Icons accompany labels for important tasks, never replace them.
- Images: real garment and workshop photography only ([CONTENT.md](CONTENT.md#photography)).

## What the Tesla reference contributes

The reference came from `npx getdesign@latest add tesla` and is kept at [docs/Plans 2026/TESLA-DESIGN-REFERENCE.md](Plans%202026/TESLA-DESIGN-REFERENCE.md) as reference material, not an active rule. It is an independently written style reference, not an official Tesla specification, and no Tesla assets are used. Values adopted:

- Neutral palette: white `#FFFFFF`, light ash `#F4F4F4`, carbon `#171A20`, graphite `#393C41`, pewter `#5C5E62`, pale silver `#D0D1D2`, silver fog `#8E8E8E`.
- Photography-led public sections with near-zero decoration: no gradients, patterns or decorative shadows.
- At most two actions per screen: a primary and a quieter secondary.
- Medium and regular weights (500 and 400), normal letter spacing, no uppercase transforms.
- Barely rounded controls (4px) and restrained image cards (about 12px).
- Colour-only hover transitions of roughly 0.33s.
- Responsive collapse: hamburger navigation and stacked actions below 768px.

## Deviations from the Tesla reference

| Tesla reference | Herit contract | Why |
|---|---|---|
| Electric blue `#3E6AE1` as the only accent | Herit amber `#F59E0B` with `#171A20` text; `#B45309` for amber text | Owner decision, 10 Oct 2026. Tesla blue is not used anywhere. |
| White text on the accent button | Dark text on amber | White on amber fails contrast |
| Universal Sans (proprietary) | Inter, plus Source Serif 4 for public headings | Licence and Herit identity |
| 14px body and UI text | 16px minimum body and form text | Readability on phones |
| 40px maximum hero text | 36 to 56px public hero | Serif headings need room |
| No semantic colours | Success, warning, error and pending colours | Working forms and job status |
| 32 to 40px buttons | 44px preferred, 48px primary form controls | Touch usability |
| 100vh sections, one message per screen | 40px phone, 72 to 96px desktop section spacing; no forced viewport-height clipping | Content must reflow and stay readable |
| Auto-advancing hero carousel | One real image or optional muted clip | Carousels hide the explanation |
| Transparent navigation over the hero | Opaque white header always | Contrast |
| Navigation collapses below 768px | Collapses below 1024px | The links and two actions do not fit at 768px |
| Frosted glass navigation | Not used | No glass layers |
| Placeholder text `#8E8E8E` | Placeholders and help text `#5C5E62`; `#8E8E8E` only for control borders | `#8E8E8E` is 3.28:1, too low for text |
| Persistent "Ask a question" chat bar | Not used | No live chat infrastructure (deferred) |
| 0.33s for every transition | 180 to 250ms for UI, 300 to 400ms for reveals | Immediate feedback in the app |

## History

The amber and ink brand replaced an indigo and warm-gold direction (`#26215C`, `#FAC775`, Playfair Display) and an older maroon brand (`#7A1F1F`, Fraunces) in a rebrand applied on 15 June 2026. On 10 October 2026 the owner kept amber as the accent and moved the layout to the Tesla-style restraint above, retiring the Tack Stitch and warm shadows. The root `DESIGN-SYSTEM.md` and the flat `docs/DESIGN.md` were earlier homes of this contract; this file replaces both.
