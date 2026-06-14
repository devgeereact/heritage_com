// HeritOS — client-side role gating.
//
// The server is the source of truth (every endpoint runs require_auth($roles)).
// This just hides what a role shouldn't see and keeps them out of routes they
// can't use, so the UI matches their access.

const ALL = ['super_admin', 'admin', 'manager', 'tailor', 'editor', 'seller', 'employee'];
const ADMIN = ['super_admin', 'admin'];
const MANAGE = ['super_admin', 'admin', 'manager'];

// Section key (top-level menu key / first URL segment) → roles allowed.
// Anything not listed defaults to ADMIN only, which declutters the kit's demo
// sections for non-admin staff.
const SECTIONS = {
  dashboard: ALL,
  tailoring: ['super_admin', 'admin', 'manager', 'tailor'],
  catalogue: ['super_admin', 'admin', 'manager', 'editor', 'employee', 'seller'],
  stock: ['super_admin', 'admin', 'manager', 'employee'],
  suppliers: ['super_admin', 'admin', 'manager'],
  finance: ['super_admin', 'admin', 'manager'],
  analytics: ['super_admin', 'admin', 'manager'],
  marketing: ['super_admin', 'admin', 'manager', 'editor'],
  pos: ['super_admin', 'admin', 'manager', 'seller', 'employee'],
  studio: ['super_admin', 'admin', 'manager', 'editor'],
  channels: ['super_admin', 'admin', 'manager'],
  weather: ['super_admin', 'admin', 'manager', 'seller', 'employee'],
  enquiries: ['super_admin', 'admin', 'manager', 'employee'],
  inbox: ['super_admin', 'admin', 'manager', 'editor', 'employee'],
  whatsapp: ['super_admin', 'admin', 'manager', 'seller', 'editor', 'employee'],
  crm: ['super_admin', 'admin', 'manager', 'tailor', 'employee'],
  sales: ['super_admin', 'admin', 'manager', 'seller', 'employee'],
  profile: ALL,

  // Larkon operational sections — managers and admins.
  products: MANAGE, category: MANAGE, inventory: MANAGE, orders: MANAGE,
  purchases: MANAGE, attributes: MANAGE, invoice: MANAGE,
  coupons: ['super_admin', 'admin', 'manager', 'editor'],
  seller: MANAGE, customer: MANAGE, review: MANAGE, apps: MANAGE, support: MANAGE,

  // Platform administration — admins only.
  team: ADMIN, role: ADMIN, permissions: ADMIN, settings: ADMIN,

  // Kit demo / component galleries — admins only.
  'base-ui': ADMIN, 'advanced-ul': ADMIN, charts: ADMIN, maps: ADMIN,
  forms: ADMIN, tables: ADMIN, icons: ADMIN, widgets: ADMIN, pages: ADMIN,
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
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'tailoring', label: 'Tailoring' },
  { key: 'catalogue', label: 'Catalogue' },
  { key: 'stock', label: 'Inventory' },
  { key: 'pos', label: 'Market Sales' },
  { key: 'suppliers', label: 'Suppliers' },
  { key: 'sales', label: 'Orders' },
  { key: 'crm', label: 'Customers' },
  { key: 'enquiries', label: 'Enquiries' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'coupons', label: 'Coupons' },
  { key: 'studio', label: 'Brand Studio' },
  { key: 'finance', label: 'Finance' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'weather', label: 'Weather & Ops' },
  { key: 'channels', label: 'Store & Channels' },
  { key: 'team', label: 'Team & Access' },
  { key: 'settings', label: 'Settings' },
].map((m) => ({ ...m, roles: SECTIONS[m.key] ?? ADMIN }));

/** First URL segment, e.g. "/tailoring/5" → "tailoring". */
export const pathSection = (path = '') => {
  const seg = String(path).split('?')[0].split('/').filter(Boolean)[0];
  return seg || 'dashboard';
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
    case 'tailor': return '/tailoring';
    case 'editor': return '/catalogue';
    case 'seller': return '/catalogue';
    case 'employee': return '/enquiries';
    default: return '/dashboard'; // super_admin, admin, manager
  }
};

/**
 * Filter the sidebar menu for a role. Drops items the role can't see, and any
 * section title left with no visible items under it.
 */
export const filterMenuByRole = (items, role) => {
  if (!role) return items;
  const out = [];
  for (const item of items) {
    if (item.isTitle) {
      out.push({ ...item, __title: true });
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
