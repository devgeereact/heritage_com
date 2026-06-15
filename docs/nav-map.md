# HeritOS — Navigation & Route Map

Two surfaces share one design system: the **public storefront** (expressive, sells the feeling) and the **app** (quiet precision — POS, admin, account, tailor). Routes come from `brief.json` + `features.md`. The scaffold turns the route table into React Router config; every guarded route is enforced server-side by a Laravel policy, not just hidden in the UI.

Roles: **Guest** (not logged in) · **Customer** · **Staff** (Ajuwon Market POS) · **Tailor** · **Manager** · **Owner/Admin**.

---

## Per-role visibility — top-level areas

| Area | Guest | Customer | Staff | Tailor | Manager | Owner |
|------|:-----:|:--------:|:-----:|:------:|:-------:|:-----:|
| Storefront (shop, collections, journal) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Cart & checkout | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| My account (orders, wishlist, measurements) |  | ✓ |  |  |  |  |
| Bespoke request | ✓ | ✓ |  |  |  |  |
| Admin · Dashboard |  |  |  |  | ✓ | ✓ |
| Admin · Catalogue & inventory |  |  |  |  | ✓ | ✓ |
| Admin · Orders & fulfilment |  |  | ✓¹ |  | ✓ | ✓ |
| Admin · Bespoke pipeline |  |  |  | ✓² | ✓ | ✓ |
| Admin · Customers & CRM |  |  |  |  | ✓ | ✓ |
| Admin · Marketing & promotions |  |  |  |  | ✓ | ✓ |
| Admin · Content & lookbook |  |  |  |  | ✓ | ✓ |
| Admin · Suppliers & artisans |  |  |  |  | ✓ | ✓ |
| Admin · Returns & quality |  |  | ✓¹ |  | ✓ | ✓ |
| POS (Ajuwon Market) |  |  | ✓ |  | ✓ | ✓ |
| Settings & platform |  |  |  |  | partial³ | ✓ |

¹ Staff see only fulfilment/packing + return intake, not pricing or analytics. ² Tailor sees only their assigned bespoke projects + measurement profiles. ³ Manager sees operational settings; Owner sees roles, payments, privacy, backups.

---

## Tree — public storefront (`PublicLayout`)

```
- Home                     → /
- Shop                     → /shop
  - Product detail         → /shop/:productSlug
  - Search results         → /search
- Collections              → /collections
  - Collection / drop      → /collections/:slug
- Lookbook                 → /lookbook
- Fabric library           → /fabrics
  - Fabric story           → /fabrics/:slug
- Journal                  → /journal
  - Article                → /journal/:slug
- Bespoke                  → /bespoke           (request a made-to-measure / aso-ebi order)
- About / Our story        → /about
- Contact                  → /contact
- Help: shipping, returns, size guide, FAQ → /help/:topic
- Legal: privacy, terms, returns policy    → /legal/:topic
- Cart                     → /cart
- Checkout (guest or auth) → /checkout
  - Order confirmation     → /checkout/confirmation/:orderNumber
- Track order              → /track/:trackingNumber
```

## Tree — auth: customer account (`AppLayout`, guard `auth`)

```
- My account               → /account
  - Orders                 → /account/orders
    - Order detail         → /account/orders/:number
  - Bespoke projects       → /account/bespoke
    - Project detail       → /account/bespoke/:id
  - Wishlist               → /account/wishlist
  - Measurements           → /account/measurements
  - Addresses              → /account/addresses
  - Profile & security     → /account/profile
```

## Tree — admin app (`AdminLayout`, guard `role:manager|owner` unless noted)

