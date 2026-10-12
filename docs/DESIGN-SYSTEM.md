# Design System

This file owns the design direction for Herit Clothing's website and the HeritOS CMS and operations app. Screen behaviour belongs to [UX-SPEC.md](UX-SPEC.md), accessibility requirements to [ACCESSIBILITY.md](ACCESSIBILITY.md), and public copy and photography to [CONTENT.md](CONTENT.md).

## 2026 direction: quiet confidence

**Status: owner-selected Apple reference, adapted locally on 12 October 2026 (D-026).** The website and CMS use the shared palette and controls below. The editorial hero replaces D-025's automatic slider. Build and browser verification are recorded in [the design review](../qa/DESIGN-2026-REVIEW.md). Production deployment remains outside this task.

The foundation is GetDesign's [independent Apple design analysis](https://getdesign.md/apple/design-md): generous white space, photography-led presentation, restrained interface chrome and rounded actions. Herit keeps amber instead of Apple's blue, Inter instead of proprietary SF Pro, and Source Serif 4 for public display headings. These are deliberate adaptations for a tailoring studio, not a copy of Apple's branding.

Create the feel of a contemporary tailoring studio: warm, composed and precise. Give the website an editorial rhythm, generous space and strong garment photography. Give the CMS predictable navigation, readable records and clearly separated editing and publishing actions. Both use the same colours and controls, with different density.

Clarity and consistency guide the adaptation. Keep one clear message per section, let photographs carry the character, and keep working controls predictable in the CMS.

[View the earlier website and CMS concept image](../qa/design-2026/herit-website-cms-concept.png). This earlier image predates the Apple selection and is an AI-generated visual sample with fictional records and photography, not a screenshot, finished UI, verified business details or evidence of delivered garments. Exact rules below take priority over image rendering, including typography, contact details and mobile navigation.

### 1. Colour roles

Use white panels on a warm neutral canvas. Charcoal leads; amber is a controlled brand accent. Photography supplies the richer colour. Keep approximately 85% of interface area neutral, with amber on a primary action and a small active indicator. Status colours are semantic exceptions.

| Semantic role | Target | Use |
|---|---|---|
| Canvas | `#F7F7F2` | CMS workspace and quiet website section background |
| Surface | `#FFFFFF` | Cards, forms, header, menus |
| Primary text | `#20221F` | Headings, navigation, labels, text on amber |
| Body text | `#41453E` | Paragraphs and table content |
| Muted text | `#61655E` | Supporting text and dates, never lower-opacity body copy |
| Decorative border | `#E1E3DC` | Card edges and separators, not the sole boundary of an input |
| Control border | `#858A80` | Input, select and checkbox boundaries |
| Accent | `#F59E0B` | Primary action fill, selected indicator |
| Accent hover | `#D97706` | Primary action hover, retain charcoal label |
| Accent text | `#995108` | Underlined text links where an accent is useful |
| Selected surface | `#FFF1D6` | Active CMS navigation item with charcoal label |
| Success | `#246342` on `#EDF6EF` | Published, ready or confirmed, with a text label |
| Warning | `#854D0E` on `#FFF4DC` | Draft or needs attention, with a text label |
| Danger | `#A12B2B` on `#FFF0EE` | Error or destructive action |
| Neutral status | `#61655E` on `#F0F1EC` | Unpublished or pending |
| Focus | `#20221F` | 2px outline with 3px offset on light surfaces |

Amber never carries white button text and is not small text on white. Decorative borders cannot establish focus or communicate an error. On dark photography, use a solid light text panel or sufficiently opaque scrim and test the actual crop. Do not infer contrast from the colour swatches alone. Calculated contrast evidence: [design review](../qa/DESIGN-2026-REVIEW.md).

### 2. Typography

Keep the existing two open-source families, Inter and Source Serif 4. A contemporary result comes from hierarchy and composition, not adding fonts.

| Role | Desktop | Mobile | Weight and leading |
|---|---|---|---|
| Website hero | 64px, maximum 72px | 40px, 36px at 320px | Source Serif 4 500; 1.08; tracking -0.025em |
| Website section title | 40px | 30px | Source Serif 4 500; 1.15; tracking -0.015em |
| Website card title | 24px | 22px | Source Serif 4 500; 1.2 |
| CMS page title | 28px | 24px | Inter 600; 1.2; tracking -0.02em |
| CMS panel title | 18px | 18px | Inter 600; 1.3 |
| Public body | 18px | 16px | Inter 400; 1.6 |
| CMS body and rows | 15px | 16px | Inter 400; 1.5 |
| Inputs and buttons | 16px | 16px | Inter 400 inputs, 500 actions; 1.4 |
| Labels and table headings | 14px | 14px | Inter 500; 1.4 |
| Metadata and badges | 13px | 13px | Inter 400 or 500; 1.4 |

