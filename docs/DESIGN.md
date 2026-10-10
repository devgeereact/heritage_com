# Design

This is the single design contract for the HeritOS app and the public website. It replaces the old root DESIGN-SYSTEM.md. The direction, approved by the owner on 10 October 2026, is a restrained Tesla-style layout led by real photography, with Herit amber `#F59E0B` as the only accent. The code does not match this yet: the rebuild happens in Phase 4 of [ROADMAP.md](ROADMAP.md), and until then this file describes the target and records what is implemented today.

Contrast figures are calculated from token values with the WCAG formula on 10 October 2026. They are not measurements of rendered pages. Visual quality and cross-device behaviour are NOT TESTED until screenshots and device checks exist.

## Principles

- **One brand, two dialects.** The public site is photography-led and spacious. The app is quiet precision: calm, fast, legible, with decoration treated as the enemy. Same tokens, different volume.
- **One accent per screen.** Amber marks the primary action or the active state, not both shouting at once. Fabric and garment photography carries the rest of the colour.
- **Real work only.** No generic fabric gradients, no AI garments presented as delivered work, no stock logos, no team carousel for a one-person business.
- **Function over flourish.** Forms and sensitive records get explicit Herit adaptations wherever the marketing-oriented Tesla reference falls short.

## Tokens

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

### Implemented today

Two separate token sets hold the same brand values and must merge into one layer, so that a colour change happens once (finding A23):

- Public site: `src/app/(public)/site/site.css:10-41`, scoped under `.hc` (`--accent`, `--primary`, `--background`, `--font-*`, `--shadow-*`, radius `0.625rem`). Its header comment still describes an old "deep indigo, warm gold" palette; the values are amber and ink.
- Admin: `src/assets/scss/config/_variables.scss` plus the `--herit-*` CSS variables in `src/assets/scss/heritos-admin.css`, loaded after `app.scss`.

| Current token | Light | Dark | Target |
|---|---|---|---|
| `--herit-surface` | `#FFFBEB` cream | `#1C1A17` espresso | `#FFFFFF` / `#F4F4F4` |
| `--herit-bg` | `#FFFFFF` paper | `#262320` raised | `#FFFFFF` |
| `--herit-primary` | `#262626` ink | `#F59E0B` | `#171A20` |
| `--herit-accent` | `#F59E0B` | `#F59E0B` | `#F59E0B` |
| `--herit-accent-dark` | `#D97706` | `#D97706` | `#D97706` (hover) |
| `--herit-border` | `#E8E3DB` | `#3A352E` | `#D0D1D2` / `#8E8E8E` |
| `--herit-ink-muted` | `#6B655E` | `#C9C2B5` | `#5C5E62` |

Legacy brand ladder still present in code: Heritage Brown `#92400E`, Earth `#78350F` (old text-on-amber colour), espresso `#1A1714`. These retire with the warm shadows unless a functional need appears. Legacy aliases `--herit-maroon` and `--herit-gold` point at the current tokens and can go once nothing references them.

Rules for tokens: components inherit tokens and never hard-code a hex. After the merge, a rebrand is a single token-file change.

### Themes

Deliver and test a clear light theme first. The admin dark theme exists today (espresso `#1C1A17` surface, `#262320` raised, `#3A352E` border, cream `#FFFBEB` text, muted `#C9C2B5`, amber becomes the primary colour while button text stays dark). Calculated: cream on espresso 16.74:1, muted on espresso 9.81:1, amber on espresso 8.08:1. It stays supported only if verified on rendered pages; do not double the polishing work during the rebuild. The old claim that both themes pass WCAG AA had no runtime evidence and is withdrawn.

## Typography

| Face | Use |
|---|---|
| Inter | App, forms, buttons, tables, labels and public body text. Use tabular figures for amounts, dates and measurements. |
| Source Serif 4 | Public headings only (already loaded, index.html). A deliberate deviation from the Tesla template that keeps Herit identity; the owner can drop it. Never long body copy. |

IBM Plex Mono is loaded today for codes and kicker labels. It is not part of the approved two-family pair; Proposed: remove it in Phase 4 unless the owner wants it for job codes. Fonts are licence-safe, local or Google-hosted; never Tesla's proprietary Universal Sans.

| Role | Size | Notes |
|---|---|---|
| Public hero | 36px phone to 56px desktop | Source Serif 4 |
| App H1 | 28 to 32px | Inter |
| Body and form text | 16px minimum | Comfortable line height |
| Caption and meta | 13 to 14px | |

Writing in the interface: sentence case for headings and buttons; only the wordmark is all caps; no all-caps paragraphs. British and Nigerian spelling (colour, honour). Fabric names are proper nouns: Ankara, Adire, Aso-Oke, Kente. Naira is written `₦18,500`.

## Spacing and layout

