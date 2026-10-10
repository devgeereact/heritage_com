# Content and social

What the website and social profiles say, and how content gets published. The public story is simple: a men's fashion and tailoring business in Lagos, run by its owner, showing real work and a clear order process. Nothing here has been published; the profile drafts below are ready to edit, and publishing needs a separate authorised task (owner decision, 10 October 2026).

## Positioning

Present care, fit, real craft and a clear order process. Company buyers find a useful service brief and a dependable point of contact, not claims about factory scale.

- Draft headline: "Men's clothing, made with care in Lagos."
- Draft supporting copy: "Tell me what you want to make. I will discuss the fabric, fit and finish, arrange your measurements and agree the work before sewing begins."
- Primary action: "Book a measurement appointment". Until public booking really works, use "Request a measurement appointment". Never label an enquiry as a confirmed booking.
- Secondary action: "Discuss a company order".

### Claims that come down

Owner-confirmed 10 October 2026: none of these are real, and all are removed in the website phase.

| Claim | Where (Verified) |
|---|---|
| 1200+ pieces delivered, 18 countries, 98% would order again | HomePage.jsx:62-99 |
| Four named staff: Amara Okafor, Tunde Bello, Zainab Yusuf, Chidi Eze | HomePage.jsx |
| Four named testimonials | site/content.js:35-38 |
| Free Lagos delivery over ₦25,000 | HomePage.jsx; enforced in store.php:33, 196 |
| "10% off your first piece, code HERIT10" | HomePage.jsx:96, 218; the coupon has no first-order check (A22) |
| Sample blog posts and static products priced ₦18,500 to ₦68,000 | Fallbacks in site/products.js:19-84 |

They are replaced with the owner's own story and real finished work. Any future offer is a deliberate owner decision, enforced in code before it is advertised. Avoid invented years of experience, team members, customer counts, delivery countries, discounts, performance percentages and client logos.

## Site architecture

Top navigation: Services, Our work, How it works, About, Contact. A clear Book appointment button sits beside a quieter Track your job link; the mobile menu shows both. Company orders get a prominent section or page. Ready-to-wear and Journal are secondary, and only while maintained.

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