Serif belongs to public display headings, never CMS headings, navigation, forms or long body text. Keep paragraphs to 55 to 65 characters per line. Hero copy should occupy at most three lines without forced line breaks on phones. Use tabular numbers for counts, amounts and dates, and system monospace only for references. Use sentence case. Small uppercase eyebrows are optional, maximum one per section, 12px with 0.08em tracking.

### 3. Spacing and grids

Use a 4px base with named steps: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96 and 120px. Choose from the scale rather than accumulating arbitrary margins.

| Layout decision | Website | CMS |
|---|---|---|
| Content width | Maximum 1280px, centred | Maximum 1440px excluding sidebar; editor form maximum 760px |
| Outer gutters | 48px desktop, 32px tablet, 20px phone, 16px at 320px | 32px desktop, 24px tablet, 16px phone |
| Grid | 12 columns desktop; 24px gaps | 12 columns; 24px gaps, 16px on phones |
| Section separation | 96px desktop, 64px tablet, 48px phone | 32px between page regions |
| Card padding | 24px desktop, 20px phone | 24px desktop, 16px phone |
| Internal grouping | 8px label to helper; 16px title to text; 24px text to action | 8px label to control; 8px helper below; 24px between fields |
| Sidebar and header | Header 72px desktop, 64px phone | Sidebar 248px; topbar 72px; retain existing sidebar collapse rules |

Related items sit closer together than separate groups. Align section titles, cards and footer columns to the same left edge. Never force a section to 100vh or shrink text to fit. At 1024px reassess navigation and grids; below 768px stack hero and editor columns; at 320px retain readable type and complete controls.

### 4. Cards, borders and depth

- CMS cards: white, 1px decorative border, 12px radius, 24px padding. Static cards remain flat. Three useful summary tiles are enough; counts come from real records.
- Website cards: 18px radius for image frames, 3:2 service images and 4:5 garment images. Keep headings and links outside the image. Two or three columns on desktop, one on narrow phones.
- Hero: a warm neutral split panel with a 24px outer radius, one CMS image and a readable copy column. On phones use an 18px outer radius and stack copy above the image. Without an image use centred copy with no placeholder garment.
- CMS controls and inputs: 8px radius. Public action buttons: 999px pill radius. Badges: 999px radius, at least 28px height. Dialogs: 16px radius. Rounded pills are reserved for short statuses and filters.
- Borders: 1px by default. Use stronger control borders for inputs and a 2px focus outline. Do not nest several bordered cards around one form.
- Depth: no shadow on ordinary panels; optional `0 2px 8px rgba(32,34,31,0.04)` on an interactive card; `0 12px 32px rgba(32,34,31,0.12)` on menus and dialogs. Shadow communicates elevation, not decoration.

### 5. Controls and states

| Component | Specification |
|---|---|
| Primary action | Amber fill, charcoal label, 48px public / 44px CMS height, 20px horizontal padding; one main action per task region |
| Secondary action | White or transparent fill, charcoal label, visible control border; same height as primary |
| Text action | Underlined label or explicit arrow; 44px touch area; no icon-only essential action |
| Input and select | White, 48px height, 16px text, 12px horizontal padding, visible label above; placeholder is an example, not a label |
| Textarea | Minimum 144px; same boundary and label rules as inputs |
| Status | Text and optional icon on a pale tint; do not colour the whole card for a status |
| Table | 56px desktop rows, 44px heading; left-aligned labels, right-aligned amounts, subtle horizontal separators; hover tint for actionable rows |
| Tabs | 44px target; active label plus 2px underline; avoid a pill around each tab |
| Dialog | Maximum 560px, 24px padding, descriptive heading; cancel secondary, confirm primary; labelled close button and focus return |

Hover changes colour or border without moving the layout. Pressed state is slightly darker. Focus is always visible. Disabled state has a readable label and a reason where useful. Loading keeps the button width and changes its label to an explicit action such as “Saving…”. Success says what completed. Errors appear beside the affected field and in a focused summary for long forms. Empty, offline and permission-denied states explain what the user can do next.

### 6. Landing page composition

