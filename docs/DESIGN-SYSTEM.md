# Design System

This is the single design contract for the HeritOS app and the public website. It owns principles, tokens and measured contrast, typography, spacing, surfaces, control styling, motion, the Tesla reference and every deviation from it. Screen behaviour, forms and navigation are in [UX-SPEC.md](UX-SPEC.md); keyboard, focus, touch-target, reduced-motion and test-width rules are in [ACCESSIBILITY.md](ACCESSIBILITY.md); copy and photography rules are in [CONTENT.md](CONTENT.md).

The direction, approved by the owner on 10 October 2026 (D-002), is a restrained Tesla-style layout led by real photography, with Herit amber `#F59E0B` as the only accent. The rebuild is Phase 4 of [ROADMAP.md](ROADMAP.md). The token layer, public components and motion are built on `feat/phase4-website`; page content and the CMS follow.

Contrast figures are calculated from token values with the WCAG formula on 10 October 2026. They are not measurements of rendered pages. Visual quality and cross-device behaviour are NOT TESTED until screenshots and device checks exist ([qa/FUNCTIONAL-AUDIT.md](../qa/FUNCTIONAL-AUDIT.md#usability)).

## Principles

- **One brand, two dialects.** The public site is photography-led and spacious. The app is quiet precision: calm, fast, legible, with decoration treated as the enemy. Same tokens, different volume.
- **One accent per screen.** Amber marks the primary action or the active state, not both shouting at once. Fabric and garment photography carries the rest of the colour.
- **Real work only.** No generic fabric gradients, no AI garments presented as delivered work, no stock logos, no team carousel for a one-person business.
- **Function over flourish.** Forms and sensitive records get explicit Herit adaptations wherever the marketing-oriented Tesla reference falls short.

## Colour and contrast

### Target palette (approved 10 October 2026)

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
- `src/assets/tokens/tokens.scss` emits them as `--hc-*` custom properties on `:root`, remaps the colours under `html[data-bs-theme="dark"]`, and redeclares the light colours on `.hc` (the public wrapper) and `.hd-print` with `color-scheme: light`, so the public site and printed documents always stay light.
- Admin: Larkon's `scss/config/_variables.scss`, `_variables-dark.scss` and `_theme-mode.scss` read the same maps (`$primary` amber with `$color-contrast-dark` ink and `$min-contrast-ratio: 4.5`, so `.btn-primary` is amber with ink text; ink `$secondary`/`$dark`; graphite body; Tesla neutrals for the greys; ink focus ring; `#B45309` underlined links; 4px control and 12px card radius; system monospace). `heritos-admin.css` is rewritten on `var(--hc-*)`: flat cards, no warm shadows or glass, Inter 600 sentence-case table headers and page headings, a 3px amber rail on the active sidebar item only, and `.text-primary`/`.link-primary` set to `--hc-accent-text` (amber as text fails contrast). `--herit-*` remain as aliases for one release.
- Phase 2 and 3: `--hd-*` in `src/components/herit/herit-daily.css` are aliases of `--hc-*`; `portal.css` uses `--hc-*` directly.

| Group | Tokens |
|---|---|
| Colour | `--hc-surface` `#FFFFFF`, `--hc-surface-alt` `#F4F4F4`, `--hc-text` `#171A20`, `--hc-text-body` `#393C41`, `--hc-text-muted` `#5C5E62`, `--hc-divider` `#D0D1D2`, `--hc-control-border` `#8E8E8E`, `--hc-accent` `#F59E0B`, `--hc-accent-hover` `#D97706`, `--hc-on-accent` `#171A20`, `--hc-accent-text` `#B45309`, `--hc-focus` `#171A20` |
| Status (text / tint) | `--hc-success` `#15803D` / `--hc-success-tint` `#F0FDF4`; `--hc-warning` `#B45309` / `#FFFBEB`; `--hc-danger` `#991B1B` / `#FEF2F2`; `--hc-pending` `#5C5E62` / `#F4F4F4` |
| Font | `--hc-font-sans` (Inter, then system UI), `--hc-font-serif` (Source Serif 4, Georgia), `--hc-font-mono` (system monospace) |
| Type scale | `--hc-text-xs` 13px, `-sm` 14px, `-base` 16px, `-md` 18px, `-lg` 20px, `-xl` 24px, `-2xl` 28px, `-3xl` 32px, `-4xl` 40px, `--hc-text-hero` `clamp(2.25rem, 1.6rem + 2.8vw, 3.5rem)` |
| Leading and weight | `--hc-lh-body` 1.6, `--hc-lh-heading` 1.2, `--hc-lh-hero` 1.08; `--hc-w-regular` 400, `--hc-w-medium` 500, `--hc-w-semibold` 600 |
| Spacing | `--hc-space-1` to `--hc-space-9`: 4, 8, 12, 16, 24, 32, 48, 64, 96px; `--hc-section-y` `clamp(40px, 7vw, 96px)` |
| Layout | `--hc-container` 1200px, `--hc-measure` 65ch, `--hc-gutter` `clamp(16px, 4vw, 32px)`, `--hc-header-h` 64px |
| Radius and controls | `--hc-radius-control` 4px, `--hc-radius-card` 12px, `--hc-radius-chip` 999px; `--hc-touch` 44px, `--hc-control-h` 48px |
| Motion | `--hc-dur-press` 180ms, `--hc-dur-ui` 200ms, `--hc-dur-color` 330ms, `--hc-dur-reveal` 360ms, `--hc-dur-hero` 700ms; `--hc-ease` `cubic-bezier(0.2, 0, 0, 1)`, `--hc-ease-emph` `cubic-bezier(0.16, 1, 0.3, 1)`, `--hc-ease-curtain` `cubic-bezier(0.65, 0, 0.35, 1)` |
| Elevation | `--hc-shadow-overlay` `0 8px 24px rgba(23, 26, 32, 0.12)`, dropdowns and dialogs only |

Status tint pairs are calculated at 4.8:1 or better; they still need measuring on rendered pages. The PWA manifest already uses `background_color` `#FFFFFF` and `theme_color` `#171A20` (commit f1e8960, K-03). Legacy values (Heritage Brown `#92400E`, Earth `#78350F`, espresso `#1A1714`, cream `#FFFBEB` as a surface) are gone from the admin layer; cream survives only as the warning tint and as dark-mode text.

Rules for tokens: components inherit tokens and never hard-code a hex. A rebrand is a change to `_tokens-map.scss` only.

### Themes

Light is built and tested first. The public site is always light: `.hc` redeclares the light colours, and the public layout keeps `data-bs-theme` off the page while a public route is open (see [ARCHITECTURE.md](ARCHITECTURE.md#route-inventory)). Admin dark mode remaps only the colour tokens (`$hc-dark`: surface `#1C1A17`, surface-alt `#262320`, text `#FFFBEB`, body `#E7E1D6`, muted `#C9C2B5`, divider `#3A352E`, control border `#7A736A`, accent text and status warning `#F59E0B`, success `#4ADE80`, danger `#FCA5A5`); the amber fill and its ink button text stay the same. Calculated: cream on espresso 16.74:1, muted on espresso 9.81:1, amber on espresso 8.08:1. Dark mode is not verified on rendered pages beyond the Today and Jobs screenshots recorded in [qa/FUNCTIONAL-AUDIT.md](../qa/FUNCTIONAL-AUDIT.md); the old claim that both themes pass WCAG AA is withdrawn.

## Typography

| Face | Use |
|---|---|
| Inter | App, forms, buttons, tables, labels and public body text. Use tabular figures for amounts, dates and measurements. |
| Source Serif 4 | Public headings only (already loaded, index.html). A deliberate deviation from the Tesla template that keeps Herit identity; the owner can drop it. Never long body copy. |

IBM Plex Mono is no longer loaded (Phase 4); codes use the system monospace (`--hc-font-mono`). `index.html` loads Inter and Source Serif 4 from Google Fonts as variable weight ranges (Inter 400 to 700, Source Serif 4 500 to 700, no italics) with `font-display: swap` and preconnect. Self-hosting is a later improvement. Fonts are licence-safe, local or Google-hosted; never Tesla's proprietary Universal Sans.

| Role | Size | Notes |
|---|---|---|
| Public hero | 36px phone to 56px desktop | Source Serif 4 |
| App H1 | 28 to 32px | Inter |
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

- UI actions: about 180 to 250ms. The current curve is `cubic-bezier(.2,.7,.2,1)`. Optional section reveals: 300 to 400ms. The Tesla reference uses about 330ms, which is acceptable where it helps, but the app puts immediate feedback first.
- Public hero: one real image, or a short optional muted clip with a poster. A gentle opacity change with an 8 to 12px entrance is enough.
- Never: autoplay hero carousel as the main explanation, scroll hijacking, cursor effects, large parallax, forced viewport-height text clipping, continuously moving tickers, animated statistics without a source, animation during measurement entry or amount editing.
- Content is visible without JavaScript animation. Reduced-motion rules: [ACCESSIBILITY.md](ACCESSIBILITY.md#reduced-motion).

## Icon and image direction

- Icons: one existing icon family, consistent stroke and size. Icons accompany labels for important tasks, never replace them.
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
| Transparent navigation over the hero | Opaque header when imagery reduces contrast | Contrast |
| Frosted glass navigation | Not used | No glass layers |
| Placeholder text `#8E8E8E` | Placeholders and help text `#5C5E62`; `#8E8E8E` only for control borders | `#8E8E8E` is 3.28:1, too low for text |
| Persistent "Ask a question" chat bar | Not used | No live chat infrastructure (deferred) |
| 0.33s for every transition | 180 to 250ms for UI, 300 to 400ms for reveals | Immediate feedback in the app |

## History

The amber and ink brand replaced an indigo and warm-gold direction (`#26215C`, `#FAC775`, Playfair Display) and an older maroon brand (`#7A1F1F`, Fraunces) in a rebrand applied on 15 June 2026. On 10 October 2026 the owner kept amber as the accent and moved the layout to the Tesla-style restraint above, retiring the Tack Stitch and warm shadows. The root `DESIGN-SYSTEM.md` and the flat `docs/DESIGN.md` were earlier homes of this contract; this file replaces both.