Current public routes are listed in [ARCHITECTURE.md](ARCHITECTURE.md#route-inventory). Keep useful existing URLs; any rename needs redirects.

## Company order hook

- Draft: "A clear process for coordinated men's clothing."
- Supporting text: "Share the garment type, number of pieces and required date. I will confirm whether the work fits my capacity, discuss a sample and measurement approach, and provide a written quote."
- Action: "Send your company brief".
- Form fields: company name, contact name, phone or email, garment type, approximate quantity, required date, material responsibility, short brief. Attachments come later and only with safe private storage. The company name field must not reuse the `company` honeypot in contact.php (A11).

## Copy rules

- Specific captions: what was made, a useful fabric or fit detail, and the occasion where permission exists.
- Useful information instead of repeated heritage slogans. Keep the local voice and the owner's first person where it fits.
- British and Nigerian spelling, readable sentences, honest examples. Sentence case. Naira as `₦18,500`.
- No stock client logos, no team carousel, no animated statistics without a source, no urgency banner unless it reflects real booking capacity. Testimonials can be absent without the page looking unfinished.
- Social links: only verified URLs from CMS settings; unconfigured links are hidden (today they fall back to platform home pages, A12).

## Photography

Genuine cloth and garment photographs, ideally front, back and detail on a consistent neutral backdrop, plus workshop moments: measuring, cutting, stitching, finishing. Never generic fabric gradients or AI-made garments presented as delivered projects. Client photos need explicit publication permission. Strip location metadata from public images. Full visual rules: [DESIGN.md](DESIGN.md#content-and-photography).

## SEO and performance

- Keep useful public URLs. Unique titles and descriptions, canonical URLs, Open Graph previews, correct robots rules.
- `public/robots.txt` exists; there is no sitemap (A24). Generate one for public pages only in the website phase. Review robots against actual routes. Private client and admin pages are not indexed, but robots is not access control.
- Truthful LocalBusiness and service structured data, using only verified public details. No self-serving review stars. Test metadata and structured data with provider tools.
- Google can process JavaScript-generated data, but previews and crawlable content need verifying. Add static prerendering for a small set of marketing pages only if tests show the SPA approach falls short; no framework migration for SEO.
- Images: responsive AVIF or WebP, explicit dimensions, an efficient hero, lazy-loaded work photos below the fold. No heavy charts or editors on the landing page. Measure initial public requests before removing dependencies.
- Targets where field data exists: LCP 2.5s or less, INP 200ms or less, CLS 0.1 or less, at the 75th percentile. Before real traffic, record lab checks as lab evidence, not field passes. A slow-network enquiry or booking must stay clear and recoverable.
- Analytics: the old plan chose Plausible and treated cookieless analytics as needing no consent. That is no longer assumed; evaluate the actual analytics and consent position under Nigerian rules (see [OPERATIONS.md](OPERATIONS.md#privacy-and-nigeria-notes)). Track enquiry source, relevant enquiries, appointments and accepted jobs. Never put client references in analytics URLs.

## Social profiles

### Identity

Use Herit Clothing consistently: men's fashion and tailoring in Lagos (Owner-confirmed 10 October 2026), with the real logo, owner and work photographs. Suggested handle `@heritclothing`, subject to availability and current ownership; alternative `@heritclothinglagos`. Keep the same stem across platforms where possible. Check existing profiles before creating anything, so no duplicates appear. Use an owner-controlled business email and a verified contact number; no credentials in CMS or docs.

CMS settings store only public profile URLs. The website and quote and contact surfaces use them. A saved link grants the app no publishing authority.

### Instagram

Display name: Herit Clothing | Men's Tailoring

Bio draft:

Men's fashion & tailoring in Lagos.
Made to your measurements, with care.
Appointments and enquiries ↓

Link: the confirmed website appointment/enquiry page. If unavailable, link to the working contact page rather than a nonfunctional booking form. Professional account category should match the options available in the owner's account; do not invent a category name.

Highlights: Start here, Services, Our work, Measurements, Process, Reviews, FAQs. Use real photos and short clear covers. Pin three posts: meet the owner, what can be made, how to order. Include company enquiries in Services rather than making unsupported uniform promises.

### Facebook

Page name: Herit Clothing

Intro draft: “Men's fashion and tailoring in Lagos. Discuss your garment, arrange measurements and follow a clear process from quote to collection.”

About draft: “Herit Clothing is an owner-run men's tailoring business in Lagos. I work with clients to agree the garment, fabric, fit and finish before sewing begins. For an individual piece or coordinated men's clothing enquiry, send your requirements and preferred date so I can confirm the options and capacity.”

Add real hours/location/service area, website and WhatsApp contact. Choose the closest genuine page category and a relevant contact action. Cover image: one approved finished garment/workshop photo, brand name and concise service line. Never place small dense price lists in the banner.

### LinkedIn

Page name: Herit Clothing

Tagline draft: “Men's fashion and tailoring in Lagos, with a clear process from brief to delivery.”

About draft: “Herit Clothing is an owner-run men's fashion and tailoring business in Lagos. I help clients turn a garment brief into agreed work, with attention to measurements, fabric, fit and finishing. For company or coordinated orders, the process starts with a discussion of garment type, quantity, required date and production capacity. A written quote and any necessary sample approval come before confirmed production. Contact Herit Clothing to discuss your requirements.”

Choose truthful company size, organisation type and industry fields from the available interface. Do not list fictitious employees or claim incorporation/certifications without evidence. Link the owner's genuine professional profile if desired. Banner: real garment detail plus “Men's tailoring. Clear process. Careful finishing.” LinkedIn supports company Pages, but creation/ownership requirements need checking at setup time.

### TikTok

Display name: Herit Clothing

Bio draft: “Men's tailoring in Lagos. Real work, from cloth to finish. Enquire below.”

Use genuine short process videos: fabric selection, a safe measuring explanation, cutting detail, finishing and final garment. Do not show a client's measurement sheet or contact details. Business account link/features and audio licensing must be checked in the current region/account; use original audio or permitted commercial music.

Pin: introduction, how appointments work, one real completed project. No daily posting requirement and no invented viral scripts.

### WhatsApp Business and Community

Business name: Herit Clothing

Description draft: “Men's fashion and tailoring in Lagos. Message with your garment idea and preferred date to discuss an appointment and quote.”

Greeting draft: “Hello, thank you for contacting Herit Clothing. Please share your name, the garment you would like made and your preferred completion date. I will reply during my working hours to discuss the next step.”

Away draft: “Thank you for your message. I am away from the phone at the moment and will reply during the next working period. Your appointment or order is confirmed only after we have agreed the details.”

Suggested labels: New enquiry, Appointment requested, Quote sent, Active job, Ready, Balance due, Completed. These are business-app organisation aids, not guaranteed automatic CMS sync.

Quick reply drafts:

- Appointment: “Please tell me whether you need measurements, a fitting or collection. I will confirm available times and the location.”
- Company brief: “Please share garment type, approximate quantity, required date and who will approve the sample. I will check capacity before quoting.”
- Status: “Please send your job reference privately. I will check the current progress.”
- Feedback: “Thank you for ordering. Please tell me how the fit and finish worked for you. Feedback stays private unless you separately agree to publication.”

Community name draft: Herit Clothing | Work & Updates

Description draft: “An optional space for new work, garment care and appointment availability. Keep personal orders, payments and measurements in a private message. Joining is voluntary; you can leave at any time.”

Launch structure: one announcements group only. Add a discussion group only if the owner has time to moderate. Before inviting clients, inspect current Community/group privacy behaviour and tell members how their profile/contact may be visible. Do not imply every subgroup hides phone numbers. No automatic addition of clients, public job reference lists or measurement discussions. Consider postponing the Community if Instagram/WhatsApp Business already cover the real need.

### Visual profile kit

One logo crop tested in a circular avatar; one owner or workshop portrait; one horizontal banner; one vertical process-video cover; one simple project-caption style. Same typography, Herit amber accent and real fabric images as the website. No platform-specific rebrands, AI portraits, repeated giant slogans or fake luxury badges.

Crop assets to the current upload interface and check phone previews rather than freezing dimensions that may go out of date. Store reusable public source images in the existing asset structure, not one folder per platform.

## Publishing rhythm

Two pieces of content a week, adapted across platforms, not ten separate posts. Record a few clips during real work; write captions in one short weekly session.

| Week | Main story | Companion | Action |
|---|---|---|---|
| 1 | Introduce the owner and confirmed services | How an appointment works | Request appointment |
| 2 | A genuine completed men's garment | Fabric or fit explanation | Discuss a similar piece |
| 3 | Process detail: cutting or finishing | What to bring to measurements | Send garment brief |
| 4 | Company or coordinated enquiry process | Consented feedback or a care tip | Discuss quantity and date |

- Instagram and Facebook: project photos and short clips.
- TikTok: the same process footage with an honest short explanation.
- LinkedIn: one practical company-order, craft or process story every other week.
- WhatsApp Community: one useful update a week or less.

Adjust to the time actually available. Keep one short content list: topic, source image or video, draft caption, consent checked, planned date, published URLs. Existing marketing and CMS records can hold drafts if useful. Automatic scheduling and social APIs are optional later.

Social integration means verified links plus a prepared caption and image export. Blog publishing never posts to social accounts automatically; external publication is always an explicit owner action.

## Conversion and moderation

- Every profile leads to one working enquiry or booking destination. Simple source tags where useful.
- Measure enquiries, appointments and accepted jobs, not follower growth alone.
- Reply within an owner-approved realistic window. No promises of instant replies or 24/7 support. Move order details to private channels.
- Remove spam, impersonation and exposed personal records promptly. Do not argue publicly about private complaints; record the resolution privately on the job.

## Setup acceptance

Verify each existing account, its ownership and handle before any edit. Preview bio, contact details and cover on a phone. Test website and contact links, and confirm the CMS footer uses the same verified URLs. Turn on platform account recovery and MFA. Publish only after the owner approves facts, asset rights and final text. No social account action has been taken.