1. Header: legible needle mark and wordmark, at most four main links, one compact booking/request action. Track remains a utility link or inside the phone menu. Navigation behaviour and conditional routes stay in UX-SPEC.
2. Hero: 5-column copy / 7-column photograph, short tailoring headline, one supporting paragraph, one main action and one quieter work link. D-026 authorises the static editorial hero: one published home image, falling back to the first published work image, then to a text-only layout. No autoplay, outfit stack, decorative weave, glow or pointer tilt.
3. Services: section heading, short introduction, up to three consistently cropped service cards. Confirmed service wording comes from the CMS and CONTENT, not the sample.
4. Selected work: two or three actual garment photographs, clear context, one collection link. Hide when there is no publishable work.
5. Process and studio: short, well-spaced steps and a story split. Avoid another large stack of cards for ordinary prose.
6. Closing action: simple appointment or enquiry prompt. Use only the configured action; do not imply instant confirmation.
7. Footer: brand plus short description, Explore, Help and Studio columns, at most five links per column; policies and copyright below a divider. Hide missing details. Two columns on tablet, stacked groups on phones. No giant repeated navigation list.

Photography should centre African menswear and workmanship, with warm natural light, consistent cropping and quiet backgrounds. AI garments in this concept are illustrative only. Do not publish the sample's email address, hours, dates, counts or other generated details.

### 7. CMS and staff surfaces

- Keep the existing role-gated navigation and business rules. The earlier sample shows a subset, not a new route inventory. Website content tools live inside Website rather than adding a new sidebar item for each entity.
- Use a pale sidebar, restrained line icons, charcoal active label and soft amber selected background. Keep icon size 20px and label size 14px. Secondary tools sit in an expandable group.
- Page header: title and one explanatory sentence on the left, task actions on the right. On phones put actions below the title. Avoid duplicate title bars.
- Website hub: content slots, published records and records with drafts, calculated from existing list responses. Content slots include fixed page/policy keys even when not yet written. Keep missing-details guidance and existing content navigation. View website opens the public home in a new tab. No unsupported activity feed or financial metrics.
- Content lists: search and filters above a table, readable status and last updated time, one clear Edit action. On phones use labelled record cards or a contained scroll region, never page-wide horizontal overflow.
- Editor: form on the left, preview/status panel on the right where room permits. Keep Save draft distinct from Publish. State whether changes are saved and whether the public version differs. Preserve server validation and existing publishing safeguards.
- Image library: equal aspect-ratio thumbnails, filenames, alt-text state and selection state. Labels remain visible. Upload progress and retry belong beside the upload.
- Business details: group contact, studio and social fields; explain what becomes public. Avoid a dense multi-column form on phones.
- Jobs, appointments and customers share this shell, type, controls and statuses. Do not redesign their business logic as part of a visual change.
- The phone sketch is illustrative; it does not authorise a new bottom navigation. Use the existing drawer pattern until navigation changes are requested.

### 8. Motion, themes and accessibility

Use 120 to 180ms for hover, 180 to 220ms for menus, and 250 to 350ms for a restrained entrance. Animate opacity and transform only where useful. Reduce motion removes entrances, orbits, pointer tilt and autoplay. No ornamental CMS motion.

Light is the first implementation target. The public site stays light. Preserve existing admin dark mode while implementing the new light design, then specify and verify a matching dark palette separately. Dark mode retains its existing palette plus a compatible selected-item surface. Verification scope is in the design review; do not infer full dark-theme compliance from a hub screenshot.

Aim for WCAG 2.2 AA: 4.5:1 for normal text, 3:1 for large text and meaningful control boundaries. Use a 44px minimum target, preferably 48px on public forms. Test keyboard access, focus order, 200% text zoom, long titles, reduced motion and 320, 390, 768, 1024 and 1440px widths. See ACCESSIBILITY for the full requirements. A mockup cannot establish accessibility compliance.

### 9. Implementation handoff and acceptance

Keep the current React, Bootstrap and PHP architecture. No UI kit replacement or new runtime dependency is required by this guideline. Add raw values only to `src/assets/tokens/_tokens-map.scss`; emit semantic `--hc-*` tokens through `tokens.scss`; derive component aliases where needed. Extend the spacing and radius scales centrally. Do not scatter raw colours through component styles.

Applied to shared tokens and controls, CMS shell and Website screens, and public header, hero, sections and footer. Continue to verify changes with screenshots and existing local staging journeys. The current token map, public UI kit, admin style layer, daily-record aliases and CMS hub implement this adaptation. Existing API contracts and role gates are retained.

Acceptance: the website and CMS visibly share colour and control rules; CMS uses Inter throughout; public serif is limited to headings; navigation fits; grids align; cards use the documented radii; focus and error states are visible; phones have no page overflow; public facts remain sourced from the CMS. Verify build, lint/token guard and docs checks, then local staging editing, preview, publishing and public booking/request journeys when implementing. Current evidence and limitations are recorded in the design review.

