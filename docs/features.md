# HeritOS — Feature Checklist

Herit Clothing · *Wear your heritage.* The commerce & operations platform: storefront, admin, Ajuwon Market POS, and the bespoke craft engine.

**Priority key** — `P0` launch contract (Must, must ship to sell) · `P1` high-value next (Should) · `P2` backlog (Could / later phase). Roughly 180 features across 18 modules; build P0 first, pull the rest forward phase by phase.

---

## 01 · Authentication & access control
- [ ] Sign in / sign out — `P0` · customer, all staff
- [ ] Customer registration (email + phone) — `P0` · customer
- [ ] Forgot / reset password — `P0` · all
- [ ] OTP verification (SMS / WhatsApp) — `P0` · customer
- [ ] Guest checkout (no forced account) — `P0` · customer
- [ ] Role-based access control (8 roles) — `P0` · owner
- [ ] Error pages (400/403/404/500/503) — `P0` · all
- [ ] SSO — Google / Apple (OAuth 2.0) — `P1` · customer
- [ ] Staff PIN login (shared market device) — `P1` · staff
- [ ] Session management & device tracking — `P1` · owner

## 02 · Dashboard & analytics
- [ ] Owner overview dashboard — `P0` · owner
- [ ] Sales KPIs (revenue, orders, AOV, units) — `P0` · owner
- [ ] Data export (CSV, PDF, XLSX) — `P0` · owner, manager
- [ ] Channel split (online / POS / social) — `P1` · owner
- [ ] Best / worst sellers by product & fabric — `P1` · owner, manager
- [ ] Low / out-of-stock alerts — `P1` · owner, manager
- [ ] Revenue by region / country — `P1` · owner
- [ ] Recent activity feed / timeline — `P1` · owner, manager
- [ ] Margin & cash-flow view — `P2` · owner
- [ ] Scheduled email / WhatsApp reports — `P2` · owner

## 03 · Product & catalogue management
- [ ] Product list (grid/list) + search & filter — `P0` · owner, manager
- [ ] Add / edit / delete product — `P0` · owner, manager
- [ ] Variants (size, colour, fit, length) — `P0` · owner, manager
- [ ] Fabric attributes + origin & meaning — `P0` · owner, manager
- [ ] Storytelling / rich-text fields — `P0` · owner, manager
- [ ] Images, zoom, video, 360° — `P0` · owner, manager
- [ ] Collections & timed drops — `P0` · owner, manager
- [ ] Draft / scheduled publish — `P0` · owner, manager
- [ ] SEO fields per product — `P0` · owner, manager
- [ ] Care instructions per fabric — `P1` · owner, manager
- [ ] One-of-a-kind flag (single-qty, auto-retire) — `P1` · owner, manager
- [ ] Gift-ready toggle (note + wrap) — `P1` · customer, manager
- [ ] Size guide & fit advisor — `P1` · customer
- [ ] Reviews & ratings (with photos) — `P2` · customer
- [ ] Bundles & curated sets — `P2` · manager

## 04 · Inventory & fabric stock
- [ ] Real-time stock by variant & location — `P1` · owner, manager
- [ ] One-of-a-kind register — `P1` · owner, manager
- [ ] Low-stock thresholds & reorder alerts — `P1` · owner, manager
- [ ] Fabric roll / yardage tracking — `P1` · owner, manager
- [ ] Stock transfers (market ↔ online) — `P1` · manager, staff
- [ ] Stocktake / count mode (mobile) — `P1` · staff
- [ ] Barcode / QR label generation — `P1` · manager
- [ ] Incoming stock / purchase orders — `P2` · manager
- [ ] Dye-lot / batch tracking — `P2` · manager

## 05 · Order management & fulfilment
- [ ] Order list (search, filter, status) — `P0` · owner, manager, staff
- [ ] Order detail view — `P0` · owner, manager, staff
- [ ] Status pipeline (paid→production→shipped→delivered) — `P0` · owner, manager, staff
- [ ] Packing slip & branded invoice — `P0` · owner, manager, staff
- [ ] Order notes & gift messages — `P0` · owner, manager
- [ ] Unified orders (online + POS + social) — `P1` · owner, manager
- [ ] Manual order creation (DM sales) — `P1` · owner, manager
- [ ] Pre-orders & backorders — `P1` · manager
- [ ] Fraud / address verification flags — `P1` · manager
- [ ] Bulk actions & label printing — `P1` · manager, staff
- [ ] Split / partial fulfilment — `P2` · manager

