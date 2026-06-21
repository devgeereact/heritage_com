// HeritOS sidebar — the real operating modules, grouped by how the brand works.
// Larkon's kit demo galleries (base-ui, charts, forms, products/orders/invoice
// demos, etc.) are intentionally left out of the nav; their routes still exist
// in routes/index.jsx so any deep link resolves, they're just not surfaced.
export const MENU_ITEMS = [{
  key: 'general',
  label: 'GENERAL',
  isTitle: true
}, {
  key: 'dashboard',
  label: 'Dashboard',
  icon: 'solar:widget-5-bold-duotone',
  url: '/dashboard'
}, {
  key: 'tailoring',
  label: 'Tailoring',
  icon: 'solar:scissors-square-bold-duotone',
  url: '/tailoring',
  badge: {
    text: 'Core',
    variant: 'primary'
  }
}, {
  key: 'catalogue',
  label: 'Catalogue',
  icon: 'solar:t-shirt-2-bold-duotone',
  url: '/catalogue'
}, {
  key: 'stock',
  label: 'Inventory',
  icon: 'solar:box-bold-duotone',
  url: '/stock'
}, {
  key: 'pos',
  label: 'Market Sales',
  icon: 'solar:shop-2-bold-duotone',
  url: '/pos'
}, {
  key: 'suppliers',
  label: 'Suppliers',
  icon: 'solar:delivery-bold-duotone',
  url: '/suppliers'
}, {
  key: 'sell',
  label: 'SELL & GROW',
  isTitle: true
}, {
  key: 'sales',
  label: 'Orders',
  icon: 'solar:cart-large-2-bold-duotone',
  url: '/sales'
}, {
  key: 'crm',
  label: 'Customers',
  icon: 'solar:users-group-rounded-bold-duotone',
  url: '/crm'
}, {
  key: 'enquiries',
  label: 'Enquiries',
  icon: 'solar:inbox-line-bold-duotone',
  url: '/enquiries'
}, {
  key: 'inbox',
  label: 'Inbox',
  icon: 'solar:letter-bold-duotone',
  url: '/inbox'
}, {
  key: 'whatsapp',
  label: 'WhatsApp',
  icon: 'mdi:whatsapp',
  url: '/whatsapp',
  badge: {
    text: 'New',
    variant: 'success'
  }
}, {
  key: 'marketing',
  label: 'Marketing',
  icon: 'solar:megaphone-bold-duotone',
  url: '/marketing'
}, {
  key: 'coupons',
  label: 'Coupons',
  icon: 'solar:ticket-sale-bold-duotone',
  url: '/coupons'
}, {
  key: 'loyalty',
  label: 'Loyalty & Gifts',
  icon: 'solar:gift-bold-duotone',
  url: '/loyalty'
}, {
  key: 'engage',
  label: 'Re-engagement',
  icon: 'solar:hearts-bold-duotone',
  url: '/engage'
}, {
  key: 'reviews',
  label: 'Reviews',
  icon: 'solar:star-bold-duotone',
  url: '/reviews'
}, {
  key: 'studio',
  label: 'Brand Studio',
  icon: 'solar:magic-stick-3-bold-duotone',
  url: '/studio'
}, {
  key: 'content',
  label: 'Content & Journal',
  icon: 'solar:notebook-bold-duotone',
  url: '/content'
}, {
  key: 'money',
  label: 'MONEY & INSIGHT',
  isTitle: true
}, {
  key: 'finance',
  label: 'Finance',
  icon: 'solar:wallet-money-bold-duotone',
  url: '/finance'
}, {
  key: 'analytics',
  label: 'Analytics',
  icon: 'solar:chart-2-bold-duotone',
  url: '/analytics'
}, {
  key: 'weather',
  label: 'Weather & Ops',
  icon: 'solar:cloud-sun-bold-duotone',
  url: '/weather'
}, {
  key: 'platform',
  label: 'PLATFORM',
  isTitle: true
}, {
  key: 'team',
  label: 'Team & Access',
  icon: 'solar:users-group-two-rounded-bold-duotone',
  url: '/team'
}, {
  key: 'permissions',
  label: 'Permissions',
  icon: 'solar:checklist-minimalistic-bold-duotone',
  url: '/permissions'
}, {
  key: 'channels',
  label: 'Store & Channels',
  icon: 'solar:shop-bold-duotone',
  url: '/channels'
}, {
  key: 'profile',
  label: 'Profile',
  icon: 'solar:user-circle-bold-duotone',
  url: '/profile'
}];
