# Website Content

This file owns what the public website says and shows: positioning, the claims being removed, site architecture and page plan, the company-order hook, copy and photography rules, and SEO, performance and analytics. Social profiles are in [SOCIAL.md](SOCIAL.md). How the CMS feeds the site is in [ARCHITECTURE.md](ARCHITECTURE.md#cms-and-public-projection). Visual tokens are in [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md). Nothing here is published yet; the website rebuild is Phase 4 of [ROADMAP.md](ROADMAP.md).

The public story is simple: a men's fashion and tailoring business in Lagos, run by its owner, showing real work and a clear order process.

## Positioning

Present care, fit, real craft and a clear order process. Company buyers find a useful service brief and a dependable point of contact, not claims about factory scale.

- Draft headline: "Men's clothing, made with care in Lagos."
- Draft supporting copy: "Tell me what you want to make. I will discuss the fabric, fit and finish, arrange your measurements and agree the work before sewing begins."
- Primary action: "Book a measurement appointment". Until public booking really works, use "Request a measurement appointment". Never label an enquiry as a confirmed booking.
- Secondary action: "Discuss a company order".

Status: Proposed drafts; the owner approves final wording.

### Claims that come down

Owner-confirmed 10 October 2026 (D-003): none of these are real, and all are removed in the website phase (finding A07).

| Claim | Where (Verified 10 October 2026) |
|---|---|
| 1200+ pieces delivered, 18 countries, 98% would order again | HomePage.jsx:62-99 |
| Four named staff: Amara Okafor, Tunde Bello, Zainab Yusuf, Chidi Eze | HomePage.jsx |
| Four named testimonials | site/content.js:35-38 |
| Free Lagos delivery over ₦25,000 | HomePage.jsx; enforced in store.php:33, 196 |
| "10% off your first piece, code HERIT10" | HomePage.jsx:96, 218; the coupon has no first-order check (A22) |
| Sample blog posts and static products priced ₦18,500 to ₦68,000 | Fallbacks in site/products.js:19-84 |

Status, 11 October 2026: removed from the public pages and fallbacks on `feat/phase4-website` (A07); the interim page copy states no numbers, people, offers or reach. They are replaced with the owner's own story and real finished work. Avoid invented years of experience, team members, customer counts, delivery countries, discounts, performance percentages and client logos. Future offers follow [BR-34](BUSINESS-RULES.md).

## Site architecture

Top navigation: Services, Our work, How it works, About, Contact. A clear Book appointment button sits beside a quieter Track your job link; the mobile menu shows both. Company orders get a prominent section or page. Ready-to-wear and Journal are secondary, and only while maintained. The retail shop is already hidden from public navigation behind `shop_enabled`, default off (D-014); its routes still work by direct URL.

| Page or section | Contents and action | Evidence needed before publishing |
|---|---|---|
| Home hero | One real garment or workshop image; short men's tailoring proposition; booking and company actions | Image rights, genuine garment, current availability |
| Services preview | Men's made-to-measure and other confirmed men's services | Actual garment range, fabric policy, pricing approach |
| Our work preview | Four to six real finished projects with garment, fabric, fit and purpose | Photo and client permission, true project notes |
| How it works | Discuss > measure > agree quote > sew and fit > collect or deliver | Actual order and deposit policy |
| Company orders | Coordinated men's garments; quantity, date, sample and fit process | Capacity, minimum quantities, delivery coverage |
| Craft and owner story | Real owner portrait or workshop; why the business exists; how quality is checked | Owner-approved biography; no fictional staff |
| Reviews | Consented, attributable reviews, or omit until collected | Recorded publication permission |
| FAQs | Fabric supply, measurements, appointment location, timing, deposits, changes, delivery, aftercare | Confirmed policy; no invented guarantees |
| Final action | Request an appointment or send your brief | Working form and a truthful response time |
| Footer | Contact, hours, location or service area, verified social links, privacy and terms | Current approved business details |
| Services detail | Who it helps, examples, options, what is included, process, quote action | Owner confirms exact services |
| Portfolio detail | Brief, garment, fabric, useful close-ups, result, next enquiry action | No client IDs, measurement sheets or private filenames |
| Company service page | Garment scope, sample approval, wearer measurements or sizes, milestones, invoice and PO handling | Approved scope and achievable timelines |
| About | Solo business story and working method | Real biography and photos |
| Contact and quote | Short enquiry form, other channels, hours | Correct contact details; form saves |
| Booking | Type > available time > contact > request confirmation | Real availability backend, privacy and conflict handling |
| Track and client area | Reference entry and verified access; simple job timeline | Access tests and an approved public status mapping |
| Policies | Privacy; quote, payment, change and collection terms; alterations and delivery | Actual practices; local review where needed |
| Optional shop | Only real published stock; honest unavailable states | Catalogue, price, stock and fulfilment verified |
| Optional Journal | Garment care, measuring and project stories | Time to maintain and genuine authorship |

Current public routes are listed in [ARCHITECTURE.md](ARCHITECTURE.md#route-inventory). Keep useful existing URLs; any rename needs redirects and checks of saved links, emails and customer references.

## Company order hook

- Draft: "A clear process for coordinated men's clothing."
- Supporting text: "Share the garment type, number of pieces and required date. I will confirm whether the work fits my capacity, discuss a sample and measurement approach, and provide a written quote."
- Action: "Send your company brief".
- Form fields: company name, contact name, phone or email, garment type, approximate quantity, required date, material responsibility, short brief. Attachments come later and only with safe private storage ([SECURITY.md](SECURITY.md#private-files-and-content-safety)).
- The honeypot is now `website_url_confirm` and `company` is a real optional field stored on `enquiries` (A11, fixed in PR #7; needs `schema_phase17.sql` in production).

## Real content from the live site

Loaded 19 October 2026 on `feat/real-content` into the local `heritos_clean` database through the real API (`scripts/content/load-real-content.php`, words in `scripts/content/real-content.php`). Source: the live heritclothing.com (read 19 October 2026) and the Journal posts in the old site code (`origin/main`, `src/app/(public)/site/content.js`). Voice: the brand's "we", as on the live site; the fixed band copy moved from "I" to "we" in the same change (owner to confirm).

Imported (Owner-confirmed by being live; the owner can edit each in the Website admin):

| Where | What |
|---|---|
| Business details | Herit Clothing; hello@heritclothing.com; address "Ajuwon Market, Lagos, Nigeria" (shown); area "Lagos, Nigeria"; journal switched on; Instagram @heritclothing; phone and WhatsApp +234123456789 (owner, 19 October 2026; confirm before the live load, K-32). Hours stay empty. Since 19 October 2026 (D-031) every page, service, question and journal post carries fuller copy built from how the service runs in HeritOS (appointment, written quote, measurement record, fittings, company sample and handover); no prices, durations or reviews are claimed |
| Home page | "Wear your heritage.", "Your culture, cut for now.", founded 2024 in Ajuwon Market |
| Fabric story (new page key `fabrics`, Home only) | Ankara (bold wax prints), Adire (hand-dyed indigo, resist patterns carry meaning), Aso-Oke (hand-woven strip cloth, ceremonial) |
| About | The live story, mission and vision word for word; How we work (01 to 04), values, who we serve (Lagos and Nigeria, the diaspora, gifters) |
| How it works | The four order steps the app supports, with the live reply promise "we aim to reply within one business day" |
| Company orders, Services introduction, Contact | Neutral descriptions of what the app does; the reply promise on Contact |
| Hero slides | "Wear your heritage.", "Heritage, tailored for now.", "Matching pieces for weddings and celebrations.", "Made in Lagos, worn everywhere." |
| Services | Made-to-measure, Aso-ebi and groups, Gifting (live wording, gift notes included), Company and uniform orders (neutral wording, Phase 5) |
| Questions | How do I know my size, Do you ship internationally, Can I order matching aso-ebi, How do payments work: neutral answers with no commercial commitment |
| Journal | "Reading Adire: the language of indigo", "Why we cut for now, not for one occasion", "From Ajuwon Market to your doorstep" |

Left out on purpose:

| Live content | Why |
|---|---|
| Counters (pieces delivered, countries, 98%), the four named makers, the four testimonials, the press strip (Vogue NG, BellaNaija, Guardian Life, ThisDay Style, OkayAfrica) | Invented (D-003, D-013) |
| HERIT10, free delivery, the Founders' Drop, the shipping price table | Invented or unconfirmed offers (D-003, BR-34) |
| Tiered aso-ebi pricing on six or more; the 14-day returns answer; "Every parcel is tracked" in the third journal post | Commercial commitments the owner has not confirmed |
| Shop products and prices; "Ready-to-wear" as a service | The shop stays hidden (D-006, D-014) |
| Dress wording in testimonials and products | Scope is men's tailoring and fashion (D-001) |
| Social links | No verified handle (A12) |
| Our work and testimonials | No real photographs or consented quotes yet; both sections stay hidden |

Images: 14 African print illustrations (4 hero slides, 4 services, 6 pages) rendered by `scripts/content/render-prints.mjs` and uploaded through `cms.php` `media_upload`, so they are processed into the 800, 1600 and 2400px WebP variants and one JPEG like any owner upload (2400px and quality 86 since D-030; a repeat upload of an image made before then rebuilds its variants). Each has alt text that describes the print as an illustration and the caption "Illustration of African print cloth (not a photograph)". The staging library held only synthetic swatches (staging projects and e2e navy swatches); these replace them by role, not one for one.

Re-running the loader changes nothing; an item the owner has edited since is kept unless `--update` is given. It refuses any host but `127.0.0.1` or `localhost` unless `--allow-remote` (https only), so the live site can be loaded later only when the owner chooses.

## Fixed copy in the shared bands (D-023)

Verified in `src/app/(public)/site/sections.jsx`, 14 October 2026. These bands appear on several pages so no page is left as a lone heading. Their text describes how HeritOS really works and holds no numbers, offers, deposits or client claims; edit it here and in the file together.

| Band | Where | Text (summary) |
|---|---|---|
| `PromiseBand` | Home (statement from the business name and area, or the home page body), About and How it works (the page body) | Label "How we work". Three numbered facts (no icons, D-029): made to your measurements; fittings by appointment, the date agreed in the written quote; follow your order online in your account |
| `ProcessBand` | Home, Services, a service, Our work, About, How it works, Company orders | Four steps: tell me what you need; measurement appointment and written quote; cutting and fittings once the quote is agreed; pay any balance and collect, with each stage in your account. Heading "From first message to handover" unless the How it works page is published, then its headline |
| `CompanyBand` | Home, Services, Company orders | Label "For teams and events"; "For teams, events and wedding parties", then four points: one quote billed to your company; each wearer measured and listed by name; the sample approved before production starts; handover recorded item by item. The action goes to `/company-orders` when published, otherwise `/contact?type=company` |
| Service "At a glance" card | A service page | The price note, or "Priced by quote: the cloth and the finish set the price"; measurements taken at your appointment; fittings by appointment; your order followed online |

Photographs in these bands come only from published content (the company or about page, a service, or a work cover). Without any, the band is text only.

## Copy rules

- No AI-sounding writing (D-029, 19 October 2026): no slogan pairs or triads ("X. Made for Y."), no "not just X, it is Y" contrasts, no one-line closers that repeat the brand line, no empty praise ("occasions that deserve it", "presentation that matches the meaning", "craft you can feel"), no small label that repeats the heading under it, and no claim the business has not made (a finish, a process, a promise). Say what is made, from which cloth, how it is ordered and what it costs to find out. The live-site wording was rewritten to these rules on 19 October 2026 in `scripts/content/real-content.php`; facts, the mission and vision statements and the tagline "Your culture, cut for now" are unchanged.
- Specific captions: what was made, a useful fabric or fit detail, and the occasion where permission exists.
- Useful information instead of repeated heritage slogans. Keep the local voice; since 19 October 2026 the site speaks as "we", as the live site did.
- British and Nigerian spelling (colour, honour), readable sentences, honest examples. Sentence case for headings and buttons; only the wordmark is all caps; no all-caps paragraphs. Fabric names are proper nouns: Ankara, Adire, Aso-Oke, Kente. Naira as `₦18,500`.
- No stock client logos, no team carousel, no animated statistics without a source, no urgency banner unless it reflects real booking capacity. Testimonials can be absent without the page looking unfinished.
- Social links: only verified URLs from CMS settings; unconfigured links are hidden. Today they fall back to platform home pages (A12).

## Photography

- Genuine cloth and garment photographs: front, back and detail, ideally on a consistent neutral backdrop. Workshop moments: measuring, cutting, stitching, finishing.
- Stock photographs (D-028) are mood only: cloth, tailoring tools, hands at work, workshop details and Lagos scenes, under the Unsplash or Pexels licence. Never a person wearing a finished garment, a garment shown as a product or as delivered work, a recognisable face as the subject, a logo or brand label, or any image on Our work, products or a project page. Alt text says what is shown and never claims it is Herit's work; a cloth whose origin is not known is not named as Adire, Aso-Oke or Ankara. Each one is listed with its source page, photographer, licence and any edit in `scripts/content/stock-photos.json`, and its media caption credits the photographer. Real photographs replace them as they arrive.
- Never AI-made garments presented as delivered work. African print illustrations ([DESIGN-SYSTEM.md](DESIGN-SYSTEM.md#african-print-art)) are drawn cloth, used for mood and empty states and always described as illustrations in their alt text; they never stand in for a photograph of a real piece.
- Client photos and reviews need explicit, separate publication permission ([BR-33](BUSINESS-RULES.md)).
- Strip location metadata from public images; keep public derivatives separate from private originals.
- No team carousel for a one-person business. A page without testimonials is not unfinished.

## SEO and performance

- Keep useful public URLs. Unique titles and descriptions, canonical URLs, Open Graph previews, correct robots rules.
- Sitemap (A24, in code on `feat/phase4-website`): `sitemap.php`, served at `/sitemap.xml`, lists only published public pages, services, portfolio projects, policies and, while the journal is on, journal posts ([API-SPEC.md](API-SPEC.md#sitemapphp)). `public/robots.txt` points at it and disallows sign-in, portal, checkout, preview and every current admin path. Robots is not access control.
- Truthful LocalBusiness and service structured data, using only verified public details. No self-serving review stars. `site.php?action=config` returns `jsonld`, a LocalBusiness built only from business profile facts that are set (null without a name, never ratings); the public site renders it. Test metadata and structured data with provider tools.
- Link previews (K-06, `feat/link-previews`): `index.html` carries public defaults that every crawler sees: title "Herit Clothing | Men's tailoring in Lagos" and description "Herit Clothing is a men's fashion and tailoring business in Lagos. Get in touch about clothing made to your measurements or about a company order." (only owner-confirmed facts; no garment list until the range is confirmed), plus `og:locale` `en_NG` and the square brand icon as `og:image` (K-19). Since the 18 October 2026 merge of #14 this is the same text as `DEFAULT_DESCRIPTION` in `useSeo.js` and `SPA_DEFAULT_DESCRIPTION` in `_cms.php`, so the first paint, the rendered page and an injected head agree. `spa.php` can fill each service, portfolio project and page with its own title, description and photograph for WhatsApp and Facebook; it is off until a live share test shows the defaults are not enough ([DEPLOYMENT.md](DEPLOYMENT.md#server-configuration)).
- Google can process JavaScript-generated data, but previews and crawlable content need verifying. Add static prerendering for a small set of marketing pages only if tests show the SPA approach falls short; no framework migration for SEO.
- Images: responsive AVIF or WebP, explicit dimensions, an efficient hero, lazy-loaded work photos below the fold. No heavy charts or editors on the landing page. Measure initial public requests before removing dependencies.
- Performance targets where field data exists: LCP 2.5s or less, INP 200ms or less, CLS 0.1 or less, at the 75th percentile. Before real traffic, record lab checks as lab evidence, not field passes ([docs/AUDIT.md](AUDIT.md)). A slow-network enquiry or booking must stay clear and recoverable.

## Analytics

The old plan chose Plausible and treated cookieless analytics as needing no consent. That is no longer assumed (D-017); evaluate the actual analytics and consent position under Nigerian rules ([DATA-PRIVACY.md](DATA-PRIVACY.md)). Track enquiry source, relevant enquiries, appointments and accepted jobs, not follower growth alone. Never put client references in analytics URLs.