```
- Dashboard                → /admin                         (owner, manager)
  - Overview (KPIs)        → /admin
  - Analytics              → /admin/analytics
  - Activity feed          → /admin/activity
- Catalogue                → /admin/products
  - Products               → /admin/products
  - New / edit product     → /admin/products/new · /admin/products/:id/edit
  - Collections & drops    → /admin/collections
  - Fabrics                → /admin/fabrics
- Inventory                → /admin/inventory
  - Stock by location      → /admin/inventory
  - One-of-a-kind register → /admin/inventory/unique
  - Stocktake (mobile)     → /admin/inventory/count
- Orders                   → /admin/orders                  (+ staff, fulfilment-only)
  - Order detail           → /admin/orders/:number
  - Manual order           → /admin/orders/new
- Bespoke                  → /admin/bespoke                 (+ tailor, own projects)
  - Project pipeline       → /admin/bespoke
  - Project detail         → /admin/bespoke/:id
  - Fitting calendar       → /admin/bespoke/calendar
  - Aso-ebi group orders   → /admin/bespoke/groups
- Customers                → /admin/customers
  - Customer detail        → /admin/customers/:id
  - Segments               → /admin/customers/segments
- Marketing                → /admin/marketing
  - Promo codes            → /admin/marketing/coupons
  - Waitlists & notify-me  → /admin/marketing/waitlists
  - Campaigns (email/WA)   → /admin/marketing/campaigns
- Content                  → /admin/content
  - Pages / homepage       → /admin/content/pages
  - Journal                → /admin/content/journal
  - Lookbook               → /admin/content/lookbook
- Suppliers                → /admin/suppliers
  - Artisans / tailors     → /admin/suppliers/artisans
  - Purchase orders        → /admin/suppliers/po
- Returns                  → /admin/returns                 (+ staff intake)
  - RMA detail             → /admin/returns/:id
- Payments                 → /admin/payments                (owner)
  - Transactions           → /admin/payments
  - Reconciliation         → /admin/payments/reconciliation
- Settings                 → /admin/settings                (owner; manager: operational only)
  - Business profile       → /admin/settings/business
  - Roles & permissions    → /admin/settings/roles          (owner)
  - Brand theming          → /admin/settings/branding       (owner)
  - Shipping zones         → /admin/settings/shipping
  - Tax / VAT              → /admin/settings/tax             (owner)
  - Integrations           → /admin/settings/integrations   (owner)
  - Privacy (NDPA)         → /admin/settings/privacy         (owner)
  - Backups                → /admin/settings/backups         (owner)
  - Audit log              → /admin/settings/audit           (owner)
```

## Tree — POS (`PosLayout`, guard `role:staff|manager|owner`, PWA + offline)

```
- POS sell                 → /pos                            (touchscreen, PIN login)
- Checkout / payment       → /pos/checkout
- Receipt                  → /pos/receipt/:saleId
- Day reconciliation       → /pos/reconciliation
- Quick stocktake          → /pos/count
```

## Tree — auth chrome (`AuthLayout`)

```
- Sign in                  → /login
- Register                 → /register
- Forgot password          → /forgot-password
- Reset password           → /reset-password/:token
- Verify OTP               → /verify
- Staff PIN login          → /pos/login
```

---

## Route table

