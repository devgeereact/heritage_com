# Research, coverage and evidence

Prepared 10 October 2026. Findings distinguish repository evidence, owner facts, external guidance and recommendations. This audit used public documentation searches, not connected private accounts. No customer data or credentials were transmitted for research.

## Confirmed owner context

Herit Clothing in Lagos; men's fashion and sewing; one self-employed operator. Needed outcomes: enquiries, measurement appointments and availability, client records, job/delivery progress, communication, customer reference access and feedback, portfolio, a professional informative website and consistent social profiles. Exact company service scope and capacity remain decisions.

## External research

The recommendations combine source inspection with the following authoritative references. These sources inform safeguards and practical product choices; they do not establish that this app already meets them.

| Source | Relevant finding and how used |
|---|---|
| [getdesign registry documentation](https://www.npmjs.com/package/getdesign?activeTab=code) | CLI supplies a DESIGN.md style reference and supports a custom output path. Used to save the requested Tesla reference without changing active project rules. |
| [OWASP object-level authorisation](https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/) | Record identifiers require ownership checks. Applied to client/job/measurement/company endpoints and two-client tests. |
| [OWASP authorisation guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) | Access rules should be enforced consistently. Applied to separating owner functions, customer records and company contacts. |
| [OWASP file upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) | Validate uploads and protect storage/access. Applied to private job photos and separately approved public images. |
| [OWASP REST security](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html) | Endpoint access and transport safeguards. Used for staging/session/error review requirements. |
| [NDPC: Nigeria Data Protection Act](https://www.ndpc.gov.ng/ndp-act-2023/) | Nigeria's data protection framework is the relevant starting point for the confirmed Lagos operation. No compliance status is asserted. |
| [NDPC FAQs](https://ndpc.gov.ng/faqs/) | Current obligations depend on the processing situation and classification. A solo business should not assume blanket exemption. Exact duties require confirmation. |
| [ICO retention guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/) | Supplementary explanation of purpose-based retention, not Nigerian legal authority. Used only to illustrate why keeping all data indefinitely is poor practice. |
| [W3C reflow](https://www.w3.org/WAI/WCAG21/Understanding/reflow) | Content needs to work at narrow widths/enlargement. Used for the phone/tablet and zoom acceptance matrix. |
| [W3C target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | AA minimum target requirement is 24px with exceptions. The proposed 44px product preference is deliberately stronger. |
| [W3C interaction animation](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) | Reduced motion supports users sensitive to movement. Applied as a product requirement; this criterion is AAA, not a claimed AA obligation. |
| [Google Web Vitals](https://web.dev/articles/vitals) | Current performance measures include LCP, INP and CLS, with field assessment at the 75th percentile. Used as targets, not current results. |
| [Google LocalBusiness data](https://developers.google.com/search/docs/appearance/structured-data/local-business) | Structured business facts can support discovery. Proposed only for verified public details. |
| [Google JavaScript structured data](https://developers.google.com/search/docs/appearance/structured-data/generate-structured-data-with-javascript) | JavaScript-generated structured data must be tested. SPA metadata/prerender decisions should follow actual crawl/preview checks. |
| [WhatsApp Business app](https://whatsappbusiness.com/products/business-app/) | Business profile and one-to-one communication fit small operators. Supports a simple manual-first communication choice. |
| [WhatsApp Communities](https://faq.whatsapp.com/495856382464992) and [privacy overview](https://faq.whatsapp.com/236979282604093) | Communities organise topic groups; contact visibility needs checking. Proposed optional announcements with private order conversations. |
| [LinkedIn Page setup](https://www.linkedin.com/help/linkedin/answer/a543852/creating-a-linkedin-page) | Business Pages have identity/company fields. Used for a truthful company profile draft rather than account creation. |
| [TikTok account types](https://support.tiktok.com/en/using-tiktok/growing-your-audience/switching-to-a-creator-or-business-account) | Account type changes business/profile capabilities. Verify the owner's current interface and commercial audio permissions before setup. |

Context7 was queried first for getdesign and returned no matching library. Fallback was registry documentation plus the actual CLI reference. No speculative new library/API implementation was generated. Existing framework behaviour is evaluated from source and local build, not unverified new setup instructions.

## Local coverage

Read project routing/task/MCP contracts, GEE OS skill and focused planning/existing-app references, preserved CLAUDE knowledge, README and old docs headings/relevant ranges. Reviewed product brief audience/roles/integrations/constraints. Enumerated repository files, app pages, PHP endpoints, schema tables, public assets, local branches and worktrees.

Critical paths inspected: route registration and frontend role guards; real API client/token storage; shared PHP authentication and CORS; public contact submission and staff enquiry page; tailoring creation/stages/measurements/payments/fitting; customer measurement updates; customer portal login/profile; retail tracking; CMS blog save/published reads; website content fallbacks, hero/team/statistics, navigation/social links; calendar state and demo data; service worker; ESLint and CI/deploy files.

Public surfaces catalogued: Home, About, Shop, Product, Cart, Checkout, Gifting, Contact, Track, Account, Blog and BlogPost. Public CSS has responsive and some reduced-motion/focus rules, so there is a useful starting point. That is not proof of visual consistency or accessibility conformance.

Admin areas catalogued in audit document 01 include all business modules plus kit demos. Catalogue/stock/suppliers/finance/marketing/AI/inbox integrations were surveyed through routes/API references and targeted evidence, not fully exercised against a database. Deep review of live secrets/config, hosting accounts and deployed tables is intentionally absent.

## Verification record

| Check | Result | Meaning / limits |
|---|---|---|
| git status --short before work | PASS | Tracked worktree initially clean |
| git worktree list --porcelain | PASS | One local worktree on main at d91951c |
| git branch -a / merged comparisons | PASS | Only main locally, cached origin/main; no local merge candidate |
| npm run lint | FAIL (coverage) | Exit 0, but the TS-only config checks none of the 473 source JS/JSX files (re-run 10 Oct) |
| npm run build | PASS | Vite production bundle built; Sass deprecations and large-chunk warnings remain |
| php php-api/tests/run.php | PASS | 34 pure helper checks, no database/network; payment validation/throttle helpers only |
| php -l for top-level php-api/*.php | PASS | 32 files pass PHP syntax, not functional/security proof |
| requested getdesign CLI | PASS | Tesla template saved in this folder; no active design rules overwritten |
| local production preview | PASS startup | Bound 127.0.0.1:5113; build's relative APIs do not use development's live API URL |
| Chrome DevTools new page | BLOCKED | Occupied profile error; existing browser was not stopped |
| Computer Use preview | BLOCKED | In-app browser unavailable; Chrome request-header policy failed to load |
| Rendered screenshot/device audit | NOT TESTED | Tool blockers prevented visual evidence |
| API/database/booking/client end-to-end | NOT TESTED | Requires safe staging and synthetic records |
| Production/remote account audit | NOT TESTED | No deployment, live endpoint probing, remote fetch or connected account use |
| Dependency vulnerability audit | NOT TESTED | No npm audit performed; add lockfile/runtime risk review in phase 1, avoid blind upgrades |
| Backup restoration | NOT TESTED | Needs authorised separate-environment exercise |
| Re-run 10 Oct: build, helper tests, php -l, worktrees | PASS | Build exit 0; 34/34 helper tests; all 32 PHP files pass syntax; one worktree on main at d91951c |
| Re-check of A01 to A20 by file and line, 10 Oct | PASS | All true in substance; A06 downgraded, A03 and A13 upgraded, A12 and A19 corrected; A21 to A24 added |
| Owner decisions, 10 Oct | Recorded | Men's scope; amber accent; invented website claims removed |

Build output is regenerable and ignored. Plan Markdown/reference files are the only task changes. No social account, business record, production schema, branch or worktree was created, merged or deleted.

## Limits and next audit

This is a detailed production plan with a risk-based source audit, not a completed penetration test, WCAG certification, live operational audit or exhaustive line-by-line review. Browser checks remain a specific gap. The next implementation contract should name staging, authorised integrations and the first safety batch before touching private records.

Required next evidence: actual phone/laptop screenshots and critical flows; all active endpoint/schema versions; customer object ownership; unsafe HTML/upload denial; concurrent booking/payment/reference behaviour; real notification states; owner recovery; backup restore. Public claims and exact men's services require owner proof/approval before publication.

## Old-plan decisions that need retiring after approval

The old brief mandates omnichannel inventory, multicurrency, Laravel and offline POS. The new plan recommends single-owner men's tailoring, current PHP stack, Naira-first verified payment records and online persistence. The old features list gives coupons and international gateways launch priority while measurements/fittings are lower. These are superseded only after approval, not silently patched now.

The old SEO plan treats cookieless analytics as automatically needing no consent and assumes greenfield URLs; neither should be copied as an unconditional legal/redirect rule. Evaluate the actual analytics and existing URLs. The old checklist also proposes a 14-day returns rule; do not present that as this business's confirmed Nigerian bespoke policy without review.

## Database table inventory

Verified 10 October 2026 from the CREATE TABLE statements in php-api/*.sql: 35 tables. abandoned_carts, audit_log, auth_tokens, blog_posts, campaigns, coupon_redemptions, coupons, customer_tokens, customers, enquiries, expenses, gift_cards, items, nps_responses, order_items, orders, payments, product_variants, products, purchase_order_items, purchase_orders, reviews, settings, stock_adjustments, store_credit, suppliers, tailoring_events, tailoring_groups, tailoring_orders, testimonials, users, waitlist, whatsapp_messages, whatsapp_templates, wishlist_items. `orders` and `purchase_orders` are defined in both schema.sql and schema_modules.sql. There is no appointments table. This is the source inventory, not proof of what the live database contains.

## Exact API source inventory

Enumerated 32 top-level PHP source files. This inventory is not deployed-version evidence.

`_lib.php`, `account.php`, `ai.php`, `ai_image.php`, `analytics.php`, `api.php`, `auth.php`, `config.sample.php`, `contact.php`, `content.php`, `coupons.php`, `customers.php`, `engage.php`, `export.php`, `inbox.php`, `loyalty.php`, `mail.php`, `marketing.php`, `orders.php`, `payments.php`, `products.php`, `referrals.php`, `reviews.php`, `settings.php`, `stats.php`, `stock.php`, `store.php`, `suppliers.php`, `tailoring.php`, `users.php`, `weather.php`, `whatsapp.php`.

## Exact application page inventory

Enumerated source pages, grouped by current module. Presence is not proof of working behaviour.

| Source group | Page files |
|---|---|
| `(admin)/advanced-ul` | `(admin)/advanced-ul/rating/page.jsx`, `(admin)/advanced-ul/scrollbar/page.jsx`, `(admin)/advanced-ul/sweet-alert/page.jsx`, `(admin)/advanced-ul/swiper-slider/page.jsx`, `(admin)/advanced-ul/toastify/page.jsx` |
| `(admin)/analytics` | `(admin)/analytics/page.jsx` |
| `(admin)/apps` | `(admin)/apps/calendar/page.jsx`, `(admin)/apps/chat/page.jsx`, `(admin)/apps/email/page.jsx`, `(admin)/apps/todo/page.jsx` |
| `(admin)/attributes` | `(admin)/attributes/attributes-add/page.jsx`, `(admin)/attributes/attributes-edit/page.jsx`, `(admin)/attributes/attributes-list/page.jsx` |
| `(admin)/base-ui` | `(admin)/base-ui/accordion/page.jsx`, `(admin)/base-ui/alerts/page.jsx`, `(admin)/base-ui/avatar/page.jsx`, `(admin)/base-ui/badge/page.jsx`, `(admin)/base-ui/breadcrumb/page.jsx`, `(admin)/base-ui/buttons/page.jsx`, `(admin)/base-ui/cards/page.jsx`, `(admin)/base-ui/carousel/page.jsx`, `(admin)/base-ui/collapse/page.jsx`, `(admin)/base-ui/dropdown/page.jsx`, `(admin)/base-ui/list-group/page.jsx`, `(admin)/base-ui/modals/page.jsx`, `(admin)/base-ui/offcanvas/page.jsx`, `(admin)/base-ui/pagination/page.jsx`, `(admin)/base-ui/placeholders/page.jsx`, `(admin)/base-ui/popovers/page.jsx`, `(admin)/base-ui/progress/page.jsx`, `(admin)/base-ui/spinners/page.jsx`, `(admin)/base-ui/tabs/page.jsx`, `(admin)/base-ui/toasts/page.jsx`, `(admin)/base-ui/tooltips/page.jsx` |
| `(admin)/catalogue` | `(admin)/catalogue/[id]/page.jsx`, `(admin)/catalogue/page.jsx` |
| `(admin)/category` | `(admin)/category/category-add/page.jsx`, `(admin)/category/category-edit/page.jsx`, `(admin)/category/category-list/page.jsx` |
| `(admin)/channels` | `(admin)/channels/page.jsx` |
| `(admin)/charts` | `(admin)/charts/area/page.jsx`, `(admin)/charts/bar/page.jsx`, `(admin)/charts/boxplot/page.jsx`, `(admin)/charts/bubble/page.jsx`, `(admin)/charts/candlestick/page.jsx`, `(admin)/charts/column/page.jsx`, `(admin)/charts/heatmap/page.jsx`, `(admin)/charts/line/page.jsx`, `(admin)/charts/mixed/page.jsx`, `(admin)/charts/pie/page.jsx`, `(admin)/charts/polar/page.jsx`, `(admin)/charts/radar/page.jsx`, `(admin)/charts/radialBar/page.jsx`, `(admin)/charts/scatter/page.jsx`, `(admin)/charts/timeline/page.jsx`, `(admin)/charts/treemap/page.jsx` |
| `(admin)/content` | `(admin)/content/page.jsx` |
| `(admin)/coupons` | `(admin)/coupons/coupons-add/page.jsx`, `(admin)/coupons/coupons-list/page.jsx`, `(admin)/coupons/page.jsx` |
| `(admin)/crm` | `(admin)/crm/[id]/page.jsx`, `(admin)/crm/page.jsx` |
| `(admin)/customer` | `(admin)/customer/customer-detail/page.jsx`, `(admin)/customer/customer-list/page.jsx` |
| `(admin)/dashboard` | `(admin)/dashboard/page.jsx` |
| `(admin)/engage` | `(admin)/engage/page.jsx` |
| `(admin)/enquiries` | `(admin)/enquiries/page.jsx` |
| `(admin)/finance` | `(admin)/finance/page.jsx` |
| `(admin)/forms` | `(admin)/forms/basic/page.jsx`, `(admin)/forms/checkbox/page.jsx`, `(admin)/forms/clipboard/page.jsx`, `(admin)/forms/editors/page.jsx`, `(admin)/forms/file-uploads/page.jsx`, `(admin)/forms/flat-picker/page.jsx`, `(admin)/forms/input-mask/page.jsx`, `(admin)/forms/range-slider/page.jsx`, `(admin)/forms/select/page.jsx`, `(admin)/forms/validation/page.jsx`, `(admin)/forms/wizard/page.jsx` |
| `(admin)/icons` | `(admin)/icons/boxicons/page.jsx`, `(admin)/icons/solaricons/page.jsx` |
| `(admin)/inbox` | `(admin)/inbox/page.jsx` |
| `(admin)/inventory` | `(admin)/inventory/received-orders/page.jsx`, `(admin)/inventory/warehouse/page.jsx` |
| `(admin)/invoice` | `(admin)/invoice/invoice-add/page.jsx`, `(admin)/invoice/invoice-details/page.jsx`, `(admin)/invoice/invoice-list/page.jsx` |
| `(admin)/loyalty` | `(admin)/loyalty/page.jsx` |
| `(admin)/maps` | `(admin)/maps/google/page.jsx`, `(admin)/maps/vector/page.jsx` |
| `(admin)/marketing` | `(admin)/marketing/page.jsx` |
| `(admin)/orders` | `(admin)/orders/order-cart/page.jsx`, `(admin)/orders/order-checkout/page.jsx`, `(admin)/orders/order-detail/page.jsx`, `(admin)/orders/orders-list/page.jsx` |
| `(admin)/pages` | `(admin)/pages/pages-404-alt/page.jsx`, `(admin)/pages/pricing/page.jsx`, `(admin)/pages/timeline/page.jsx`, `(admin)/pages/welcome/page.jsx` |
| `(admin)/permissions` | `(admin)/permissions/page.jsx` |
| `(admin)/pos` | `(admin)/pos/page.jsx` |
| `(admin)/products` | `(admin)/products/[productId]/page.jsx`, `(admin)/products/product-add/page.jsx`, `(admin)/products/product-edit/page.jsx`, `(admin)/products/product-grid/page.jsx`, `(admin)/products/product-list/page.jsx` |
| `(admin)/profile` | `(admin)/profile/page.jsx` |
| `(admin)/purchases` | `(admin)/purchases/purchase-list/page.jsx`, `(admin)/purchases/purchase-order/page.jsx`, `(admin)/purchases/purchase-returns/page.jsx` |
| `(admin)/review` | `(admin)/review/page.jsx` |
| `(admin)/reviews` | `(admin)/reviews/page.jsx` |
| `(admin)/role` | `(admin)/role/role-add/page.jsx`, `(admin)/role/role-edit/page.jsx`, `(admin)/role/role-list/page.jsx` |
| `(admin)/sales` | `(admin)/sales/[id]/page.jsx`, `(admin)/sales/page.jsx` |
| `(admin)/seller` | `(admin)/seller/seller-add/page.jsx`, `(admin)/seller/seller-details/page.jsx`, `(admin)/seller/seller-edit/page.jsx`, `(admin)/seller/seller-list/page.jsx` |
| `(admin)/settings` | `(admin)/settings/page.jsx` |
| `(admin)/stock` | `(admin)/stock/page.jsx` |
| `(admin)/studio` | `(admin)/studio/page.jsx` |
| `(admin)/suppliers` | `(admin)/suppliers/page.jsx` |
| `(admin)/support` | `(admin)/support/faqs/page.jsx`, `(admin)/support/help-center/page.jsx`, `(admin)/support/privacy-policy/page.jsx` |
| `(admin)/tables` | `(admin)/tables/basic/page.jsx`, `(admin)/tables/gridjs/page.jsx` |
| `(admin)/tailoring` | `(admin)/tailoring/[id]/page.jsx`, `(admin)/tailoring/groups/page.jsx`, `(admin)/tailoring/page.jsx` |
| `(admin)/team` | `(admin)/team/page.jsx` |
| `(admin)/weather` | `(admin)/weather/page.jsx` |
| `(admin)/whatsapp` | `(admin)/whatsapp/page.jsx` |
| `(admin)/widgets` | `(admin)/widgets/page.jsx` |
| `(other)/auth` | `(other)/auth/lock-screen/page.jsx`, `(other)/auth/reset-pass/page.jsx`, `(other)/auth/sign-in/page.jsx`, `(other)/auth/sign-up/page.jsx` |
| `(other)/coming-soon` | `(other)/coming-soon/page.jsx` |
| `(other)/maintenance` | `(other)/maintenance/page.jsx` |
| `(other)/pages-404` | `(other)/pages-404/page.jsx` |
