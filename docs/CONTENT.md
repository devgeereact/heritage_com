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

## Copy rules

- Specific captions: what was made, a useful fabric or fit detail, and the occasion where permission exists.
- Useful information instead of repeated heritage slogans. Keep the local voice and the owner's first person where it fits.
- British and Nigerian spelling (colour, honour), readable sentences, honest examples. Sentence case for headings and buttons; only the wordmark is all caps; no all-caps paragraphs. Fabric names are proper nouns: Ankara, Adire, Aso-Oke, Kente. Naira as `₦18,500`.
- No stock client logos, no team carousel, no animated statistics without a source, no urgency banner unless it reflects real booking capacity. Testimonials can be absent without the page looking unfinished.
- Social links: only verified URLs from CMS settings; unconfigured links are hidden. Today they fall back to platform home pages (A12).

## Photography

- Genuine cloth and garment photographs: front, back and detail, ideally on a consistent neutral backdrop. Workshop moments: measuring, cutting, stitching, finishing.
- Never generic fabric gradients, and never AI-made garments presented as delivered work.
- Client photos and reviews need explicit, separate publication permission ([BR-33](BUSINESS-RULES.md)).
- Strip location metadata from public images; keep public derivatives separate from private originals.
- No team carousel for a one-person business. A page without testimonials is not unfinished.

## SEO and performance

- Keep useful public URLs. Unique titles and descriptions, canonical URLs, Open Graph previews, correct robots rules.
- Sitemap (A24, in code on `feat/phase4-website`): `sitemap.php`, served at `/sitemap.xml`, lists only published public pages, services, portfolio projects, policies and, while the journal is on, journal posts ([API-SPEC.md](API-SPEC.md#sitemapphp)). `public/robots.txt` points at it and disallows sign-in, portal, checkout, preview and every current admin path. Robots is not access control.
- Truthful LocalBusiness and service structured data, using only verified public details. No self-serving review stars. `site.php?action=config` returns `jsonld`, a LocalBusiness built only from business profile facts that are set (null without a name, never ratings); the public site renders it. Test metadata and structured data with provider tools.
- Google can process JavaScript-generated data, but previews and crawlable content need verifying. Add static prerendering for a small set of marketing pages only if tests show the SPA approach falls short; no framework migration for SEO.
- Images: responsive AVIF or WebP, explicit dimensions, an efficient hero, lazy-loaded work photos below the fold. No heavy charts or editors on the landing page. Measure initial public requests before removing dependencies.
- Performance targets where field data exists: LCP 2.5s or less, INP 200ms or less, CLS 0.1 or less, at the 75th percentile. Before real traffic, record lab checks as lab evidence, not field passes ([qa/PERFORMANCE-AUDIT.md](../qa/PERFORMANCE-AUDIT.md)). A slow-network enquiry or booking must stay clear and recoverable.

## Analytics

The old plan chose Plausible and treated cookieless analytics as needing no consent. That is no longer assumed (D-017); evaluate the actual analytics and consent position under Nigerian rules ([DATA-PRIVACY.md](DATA-PRIVACY.md)). Track enquiry source, relevant enquiries, appointments and accepted jobs, not follower growth alone. Never put client references in analytics URLs.
