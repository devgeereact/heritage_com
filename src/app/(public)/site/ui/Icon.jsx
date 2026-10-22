/**
 * Locally bundled stroke icons for the public site, so public pages make no
 * request to api.iconify.design (Iconify stays in the admin). 24px grid,
 * 1.75 stroke, currentColor, decorative by default (aria-hidden).
 *
 *   <Icon name="arrow-right" />
 *   <Icon icon="solar:arrow-right-linear" />   // older Iconify names are mapped
 *
 * Pass `label` to make an icon meaningful to screen readers.
 */

const P = {
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  'arrow-left': <path d="M19 12H5M11 6l-6 6 6 6" />,
  'arrow-up-right': <path d="M7 17L17 7M8 7h9v9" />,
  'chevron-down': <path d="M6 9l6 6 6-6" />,
  'chevron-up': <path d="M6 15l6-6 6 6" />,
  'chevron-right': <path d="M9 6l6 6-6 6" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.8 2.8L16 10" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5v.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.5v.01" />
    </>
  ),
  question: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.3a2.5 2.5 0 014.8.9c0 1.7-2.4 2.1-2.4 3.6M12 16.8v.01" />
    </>
  ),
  'x-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </>
  ),
  'plus-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  'minus-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
    </>
  ),
  circle: <circle cx="12" cy="12" r="9" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  phone: <path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 006.5 6.5L16 14l4 1.5V19a1.5 1.5 0 01-1.5 1.5A15.5 15.5 0 013.5 5.5 1.5 1.5 0 015 4z" />,
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
      <path d="M4 7l8 6 8-6" />
    </>
  ),
  'map-pin': (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20a7 7 0 0114 0" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="9" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0111 0M15.5 6.2a3 3 0 010 5.6M17 14.2a5.5 5.5 0 013.5 4.8" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="1.5" />
      <path d="M8 10.5V8a4 4 0 018 0v2.5" />
    </>
  ),
  bag: (
    <>
      <path d="M5 8h14l-1 12.5H6L5 8z" />
      <path d="M9 10V7a3 3 0 016 0v3" />
    </>
  ),
  cart: (
    <>
      <path d="M3.5 4.5h2l2.2 10.5h10l1.8-7.5H7" />
      <circle cx="9.5" cy="19" r="1.3" />
      <circle cx="16.5" cy="19" r="1.3" />
    </>
  ),
  gift: (
    <>
      <rect x="4" y="9" width="16" height="11.5" rx="1" />
      <path d="M3.5 9h17M12 9v11.5M12 9c-1-3-5-4-5-1.5S12 9 12 9zm0 0c1-3 5-4 5-1.5S12 9 12 9z" />
    </>
  ),
  scissors: (
    <>
      <circle cx="6.5" cy="7" r="2.5" />
      <circle cx="6.5" cy="17" r="2.5" />
      <path d="M8.6 8.4L20 17M8.6 15.6L20 7" />
    </>
  ),
  ruler: (
    <>
      <path d="M3.5 15.5l12-12 5 5-12 12z" />
      <path d="M7 12l2 2M10 9l2 2M13 6l2 2" />
    </>
  ),
  hanger: <path d="M12 8.5a2 2 0 10-2-2M12 8.5v1.5L3.5 16a1.5 1.5 0 00.9 2.7h15.2a1.5 1.5 0 00.9-2.7L12 10" />,
  truck: (
    <>
      <path d="M3 6.5h11v10H3zM14 10h3.5l3 3v3.5H14" />
      <circle cx="7" cy="17.5" r="1.7" />
      <circle cx="17" cy="17.5" r="1.7" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="1.5" />
      <path d="M3 10h18M7 15h3" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7.5h15a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1v-11A1.5 1.5 0 015.5 5H17" />
      <circle cx="16" cy="13.5" r="1.2" />
    </>
  ),
  refresh: <path d="M19.5 12a7.5 7.5 0 11-2.2-5.3M19.5 4.5v4h-4" />,
  trash: <path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13M10.5 11v5M13.5 11v5" />,
  star: <path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z" />,
  heart: <path d="M12 19.5s-7.5-4.4-7.5-10A4.2 4.2 0 0112 7a4.2 4.2 0 017.5 2.5c0 5.6-7.5 10-7.5 10z" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 3.5 5.7 3.5 9s-1 6.3-3.5 9c-2.5-2.7-3.5-5.7-3.5-9s1-6.3 3.5-9z" />
    </>
  ),
  book: <path d="M5 4.5h10.5A2.5 2.5 0 0118 7v13H7.5A2.5 2.5 0 015 17.5zM5 17.5A2.5 2.5 0 017.5 15H18" />,
  shield: (
    <>
      <path d="M12 3.5l7 2.5v5.5c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6z" />
      <path d="M9 12l2.2 2.2L15.5 10" />
    </>
  ),
  leaf: <path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14zM5 19l7-7" />,
  home: <path d="M4 11l8-6.5 8 6.5M6 9.5V20h12V9.5" />,
  tag: (
    <>
      <path d="M3.5 12.5V4.5h8l9 9-8 8z" />
      <circle cx="8" cy="9" r="1.3" />
    </>
  ),
  box: (
    <>
      <path d="M4 7.5L12 4l8 3.5v9L12 20l-8-3.5z" />
      <path d="M4 7.5l8 3.5 8-3.5M12 11v9" />
    </>
  ),
  chat: <path d="M4.5 5.5h15v10h-8l-4.5 4v-4h-2.5z" />,
  pen: (
    <>
      <path d="M4 20l1-4L16 5l3 3L8 19z" />
      <path d="M14 7l3 3" />
    </>
  ),
  notes: (
    <>
      <rect x="5" y="3.5" width="14" height="17" rx="1.5" />
      <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="13" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="13" width="7" height="7" rx="1" />
      <rect x="13" y="13" width="7" height="7" rx="1" />
    </>
  ),
  play: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5l5 3.5-5 3.5z" />
    </>
  ),
  pause: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 9v6M14 9v6" />
    </>
  ),
  send: <path d="M20.5 3.5L10 14M20.5 3.5L14 20.5l-4-6.5-6.5-4z" />,
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  ticket: <path d="M3.5 7.5h17v3a1.5 1.5 0 000 3v3h-17v-3a1.5 1.5 0 000-3zM14 7.5v9" />,
  shop: (
    <>
      <path d="M4 9.5L5.5 4.5h13L20 9.5M4 9.5v10h16v-10M4 9.5a2.7 2.7 0 005.3 0 2.7 2.7 0 005.4 0 2.7 2.7 0 005.3 0" />
      <path d="M10 19.5v-5h4v5" />
    </>
  ),
  instagram: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4.5" />
      <circle cx="12" cy="12" r="3.6" />
      <path d="M16.8 7.2v.01" />
    </>
  ),
  facebook: <path d="M14.5 8H17V4.5h-2.5A3.5 3.5 0 0011 8v2.5H8.5V14H11v6.5h3.5V14H17l.5-3.5h-3V8z" />,
  whatsapp: (
    <>
      <path d="M4.5 19.5l1.2-3.6A8 8 0 1112 20a8 8 0 01-3.9-1z" />
      <path d="M9.2 8.6c.3 2.9 2.6 5.3 5.6 5.9l1-1.2-1.7-1-.9.8a4.5 4.5 0 01-2.1-2.1l.8-.9-1-1.7z" />
    </>
  ),
  tiktok: <path d="M14 4v10.5a3.5 3.5 0 11-3.5-3.5M14 4c.4 2.4 2 4 4.5 4.3" />,
  youtube: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="3.5" />
      <path d="M10.5 9.5l4 2.5-4 2.5z" />
    </>
  ),
  linkedin: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 10.5V16M8 7.7v.01M11.5 16v-5.5M11.5 13a2.5 2.5 0 015 0v3" />
    </>
  ),
  x: <path d="M4.5 4.5l15 15M19.5 4.5L13.6 11M10.4 13l-5.9 6.5" />,
}

