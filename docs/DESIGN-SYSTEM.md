# Design System

This is the single design contract for the HeritOS app and the public website. It owns principles, tokens and measured contrast, typography, spacing, surfaces, control styling, motion, the Tesla reference and every deviation from it. Screen behaviour, forms and navigation are in [UX-SPEC.md](UX-SPEC.md); keyboard, focus, touch-target, reduced-motion and test-width rules are in [ACCESSIBILITY.md](ACCESSIBILITY.md); copy and photography rules are in [CONTENT.md](CONTENT.md).

The direction since 13 October 2026 is **dark luxury** (D-023, which supersedes the white Tesla-style surfaces of D-002 and the Source Serif 4 choice of D-017): near-black ink and warm ivory, led by real photography, with Herit amber `#F59E0B` still the only accent. The owner approved it from two prototypes (a landing page and the admin) before the build. Built on `feat/redesign-dark-luxury`. Sections below that still describe the white palette are history unless they agree with [Dark luxury palette](#dark-luxury-palette-d-023).

Contrast figures are calculated from token values with the WCAG formula on 10 October 2026. They are not measurements of rendered pages. Visual quality and cross-device behaviour are NOT TESTED until screenshots and device checks exist ([docs/AUDIT.md](AUDIT.md#usability)).

## Principles

- **One brand, two dialects.** The public site is photography-led and spacious. The app is quiet precision: calm, fast, legible, with decoration treated as the enemy. Same tokens, different volume.
- **One accent per screen.** Amber marks the primary action or the active state, not both shouting at once. Fabric and garment photography carries the rest of the colour.
- **Real work only.** No generic fabric gradients, no AI garments presented as delivered work, no stock logos, no team carousel for a one-person business. The African print illustrations ([African print art](#african-print-art)) are drawn cloth patterns named as illustrations, never presented as garments or delivered work; they were asked for by the owner on 19 October 2026 (the decision record is the lead's to add to [DECISIONS.md](DECISIONS.md)).
- **Function over flourish.** Forms and sensitive records get explicit Herit adaptations wherever the marketing-oriented Tesla reference falls short.

## Colour and contrast

### Warm paper palette (D-030)

Since 19 October 2026 (D-030, owner: "use this npx getdesign@latest add oura and use the 12px border radius for all the buttons ... keep the color from what we have in the logo") the public site rests on warm paper, after the [Oura reference](OURA-DESIGN-REFERENCE.md), and the one accent is the logo gold `#FFB800` (from `src/assets/images/logo-*.svg`), always with ink text on it. Near-black ink is kept for the hero photograph, the company band, the closing band, the footer and the sign-in side panel (`.hc-ink`, `<Section tone="ink">`). It supersedes the dark-first site of D-023; the D-023 table below is history. Verified in `src/assets/tokens/_tokens-map.scss`.

| Map | Surface / alt / raised | Text / body / muted | Divider / control | Accent / accent text |
|---|---|---|---|---|
| `$hc-site` and `$hc-paper` (public paper) | `#F7F1E8` / `#EFE7DA` / `#FFFFFF` | `#1C1B1A` / `#3D3A35` / `#66625B` | `#DED6C8` / `#827C71` | `#FFB800` / `#6E5000` |
| `$hc-ink` (bands, footer) | `#0E0D0B` / `#171512` / `#1F1C18` | `#F5EFE4` / `#D9D2C5` / `#A79F92` | `#2E2A24` / `#6F685D` | `#FFB800` / `#FFB800` |
| `$hc-light` (admin light) | `#FFFFFF` / `#F7F1E8` / `#FBF8F3` | as paper | `#E4DCCD` / `#827C71` | `#FFB800` / `#6E5000` |

Calculated contrast (WCAG formula, 19 October 2026; not measured on rendered pages): text on paper 15.32:1 (14.01 on alt); body 10.08:1; muted 5.40:1 (4.94 on alt); gold text `#6E5000` 6.65:1 (6.09 on alt); ink on the gold button 9.92:1 (8.04 on hover `#E6A600`); gold on ink 11.20:1; control border on paper 3.22:1.

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
| Paper success `#166534` on ivory `#F6F1E8` (`$hc-paper`, since 17 October 2026; it was `#15803D` at 4.46:1, below AA) | 6.34:1 |

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
| Spacing | `--hc-space-1` to `--hc-space-10`: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px; `--hc-section-y` `clamp(56px, 7vw, 112px)` (tightened 19 October 2026, D-031) |
| Layout | `--hc-container` 1240px, `--hc-measure` 65ch, `--hc-gutter` `clamp(16px, 4vw, 48px)`, `--hc-header-h` 76px (public); admin topbar 64px and sidebar 248px (`_theme-mode.scss`) |
| Radius and controls | `--hc-radius-control` 8px, `--hc-radius-card` 14px, `--hc-radius-chip` 999px (public buttons are pills); `--hc-touch` 44px, `--hc-control-h` 48px |
| Motion | `--hc-dur-press` 180ms, `--hc-dur-ui` 200ms, `--hc-dur-color` 330ms, `--hc-dur-reveal` 360ms, `--hc-dur-hero` 700ms; `--hc-ease` `cubic-bezier(0.2, 0, 0, 1)`, `--hc-ease-emph` `cubic-bezier(0.16, 1, 0.3, 1)`, `--hc-ease-curtain` `cubic-bezier(0.65, 0, 0.35, 1)` |
| Elevation | `--hc-shadow-overlay` `0 8px 24px rgba(14, 13, 11, 0.18)`, dropdowns and dialogs only |

Status tint pairs are calculated at 4.8:1 or better; they still need measuring on rendered pages. The PWA manifest already uses `background_color` `#FFFFFF` and `theme_color` `#171A20` (commit f1e8960, K-03). Legacy values (Heritage Brown `#92400E`, Earth `#78350F`, espresso `#1A1714`, cream `#FFFBEB` as a surface) are gone from the admin layer; cream survives only as the warning tint and as dark-mode text.

Rules for tokens: components inherit tokens and never hard-code a hex. A rebrand is a change to `_tokens-map.scss` only.

### Themes

Since D-023 the public site is always dark (`$hc-site` on `.hc`, with ivory `.hc-paper` bands), whatever the admin theme; the public layout still keeps `data-bs-theme` off the page while a public route is open (see [ARCHITECTURE.md](ARCHITECTURE.md#route-inventory)). The admin starts in its warm light theme (ivory page, white cards, an amber-tint active sidebar item) and its dark theme remaps only colour tokens to ink and ivory (`$hc-dark`). The amber fill and its ink button text stay the same everywhere. Figures are in [Dark luxury palette](#dark-luxury-palette-d-023). Rendered checks on 13 October 2026: Today in light and Jobs in dark at 1440px on local staging ([docs/AUDIT.md](AUDIT.md#redesign-dark-luxury-13-october-2026)); other admin screens in dark are NOT TESTED.

## Typography

| Face | Use |
|---|---|
| Hanken Grotesk | Since D-030: app, forms, buttons (600, 15px), tables, labels and public body text. Use tabular figures for amounts, dates and measurements. Replaced Inter on 19 October 2026. |
| Newsreader | Since D-030: display serif with optical sizes for public headings, the hero, the closing band, admin page titles and summary-tile figures. Weight 300 at display sizes, 400 for h3 and smaller serif headings; tracking -0.015 to -0.025em; italic for the mission line. Never long body copy. Replaced Fraunces on 19 October 2026. |

IBM Plex Mono is no longer loaded (Phase 4); codes use the system monospace (`--hc-font-mono`). Newsreader and Hanken Grotesk (D-030, from Fontsource 5.3.0) are self-hosted in `public/fonts` as variable WOFF2 files (Newsreader weight 200 to 800 with optical size, normal and italic; Hanken Grotesk 100 to 900) in latin, latin-ext and Vietnamese subsets (the last carries Yoruba dot-below letters), declared by `@font-face` in `index.html` with `font-display: swap`; the two latin normal files are preloaded. Both are SIL Open Font License 1.1, with `OFL-Newsreader.txt` and `OFL-HankenGrotesk.txt` beside them. No visitor request goes to Google Fonts. Fonts are licence-safe and local; never Tesla's proprietary Universal Sans.

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

- Radius (D-030): buttons, inputs and icon buttons 12px (`--hc-radius-control`); cards and framed photographs 8px (`--hc-radius-card`); chips, tags and badges 6px (`--hc-radius-chip`); full-bleed photographs 0. Nothing is pill-shaped; the process dots stay round.
- Mostly flat, light neutral backgrounds with thin, useful dividers. Elevation is reserved for dropdowns and dialogs. No decorative dashed borders, no dashboard glass layers, no warm heritage-brown shadow ladder.
- The "Tack Stitch" (a 2px dashed amber rule on card edges with a warm shadow) is retired by owner decision on 10 October 2026 (D-004). It was documented but never implemented (A23), so retiring it changes no code.

## Control styling

- One primary action per task. Secondary buttons are outlined or neutral. Danger actions are separated and labelled.
- Hover: colour and border changes only, no scale or translate effects.
- Sizes and focus: [ACCESSIBILITY.md](ACCESSIBILITY.md).

## Motion

Built on `feat/phase4-website` (`src/app/(public)/site/ui/ui.css`, `Hero.jsx`, `useReveal.js`) as CSS plus one small hook. Since 19 October 2026 (D-027) the home hero runs on GSAP (`gsap`, `@gsap/react`, with the React Bits `SplitText` headline vendored in `ui/reactbits/`) and the public site scrolls with Lenis (`ui/SmoothScroll.jsx`); every other public motion is still CSS. Restrained and purposeful: it marks the first view and the user's own actions, nothing moves on its own afterwards.

| Element | Motion | Timing |
|---|---|---|
| Home hero (D-023, GSAP since D-027) | Full screen (`min(100svh, 1100px)`) under the transparent header: the photograph fills the hero behind the copy, with a left, bottom and top scrim. Slides come from published content (D-023); a slide without a photograph shows a print with a gold "Illustration: ... print" tag top right (top left on phones; the staff Edit control sits opposite). On load the photograph fades in from 1.18 to 1.06 scale and then settles to 1 over the slide (Ken Burns). Each slide change wipes the new photograph up over the old one (clip-path), which eases up and away. Controls along the bottom: one bar per slide with its name (names hidden below 861px, kept in `aria-label`), amber fill for time left, the counter, pause and play, previous and next. It pauses on hover, keyboard focus, a hidden tab and while scrolled out of view; arrows, the left and right keys and a swipe change slide. From 1024px, scrolling moves the photograph down 18% and fades the copy out by mid-hero (scrubbed, the only scroll-linked motion). Only the first slide's heading is an `h1` | 7.5s per slide; wipe 1.2s `expo.inOut`; load 1.4s |
| Hero headline | The active slide's words rise out of masks (React Bits `SplitText`, GSAP SplitText); GSAP adds an `aria-label` with the whole line and hides the pieces | 1.1s `expo.out`, 70ms stagger |
| Hero eyebrow, lead, actions, note | Rise 18px and fade in after the photograph starts; on a slide change the old copy fades up and out in 350ms | 1s at 350ms, 100ms stagger; 900ms on change |
| Smooth scroll (D-027) | Lenis smooths wheel scrolling on public pages (`lerp` 0.1), driven by GSAP's ticker so ScrollTrigger stays in step; touch stays native, hash links jump natively, and it stops while the mobile menu is open. Not on staff screens | |
| Section content | `data-reveal` items that start below the fold fade up 12px on first view (IntersectionObserver, once); up to four entering together stagger 60ms; a 3s safety net reveals anything already passed | 360ms `--hc-ease` |
| Cards | Service cards lift 6px with an amber border and the image zooms 6%; work cards zoom 5% under a caption scrim | 450ms, 1s image |
| How it works | The vertical rule between numbered steps fills amber as each step reveals (triggered, not scroll-linked) | 600ms |
| Links | Header links: a 1px underline grows from the left on hover and marks the current page; body links thicken from 1px to 2px | 200ms |
| Buttons | Colour-only hover; press scales to 0.98 | 330ms colour, 80 to 180ms press |
| Mobile menu | Sheet fades in with an 8px drop | 200ms |
| Header | On the home page it is transparent over the hero; after 8px of scroll it turns ink with a blur and a 1px divider (every page) | 330 to 400ms |

- Content is never hidden without JavaScript: only items `useReveal` marks `pending` are hidden, and only when they start below the fold, so nothing on screen at load flashes.
- `prefers-reduced-motion: reduce` removes every animation and transition on public pages (verified 11 October 2026 before D-023). Since D-027: Lenis is not mounted, the hero never advances on its own, the headline is not split, slides change at once and the active bar shows full (verified in Chrome with emulated reduced motion, 19 October 2026).
- Admin: 180 to 250ms colour transitions and a 0.98 button press; the old card lift and settle-in animation are gone.
- Never: autoplay carousels other than the home hero (D-023), scroll hijacking (Lenis smoothing has no snapping and leaves touch native, D-027), parallax beyond the home hero's scroll drift (D-027), cursor effects, tickers or marquees, counters, forced viewport-height text clipping, animation during measurement entry or amount editing.

## Admin components (D-023)

Styled in `src/components/herit/herit-daily.css` under `.hd`, tokens only. Built 13 and 14 October 2026 to the approved admin prototype.

| Component | Contract |
|---|---|
| Summary tiles (`.hd-stats`, `a.hd-stat`) | Four across from 1200px, two below (`.hd-stats--3`: three across, one column below 768px); label and tinted icon, Fraunces figure, short line; each tile is one link. Below 420px the figure is 1.3rem on one line. Used on Today and Payments |
| `.hd-avatar` | 38px circle, amber tint with amber-text initials (`initials()` in `src/helpers/format.js`), decorative (`aria-hidden`). Leads rows on Jobs, Clients and Enquiries |
| `.hd-seg` | Pill switch of two buttons with `aria-pressed`; the pressed one is ink on surface. Jobs List or Board |
| Stage bar (`StageStepper`, `.hd-stepper`) | One 4px bar and label per stage under the job header on every tab: done in muted, current in amber with `aria-current="step"`; scrolls sideways on phones with the current step brought into view |
| Money card (job Overview) | Owner roles only, from `job.money`: price, verified paid, waiting to verify when any, balance or credit, an 8px amber paid bar (`.hd-paid-bar`) and "Open payments". Sticky beside the main column from 992px (`.hd-sticky`), first on phones. Rows of stacked cards use `.hd-stack` so cards keep their own height |
| Tab count (`.hd-tab-n`) | Small pill after a tab label: muted on the surface tint, amber with `on-accent` text on the active tab. Tab strips (`.hd-tabs`, `.hd-seg`) scroll sideways without a visible scrollbar |
| Publish bar (`.hd-publish-bar`) | Website hub: a green dot and "Everything here is live" or, with `.is-dirty`, the warning tint, an amber dot, the count of items with unpublished changes and a link per list. Built from each list's `has_draft`; it never publishes anything itself |
| Board (`.hd-board`, `.hd-col`, `a.hd-kcard`) | One column per stage with a count; columns at least 250px, scrolling sideways inside the board on narrow screens; each card is one link to the job |

## Public components

Built in `src/app/(public)/site/ui/` (barrel `ui/index.js`), styled in `ui/ui.css`, tokens only. The only added dependencies are for motion: `gsap`, `@gsap/react` and `lenis` (D-027).

Since D-029 (19 October 2026) Home lists services as a numbered index (`ServiceIndex` in `sections.jsx`): rows with a serif number, name and summary between hairlines, beside a sticky 4:5 photograph frame that shows the service under the pointer or keyboard focus, the new photograph wiping up over the old with GSAP (instant under reduced motion); below 992px each row has its own square thumbnail and the frame is hidden. The `PromiseBand` facts are numbered 01 to 03 in the accent text colour instead of icons; the About mission sits under a hairline in serif italic, not beside an accent stripe; print tags no longer repeat a card's title (fabric cards) or category (journal cards). The service card grid stays on the Services page. Since D-030 buttons are 48px tall with 12px corners in Hanken Grotesk 600 15px; overlines above headings are quiet tracked capitals in the muted text colour with no rule (the amber measure line is gone), used only where they add context; alerts have a 1px border all round, never a coloured side stripe; the header shows the light logo over the home photograph and the dark logo on paper. Before that, since D-023 (13 and 14 October 2026), buttons were 48px pills in Inter 600 14px, secondary buttons are outlined (a glass fill over photographs), and cards use the 14px radius. Shared bands in `sections.jsx`, styled in `site.css`: `PromiseBand` (serif statement beside three facts with icons, ivory), `ProcessBand` (four steps on a 2px rail that fills amber as each step reveals, with a dot per step; four columns, two below 992px, one below 560px), `CompanyBand` (5:6 photograph beside copy and a ticked list), and `ClosingAction` (eyebrow, large serif title, text and two actions over a dimmed photograph). Service pages use `.hc-detail` (copy beside a sticky "At a glance" card). `SectionHead` on an h2 with a lead or links is split (eyebrow and title left, lead, links and filters right, bottom-aligned; one column below 860px; `split={false}` inside narrow columns). `Testimonials` is one centred serif quote rotating every 6.5s with dots, paused on hover and focus and still under reduced motion; since 17 October 2026 it has a pause and play button, choosing a review with a dot stops rotation, and the quote is announced only while rotation is stopped. The footer has Brand (name, line, primary action), Explore (up to five published pages), Clients (appointment, track, account, questions, contact) and Visit (since 19 October 2026: an icon column with the address one part per line, hours, email, the Instagram handle, the WhatsApp number and phone; Instagram and WhatsApp shown there are left out of the bottom icon row), then the outline wordmark and a bottom bar with the year, legal links, staff sign-in and socials. A three-column grid holding exactly four cards shows four across. Copy for the bands: [CONTENT.md](CONTENT.md#fixed-copy-in-the-shared-bands-d-023). The table below is the Phase 4 contract; where it disagrees, this paragraph wins.

Sitewide consistency rules (14 October 2026): every public page opens with the same header band (`.hc-section--pagehead` or the older `.hc-pagehead`, same padding, divider, 40 to 72px Fraunces h1 and muted lead); long text (a service, a piece, a journal post, a policy, the company page body) sits in an ivory `tone="paper"` band at reading width; question lists use the split layout (heading left, questions right) on Home and Questions; every marketing page ends with `ClosingAction` (eyebrow, default "Start here", title, a line of text and two actions, over a photograph when one is published); forms sit beside a sticky side card (`.hc-detail`) on Company orders and Track; buttons, including portal buttons, are pills. Bands that would hold only a link or a heading are not rendered.

| Component | Contract |
|---|---|
| `Button` (`.hc-btn`) | 48px tall, `0 24px`, 4px radius, Inter 500 16px. `primary` amber with ink text, hover `#D97706`; `secondary` light ash with ink text, ink border on hover; `quiet` ink text link with a 4px underline offset. Disabled uses `aria-disabled`. `Actions` holds at most two and stacks them full width below 600px. Older class names `--ghost`, `--light` and `--onfill` render as secondary |
| `Section`, `SectionHead` | Section on white or `tone="alt"` light ash, `--hc-section-y` padding; heading block with eyebrow, measure line, serif title and lead |
| `Card`, `ServiceCard`, `WorkCard` | Flat on light ash, 12px radius, no shadows. Service: 3:2 image, serif title, summary, quiet link. Work: 4:5 image, title, muted fabric or fit line, the whole card one link |
| `Field`, `ErrorSummary` | Label above (14px, 500), "(required)" in text, help below in muted text, 16px input 48px tall with a 1px `#8E8E8E` border and a 2px ink focus outline; inline error in `#991B1B` with an icon via `aria-invalid` and `aria-describedby`; the summary links to fields and takes focus |
| `StatusChip` | 28px pill, 13px 500, icon plus text on the status tint pair |
| `HcImage` | Reserved aspect ratio, AVIF and WebP `srcset` when present, required `alt`, `priority` for the one hero image (eager, high priority), lazy and async otherwise |
| `Hero` | Since D-023 the home hero puts the copy over a full-screen photograph with a scrim (this Phase 4 row described text beside the photograph). Without a photograph a slide shows a labelled print. Motion: [Motion](#motion) |
| `Icon` | About 60 inline stroke SVGs (24px grid, 1.75 stroke, `currentColor`, decorative unless `label` is given); older Iconify names map to them |
| Header (`SiteHeader.jsx`) | Sticky, opaque white, 64px; wordmark, links (Services, Companies, Our work, How it works, About, each shown only while its page has published content; Shop while the shop is on; Contact always), quiet "Track your job", primary "Book an appointment" (or "Request an appointment" while booking is off). Below 1024px a Menu button opens a sheet with 56px rows and Book and Track pinned at the bottom (a recorded deviation: the links do not fit at 768px) |
| Footer (`SiteFooter.jsx`) | Light ash, four columns, each shown only when it has content: business name, area and hours; phone, WhatsApp and email; explore links; policies. Verified social links only (https on the platform's own domain). Bottom row "© year name" and a small staff link. Details come from `useBusiness()` (`site/business.js`: the Website profile in `site.php?action=config`, falling back to `store.php` config on a server without `site.php`); explore and policy links follow the published-content flags |
| `useActions` (`ui/useActions.js`) | The two site actions in one place: primary "Book a measurement appointment" (`/book`) while public booking is on and ready, else "Request a measurement appointment" (`/contact?type=fitting`); secondary "Discuss a company order" (`/company-orders#brief` while that page is published, else `/contact?type=company`) |
| CMS blocks (`site/cmsBlocks.jsx`) | `Rich` (CMS rich text through `safeHtml()`), `PageHead` (h1, intro, optional hero image), `RichSection`, loading, not-found (noindex) and error pages, `MoreLink`. Empty content renders nothing |
| `useSeo` (`site/seo/useSeo.js`) | Title ("{Page} \| Herit Clothing", Home "Herit Clothing \| Men's tailoring in Lagos"), description, canonical, Open Graph (absolute image URL), Twitter card, robots and one JSON-LD block; restores defaults on unmount. Called once by `SiteLayout` from its `title`, `seo` and `noindex` props; preview mode is always noindex |

### Landing sections (D-031)

`src/app/(public)/site/landing.jsx` and `landing.css`, tokens only (in `check-tokens`). Section titles use `.hc-land-title`: Newsreader 300, up to 5rem, tight tracking. Cards (order paths, docket, enquiry form) are 8px raised paper with a 1px divider shadow; buttons stay 12px.

- Motion, all GSAP on the Lenis scroll and all off under reduced motion: per-word rise on section titles below the first screen; image drift inside the order cards; the cloth run pinned from 1024px with the prints drifting inside their frames; the cloth names rolling in a masked slot; the docket's chalk lines drawn on once; the stitch rail filling as you scroll and lighting each step; the mission words brightening as you read. Patterns taken from the HyperFrames catalogue (Kinetic Type Swap, Per Word Rise, Word-Sweep Highlight, Handwritten Write-On, Accent Underline) and rebuilt for the web.
- Every section is complete at rest: content is hidden before it animates only when it starts below the first screen.
- Header tape (`.hc-tape` in `ui/ui.css`): a 16px ruler under the navigation, always shown, with 1, 5 and 10mm ticks and a number every 10cm in the muted text colour (light over the home photograph) and a 3px gold fill scaled to the scroll progress. It carries the header's lower edge, so the header has no divider of its own.
- Forms: every single-line input is 48px (`--hc-control-h`) like a select; a note that covers two fields runs under both (`.hc-form-note`).
- Footer: no print strip and no divider under the columns; the outlined wordmark sits at line height 1 so no glyph is clipped.
- CMS Workroom (D-032): the sidebar carries `.hc-ink` (ink tokens in both admin themes) with a tape edge (1, 5 and 10mm ticks, gold every 100px) and Solar line icons; the jump-to palette (`.hd-cmd`, `.hd-pal`); the Home studio (`.hw-*` in `herit-daily.css`: map, editor, proof in `.hc-paper`/`.hc-ink` so it shows the site's colours, sticky publish bar on ink); rolling figures (`RollNumber`, `.hd-roll`). A grid card fills its cell only when it is the cell's one card.
- CMS (`herit-daily.css`, CMS rebrand section): card headings Hanken 600 at 1rem whatever their level; card bodies 1.25rem padding; links in ink with a 1px underline in the control colour, gold on hover; side panels (`.hd-aside-card`) keep their own height and stick in view from 992px; Today's empty lists share one "All clear" card (`.hd-clear-list`).

### African print art

Built 19 October 2026 on `feat/real-content`, at the owner's request to bring back the African print illustrations of the live site. The live site drew them with CSS gradients (`.hc-tile-*`, removed from this site in Phase 4); they are now one data source and two renderers:

- `src/app/(public)/site/ui/printPatterns.js`: one repeat tile per print as shapes (circles and rectangles) with colour names, no colour values. Four prints: **Adire** (indigo ground, interlocking cream resist rings with an amber inner ring), **Ankara** (deep red ground, cream ring-and-dot medallions with rust rings), **Aso-Oke** (ochre and umber warp strips with a gold lurex grid) and the **woven check** (Kente-like crimson and rust blocks with amber squares). `printVariant()` maps a fabric name or an older tile class (`hc-tile-adire`) to a print; `printAt(i)` cycles them.
- `ui/PrintArt.jsx`: an inline SVG `<pattern>` filled from the `--hc-print-*` tokens. Props: `variant`, `label` (makes it `role="img"` with that name; otherwise `aria-hidden`), `scale`, `shade` (`soft` or `strong` ink scrim for text on top), `drift` (a 60s pan; none under `prefers-reduced-motion`), `ratio` and children laid over the cloth. `PrintRule` is a 14px strip used as a divider. Each instance has its own pattern id (`useId`).
- `scripts/content/render-prints.mjs`: the same tiles rendered with headless Chrome into the media-library illustrations ([CONTENT.md](CONTENT.md#real-content-from-the-live-site)).

Tokens: a `$hc-print` map in `src/assets/tokens/_tokens-map.scss`, emitted on `:root` (the same in every theme): `print-indigo` `#1B1F2E`, `print-cream` `#E7D6B0`, `print-sand` `#CDB98A`, `print-amber` `#F59E0B`, `print-red` `#8F2723`, `print-rust` `#B45309`, `print-ochre` `#9A4D12`, `print-umber` `#8A3D0E`, `print-gold` `#FEF3C7`, `print-brown` `#6D3410`, `print-crimson` `#9B2C2C`, `print-shade` `#0E0D0B`. They are illustration colours only, never text, control or status colours, so amber stays the one interface accent. Text over a print sits on an ink scrim or on the gold tag (`.hc-print-tag`, ink `#0E0D0B` on `#FEF3C7`, calculated 17.44:1).

Where prints appear: a slide without a photograph (hero), a service card without one, the company band without one, every closing band without a photograph, the fabric story cards on Home, the card tops and statement rules of the About story bands, journal cards (each post's stored tile picks the print, `site.php` `print`), and `PrintRule` dividers under the hero, page heads, a journal post and at the top of the footer. Sections are never an empty grey box. Styles: the end of `ui/ui.css` (PrintArt, edit control) and of `site.css` (placements).

Older page markup (`.hc-card`, `.hc-product`, `.hc-journal-card`, `.hc-chip`, `.hc-table` and so on) is restyled on the tokens in `site.css`; fabric pattern tiles, the marquee, slider, counter, team and logo strip styles are gone. `npm run check:tokens` (`scripts/check-tokens.mjs`, also run by `npm run lint` and so in CI) fails if `site.css`, `ui.css`, `portal.css`, `heritos-admin.css`, `herit-daily.css` or any JS/JSX file under `src/app/(public)` holds a raw colour; inline styles use `var(--hc-*)`.

## Icon and image direction

- Icons: one family per surface, consistent stroke and size: the bundled `Icon` set on public pages, Iconify (Solar) in the admin. Icons accompany labels for important tasks, never replace them.
- Images: real garment and workshop photography for anything that shows work; African print illustrations (above) for cloth, mood and empty states, always with alt text that says they are illustrations ([CONTENT.md](CONTENT.md#photography)).

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
