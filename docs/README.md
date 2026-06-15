# HeritOS — product spec docs

Source-of-truth **product spec** for Herit Clothing / HeritOS, brought in from the
brand kit. These define *what* the platform is — scope, brand, routes, SEO — not how
this repo is built.

| File | What it is |
|---|---|
| `brief.json` | Master brief: positioning, audience, roles, entities, domains, **brand palette + fonts + voice + logo**, integrations, constraints. |
| `features.md` | Full feature checklist — ~180 features across 18 modules, with P0/P1/P2 priority. The launch contract. |
| `nav-map.md` | Navigation & route map per role (guest/customer/staff/tailor/manager/owner) + the full route table. |
| `seo-analytics.md` | SEO + analytics plan: per-route meta, JSON-LD, sitemap/robots, prerender, Plausible, NDPA consent. |
| `HeritOS.html` | Interactive feature spec (the same checklist as a standalone page). |

## ⚠️ Stack caveat — read before acting on these

These docs were written against the **DEVGEE house stack** (React+Vite+TS SPA at the apex,
**Laravel** API on an `api.` subdomain, shared TS types). **This repo does not use that stack.**
HeritOS here is the **Larkon React (JS) + Bootstrap** admin kit with a **raw-PHP API**
(`php-api/*.php`, see [CLAUDE.md](../CLAUDE.md)).

So treat these as the **product/brand spec**, not the implementation guide:
- **Brand (`brief.json`)** — authoritative and already applied (amber `#F59E0B`, ink `#262626`,
  cream `#FFFBEB`, Source Serif 4 + Inter; see [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md)).
- **Feature scope (`features.md`)** — the goal; map modules onto the live Larkon pages.
- **Routes (`nav-map.md`)** — the Laravel route shapes (`/admin/*`, `/pos/*`, Sanctum guards)
  **differ** from this repo's flat routes (`/dashboard`, `/sales`, …) and `_lib.php` auth.
  Use it for *information architecture & role visibility*, not literal paths.
- **SEO (`seo-analytics.md`)** — still-open gap here: this SPA sets `document.title` only
  (no per-route OG/JSON-LD/helmet, no prerender/sitemap). `public/robots.txt` is in place.
