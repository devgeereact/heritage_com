# HeritOS Design System — The Contract

> **Status: locked direction (CEO decision, 2026-06-14).** Source of truth for the premium
> rebrand of HeritOS — storefront + admin app. Build against these tokens, not against ad-hoc values.
> Supersedes the old warm-maroon-default brand (#9b2c2c, Poppins/Libre Baskerville/IBM Plex Mono).

---

## 0. The bet

Pivot from generic/loud to **premium heritage**: warm-neutral foundation, deep maroon as a
restrained accent, a thread of gold as the one "expensive" sparkle. Heritage made modern.

**Rejected:** yellow/black/coral brutalism (#FFD84D surface, #FF5B3E accent, Montserrat). Yellow
reads cheap/loud, Montserrat reads template/AI-default — neither sells premium clothing.

**Pitch line:** *"Warm, editorial, restrained. Heritage made modern — bone paper, deep maroon,
a thread of gold. Feels hand-made, not template."*

One token set, two flavors:
- **Storefront** = editorial premium (big imagery, serif display, generous space, slow scroll). Sells clothes.
- **Admin app** = tool premium (Linear/Stripe calm — dense but breathing, crisp, fast). Operated 8hrs/day.

---

## 1. Color

No yellow surface. No coral. Gold is the only sparkle, used tiny (~5% of page).

| Token | Hex | Use |
|---|---|---|
| `--surface-paper` | `#FAF8F4` | Primary surface (bone — **not** white) |
| `--surface-card` | `#FFFFFF` | Elevated cards only |
| `--ink` | `#1A1714` | Text (warm near-black, not pure #000) |
| `--ink-muted` | `#6B655E` | Secondary text |
| `--border-hairline` | `#E8E3DB` | Warm-grey hairline (not cold #DEDEDE) |
| `--maroon` | `#7A1F1F` | Heritage accent — deeper than old #9b2c2c. ~5% of page |
| `--maroon-hover` | `#5E1717` | Maroon hover/active |
| `--gold` | `#C9A24B` | Micro-accent: tags, active states, the premium "tell" |

Status colors: muted, desaturated — never candy/neon.

---

## 2. Typography

Drop Montserrat + default Baskerville.

| Role | Font | Notes |
|---|---|---|
| Display / headline | **Fraunces** (serif) | Storefront hero + section heads. Fashion-grade character |
| UI + body | **Inter** | Everywhere in admin; body on storefront. Dense-friendly |
| Mono (data/SKU) | **IBM Plex Mono** | Kept |

This pairing does ~70% of the "premium" feeling. Tight letter-spacing on display headers.
Wordmark: Fraunces, tight tracking, gold OR maroon — never both at once.

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
custom display-font licensing if Fraunces feels too common.

**Riskiest assumption to validate:** that warm-neutral/restraint reads "premium" to *Lagos fashion
buyers* specifically — some markets read maximalism as premium. Gut-check 2–3 real customers
before full rollout.
