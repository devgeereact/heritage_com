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
  icon: 'solar:home-smile-bold-duotone',
  url: '/today'
}, {
  key: 'enquiries',
  label: 'Enquiries',
  icon: 'solar:inbox-line-bold-duotone',
  url: '/enquiries'
}, {
  key: 'appointments',
  label: 'Appointments',
  icon: 'solar:calendar-bold-duotone',
  url: '/appointments'
}, {
  key: 'messages',
  label: 'Messages',
  icon: 'solar:chat-round-dots-bold-duotone',
  url: '/messages'
}, {
  key: 'clients',
  label: 'Clients',
  icon: 'solar:users-group-rounded-bold-duotone',
  url: '/clients'
}, {
  key: 'jobs',
  label: 'Jobs',
  icon: 'solar:scissors-square-bold-duotone',
  url: '/jobs'
}, {
  key: 'payments',
  label: 'Payments',
  icon: 'solar:wallet-money-bold-duotone',
  url: '/payments'
}, {
  // Website CMS (Phase 4): pages, services, work, questions, policies, images, business details.
  key: 'website',
  label: 'Website',
  icon: 'solar:global-bold-duotone',
  url: '/website'
}, {
  key: 'setup',
  label: 'SETTINGS',
  isTitle: true
}, {
  key: 'settings',
  label: 'Settings',
  icon: 'solar:settings-bold-duotone',
  url: '/settings'
}, {
  // Phase 7: evidence for what to keep, fix or remove (owner only, review.php).
  key: 'review',
  label: 'Owner review',
  icon: 'solar:clipboard-check-bold-duotone',
  url: '/review'
}, {
  key: MORE,
  label: 'More tools',
  icon: 'solar:widget-5-bold-duotone',
  children: more([
    { key: 'reports', label: 'Reports', icon: 'solar:chart-square-bold-duotone', url: '/reports' },
    { key: 'finance', label: 'Finance', icon: 'solar:wallet-bold-duotone', url: '/finance' },
    { key: 'catalogue', label: 'Catalogue', icon: 'solar:t-shirt-2-bold-duotone', url: '/catalogue' },
    { key: 'sales', label: 'Orders', icon: 'solar:cart-large-2-bold-duotone', url: '/sales' },
    { key: 'pos', label: 'Market Sales', icon: 'solar:shop-2-bold-duotone', url: '/pos' },
    { key: 'stock', label: 'Inventory', icon: 'solar:box-bold-duotone', url: '/stock' },
    { key: 'suppliers', label: 'Suppliers', icon: 'solar:delivery-bold-duotone', url: '/suppliers' },
    { key: 'marketing', label: 'Marketing', icon: 'solar:megaphone-bold-duotone', url: '/marketing' },
    { key: 'studio', label: 'Brand Studio', icon: 'solar:magic-stick-3-bold-duotone', url: '/studio' },
    { key: 'analytics', label: 'Analytics', icon: 'solar:chart-2-bold-duotone', url: '/analytics' },
    { key: 'engage', label: 'Re-engagement', icon: 'solar:hearts-bold-duotone', url: '/engage' },
    { key: 'loyalty', label: 'Loyalty & Gifts', icon: 'solar:gift-bold-duotone', url: '/loyalty' },
    { key: 'coupons', label: 'Coupons', icon: 'solar:ticket-sale-bold-duotone', url: '/coupons' },
    { key: 'reviews', label: 'Reviews', icon: 'solar:star-bold-duotone', url: '/reviews' },
    { key: 'content', label: 'Journal & testimonials', icon: 'solar:notebook-bold-duotone', url: '/content' },
    { key: 'inbox', label: 'Inbox', icon: 'solar:letter-bold-duotone', url: '/inbox' },
    { key: 'whatsapp', label: 'WhatsApp', icon: 'mdi:whatsapp', url: '/whatsapp' },
    { key: 'weather', label: 'Weather & Ops', icon: 'solar:cloud-sun-bold-duotone', url: '/weather' },
    { key: 'team', label: 'Team & Access', icon: 'solar:users-group-two-rounded-bold-duotone', url: '/team' },
    { key: 'permissions', label: 'Permissions', icon: 'solar:checklist-minimalistic-bold-duotone', url: '/permissions' },
    { key: 'channels', label: 'Store & Channels', icon: 'solar:shop-bold-duotone', url: '/channels' },
    { key: 'profile', label: 'Profile', icon: 'solar:user-circle-bold-duotone', url: '/profile' },
  ]),
}];