## 06 · Made-to-measure & bespoke (the craft engine)
- [ ] Custom-order request form — `P1` · customer
- [ ] Customer measurement profile (saved) — `P1` · customer, tailor
- [ ] Measurement capture (stall / self-measure) — `P1` · tailor, staff
- [ ] Bespoke project pipeline (consult→deliver) — `P1` · manager, tailor
- [ ] Deposit & balance-due tracking — `P1` · owner, manager
- [ ] Fitting appointment scheduler + reminders — `P1` · tailor, manager
- [ ] Tailor assignment & workload — `P1` · manager
- [ ] Aso-ebi / group orders (organiser + many) — `P1` · customer, manager
- [ ] Revision & approval log (photos) — `P1` · tailor, customer
- [ ] Sample / swatch request flow — `P2` · customer
- [ ] Per-project profitability — `P2` · owner

## 07 · Point of sale — Ajuwon Market
- [ ] Fast touchscreen POS (phone/tablet) — `P1` · staff
- [ ] Offline mode with auto-sync — `P1` · staff
- [ ] Cash / transfer / card / POS-terminal capture — `P1` · staff
- [ ] Print / WhatsApp digital receipt — `P1` · staff
- [ ] Daily cash reconciliation (Z-report) — `P1` · staff, owner
- [ ] Live shared inventory with online — `P1` · staff, manager
- [ ] Barcode / QR scan to sell — `P1` · staff
- [ ] Split & part payment — `P1` · staff
- [ ] Walk-in quick-add (capture phone) — `P1` · staff
- [ ] Staff sales attribution & shifts — `P1` · owner, manager

## 08 · Shipping & logistics
- [ ] Zone-based shipping rates — `P0` · customer, manager
- [ ] Real-time tracking + tracking page — `P1` · customer, manager
- [ ] Dispatch / delivery notifications — `P1` · customer
- [ ] Free-delivery thresholds — `P1` · manager
- [ ] Carrier integrations (DHL, GIG, riders) — `P1` · manager
- [ ] Customs / duties messaging (international) — `P1` · customer
- [ ] Pickup-from-market option — `P1` · customer
- [ ] Returns labels & RMA — `P2` · manager
- [ ] Proof of delivery — `P2` · manager

## 09 · Customer & CRM
- [ ] Customer list (search, filter, tags) — `P0` · owner, manager
- [ ] Customer profile (orders, LTV, prefs) — `P0` · owner, manager
- [ ] Self-service account portal — `P0` · customer
- [ ] Wishlist / saved items — `P1` · customer
- [ ] Saved addresses & measurements — `P1` · customer
- [ ] Communication history (incl. WhatsApp) — `P1` · manager
- [ ] Notes & flags per customer — `P1` · manager
- [ ] Bulk import / export — `P1` · manager
- [ ] Segments (Lagos / diaspora / VIP / lapsed) — `P2` · owner, manager

## 10 · Marketing, loyalty & promotions
- [ ] Coupon / promo-code engine — `P0` · owner, manager
- [ ] Drop / restock waitlist + notify-me — `P1` · customer
- [ ] SMS notifications — `P1` · manager
- [ ] Welcome offer automation — `P2` · manager
- [ ] Referral programme — `P2` · manager
- [ ] Loyalty points / store credit — `P2` · owner
- [ ] Email automated flows (cart, win-back, restock) — `P2` · manager
- [ ] WhatsApp broadcast & drip campaigns — `P2` · manager
- [ ] Gift cards (digital) — `P2` · customer
- [ ] Creator gifting & code tracking — `P2` · manager

## 11 · Content, lookbook & storytelling
- [ ] Homepage & landing-page builder — `P0` · owner, manager
- [ ] Lookbook / collection story pages — `P1` · customer
- [ ] Fabric origin & meaning library — `P1` · customer
- [ ] Journal / blog (SEO) — `P1` · customer, manager
- [ ] Maker / behind-the-scenes features — `P2` · customer
- [ ] Shoppable galleries / UGC — `P2` · customer
- [ ] Reusable content / asset library — `P2` · manager
- [ ] Multi-language content — `P2` · manager

