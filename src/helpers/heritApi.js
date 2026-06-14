// HeritOS API client — talks to the real PHP backend over fetch().
//
// Larkon's bundled axios `fake-backend` still serves demo data for modules that
// aren't wired to PHP yet. Anything backed by a real endpoint goes through here
// so there's a clean line between "mock demo" and "live data".
//
// Dev hits the live API (CORS enabled in api.php); production is same-origin.
import { API_BASE } from '@/context/constants';

const authSessionKey = '_LARKON_AUTH_KEY_';

/** Pull the Bearer token from the session cookie (set by useAuthContext). */
function token() {
  const m = document.cookie.match(/_LARKON_AUTH_KEY_=([^;]+)/);
  if (!m) return null;
  try {
    return JSON.parse(decodeURIComponent(m[1]))?.token ?? null;
  } catch {
    return null;
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const t = token();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const heritApi = {
  // Smoke test — proves React → api.php → MySQL → JSON.
  listItems: () => request('/api.php', { auth: false }),
  addItem: (label) => request('/api.php', { method: 'POST', body: { label }, auth: false }),

  // Auth
  login: (email, password) =>
    request('/auth.php?action=login', { method: 'POST', body: { email, password }, auth: false }),
  logout: () => request('/auth.php?action=logout', { method: 'POST' }),
  me: () => request('/auth.php?action=me'),

  // AI proxy (OpenRouter, server-side)
  ai: (task, prompt, opts = {}) =>
    request('/ai.php', { method: 'POST', body: { task, prompt, ...opts } }),

  // AI image proxy (text-to-image, server-side, staff-only)
  aiImage: (task, prompt, opts = {}) =>
    request('/ai_image.php', { method: 'POST', body: { task, prompt, ...opts } }),

  // Tailoring & production
  tailoring: {
    list: () => request('/tailoring.php?action=list'),
    get: (id) => request(`/tailoring.php?action=get&id=${id}`),
    tailors: () => request('/tailoring.php?action=tailors'),
    create: (data) => request('/tailoring.php?action=create', { method: 'POST', body: data }),
    setStage: (id, stage, note) =>
      request(`/tailoring.php?action=stage&id=${id}`, { method: 'POST', body: { stage, note } }),
    assign: (id, data) =>
      request(`/tailoring.php?action=assign&id=${id}`, { method: 'POST', body: data }),
    setMeasurements: (id, measurements, sync_customer = false) =>
      request(`/tailoring.php?action=measure&id=${id}`, { method: 'POST', body: { measurements, sync_customer } }),
    pay: (id, amount) =>
      request(`/tailoring.php?action=pay&id=${id}`, { method: 'POST', body: { amount } }),
    setCosts: (id, fabric_cost, labour_cost) =>
      request(`/tailoring.php?action=costs&id=${id}`, { method: 'POST', body: { fabric_cost, labour_cost } }),
    setFitting: (id, fitting_date) =>
      request(`/tailoring.php?action=fitting&id=${id}`, { method: 'POST', body: { fitting_date } }),
    remind: (id, data) =>
      request(`/tailoring.php?action=remind&id=${id}`, { method: 'POST', body: data }),
  },

  // Products & variants (catalogue)
  products: {
    list: () => request('/products.php?action=list'),
    get: (id) => request(`/products.php?action=get&id=${id}`),
    create: (data) => request('/products.php?action=create', { method: 'POST', body: data }),
    update: (id, data) => request(`/products.php?action=update&id=${id}`, { method: 'POST', body: data }),
    setStock: (variantId, stock) =>
      request(`/products.php?action=stock&id=${variantId}`, { method: 'POST', body: { stock } }),
    setStatus: (id, status) =>
      request(`/products.php?action=status&id=${id}`, { method: 'POST', body: { status } }),
  },

  // Customers / CRM
  customers: {
    list: () => request('/customers.php?action=list'),
    get: (id) => request(`/customers.php?action=get&id=${id}`),
    create: (data) => request('/customers.php?action=create', { method: 'POST', body: data }),
    update: (id, data) => request(`/customers.php?action=update&id=${id}`, { method: 'POST', body: data }),
    setMeasurements: (id, measurements) =>
      request(`/customers.php?action=measure&id=${id}`, { method: 'POST', body: { measurements } }),
  },

  // Inventory & stock
  inventory: {
    list: () => request('/stock.php?action=list'),
    history: (variantId) => request(`/stock.php?action=history&id=${variantId}`),
    adjust: (variantId, delta, reason, note) =>
      request(`/stock.php?action=adjust&id=${variantId}`, { method: 'POST', body: { delta, reason, note } }),
    setCount: (variantId, stock, note) =>
      request(`/stock.php?action=set&id=${variantId}`, { method: 'POST', body: { stock, note } }),
  },

  // Orders (selling side)
  orders: {
    list: () => request('/orders.php?action=list'),
    get: (id) => request(`/orders.php?action=get&id=${id}`),
    create: (data) => request('/orders.php?action=create', { method: 'POST', body: data }),
    setStatus: (id, status) =>
      request(`/orders.php?action=status&id=${id}`, { method: 'POST', body: { status } }),
    track: (id, data) => request(`/orders.php?action=track&id=${id}`, { method: 'POST', body: data }),
    setReturn: (id, return_status, return_reason) =>
      request(`/orders.php?action=return&id=${id}`, { method: 'POST', body: { return_status, return_reason } }),
  },

  // Suppliers & purchasing
  suppliers: {
    list: () => request('/suppliers.php?action=list'),
    get: (id) => request(`/suppliers.php?action=get&id=${id}`),
    create: (data) => request('/suppliers.php?action=create', { method: 'POST', body: data }),
    update: (id, data) => request(`/suppliers.php?action=update&id=${id}`, { method: 'POST', body: data }),
    poList: () => request('/suppliers.php?action=po_list'),
    poGet: (id) => request(`/suppliers.php?action=po_get&id=${id}`),
    poCreate: (data) => request('/suppliers.php?action=po_create', { method: 'POST', body: data }),
    poReceive: (id) => request(`/suppliers.php?action=po_receive&id=${id}`, { method: 'POST' }),
    poStatus: (id, status) => request(`/suppliers.php?action=po_status&id=${id}`, { method: 'POST', body: { status } }),
  },

  // Payments & finance
  finance: {
    payments: () => request('/payments.php?action=list'),
    addPayment: (data) => request('/payments.php?action=create', { method: 'POST', body: data }),
    expenses: () => request('/payments.php?action=expenses'),
    addExpense: (data) => request('/payments.php?action=expense_create', { method: 'POST', body: data }),
    summary: () => request('/payments.php?action=summary'),
  },

  // Analytics & reports
  analytics: () => request('/analytics.php'),

  // Weather & ops (Lagos forecast + brand nudges, via Open-Meteo)
  weather: () => request('/weather.php'),

  // Marketing & social
  marketing: {
    list: () => request('/marketing.php?action=list'),
    create: (data) => request('/marketing.php?action=create', { method: 'POST', body: data }),
    setStatus: (id, status) => request(`/marketing.php?action=status&id=${id}`, { method: 'POST', body: { status } }),
    remove: (id) => request(`/marketing.php?action=delete&id=${id}`, { method: 'POST' }),
  },

  // Platform settings / channels
  settings: {
    get: () => request('/settings.php'),
    save: (data) => request('/settings.php', { method: 'POST', body: data }),
  },

  // Loyalty — store credit + gift cards
  loyalty: {
    balances: () => request('/loyalty.php?action=balances'),
    history: (customerId) => request(`/loyalty.php?action=history&customer_id=${customerId}`),
    adjust: (data) => request('/loyalty.php?action=adjust', { method: 'POST', body: data }),
    giftList: () => request('/loyalty.php?action=gift_list'),
    giftIssue: (data) => request('/loyalty.php?action=gift_issue', { method: 'POST', body: data }),
    giftToggle: (id, active) => request(`/loyalty.php?action=gift_toggle&id=${id}`, { method: 'POST', body: { active } }),
  },

  // Coupons & promotions
  coupons: {
    list: () => request('/coupons.php?action=list'),
    create: (data) => request('/coupons.php?action=create', { method: 'POST', body: data }),
    update: (id, data) => request(`/coupons.php?action=update&id=${id}`, { method: 'POST', body: data }),
    toggle: (id, active) => request(`/coupons.php?action=toggle&id=${id}`, { method: 'POST', body: { active } }),
    remove: (id) => request(`/coupons.php?action=delete&id=${id}`, { method: 'POST' }),
  },

  // Dashboard stats
  stats: () => request('/stats.php'),

  // Enquiries / contact
  contact: {
    submit: (data) => request('/contact.php', { method: 'POST', body: data, auth: false }),
    list: () => request('/contact.php?action=list'),
    setStatus: (id, status) =>
      request(`/contact.php?action=status&id=${id}`, { method: 'POST', body: { status } }),
  },

  // Team & Access (staff user management, admin-only)
  team: {
    list: () => request('/users.php?action=list'),
    create: (data) => request('/users.php?action=create', { method: 'POST', body: data }),
    update: (id, data) => request(`/users.php?action=update&id=${id}`, { method: 'POST', body: data }),
    reset: (id) => request(`/users.php?action=reset&id=${id}`, { method: 'POST' }),
    deactivate: (id) => request(`/users.php?action=deactivate&id=${id}`, { method: 'POST' }),
  },

  // Email — IMAP inbox + SMTP send
  inbox: {
    list: (limit = 30) => request(`/inbox.php?action=list&limit=${limit}`),
    get: (uid) => request(`/inbox.php?action=get&uid=${uid}`),
    setSeen: (uid, seen = true) => request(`/inbox.php?action=seen&uid=${uid}`, { method: 'POST', body: { seen } }),
  },
  mail: {
    send: (data) => request('/mail.php?action=send', { method: 'POST', body: data }),
  },

  // WhatsApp — inbox + broadcast (Meta Cloud API, wa.me fallback)
  whatsapp: {
    threads: () => request('/whatsapp.php?action=threads'),
    thread: (phone) => request(`/whatsapp.php?action=thread&phone=${encodeURIComponent(phone)}`),
    send: (data) => request('/whatsapp.php?action=send', { method: 'POST', body: data }),
    broadcast: (data) => request('/whatsapp.php?action=broadcast', { method: 'POST', body: data }),
    templates: () => request('/whatsapp.php?action=templates'),
    saveTemplate: (data) => request('/whatsapp.php?action=template_save', { method: 'POST', body: data }),
    deleteTemplate: (id) => request('/whatsapp.php?action=template_delete', { method: 'POST', body: { id } }),
  },

  // Own account (any authenticated role)
  account: {
    me: () => request('/users.php?action=me'),
    changePassword: (current, next) =>
      request('/users.php?action=password', { method: 'POST', body: { current, next } }),
  },

  // Public storefront (no auth) — catalogue, checkout, payment
  store: {
    catalogue: () => request('/store.php?action=catalogue', { auth: false }),
    checkout: (data) => request('/store.php?action=checkout', { method: 'POST', body: data, auth: false }),
    payInit: (code, email) => request('/store.php?action=pay_init', { method: 'POST', body: { code, email }, auth: false }),
    payVerify: (reference) => request(`/store.php?action=pay_verify&reference=${encodeURIComponent(reference)}`, { auth: false }),
    validateCoupon: (code, subtotal, shipping = 0) =>
      request(`/coupons.php?action=validate&code=${encodeURIComponent(code)}&subtotal=${subtotal}&shipping=${shipping}`, { auth: false }),
    creditBalance: (phone) =>
      request(`/loyalty.php?action=credit_balance&phone=${encodeURIComponent(phone)}`, { auth: false }),
    giftCheck: (code) =>
      request(`/loyalty.php?action=gift_check&code=${encodeURIComponent(code)}`, { auth: false }),
    track: (code, phone) =>
      request(`/store.php?action=track&code=${encodeURIComponent(code)}&phone=${encodeURIComponent(phone)}`, { auth: false }),
  },

  // Generic escape hatches for feature modules
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};

export default heritApi;