// Filled variants (stroke icons with a fill) for state such as "saved".
const FILLED = new Set(['star-fill', 'heart-fill'])

// Older Iconify names used by public pages, mapped to the local set.
const ALIAS = {
  'solar:hamburger-menu-linear': 'menu',
  'solar:close-square-linear': 'close',
  'solar:arrow-right-linear': 'arrow-right',
  'solar:arrow-left-linear': 'arrow-left',
  'solar:arrow-right-up-linear': 'arrow-up-right',
  'solar:alt-arrow-down-linear': 'chevron-down',
  'solar:alt-arrow-up-linear': 'chevron-up',
  'solar:alt-arrow-right-linear': 'chevron-right',
  'solar:check-circle-bold': 'check-circle',
  'solar:verified-check-bold': 'check-circle',
  'solar:danger-circle-bold': 'alert',
  'solar:question-circle-bold': 'question',
  'solar:close-circle-bold': 'x-circle',
  'solar:close-circle-linear': 'x-circle',
  'solar:add-circle-linear': 'plus-circle',
  'solar:minus-circle-linear': 'minus-circle',
  'solar:record-linear': 'circle',
  'solar:map-point-bold': 'map-pin',
  'solar:letter-bold': 'mail',
  'solar:letter-linear': 'mail',
  'solar:user-circle-linear': 'user',
  'solar:user-bold': 'user',
  'solar:users-group-rounded-bold': 'users',
  'solar:lock-keyhole-minimalistic-linear': 'lock',
  'solar:lock-keyhole-minimalistic-bold': 'lock',
  'solar:bag-4-bold': 'bag',
  'solar:cart-plus-bold': 'cart',
  'solar:cart-check-bold': 'cart',
  'solar:gift-bold': 'gift',
  'solar:gift-linear': 'gift',
  'solar:scissors-square-bold': 'scissors',
  'solar:scissors-bold': 'scissors',
  'solar:ruler-pen-bold': 'ruler',
  'solar:ruler-bold': 'ruler',
  'solar:hanger-2-bold': 'hanger',
  'solar:delivery-bold': 'truck',
  'solar:card-bold': 'card',
  'solar:wallet-money-bold': 'wallet',
  'solar:hand-money-bold': 'wallet',
  'solar:banknote-2-bold': 'wallet',
  'solar:refresh-bold': 'refresh',
  'solar:restart-bold': 'refresh',
  'solar:trash-bin-trash-linear': 'trash',
  'solar:star-bold': 'star-fill',
  'solar:star-linear': 'star',
  'solar:heart-bold': 'heart-fill',
  'solar:heart-linear': 'heart',
  'solar:global-bold': 'globe',
  'solar:book-bookmark-bold': 'book',
  'solar:notebook-bold': 'book',
  'solar:shield-check-bold': 'shield',
  'solar:leaf-bold': 'leaf',
  'solar:home-2-bold': 'home',
  'solar:tag-bold': 'tag',
  'solar:ticket-bold': 'ticket',
  'solar:box-bold': 'box',
  'solar:chat-unread-bold': 'chat',
  'solar:pen-new-square-bold': 'pen',
  'solar:notes-bold': 'notes',
  'solar:widget-5-bold': 'grid',
  'solar:play-circle-bold': 'play',
  'solar:plain-bold': 'send',
  'solar:target-bold': 'target',
  'solar:shop-bold': 'shop',
  'mdi:instagram': 'instagram',
  'mdi:facebook': 'facebook',
  'mdi:whatsapp': 'whatsapp',
  'ic:baseline-tiktok': 'tiktok',
  'mdi:youtube': 'youtube',
  'mdi:twitter': 'x',
  'mdi:linkedin': 'linkedin',
}

const Icon = ({ name, icon, size = '1.25em', label, className = '', style, strokeWidth = 1.75 }) => {
  let key = name || ALIAS[icon] || icon
  const filled = FILLED.has(key)
  if (filled) key = key.replace(/-fill$/, '')
  const glyph = P[key] || P.circle
  if (import.meta.env.DEV && !P[key]) console.warn(`[Icon] no local glyph for "${name || icon}"`)
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true, focusable: 'false' }
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`hc-icon ${className}`.trim()}
      style={style}
      {...a11y}>
      {label && <title>{label}</title>}
      {glyph}
    </svg>
  )
}

export default Icon