- Scale: 4, 8, 12, 16, 24, 32, 48, 64.
- App containers around 1200px. Public reading text around 65 characters per line.
- Section spacing: 40px on phones, 72 to 96px on desktop.
- Three volumes: generous on the public site, compact but breathing in the app, thumb-first on phone forms.
- Radius (Proposed, from the Tesla reference): 4px on buttons and inputs, about 12px on image cards. Current code uses 8 to 12px.

## Surfaces and elevation

Mostly flat, light neutral backgrounds with thin, useful dividers. Elevation is reserved for dropdowns and dialogs. No decorative dashed borders, no dashboard glass layers, no warm heritage-brown shadow ladder.

The "Tack Stitch" (a 2px dashed amber rule on card edges with a warm shadow) is retired by owner decision on 10 October 2026. It was documented but never implemented (A23), so retiring it changes no code.

## Controls

- Touch targets: 44px preferred minimum; 48px for primary form controls. WCAG 2.2 AA asks for 24px with exceptions; the larger size is a deliberate usability choice.
- One primary action per task. Secondary buttons are outlined or neutral. Danger actions are separated and labelled.
- Focus: always visible through `:focus-visible`, using a 2px `#171A20` outline (the admin already uses the primary colour, heritos-admin.css:191). Never an amber ring on white, which would fail 3:1.
- Hover: colour and border changes only, no scale or translate effects.

## Forms

Persistent labels; help or example text below the field; required fields marked; grouped sections; inline errors plus an error summary. Visible saving, saved and failed states. No placeholder-only fields. A failed submit keeps everything the person typed. Measurement inputs use a numeric keyboard, accept decimals and keep the unit visible. No editable spreadsheet for everyday measurement capture.

## Status, data and icons

- Status labels: pending, confirmed, due, overdue, ready, each as text plus icon plus colour.
- Data: short readable rows or cards; clear amounts, units and dates; tabular figures; secondary data collapsed on phones.
- Icons: one existing icon family, consistent stroke and size. Icons accompany labels for important tasks, never replace them.
- Modals: short actions only. Large client or job edits use full pages. Focus is trapped while open and returned on close.

## Navigation

- App: predictable desktop sidebar with a clear current location. On phones: Today, Jobs, Appointments and More (see [PRODUCT.md](PRODUCT.md#daily-navigation)).
- Public: Services, Our work, How it works, About, Contact, with a Book appointment button and a quieter Track your job link. The header gains an opaque background whenever imagery would reduce text contrast.

## Motion

- UI actions: about 180 to 250ms. The current curve is `cubic-bezier(.2,.7,.2,1)`. Optional section reveals: 300 to 400ms. The Tesla reference uses about 330ms, which is acceptable where it helps, but the app puts immediate feedback first.
- Public hero: one real image, or a short optional muted clip with a poster. A gentle opacity change with an 8 to 12px entrance is enough.
- Never: autoplay hero carousel as the main explanation, scroll hijacking, cursor effects, large parallax, forced viewport-height text clipping, continuously moving tickers, animated statistics without a source, animation during measurement entry or amount editing.
- Content is visible without JavaScript animation. `prefers-reduced-motion` gets static equivalents. Anything that moves on its own has a visible pause control; hover-only pause does not count. (The W3C interaction-animation criterion is AAA; reduced motion is a product requirement here regardless.)

## Responsive and accessibility checks

Test at 320, 375 or 390, 768, 1024 and 1440 CSS pixels, portrait and landscape, with text enlarged to 200%, reflow at narrow widths, keyboard-only navigation and visible, unobscured focus. Tables may scroll horizontally inside their own container where essential; the page itself never overflows. Sticky actions never cover inputs or the phone keyboard. Target is WCAG 2.2 AA; no conformance is claimed without testing.

## Content and photography

- Genuine cloth and garment photographs: front, back and detail, ideally on a consistent neutral backdrop. Workshop moments: measuring, cutting, stitching, finishing.
- Captions say what was made, a useful fabric or fit detail, and the occasion where permission exists.
- Client photos and reviews need explicit, separate publication permission.
- No stock client logos, no team carousel, no unsourced statistics, no urgency banners unless they reflect real booking capacity. A page without testimonials is not unfinished.
- Copy rules and page content live in [CONTENT-AND-SOCIAL.md](CONTENT-AND-SOCIAL.md).

## What the Tesla reference contributes

The reference came from `npx getdesign@latest add tesla`. It is an independently written style reference, not an official Tesla specification, and no Tesla assets are used. Values adopted:

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

The amber and ink brand replaced an indigo and warm-gold direction (`#26215C`, `#FAC775`, Playfair Display) and an older maroon brand (`#7A1F1F`, Fraunces) in a rebrand applied on 15 June 2026. On 10 October 2026 the owner kept amber as the accent and moved the layout to the Tesla-style restraint above, retiring the Tack Stitch and warm shadows.