## 12 · AI-powered features
- [ ] AI product description / story generator — `P2` · manager
- [ ] AI size & fit recommender (cut returns) — `P2` · customer
- [ ] "Complete the look" recommendations — `P2` · customer
- [ ] Personalised recommendations — `P2` · customer
- [ ] AI semantic search — `P2` · customer
- [ ] AI social-caption assistant (admin) — `P2` · manager
- [ ] AI demand forecast (what to restock) — `P2` · owner
- [ ] At-risk customer alerts + win-back — `P2` · owner
- [ ] AI photo auto-tagging — `P2` · manager
- [ ] AI customer assistant (WhatsApp FAQ) — `P2` · customer

## 13 · Payments & billing
- [ ] Local gateways (Paystack / Flutterwave) — `P0` · customer, owner
- [ ] International (Stripe / PayPal) — `P0` · customer, owner
- [ ] Multi-currency checkout (₦, $, £) — `P0` · customer
- [ ] Transaction list & detail — `P0` · owner, manager
- [ ] Bank transfer + proof-of-payment confirm — `P1` · customer, owner
- [ ] Tax / VAT configuration — `P1` · owner
- [ ] Made-to-measure deposits & balance links — `P1` · owner, manager
- [ ] Reconciliation across channels — `P1` · owner
- [ ] Refund & store-credit workflow — `P1` · manager
- [ ] Instalment / part-payment — `P2` · customer
- [ ] B2B / wholesale invoicing — `P2` · owner

## 14 · Reviews, UGC & community
- [ ] Verified-purchase reviews (photos) — `P2` · customer
- [ ] Star ratings per product — `P2` · customer
- [ ] Review moderation & response — `P2` · manager
- [ ] UGC collection + rights tracking — `P2` · manager
- [ ] "As worn by" customer gallery — `P2` · customer
- [ ] NPS / satisfaction survey — `P2` · owner
- [ ] Product Q&A — `P2` · customer

## 15 · Communication & notifications
- [ ] Transactional messages (order/dispatch/delivery) — `P1` · customer
- [ ] WhatsApp Business inbox (sales + support) — `P1` · manager
- [ ] On-site chat widget — `P1` · customer
- [ ] Notification bell & panel — `P1` · all staff
- [ ] Instagram / Facebook DM unification — `P2` · manager
- [ ] Broadcast announcements — `P2` · manager
- [ ] Push notifications (PWA) — `P2` · customer
- [ ] Internal staff notes & @mentions — `P2` · staff

## 16 · Supplier, artisan & vendor management
- [ ] Supplier / artisan directory — `P1` · manager
- [ ] Tailor / maker profiles & capacity — `P1` · manager
- [ ] Purchase orders & deliveries — `P2` · manager
- [ ] Cost & lead-time tracking — `P2` · owner
- [ ] Payout / settlement tracking — `P2` · owner
- [ ] Quality notes & ratings — `P2` · manager

## 17 · Returns, exchanges & quality
- [ ] 14-day window logic + MTM exclusions — `P1` · customer, manager
- [ ] Self-service return / exchange request — `P1` · customer
- [ ] RMA generation & tracking — `P1` · manager
- [ ] Exchange-for-size flow — `P1` · customer
- [ ] Refund vs store-credit routing — `P1` · manager
- [ ] Fault / defect logging (photos) — `P1` · manager
- [ ] Returns analytics — `P2` · owner

## 18 · Admin, settings & platform
- [ ] General settings & business profile — `P0` · owner
- [ ] Roles & permissions management — `P0` · owner
- [ ] Brand theming (Herit palette, logo, fonts) — `P0` · owner
- [ ] NDPA 2023 / data-privacy controls — `P0` · owner
- [ ] WCAG 2.1 AA accessibility — `P0` · all
- [ ] Automated backup & restore — `P0` · owner
- [ ] Multi-location (online + market + future) — `P1` · owner
- [ ] PWA — installable, offline-capable — `P1` · all
- [ ] Audit log & activity trail — `P1` · owner
- [ ] Accounting export / sync — `P2` · owner
- [ ] REST API + webhooks — `P2` · owner

---

*Rule for the build: nothing marked `P0` is optional for launch. Do not build `P2` before `P0` is live and stable. See `nav-map.md` for routes and `CLAUDE.md` for the phased build plan.*
