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

  // Tailoring & production
  tailoring: {
    list: () => request('/tailoring.php?action=list'),
    get: (id) => request(`/tailoring.php?action=get&id=${id}`),
    tailors: () => request('/tailoring.php?action=tailors'),
    create: (data) => request('/tailoring.php?action=create', { method: 'POST', body: data }),
    setStage: (id, stage, note) =>
      request(`/tailoring.php?action=stage&id=${id}`, { method: 'POST', body: { stage, note } }),
  },

  // Products & variants (catalogue)
  products: {
    list: () => request('/products.php?action=list'),
    get: (id) => request(`/products.php?action=get&id=${id}`),
    create: (data) => request('/products.php?action=create', { method: 'POST', body: data }),
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

  // Dashboard stats
  stats: () => request('/stats.php'),

  // Enquiries / contact
  contact: {
    submit: (data) => request('/contact.php', { method: 'POST', body: data, auth: false }),
    list: () => request('/contact.php?action=list'),
    setStatus: (id, status) =>
      request(`/contact.php?action=status&id=${id}`, { method: 'POST', body: { status } }),
  },

  // Generic escape hatches for feature modules
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};

export default heritApi;