## Historical implementation record, before the Apple adaptation

The sections below are retained for traceability and incoming links. They describe the previous implementation, not the current token values or styling rules. D-026 and the Apple adaptation above supersede these visual specifications. Their contrast figures apply to the old palette only.

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

Built on `feat/phase4-website` (`src/app/(public)/site/ui/ui.css`, `Hero.jsx`, `useReveal.js`); dependency-free, CSS plus one small hook. Restrained and purposeful: it marks the first view and the user's own actions, nothing moves on its own afterwards.

| Element | Motion | Timing |
|---|---|---|
| Home hero title | Each of the two lines rises out of a mask (`translateY(105%)` to 0) on every slide change; the second line is a pale gradient (white to `--hc-control-border`) | 900ms `--hc-ease-emph`, second line 110ms later |
| Hero lead and actions | Fade up 10px; the eyebrow pill carries an amber dot with a soft ping | 600ms at 260 and 360ms; ping 2.2s loop |
| Hero outfit stage (D-025) | Three garment cards fanned (-9, 0, 9deg) rise in, then float 14px up and down with a breathing ground shadow; two thin orbit rings turn slowly; with a mouse the stack tilts up to 8 to 10deg toward the pointer. Slides crossfade by re-entering every 6.5s with a progress bar on the active dot; autoplay pauses on hover, keyboard focus and a hidden tab | 1000ms in, 7s float, 45 to 60s orbit, 500ms tilt |
| Hero reduced motion | Under `prefers-reduced-motion` nothing animates and the slides do not advance on their own; dots and arrows still work | |
| Section content | `data-reveal` items that start below the fold fade up 12px on first view (IntersectionObserver, once); up to four entering together stagger 60ms; a 3s safety net reveals anything already passed | 360ms `--hc-ease` |
| Measure line | A 1px by 48px amber rule under each eyebrow draws from the left when its heading block reveals; the signature detail | 480ms |
| How it works | The vertical rule between numbered steps fills amber as each step reveals (triggered, not scroll-linked) | 600ms |
| Links | Header links: a 1px underline grows from the left on hover and marks the current page; body links thicken from 1px to 2px | 200ms |
| Buttons | Colour-only hover; press scales to 0.98 | 330ms colour, 80 to 180ms press |
| Mobile menu | Burger lines cross into an X; each numbered link fades up in turn | 200ms; links 360ms, 60ms start, 40ms stagger |
| Header | 1px divider fades in after 40px of scroll; the contact bar above scrolls away with the page (D-025) | 330ms |

- Content is never hidden without JavaScript: only items `useReveal` marks `pending` are hidden, and only when they start below the fold, so nothing on screen at load flashes.
- `prefers-reduced-motion: reduce` removes every animation and transition on public pages (verified: `document.getAnimations().length` is 0 on home, about, contact, track and book, 11 October 2026); the hero curtain is not drawn.
- Admin: 180 to 250ms colour transitions and a 0.98 button press; the old card lift and settle-in animation are gone.
- Never: scroll hijacking, parallax, tickers or marquees, counters, forced viewport-height text clipping, animation during measurement entry or amount editing. Exception by owner decision D-025: the home hero slider (autoplay with pauses) and its outfit stage (float, slow orbits, pointer tilt), all off under reduced motion.

## Public components

Built in `src/app/(public)/site/ui/` (barrel `ui/index.js`), styled in `ui/ui.css`, tokens only. No new dependencies.

