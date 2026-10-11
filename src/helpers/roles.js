// HeritOS — client-side role gating.
//
// The server is the source of truth (every endpoint runs require_auth($roles)).
// This just hides what a role shouldn't see and keeps them out of routes they
// can't use, so the UI matches their access.

const ALL = ['super_admin', 'admin', 'manager', 'tailor', 'editor', 'seller', 'employee'];
const ADMIN = ['super_admin', 'admin'];
const MANAGE = ['super_admin', 'admin', 'manager'];            // ROLES_OWNER in php-api/_domain.php
const WORKSHOP = [...MANAGE, 'tailor'];                        // ROLES_WORKSHOP
const CLIENTS = [...MANAGE, 'tailor', 'employee'];             // ROLES_CLIENTS
const ENQUIRY = [...MANAGE, 'employee'];                       // ROLES_ENQUIRY

// Section key (top-level menu key / first URL segment) → roles allowed.
// K-01 (fixed in Phase 2): each list matches the server's require_auth() gate
// for the endpoints that page needs. Where a page needs several endpoints, the
// list is the roles every one of them allows, so a page never opens for a role
// the server would refuse. Anything not listed defaults to ADMIN only.
const SECTIONS = {
  // Daily records (Phase 2)
  today: MANAGE,                                               // today.php
  enquiries: ENQUIRY,                                          // enquiries.php (convert is owner-only inside)
  appointments: WORKSHOP,                                      // appointments.php (reads workshop; writes and requests owner)
  messages: MANAGE,                                            // messages.php (owner)
  clients: CLIENTS,                                            // customers.php (measurements tab: workshop roles)
  jobs: WORKSHOP,                                              // tailoring.php, measurements.php
  payments: MANAGE,                                            // ledger.php
  print: MANAGE,                                               // tailoring.php?action=document, measurements.php
  settings: MANAGE,                                            // settings.php, measurements.php template_save
  reports: MANAGE,                                             // stats.php + analytics.php (old dashboard)

  // Other tools
  catalogue: ['super_admin', 'admin', 'manager', 'editor', 'employee'],   // products.php
  stock: ['super_admin', 'admin', 'manager', 'employee'],                 // stock.php
  pos: ['super_admin', 'admin', 'manager', 'employee'],                   // orders.php + stock.php
  sales: ['super_admin', 'admin', 'manager', 'employee'],                 // orders.php + products.php
  suppliers: MANAGE,                                                      // suppliers.php + stock.php
  finance: MANAGE,                                                        // payments.php, export.php
  analytics: MANAGE,                                                      // analytics.php
  marketing: ['super_admin', 'admin', 'manager', 'editor'],               // marketing.php
  studio: ALL,                                                            // ai.php, ai_image.php (any staff)
  website: ['super_admin', 'admin', 'manager', 'editor'],                 // cms.php (Website CMS); profile and policy publishing owner-only on the server
  content: MANAGE,                                                        // content.php (journal and testimonials)
  channels: MANAGE,                                                       // settings.php
  weather: ['super_admin', 'admin', 'manager', 'seller', 'employee'],     // weather.php
  inbox: ['super_admin', 'admin', 'manager', 'editor', 'employee'],       // inbox.php, mail.php
  whatsapp: ['super_admin', 'admin', 'manager', 'seller', 'editor', 'employee'], // whatsapp.php
  loyalty: MANAGE,                                                        // loyalty.php, referrals.php
  engage: MANAGE,                                                         // engage.php + customers.php birthdays
  reviews: ['super_admin', 'admin', 'manager', 'editor'],                 // reviews.php
  coupons: ['super_admin', 'admin', 'manager', 'editor'],                 // coupons.php
  profile: ALL,                                                           // users.php self actions
  // Remaining Larkon kit page (product review page): no endpoint.
  review: MANAGE,

  // Platform administration — admins only.
  team: ADMIN, permissions: ADMIN,                                        // users.php management
};

// Staff roles, in seniority order. 'customer' isn't a staff login.
export const STAFF_ROLES = ['super_admin', 'admin', 'manager', 'tailor', 'editor', 'seller', 'employee'];

export const ROLE_LABELS = {
  super_admin: 'Super Admin', admin: 'Admin', manager: 'Manager', tailor: 'Tailor',
  editor: 'Editor', seller: 'Seller', employee: 'Employee', customer: 'Customer',
};

// The HeritOS modules shown in the Permissions matrix (real sidebar sections,
// not Larkon kit demos), each with the roles allowed in from SECTIONS above.
export const ACCESS_MATRIX = [
  { key: 'today', label: 'Today' },
  { key: 'enquiries', label: 'Enquiries' },
  { key: 'appointments', label: 'Appointments' },
  { key: 'messages', label: 'Messages' },
  { key: 'clients', label: 'Clients' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'payments', label: 'Payments' },
  { key: 'website', label: 'Website' },
  { key: 'content', label: 'Journal & testimonials' },
  { key: 'settings', label: 'Settings' },
  { key: 'reports', label: 'Reports' },
  { key: 'catalogue', label: 'Catalogue' },
  { key: 'stock', label: 'Inventory' },
  { key: 'pos', label: 'Market Sales' },
  { key: 'suppliers', label: 'Suppliers' },
  { key: 'sales', label: 'Orders' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'inbox', label: 'Inbox' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'coupons', label: 'Coupons' },
  { key: 'loyalty', label: 'Loyalty & Gifts' },
  { key: 'engage', label: 'Re-engagement' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'studio', label: 'Brand Studio' },
  { key: 'finance', label: 'Finance' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'weather', label: 'Weather & Ops' },
  { key: 'channels', label: 'Store & Channels' },
  { key: 'team', label: 'Team & Access' },
].map((m) => ({ ...m, roles: SECTIONS[m.key] ?? ADMIN }));

/** First URL segment, e.g. "/jobs/5" → "jobs". */
export const pathSection = (path = '') => {
  const seg = String(path).split('?')[0].split('/').filter(Boolean)[0];
  return seg || 'today';
};

const rolesFor = (sectionKey) => SECTIONS[sectionKey] ?? ADMIN;

/** Can this role see/use a section (menu key or URL segment)? */
export const canAccessSection = (role, sectionKey) =>
  !!role && rolesFor(sectionKey).includes(role);

/** Can this role open a given path? */
export const canAccessPath = (role, path) =>
  canAccessSection(role, pathSection(path));

/** Where a role lands after login / when redirected from a forbidden page. */
export const roleHome = (role) => {
  switch (role) {
    case 'tailor': return '/jobs';
    case 'editor': return '/catalogue';
    case 'seller': return '/whatsapp';
    case 'employee': return '/enquiries';
    default: return '/today'; // super_admin, admin, manager
  }
};

/**
 * Filter the sidebar menu for a role. Drops items the role can't see, recurses
 * into groups (children) and drops groups left empty, and drops any section
 * title left with no visible items under it.
 */
export const filterMenuByRole = (items, role) => {
  if (!role) return items;
  const out = [];
  for (const item of items) {
    if (item.isTitle) {
      out.push({ ...item, __title: true });
      continue;
    }
    if (item.children) {
      const children = filterMenuByRole(item.children, role);
      if (children.length) out.push({ ...item, children });
      continue;
    }
    if (canAccessSection(role, item.key)) out.push(item);
  }
  // Remove titles immediately followed by another title or the end (orphans).
  return out.filter((item, i) => {
    if (!item.__title) return true;
    const next = out[i + 1];
    return next && !next.__title;
  }).map(({ __title, ...rest }) => rest);
};
