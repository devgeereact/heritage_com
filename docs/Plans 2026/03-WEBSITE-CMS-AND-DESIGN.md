# Website, CMS and shared design

## Positioning

Herit Clothing is a men's fashion and tailoring business in Lagos, operated by its owner. Present care, fit, real craft and a clear order process. Company buyers should find a useful service brief and a dependable point of contact, not unsupported claims about factory scale.

Draft headline: “Men's clothing, made with care in Lagos.”

Draft supporting copy: “Tell me what you want to make. I will discuss the fabric, fit and finish, arrange your measurements and agree the work before sewing begins.”

Primary action: “Book a measurement appointment”. Secondary action: “Discuss a company order”. Until public booking is genuinely working, use “Request a measurement appointment”. Never label an enquiry as a confirmed booking.

Avoid fabricated years of experience, team members, customer counts, delivery countries, discount offers, performance percentages and client logos. The current home page (HomePage.jsx:62-99, 218) shows 1200+ pieces, 18 countries, 98% repeat intent, four named staff, four named testimonials (content.js:35-38), free Lagos delivery over ₦25,000 and a HERIT10 discount. Owner-confirmed 10 October 2026: none of these are real. All are removed in the website phase and replaced with the owner's own story and real finished work. Any future offer is a deliberate owner decision, enforced in code before it is advertised.

## Site architecture

Top navigation: Services, Our work, How it works, About, Contact. A clear Book appointment button sits alongside a quieter Track your job link. Mobile menu exposes both. Company orders get a prominent service section/page. Ready-to-wear and Journal are secondary only when maintained.

| Page / section | Contents and action | Evidence needed |
|---|---|---|
| Home hero | One real garment/workshop image; short men's tailoring proposition; booking and company enquiry actions | Approved image rights, genuine garment and current availability |
| Services preview | Men's made-to-measure and other confirmed men's garment services | Actual garment range, fabric policy and pricing approach |
| Our work preview | Four to six real finished projects with garment, fabric, fit and purpose | Photo/client permission and true project notes |
| How it works | Discuss > measure > agree quote > sew/fit > collect/deliver | Actual order and deposit policy |
| Company orders | Coordinated men's garments; quantity, date, sample and fit process | Capacity, minimum quantities and delivery coverage, if any |
| Craft / owner story | Real owner portrait/workshop, why the business exists and how quality is checked | Owner-approved biography; no fictional staff |
| Reviews | Consented attributable reviews or omit until collected | Recorded publication permission |
| FAQs | Fabric supply, measurements, appointment location, timing, deposits, changes, delivery and aftercare | Confirmed policy, no invented guarantees |
| Final action | Request an appointment / send your brief | Working form and truthful response time |
| Footer | Contact, business hours, location/service area, verified social links, privacy and terms | Current approved business details |
| Services detail | Who the service helps, examples, options, what is included, process and quote action | Owner confirms exact services |
| Portfolio detail | Brief, garment, fabric, useful close-ups, result and next enquiry action | No client IDs, measurement sheets or private filenames |
| Company service page | Garment scope, sample approval, wearer measurements/size collection, milestones, invoice/PO handling | Approved scope and attainable timelines |
| About | Solo business story and working method | Real biography and photos |
| Contact / quote | Short enquiry form, channel alternatives and hours | Correct contact and form persistence |
| Booking | Type > available time > contact > request confirmation | Real availability backend, privacy and conflict handling |
| Track / client area | Reference entry and verified access; simple job timeline | Access tests and approved public status mapping |
| Policies | Privacy; quote/payment/change/collection terms; alterations and delivery arrangements | Actual practices and local review where needed |
| Optional Shop | Only real published stock; honest unavailable states | Catalogue/price/stock fulfilment verified |
| Optional Journal | Practical garment care, measuring and project stories | Time to maintain and genuine authorship |

## Service recommendations to confirm

Core advertised service: men's fashion and tailoring. Candidate men's garments include shirts, trousers, coordinated two-piece sets and traditional occasion wear. Alterations, repairs, group/event outfits and business/team garments may be useful, but must be approved individually before appearing as services. Do not assume suits, embroidery, corporate uniforms, women's wear, worldwide shipping or same-day work are available.

Company hook draft: “A clear process for coordinated men's clothing.” Supporting text: “Share the garment type, number of pieces and required date. I will confirm whether the work fits my capacity, discuss a sample and measurement approach, and provide a written quote.” CTA: “Send your company brief”.

Form fields: company name, contact name, phone/email, garment type, approximate quantity, required date, material responsibility and short brief. Optional attachment comes later only with safe private storage. Company name must not reuse contact.php's current honeypot field.

## Content quality and photography