| Component | Contract |
|---|---|
| `Button` (`.hc-btn`) | 48px tall, `0 24px`, 4px radius, Inter 500 16px. `primary` amber with ink text, hover `#D97706`; `secondary` light ash with ink text, ink border on hover; `quiet` ink text link with a 4px underline offset. Disabled uses `aria-disabled`. `Actions` holds at most two and stacks them full width below 600px. Older class names `--ghost`, `--light` and `--onfill` render as secondary |
| `Section`, `SectionHead` | Section on white or `tone="alt"` light ash, `--hc-section-y` padding; heading block with eyebrow, measure line, serif title and lead |
| `Card`, `ServiceCard`, `WorkCard` | Flat on light ash, 12px radius, no shadows. Service: 3:2 image, serif title, summary, quiet link. Work: 4:5 image, title, muted fabric or fit line, the whole card one link |
| `Field`, `ErrorSummary` | Label above (14px, 500), "(required)" in text, help below in muted text, 16px input 48px tall with a 1px `#8E8E8E` border and a 2px ink focus outline; inline error in `#991B1B` with an icon via `aria-invalid` and `aria-describedby`; the summary links to fields and takes focus |
| `StatusChip` | 28px pill, 13px 500, icon plus text on the status tint pair |
| `HcImage` | Reserved aspect ratio, AVIF and WebP `srcset` when present, required `alt`, `priority` for the one hero image (eager, high priority), lazy and async otherwise |
| `Hero` | D-025: the old landing's dark animated slider, framed as the 21st.dev "Lunar Gravity Card". A rounded ink card (24px radius) inside the page margins with a fine weave and one amber glow; a round "Track your job" button in the corner from 768px. Left (1.25fr from 1024px): eyebrow pill with an amber dot, a two-line serif title (second line pale), the lead, a primary button and an outlined ghost link. Right: the outfit stage (three garment cards, the centre one with a white caption chip). Bottom edge: three progress dots and previous/next buttons. Slides on Home: the home message, a service, company orders; images come from published work and the slide's own image |
| `Icon` | About 60 inline stroke SVGs (24px grid, 1.75 stroke, `currentColor`, decorative unless `label` is given); older Iconify names map to them |
| Header (`SiteHeader.jsx`) | D-025, after the owner's EGO and RitaGreen sites. From 1024px a 36px ink contact bar (area, hours, phone) sits above the header and scrolls away. Header: sticky, solid white, 64px, a hairline once scrolled. Brand lockup: the `logo-sm.svg` needle mark at 34px plus a live-text wordmark (HERIT in Source Serif 4 600 with 0.08em tracking, CLOTHING in Inter 500 10px with 0.34em tracking, muted), because the stacked `logo-dark.svg` is unreadable at this height. At most four centred links (Services, Our work, How it works, About; Shop while the shop is on), each only while its page is published; the current page is underlined in amber. Then "Track your job" with a ticket icon (from 1200px) and a compact primary button: "Book a fitting", or "Request a fitting" while booking is off. Company orders, Questions, Journal and Contact live in the footer and the menu sheet. Below 1024px a Menu button opens a full-height sheet: numbered serif links, phone and email, then Book, Track and the company action pinned at the bottom |
| Footer (`SiteFooter.jsx`) | After 21st.dev "Footer 7" (Shadcnblocks), D-025. White with a top hairline and generous padding. Left: brand lockup, one short statement, muted social icons in a row. Right: three columns with bold headings and small muted links: Explore (at most five published pages), Help (Track your job, Questions, Journal, Contact), Studio (phone, WhatsApp, email, area or public address, hours). Bottom: a hairline, "© year name. All rights reserved." on the left, Privacy, Terms and the staff link on the right. Columns with nothing real are not rendered |
| `useActions` (`ui/useActions.js`) | The two site actions in one place: primary "Book a measurement appointment" (`/book`) while public booking is on and ready, else "Request a measurement appointment" (`/contact?type=fitting`); secondary "Discuss a company order" (`/company-orders#brief` while that page is published, else `/contact?type=company`) |
| Home blocks (`HomePage.jsx`, styles in `ui.css` "home") | Principles row (three columns divided by hairlines, no cards); services (at most three on Home); story split (image 5fr beside copy 6fr, checklist); ink band (`.hc-band`: `--hc-text` surface, `--hc-surface` headings, `--hc-divider` body, amber serif step numbers and a 1px amber rule per step that draws on reveal); work grid (two columns on phones); company split (heading block beside the primary action); questions split (heading 4fr, answers 7fr). D-023 |
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
| Auto-advancing hero carousel | Owner-approved slider (D-025): 6.5s, pauses on hover, focus and hidden tab, never under reduced motion; dots and arrows | Owner preferred the old animated hero, 12 Oct 2026 |
| Placeholder text `#8E8E8E` | Placeholders and help text `#5C5E62`; `#8E8E8E` only for control borders | `#8E8E8E` is 3.28:1, too low for text |
| Persistent "Ask a question" chat bar | Not used | No live chat infrastructure (deferred) |
| 0.33s for every transition | 180 to 250ms for UI, 300 to 400ms for reveals | Immediate feedback in the app |

## History

The amber and ink brand replaced an indigo and warm-gold direction (`#26215C`, `#FAC775`, Playfair Display) and an older maroon brand (`#7A1F1F`, Fraunces) in a rebrand applied on 15 June 2026. On 10 October 2026 the owner kept amber as the accent and moved the layout to the Tesla-style restraint above, retiring the Tack Stitch and warm shadows. The root `DESIGN-SYSTEM.md` and the flat `docs/DESIGN.md` were earlier homes of this contract; this file replaces both.
