# HeritOS — SEO & Analytics

Herit Clothing sells globally from a Lagos base, so organic discovery (heritage fashion, Ankara/Adire/Aso-Oke/Kente, aso-ebi, made-to-measure) and clean product/article indexing matter. The storefront must be SEO-strong; the authenticated app shell can stay client-only.

## 1. Per-route head (react-helmet-async)
Every route sets `title`, `description`, `canonical`, and Open Graph / Twitter tags. A `<Seo>` wrapper component reads per-page props and falls back to brand defaults.

| Route | Title pattern | Notes |
|---|---|---|
| `/` | `Herit Clothing — Wear your heritage` | OG hero image; brand description |
| `/shop` | `Shop heritage fashion — Herit Clothing` | indexable; paginated canonical |
| `/shop/:slug` | `{Product} — {Fabric} \| Herit Clothing` | Product JSON-LD, OG product image, price |
| `/collections/:slug` | `{Collection} — Herit Clothing` | drop/lookbook story |
| `/fabrics/:slug` | `{Fabric}: origin & meaning — Herit Clothing` | educational, strong long-tail SEO |
| `/journal/:slug` | `{Article} — Herit Journal` | Article JSON-LD, author, published date |
| `/bespoke` | `Made-to-measure & aso-ebi — Herit Clothing` | service landing |
| `/about`, `/contact` | static brand pages | LocalBusiness JSON-LD (Ajuwon Market) |
| `/account/*`, `/admin/*`, `/pos/*` | `noindex, nofollow` | authenticated; never indexed |

Defaults: locale `en_NG`, currency hints `NGN` primary; `og:site_name = Herit Clothing`; Twitter `summary_large_image`. British/Nigerian spelling in all meta copy; sentence case.

## 2. Structured data (JSON-LD)
- **Organisation / LocalBusiness** on `/` and `/about` — name, logo, Ajuwon Market address (Lagos), social profiles, `sameAs`.
- **Product** on product pages — name, image, description, `offers` (price, priceCurrency per currency, availability, `itemCondition`), brand = Herit Clothing; aggregateRating once reviews ship (P2).
- **Article** on journal posts — headline, image, datePublished, author.
- **BreadcrumbList** on shop, collection, product, fabric, journal.
- **FAQPage** on `/help/*` topics (shipping, returns, sizing).

## 3. sitemap.xml + robots.txt
- `sitemap.xml` generated at build/deploy from published products, collections, fabrics, journal posts + static pages (a CI prerender/generation step; regenerate on publish). Submit in Google Search Console + Bing.
- `robots.txt`: allow storefront; disallow `/account`, `/admin`, `/pos`, `/checkout`, `/cart`, `/search?` query crawls; reference the sitemap. Served from the SPA docroot apex.

## 4. SPA-SEO decision (honest)
A client-rendered Vite SPA is weak for SEO on its own — crawlers may not execute JS reliably for marketing/product routes.

**Decision (D-SEO-1):** **Prerender the public/marketing & catalogue routes** at build time (e.g. `vite-plugin-ssr`/`react-snap`-style prerender, or a small prerender step in CI that outputs static HTML for `/`, `/shop`, `/shop/:slug`, `/collections/*`, `/fabrics/*`, `/journal/*`, `/about`, `/contact`, `/bespoke`). The authenticated app (`/account`, `/admin`, `/pos`) stays client-only and `noindex`. Product/collection/journal HTML is regenerated when content publishes (webhook → CI rebuild, or scheduled). Cloudflare serves the static HTML fast; helmet still manages tags client-side for navigations.
- Alternative considered: full SSR via a Node renderer — rejected for now (cPanel shared hosting is PHP-first; a Node SSR server adds ops cost). Revisit if catalogue scale demands it.

## 5. Analytics
**Provider (D-SEO-2): Plausible** (privacy-first, lightweight, cookieless by default — fits NDPA 2023 and avoids a heavy consent burden). GA4 optional later if the team needs ad attribution; if added, it goes behind the consent gate. Self-hosted Umami on cPanel is a viable cost-zero alternative — note as fallback.

**Event taxonomy (the handful that matter):**

| Event | Where | Why |
|---|---|---|
| `view_product` | product page | demand signal |
| `add_to_cart` | cart action | funnel top |
| `begin_checkout` | checkout start | funnel mid |
| `purchase` | order confirmation (value, currency, channel) | conversion |
| `bespoke_request` | bespoke form submit | high-margin lead |
| `notify_me` | restock/drop waitlist | demand capture |
| `newsletter_signup` | footer / welcome | list growth |
| `pos_sale` | POS payment taken | omnichannel revenue |

Track currency (₦/$/£) and channel (online/POS/social) as event props so the dashboard's channel split is real.

## 6. Consent & privacy (NDPA 2023)
- Cookieless analytics by default means **no consent needed for Plausible**. Any non-essential cookie tech (GA4, Meta Pixel, retargeting) is gated behind a consent banner; nothing fires before opt-in.
- Banner: accept / reject / manage; choice stored in a first-party `herit_consent` cookie; default-deny for non-essential. Documented in the privacy policy and surfaced at `/admin/settings/privacy`.
- Honour data-subject requests (access/erasure) per NDPA — link from the privacy settings module.

## 7. Wiring checklist (scaffold ticks these off)
- [ ] `react-helmet-async` provider mounted at app root; `<Seo>` component with brand defaults.
- [ ] Per-route title/description/canonical/OG/Twitter on every public route; `noindex` on auth routes.
- [ ] JSON-LD components: Organisation/LocalBusiness, Product, Article, Breadcrumb, FAQ.
- [ ] Prerender step in CI for public/catalogue routes (D-SEO-1); regenerate on content publish.
- [ ] `sitemap.xml` generator (from published content) + `robots.txt` in SPA docroot.
- [ ] Plausible snippet installed (cookieless); event helper wrapping the 8 events above.
- [ ] Consent banner component + `herit_consent` storage; non-essential tags gated.
- [ ] Canonical domain decided (apex vs www) and enforced via redirect (set at deploy).
- [ ] Search Console + Bing Webmaster verified; sitemap submitted (post-deploy).

*Greenfield — no legacy URLs to 301. If migrating from the existing prototype/site later, list redirects here and add them to `.htaccess`.*