| path | component | layout | guard | entity |
|------|-----------|--------|-------|--------|
| `/` | HomePage | PublicLayout | — | — |
| `/shop` | ShopPage | PublicLayout | — | Product |
| `/shop/:productSlug` | ProductDetailPage | PublicLayout | — | Product |
| `/search` | SearchPage | PublicLayout | — | Product |
| `/collections` | CollectionsPage | PublicLayout | — | Collection |
| `/collections/:slug` | CollectionPage | PublicLayout | — | Collection |
| `/lookbook` | LookbookPage | PublicLayout | — | Collection |
| `/fabrics` | FabricLibraryPage | PublicLayout | — | Fabric |
| `/fabrics/:slug` | FabricStoryPage | PublicLayout | — | Fabric |
| `/journal` | JournalPage | PublicLayout | — | Article |
| `/journal/:slug` | ArticlePage | PublicLayout | — | Article |
| `/bespoke` | BespokeRequestPage | PublicLayout | — | BespokeProject |
| `/about` | AboutPage | PublicLayout | — | — |
| `/contact` | ContactPage | PublicLayout | — | — |
| `/help/:topic` | HelpPage | PublicLayout | — | — |
| `/legal/:topic` | LegalPage | PublicLayout | — | — |
| `/cart` | CartPage | PublicLayout | — | Order |
| `/checkout` | CheckoutPage | PublicLayout | optional-auth | Order |
| `/checkout/confirmation/:orderNumber` | OrderConfirmationPage | PublicLayout | — | Order |
| `/track/:trackingNumber` | TrackOrderPage | PublicLayout | — | Order |
| `/login` | LoginPage | AuthLayout | guest | — |
| `/register` | RegisterPage | AuthLayout | guest | Customer |
| `/forgot-password` | ForgotPasswordPage | AuthLayout | guest | — |
| `/reset-password/:token` | ResetPasswordPage | AuthLayout | guest | — |
| `/verify` | VerifyOtpPage | AuthLayout | auth | — |
| `/account` | AccountHomePage | AppLayout | auth | Customer |
| `/account/orders` | AccountOrdersPage | AppLayout | auth | Order |
| `/account/orders/:number` | AccountOrderDetailPage | AppLayout | auth | Order |
| `/account/bespoke` | AccountBespokePage | AppLayout | auth | BespokeProject |
| `/account/bespoke/:id` | AccountBespokeDetailPage | AppLayout | auth | BespokeProject |
| `/account/wishlist` | WishlistPage | AppLayout | auth | Customer |
| `/account/measurements` | MeasurementsPage | AppLayout | auth | Customer |
| `/account/addresses` | AddressesPage | AppLayout | auth | Customer |
| `/account/profile` | ProfilePage | AppLayout | auth | Customer |
| `/admin` | AdminDashboardPage | AdminLayout | role:manager\|owner | — |
| `/admin/analytics` | AnalyticsPage | AdminLayout | role:manager\|owner | — |
| `/admin/activity` | ActivityFeedPage | AdminLayout | role:manager\|owner | — |
| `/admin/products` | ProductsPage | AdminLayout | role:manager\|owner | Product |
| `/admin/products/new` | ProductEditPage | AdminLayout | role:manager\|owner | Product |
| `/admin/products/:id/edit` | ProductEditPage | AdminLayout | role:manager\|owner | Product |
| `/admin/collections` | AdminCollectionsPage | AdminLayout | role:manager\|owner | Collection |
| `/admin/fabrics` | AdminFabricsPage | AdminLayout | role:manager\|owner | Fabric |
| `/admin/inventory` | InventoryPage | AdminLayout | role:manager\|owner | Inventory |
| `/admin/inventory/unique` | UniqueRegisterPage | AdminLayout | role:manager\|owner | Inventory |
| `/admin/inventory/count` | StocktakePage | AdminLayout | role:manager\|owner\|staff | Inventory |
| `/admin/orders` | AdminOrdersPage | AdminLayout | role:manager\|owner\|staff | Order |
| `/admin/orders/new` | ManualOrderPage | AdminLayout | role:manager\|owner | Order |
| `/admin/orders/:number` | AdminOrderDetailPage | AdminLayout | role:manager\|owner\|staff | Order |
| `/admin/bespoke` | BespokePipelinePage | AdminLayout | role:manager\|owner\|tailor | BespokeProject |
| `/admin/bespoke/calendar` | FittingCalendarPage | AdminLayout | role:manager\|owner\|tailor | BespokeProject |
| `/admin/bespoke/groups` | AsoEbiGroupsPage | AdminLayout | role:manager\|owner | BespokeProject |
| `/admin/bespoke/:id` | BespokeProjectPage | AdminLayout | role:manager\|owner\|tailor | BespokeProject |
| `/admin/customers` | CustomersPage | AdminLayout | role:manager\|owner | Customer |
| `/admin/customers/segments` | SegmentsPage | AdminLayout | role:manager\|owner | Customer |
| `/admin/customers/:id` | CustomerDetailPage | AdminLayout | role:manager\|owner | Customer |
| `/admin/marketing/coupons` | CouponsPage | AdminLayout | role:manager\|owner | — |
| `/admin/marketing/waitlists` | WaitlistsPage | AdminLayout | role:manager\|owner | — |
| `/admin/marketing/campaigns` | CampaignsPage | AdminLayout | role:manager\|owner | — |
| `/admin/content/pages` | ContentPagesPage | AdminLayout | role:manager\|owner | — |
| `/admin/content/journal` | AdminJournalPage | AdminLayout | role:manager\|owner | Article |
| `/admin/content/lookbook` | AdminLookbookPage | AdminLayout | role:manager\|owner | Collection |
| `/admin/suppliers` | SuppliersPage | AdminLayout | role:manager\|owner | Supplier |
| `/admin/suppliers/artisans` | ArtisansPage | AdminLayout | role:manager\|owner | Supplier |
| `/admin/suppliers/po` | PurchaseOrdersPage | AdminLayout | role:manager\|owner | Supplier |
| `/admin/returns` | ReturnsPage | AdminLayout | role:manager\|owner\|staff | Order |
| `/admin/returns/:id` | RmaDetailPage | AdminLayout | role:manager\|owner\|staff | Order |
| `/admin/payments` | TransactionsPage | AdminLayout | role:owner | — |
| `/admin/payments/reconciliation` | ReconciliationPage | AdminLayout | role:owner | — |
| `/admin/settings/business` | BusinessSettingsPage | AdminLayout | role:manager\|owner | — |
| `/admin/settings/roles` | RolesSettingsPage | AdminLayout | role:owner | — |
| `/admin/settings/branding` | BrandingSettingsPage | AdminLayout | role:owner | — |
| `/admin/settings/shipping` | ShippingSettingsPage | AdminLayout | role:manager\|owner | — |
| `/admin/settings/tax` | TaxSettingsPage | AdminLayout | role:owner | — |
| `/admin/settings/integrations` | IntegrationsSettingsPage | AdminLayout | role:owner | — |
| `/admin/settings/privacy` | PrivacySettingsPage | AdminLayout | role:owner | — |
| `/admin/settings/backups` | BackupsSettingsPage | AdminLayout | role:owner | — |
| `/admin/settings/audit` | AuditLogPage | AdminLayout | role:owner | — |
| `/pos/login` | PosPinLoginPage | AuthLayout | guest | — |
| `/pos` | PosSellPage | PosLayout | role:staff\|manager\|owner | Order |
| `/pos/checkout` | PosCheckoutPage | PosLayout | role:staff\|manager\|owner | Order |
| `/pos/receipt/:saleId` | PosReceiptPage | PosLayout | role:staff\|manager\|owner | Order |
| `/pos/reconciliation` | PosReconciliationPage | PosLayout | role:staff\|manager\|owner | — |
| `/pos/count` | PosCountPage | PosLayout | role:staff\|manager\|owner | Inventory |
| `*` | NotFoundPage | PublicLayout | — | — |

---

## Quality notes
- Every route above resolves to a real page/component in the scaffold (placeholder content is fine pre-build; the Definition of Done checks no dead links).
- Depth is ≤ 3 levels. Entity routes are RESTful (`/admin/products/:id/edit`).
- Guards are layout-level **and** mirrored server-side as Laravel policies (`ProductPolicy`, `OrderPolicy`, `BespokePolicy`, role gate). UI hiding alone is never the control.
- `optional-auth` on `/checkout` supports guest checkout while still letting logged-in customers reuse saved addresses/measurements.
- POS routes register a service worker for offline-with-auto-sync (PWA); the rest of the app is online-first.
