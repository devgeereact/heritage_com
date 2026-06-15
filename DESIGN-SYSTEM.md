# HeritOS — Design System

> The brand contract. Read before touching any UI. Built on Herit Clothing's established identity
> (amber gold, heritage browns, Source Serif 4 + Inter) and extended into a working app system.
> Tokens are the single source of truth — never hand-edit colours into components.
>
> **Supersedes** the prior indigo + warm-gold direction (`#26215C` / `#FAC775` / Playfair Display)
> and the older warm-maroon brand (`#7A1F1F`, Fraunces). Rebrand applied 2026-06-15.

## North Star
- **Storefront / landing:** warm, rooted, editorial — heritage worn with pride. Amber used with restraint, a serif headline that tells a small story, fabric or person at the centre. (Expressive.)
- **App (admin / POS / account / tailor):** quiet precision — calm, fast, legible. Decoration is the enemy; the amber accent does one job per screen.
- **One brand, two dialects.** Same tokens, different volume.
- The crop-the-logo test must pass on the main dashboard: crop the wordmark and you should still know it's Herit.

## Signature move — "The Tack Stitch"
A single hand-stitch motif lifted straight from the needle-and-thread logo: a **2px dashed amber rule** (`dash 6 / gap 4`) riding one edge of every important surface, paired with a **soft heritage-brown shadow**. It reads as a line of stitching on cloth — unmistakably Herit, even with the logo cropped.

- **Cards & modals:** the stitch sits on the **top edge** (a tacked seam), warm shadow below. Full borders elsewhere stay hairline and tinted.
- **Active nav:** the stitch becomes a solid **amber underline / left-rail** (the seam is "sewn down").
- **Primary buttons:** amber/ink fill, the stitch as a 1px inner top highlight; on hover the warm shadow deepens (~180ms).
- **Inputs on focus:** the focus ring is the amber stitch, not a flat outline.

> Originality comes from the stitch + the warm elevation ladder, not from a busy palette. Amber stays scarce.

## Colour (tokens in `src/assets/scss/config/_variables.scss` + the `--herit-*` vars in `src/assets/scss/heritos-admin.css`)

Four roles, two themes, both WCAG AA. Amber is the **one scarce accent** and owns the eye.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--herit-surface` | `#FFFBEB` (cream) | `#1C1A17` (espresso) | base / page |
| `--herit-bg` | `#FFFFFF` (paper) | `#262320` (raised) | mid surfaces / cards / inputs |
| `--herit-primary` | `#262626` (ink) | `#FFFBEB` (cream) | text / chrome |
| `--herit-accent` | `#F59E0B` (amber) | `#F59E0B` (amber) | the one scarce highlight |

Full brand ladder (also tokenised): Amber `#F59E0B`, Amber-600 `#D97706`, Heritage Brown `#92400E`, Earth `#78350F` (text on amber), Ink `#262626`, Slate `#6B655E`, Cream `#FFFBEB`, Line `#E8E3DB`, Paper `#FFFFFF`. Dark mode: espresso `#1C1A17` base, raised `#262320`, warm border `#3A352E`, cream text `#FFFBEB`, muted `#C9C2B5`.

Rules:
- Accent is scarce — **one amber thing per screen** (the primary action, or the active state, not both shouting).
- Amber `#F59E0B` is a *background/emphasis* colour, never small text on white (fails contrast). Text on amber = Earth `#78350F` or Ink.
- On Heritage Brown or Earth surfaces, text is Cream or white.
- Borders are tinted warm (`#E8E3DB`), never flat black. Shadows are heritage-brown near-black tints (`rgba(146,64,14,…)` / `rgba(26,23,20,…)`), never `black/50%`.
- In **dark mode** the accent becomes the active/primary colour on espresso surfaces; button text stays Ink for AA contrast.

## Typography
- **Display / headings:** Source Serif 4 — wordmark, hero headlines, section titles, pull quotes, editorial intros. Gives Herit warmth and story. Never set long body copy in the serif.
- **Functional (body, tables, labels, buttons, UI):** Inter — clean, screen-optimised, legible at any size.
- **Data / SKU / table headers / kickers:** IBM Plex Mono — small caps, tracked.
- Pairing rule: *serif for what people feel, sans for what people read.*
- Type scale (locked):

| Token | Size / line | Face | Use |
|---|---|---|---|
| Display | 40–60px / 1.1 | Source Serif 4 Bold | Hero headlines, covers |
| H1 | 28–32px / 1.2 | Source Serif 4 Bold | Page / section titles |
| H2 | 22–25px / 1.3 | Source Serif 4 SemiBold | Sub-sections |
| H3 / Kicker | 13–16px / 1.4 | IBM Plex Mono / Inter Bold, caps, +0.12–0.14em | Eyebrow labels |
| Body | 15–17px / 1.6 | Inter Regular | Paragraphs |
| Caption | 12–13px / 1.4 | Inter Regular | Notes, meta |

- Sentence case for headings and buttons; **only the wordmark is all-caps.** British/Nigerian spelling (colour, honour). Capitalise fabric names as proper nouns (Ankara, Adire, Aso-Oke, Kente). Naira as `₦18,500`; `$` / `£` on international surfaces.

## Spacing & elevation
- **8px base scale**, obeyed everywhere (4 / 8 / 12 / 16 / 24 / 32 / 48 / 64). Three volumes: generous (landing), compact-but-breathing (admin), thumb-first (POS / mobile / forms).
- **4 surface levels**, each lighter (or in dark, distinct) than the one below, each with a soft warm shadow. No flat-on-flat.
- Radius: `8px` (inputs), `~10–12px` (default cards), `16px` (large). Pills only where intended.

## Motion
- ~**180–200ms** soft ease (`cubic-bezier(.2,.7,.2,1)`) everywhere. Hover intent on every interactive element. Page transitions fade. Storefront reveals slower (~400ms). Never gratuitous; respects `prefers-reduced-motion`.

## Accessibility
- Both themes pass WCAG 2.1 AA (4.5:1 body, 3:1 large). Focus states use the amber ring (`:focus-visible`), always visible. Min touch target 44px on POS/mobile. This is a Definition-of-Done gate.

## Architecture (the leverage — do this once)
All tokens live in the **SCSS config layer (`_variables.scss`) + the `--herit-*` CSS-var override layer (`heritos-admin.css`, loaded after `app.scss`)** — one source of truth. Components inherit tokens; never hand-edit a hex into a component. A full rebrand is then a token-file change (this rebrand was exactly that).