Use genuine cloth and garment photographs, ideally front/back/detail and a consistent neutral backdrop. Include workshop details such as measuring, cutting, stitching and finishing. Images should show the actual work, not generic fabric gradients or AI-made garments presented as delivered projects.

Write specific captions: what was made, useful fabric/fit detail and the occasion where permission exists. Replace repeated heritage slogans with useful information. Keep the local voice and the owner's first person where appropriate. Use British/Nigerian spelling, readable sentences and honest examples.

No stock client logos. No team carousel for a one-person business. No animated statistics without a source. No urgency banner unless it reflects actual booking capacity. Testimonials can be absent without making the page look unfinished.

## CMS links and publication

Extend the existing content.php/settings.php/store.php pattern, not a second CMS. The server owns business details and published content; the website consumes a strictly public projection. Private job/client data remains behind authorisation.

| Authoritative record | Website consumers | App consumers | Rules |
|---|---|---|---|
| Business profile | Footer, contact, social links, metadata | Settings, quote/receipt header | One name, phone, location, hours, verified URLs; no placeholder fallback |
| Services | Home/service pages/enquiry choices | Quote/job type choices | Stable service ID; draft/published; don't retire a historical job's service name |
| Portfolio projects | Home/work pages/social draft | Website editor, optional private source-job link | Public copy/images separate from private job; approved permissions |
| Appointment availability | Booking free slots | Calendar | Server-computed; no public client details |
| Journal posts | Blog list/details/related articles | Content editor | Draft/published, sanitised body, slug, metadata; valid 404 for unpublished/missing |
| Reviews | Home/service proof | Moderation/feedback | Publication consent; private feedback separate |
| Forms and social destinations | CTAs/footer/contact | Business settings | Allowlist safe schemes/domains; hide missing links |
| Job progress projection | Verified client area | Jobs | Explicit safe status/date fields; no internal notes/costs |

CMS workflow: edit draft > preview mobile and desktop > review permissions/copy > publish > confirm website result. Drafts should not overwrite public content until publish. Keep a previous version to roll back a mistaken edit. Avoid a general drag-and-drop page builder. Fixed section order with editable content is enough.

Failure behaviour: show a clear unavailable message, last verified public content where suitable, or omit optional sections. Never resurrect sample products, fabricated reviews or old offers when API returns empty. A deliberately empty catalogue must remain empty. Changed/unpublished content must invalidate the relevant cache. No credentials, private IDs or internal notes in public JSON.

Social integration initially means verified links and a prepared caption/image export. Blog publishing does not automatically post to social accounts. External publication is an explicit owner action. This avoids API costs and complex permission management.

## Shared Tesla-based guide

The requested command was run as npx getdesign@latest add tesla --out 'docs/Plans 2026/TESLA-DESIGN-REFERENCE.md'. Context7 returned no getdesign library, so the registry documentation and actual downloaded reference were used. The template is an independently authored style reference, not an official Tesla specification and not an instruction to use Tesla assets.

Apply its core visual language: restrained neutral surfaces, sparse decoration, photography-led public sections, clear two-action hierarchies, consistent typography and predictable transitions. Explicit Herit adaptations are necessary for working forms and sensitive records. Owner-confirmed 10 October 2026: Herit amber stays as the single accent instead of Tesla blue. Approval retires the old “Tack Stitch” and warm-shadow guidance; the Tack Stitch was documented but never implemented (A23), so retiring it changes no code. Do not keep old and new rules active together.

