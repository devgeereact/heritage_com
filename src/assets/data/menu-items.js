// HeritOS sidebar (Phase 2, D-009). Daily work first; Settings on its own; every
// older module stays reachable under the collapsed "More tools" group. Each
// item's key is the first URL segment, which roles.js gates (filterMenuByRole
// and canAccessPath use the same SECTIONS table).
const MORE = 'more';
const more = (items) => items.map((i) => ({ ...i, parentKey: MORE }));

export const MENU_ITEMS = [{
  key: 'daily',
  label: 'DAILY',
  isTitle: true
}, {
  key: 'today',
  label: 'Today',
  icon: 'solar:home-smile-linear',
  url: '/today'
}, {
  key: 'enquiries',
  label: 'Enquiries',
  icon: 'solar:inbox-line-linear',
  url: '/enquiries'
}, {
  key: 'appointments',
  label: 'Appointments',
  icon: 'solar:calendar-linear',
  url: '/appointments'
}, {
  key: 'messages',
  label: 'Messages',
  icon: 'solar:chat-round-dots-linear',
  url: '/messages'
}, {
  key: 'clients',
  label: 'Clients',
  icon: 'solar:users-group-rounded-linear',
  url: '/clients'
}, {
  key: 'jobs',
  label: 'Jobs',
  icon: 'solar:scissors-square-linear',
  url: '/jobs'
}, {
  key: 'payments',
  label: 'Payments',
  icon: 'solar:wallet-money-linear',
  url: '/payments'
}, {
  // Website CMS (Phase 4): pages, services, work, questions, policies, images, business details.
  key: 'website',
  label: 'Website',
  icon: 'solar:global-linear',
  url: '/website'
}, {
  key: 'setup',
  label: 'SETTINGS',
  isTitle: true
}, {
  key: 'settings',
  label: 'Settings',
  icon: 'solar:settings-linear',
  url: '/settings'
}, {
  // Phase 7: evidence for what to keep, fix or remove (owner only, review.php).
  key: 'review',
  label: 'Owner review',
  icon: 'solar:clipboard-check-linear',
  url: '/review'
}, {
  key: MORE,
  label: 'More tools',
  icon: 'solar:widget-5-linear',
  children: more([
    { key: 'reports', label: 'Reports', icon: 'solar:chart-square-linear', url: '/reports' },
    { key: 'finance', label: 'Finance', icon: 'solar:wallet-linear', url: '/finance' },
    { key: 'catalogue', label: 'Catalogue', icon: 'solar:t-shirt-2-linear', url: '/catalogue' },
    { key: 'sales', label: 'Orders', icon: 'solar:cart-large-2-linear', url: '/sales' },
    { key: 'pos', label: 'Market Sales', icon: 'solar:shop-2-linear', url: '/pos' },
    { key: 'stock', label: 'Inventory', icon: 'solar:box-linear', url: '/stock' },
    { key: 'suppliers', label: 'Suppliers', icon: 'solar:delivery-linear', url: '/suppliers' },
    { key: 'marketing', label: 'Marketing', icon: 'solar:megaphone-linear', url: '/marketing' },
    { key: 'studio', label: 'Brand Studio', icon: 'solar:magic-stick-3-linear', url: '/studio' },
    { key: 'analytics', label: 'Analytics', icon: 'solar:chart-2-linear', url: '/analytics' },
    { key: 'engage', label: 'Re-engagement', icon: 'solar:hearts-linear', url: '/engage' },
    { key: 'loyalty', label: 'Loyalty & Gifts', icon: 'solar:gift-linear', url: '/loyalty' },
    { key: 'coupons', label: 'Coupons', icon: 'solar:ticket-sale-linear', url: '/coupons' },
    { key: 'reviews', label: 'Reviews', icon: 'solar:star-linear', url: '/reviews' },
    { key: 'content', label: 'Journal & testimonials', icon: 'solar:notebook-linear', url: '/content' },
    { key: 'inbox', label: 'Inbox', icon: 'solar:letter-linear', url: '/inbox' },
    { key: 'whatsapp', label: 'WhatsApp', icon: 'mdi:whatsapp', url: '/whatsapp' },
    { key: 'weather', label: 'Weather & Ops', icon: 'solar:cloud-sun-linear', url: '/weather' },
    { key: 'team', label: 'Team & Access', icon: 'solar:users-group-two-rounded-linear', url: '/team' },
    { key: 'permissions', label: 'Permissions', icon: 'solar:checklist-minimalistic-linear', url: '/permissions' },
    { key: 'channels', label: 'Store & Channels', icon: 'solar:shop-linear', url: '/channels' },
    { key: 'profile', label: 'Profile', icon: 'solar:user-circle-linear', url: '/profile' },
  ]),
}];
