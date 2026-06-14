# HeritOS Design System — The Contract

> **Status: locked direction (CEO decision, 2026-06-14).** Source of truth for the premium
> rebrand of HeritOS — storefront + admin app. Build against these tokens, not against ad-hoc values.
> Supersedes the prior warm-maroon brand (#7A1F1F, Fraunces).

---

## 0. The bet

Pivot to **modern editorial heritage**: deep indigo primary, warm gold/peach accent, soft
bone surface. Quiet luxury — confident, not loud. Heritage made modern.

**Rejected:** loud yellow/black brutalism, candy palettes, Montserrat. None sell premium clothing.

**Pitch line:** *"Editorial, restrained, modern. Deep indigo, soft bone paper, a warm thread
of gold. Feels considered, not template."*

One token set, two flavors:
- **Storefront** = editorial premium (big imagery, serif display, generous space, slow scroll). Sells clothes.
- **Admin app** = tool premium (Linear/Stripe calm — dense but breathing, crisp, fast). Operated 8hrs/day.

---

## 1. Color

Gold is the only sparkle, used tiny (~5% of page). Indigo carries the brand weight.

| Token | Hex | Use |
|---|---|---|
| `--primary` | `#26215C` | Deep indigo — brand primary, CTAs, headings rail, focus ring |
| `--primary-hover` | `#1B1742` | Primary hover/active |
| `--accent` | `#FAC775` | Warm gold — micro-accent, tags, active states, wordmark sparkle |
| `--accent-hover` | `#E8AC4D` | Accent hover |
| `--surface` | `#F1EFE8` | Primary surface (warm off-white — **not** pure white) |
| `--bg` | `#FFFFFF` | Elevated cards, modals, inputs |
| `--ink` | `#1A1714` | Text (warm near-black, not pure #000) |
| `--ink-muted` | `#6B655E` | Secondary text |
| `--border-hairline` | `#E8E3DB` | Warm-grey hairline (not cold #DEDEDE) |

Status colors: muted, desaturated — never candy/neon.

---

## 2. Typography

Drop Fraunces. Drop Montserrat. Drop Libre Baskerville.

| Role | Font | Notes |
|---|---|---|
| Display / headline | **Playfair Display** (serif) | Storefront hero + section heads. Editorial fashion-grade |
| UI + body | **Inter** | Everywhere in admin; body on storefront. Dense-friendly |
| Mono (data/SKU) | **IBM Plex Mono** | Kept |

This pairing does ~70% of the "premium" feeling. Tight letter-spacing on display headers.
Wordmark: Playfair Display, tight tracking, accent OR primary — never both at once.

---

## 3. Spacing — 8pt scale

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`

Admin leans the small end; storefront leans the big end. Whitespace is the budget — spend it.
Generous space *is* the premium signal.

---

## 4. Layout / containers / fluidity

- **Storefront:** ~1280px max content width, full-bleed imagery, fluid `clamp()` type.
- **Admin:** 1440px work area, 12-col grid, cards padded ≥24px.
- Mobile-first. Breakpoints **640 / 768 / 1024 / 1280**. No janky reflow.

---

## 5. Cards / borders / depth

Kill hard 1px brutalist borders. Soft layered elevation instead.

```
radius   10px (cards) · 8px (inputs) · 999px (pills)
shadow   0 1px 2px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.06)
border   hairline #E8E3DB only where elevation isn't enough
```

---

## 6. Motion

- UI: `200ms ease-out`
- Storefront reveals: `400ms cubic-bezier(.2,.8,.2,1)`

Nothing snaps. Slow = expensive.

---

## 7. Rollout

1. **Proof first:** build ONE storefront product page + ONE admin dashboard fully in these tokens.
   See it real before touching all 14 modules. Kills debate.
2. Then sweep module by module.

**Parked (phase 2):** gold foil/texture treatments · admin dark mode (after light locks) ·
custom display-font licensing if Playfair Display feels too common.

**Riskiest assumption to validate:** that indigo + warm gold reads "premium" to *Lagos fashion
buyers* specifically — some markets read maximalism as premium. Gut-check 2–3 real customers
before full rollout.