| Category | Proposed Herit contract |
|---|---|
| Palette | Surfaces white #FFFFFF and alternate #F4F4F4; primary text #171A20; body #393C41; muted #5C5E62; subtle border #D0D1D2. Accent (owner-confirmed): Herit amber #F59E0B for primary buttons, always with #171A20 text. Amber text and links use darker amber #B45309. Tesla blue #3E6AE1 is not used. Measured contrast (WCAG formula, 10 Oct 2026): #171A20 on #F59E0B 8.11:1; #B45309 on white 5.02:1; #171A20 on white 17.43:1; #393C41 on white 11.07:1; #5C5E62 on white 6.5:1 and on #F4F4F4 5.91:1. Amber #F59E0B as text on white is 2.15:1 and fails, so it is never used that way. Fabric photography carries the rest of the colour. |
| Typeface | Inter for app, forms and public body text. Source Serif 4 (already loaded, index.html:17) kept for public headings only, as a deliberate deviation from the Tesla template that preserves Herit identity; the owner can drop it. Licence-safe local or Google-hosted fonts only; never Tesla's proprietary Universal Sans. |
| Scale | Body/forms 16px minimum by default; caption 13-14px; app H1 28-32px; public hero 36px phone to 56px desktop. Comfortable line height, no all-caps paragraphs. |
| Spacing | 4/8/12/16/24/32/48/64 scale. App containers around 1200px; public reading text around 65 characters; section spacing 40px phone, 72-96px desktop. |
| Surfaces | Mostly flat, light neutral backgrounds; thin useful dividers; reserve elevation for dropdowns/dialogs. No decorative dashed borders (the documented Tack Stitch is retired, A23) and no dashboard glass layers. |
| Controls | 44px preferred minimum touch area, 48px primary form controls; one primary action per task; secondary outlined/neutral button; danger action separated and labelled. |
| Forms | Persistent labels, example/help below, required fields marked, grouped sections, inline errors and error summary. Visible saving/saved/failed. No placeholder-only fields. |
| Status | Text plus icon/colour: pending, confirmed, due, overdue, ready. Add accessible semantic success/warning/error colours, an explicit adaptation of the marketing-oriented reference. |
| Navigation | Predictable desktop sidebar; phone navigation and More; clear current location. Public header gains an opaque background when imagery would reduce contrast. |
| Icons | One existing icon family, consistent stroke/size; icons accompany meaning, not replace labels for important tasks. |
| Data display | Short readable rows/cards, clear amounts/units/dates, tabular figures; secondary data collapsed on phones. No editable spreadsheet for everyday measurement capture. |
| Modal | Short actions only; large client/job edits on full pages. Keep focus trapped and returned correctly. |
| Themes | Deliver and test a clear light theme first. Existing dark controls remain supported only if verified; avoid doubling work during initial polish. |
| Source | One approved design document and one implemented token layer. Today the public site (site.css:10-41) and the admin (heritos-admin.css plus SCSS variables) define separate token sets with the same values; merge them into one layer so a colour change happens once. |

Contrast figures above are calculated from the token values, not measured on rendered pages. Re-check the rendered combinations, including disabled and hover states, during the website phase. The original design file also claims both themes pass AA without runtime evidence; remove this as a blanket statement during documentation migration.

## Motion and responsive behaviour

Public hero: one authentic image or short optional muted clip with a poster. A gentle opacity transition and small 8-12px entrance can add life. Avoid an autoplay hero carousel as the primary explanation. No scroll hijacking, cursor effects, large parallax, forced viewport-height text clipping or continuously moving ticker.

UI actions use about 180-250ms transitions; optional section reveals 300-400ms. Follow the reference's roughly 330ms motion where helpful, but the app prioritises immediate feedback. Content must be visible without JavaScript animation. No animation during measurement entry or amount editing.

Respect reduced-motion preferences with static equivalents. Any motion continuing automatically needs a visible pause/stop control where applicable; a hover-only pause is insufficient for touch and keyboard users. The W3C interaction-animation guidance is AAA, but reduced motion is a sensible product requirement independently of the AA target.

Test 320, 375/390, 768, 1024 and 1440 CSS-pixel widths; portrait/landscape; text enlarged 200%; reflow at narrow equivalent widths; keyboard navigation and visible, unobscured focus. WCAG 2.2 AA target minimum is 24px with exceptions; the product's 44px preference is intentionally more usable. Tables may have local horizontal scrolling where essential, but the whole page should not overflow. Sticky actions must not cover inputs or phone keyboard content.

## SEO and performance

Keep useful public URLs, unique titles/descriptions, canonical URLs, Open Graph previews, sitemap and correct robots rules. Private client/admin pages should not be indexed, but robots is not access control. Review the existing robots file against actual routes.

Use truthful LocalBusiness/service details and real image alt text. Do not add self-serving review stars expecting Google eligibility. Test metadata/structured data with provider tools. Google can process JavaScript-generated data, but reliable previews and crawlable public content need verification. Add static prerendering for a small set of marketing pages only if tests show the SPA approach is insufficient; no framework migration solely for SEO.

Compress responsive AVIF/WebP images, set dimensions, load the hero efficiently and lazy-load below-fold work photos. Do not ship heavy charts/editors to the landing page. Measure initial public requests before removing dependencies. Target field Core Web Vitals where data exists: LCP <=2.5s, INP <=200ms, CLS <=0.1. Before traffic is available, record lab checks as lab evidence, not field passes. A slow-network enquiry/booking must still be clear and recoverable.

## Acceptance

Update a service, phone number and social URL in CMS, publish, and verify all public consumers use the approved value. Unpublish a review/post and confirm no fallback recreates it. Test malicious HTML/URLs. Complete booking/enquiry on phone and keyboard without losing entered details. Confirm no fictional proof or private record appears anywhere public. Visual sign-off requires actual screenshots and device checks, currently NOT TESTED.
