// HeritOS API client — talks to the real PHP backend over fetch().
//
// Every endpoint, sign-in included, goes through this fetch client.
//
// Dev hits the local staging API unless VITE_API_BASE says otherwise (constants.js);
// production is same-origin.
import { API_BASE } from '@/context/constants'

/**
 * Pull the Bearer token from the session cookie (set by useAuthContext). With
 * cookie auth on the server (STAFF_COOKIE_AUTH, A15) that cookie holds only the
 * profile, so this is null and the HttpOnly session cookie signs requests.
 */
function token() {
  const m = document.cookie.match(/_LARKON_AUTH_KEY_=([^;]+)/)
  if (!m) return null
  try {
    return JSON.parse(decodeURIComponent(m[1]))?.token ?? null
  } catch {
    return null
  }
}

/**
 * The readable CSRF cookie set beside the session cookie; writes echo it in
 * X-Herit-CSRF. The live site names it __Host-herit_csrf, local http staging
 * herit_csrf (staff_cookie_names in _lib.php). The prefixed one wins, so a bare
 * cookie planted by another subdomain cannot displace it.
 */
function csrfToken() {
  const read = (name) => document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([0-9a-f]{64})(?:;|$)`))?.[1] ?? null
  return read('__Host-herit_csrf') ?? read('herit_csrf')
}

/** Staff credentials for one request: Bearer when an old-style token exists, the CSRF header on writes. */
function staffHeaders(method, headers = {}) {
  const t = token()
  if (t) headers.Authorization = `Bearer ${t}`
  const c = method !== 'GET' ? csrfToken() : null
  if (c) headers['X-Herit-CSRF'] = c
  return headers
}

/**
 * Offline handling (D-016, A16): writes are refused while the device is
 * offline, before anything is sent, so nothing half-saves. A request that fails
 * to reach the server becomes a plain-language error marked `network` (status
 * 0); the POS checks that flag to queue a sale.
 */
const OFFLINE_WRITE = 'You are offline, so nothing was saved. Reconnect and try again.'
const NO_CONNECTION = 'Could not reach the server. Check your connection and try again.'
const NO_CONNECTION_WRITE = 'Could not reach the server, so this may not have been saved. Check your connection, then check before trying again.'
const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false
// `offline` is also set when the browser reports no connection, so a screen can
// say "you are offline" instead of a server problem (LoadError, A16).
function networkError(message) {
  const err = new Error(message)
  err.status = 0
  err.network = true
  err.offline = isOffline()
  return err
}
async function send(url, init, { lookup = false } = {}) {
  // A lookup is a read sent as POST, so the offline write refusal does not apply.
  const write = !lookup && (init.method || 'GET') !== 'GET'
  if (write && isOffline()) throw networkError(OFFLINE_WRITE)
  try {
    return await fetch(url, init)
  } catch {
    throw networkError(write ? NO_CONNECTION_WRITE : NO_CONNECTION)
  }
}

async function request(path, { method = 'GET', body, auth = true, lookup = false } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) staffHeaders(method, headers)
  // credentials: 'include' so the staff session cookie travels to the local
  // staging API on another port too, and a sign-in answer can set it.
  const res = await send(
    `${API_BASE}${path}`,
    {
      method,
      headers,
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    },
    { lookup },
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw apiError(res.status, data)
  return data
}

/**
 * An Error carrying the HTTP status and the JSON body, so screens can act on a
 * 409 (duplicate candidates, allowed stages, stale lock_version) without
 * parsing message text. The message stays the server's plain sentence.
 */
function apiError(status, data) {
  const err = new Error(data?.error || `Request failed (${status})`)
  err.status = status
  err.data = data || {}
  return err
}

/** Build a query string from an object, skipping empty values. */
function qs(params = {}) {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
  return parts.length ? `&${parts.join('&')}` : ''
}

/**
 * Customer-portal token (separate from staff auth). Kept in sessionStorage so it
 * ends with the browser tab; an older token in localStorage (legacy login) is
 * still read once and moved across.
 */
const CTOKEN = 'herit_customer_token'
function customerToken() {
  try {
    const s = sessionStorage.getItem(CTOKEN)
    if (s) return s
    const l = localStorage.getItem(CTOKEN)
    if (l) {
      sessionStorage.setItem(CTOKEN, l)
      localStorage.removeItem(CTOKEN)
    }
    return l
  } catch {
    return null
  }
}
function setCustomerToken(t) {
  try {
    sessionStorage.setItem(CTOKEN, t)
    localStorage.removeItem(CTOKEN)
  } catch {
    /* ignore */
  }
}
function clearCustomerToken() {
  try {
    sessionStorage.removeItem(CTOKEN)
    localStorage.removeItem(CTOKEN)
  } catch {
    /* ignore */
  }
}

/** Request variant that carries the customer-portal Bearer token. Errors carry the status (401 means sign in again). */
async function crequest(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const t = customerToken()
  if (t) headers.Authorization = `Bearer ${t}`
  const res = await send(`${API_BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw apiError(res.status, data)
  return data
}

const post = (path, body) => request(path, { method: 'POST', body: body || {} })
/** Multipart upload with the staff token (the browser sets the boundary). */
async function upload(path, file, fields = {}) {
  const form = new FormData()
  form.append('file', file)
  Object.entries(fields).forEach(([k, v]) => {
    if (v !== undefined && v !== null) form.append(k, v)
  })
  const headers = staffHeaders('POST')
  const res = await send(`${API_BASE}${path}`, { method: 'POST', headers, credentials: 'include', body: form })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw apiError(res.status, data)
  return data
}

const pub = (path, body) => request(path, body ? { method: 'POST', body, auth: false } : { auth: false })
const cpost = (path, body) => crequest(path, { method: 'POST', body: body || {} })
const enc = encodeURIComponent

export const heritApi = {
  // Smoke test — proves React → api.php → MySQL → JSON.
  listItems: () => request('/api.php', { auth: false }),
  addItem: (label) => request('/api.php', { method: 'POST', body: { label } }), // staff session required

  // Auth
  login: (email, password) => request('/auth.php?action=login', { method: 'POST', body: { email, password }, auth: false }),
  logout: () => request('/auth.php?action=logout', { method: 'POST' }),
  // Staff password reset by email (K-04): same answer whether or not the address has an account.
  resetRequest: (email) => pub('/auth.php?action=reset_request', { email }),
  resetConfirm: (token, password) => pub('/auth.php?action=reset_confirm', { token, password }),
  me: () => request('/auth.php?action=me'),
  pinLogin: (pin) => request('/auth.php?action=pin_login', { method: 'POST', body: { pin }, auth: false }),
  setPin: (pin) => request('/auth.php?action=set_pin', { method: 'POST', body: { pin } }),
  sessions: () => request('/auth.php?action=sessions'),
  revokeSession: (id) => request('/auth.php?action=revoke', { method: 'POST', body: { id } }),

  // AI proxy (OpenRouter, server-side)
  ai: (task, prompt, opts = {}) => request('/ai.php', { method: 'POST', body: { task, prompt, ...opts } }),

  // AI image proxy (text-to-image, server-side, staff-only)
  aiImage: (task, prompt, opts = {}) => request('/ai_image.php', { method: 'POST', body: { task, prompt, ...opts } }),

  // Today: the owner's daily worklist (owner roles)
  today: () => request('/today.php'),

  // Enquiry pipeline (staff side; convert is owner-only)
  enquiries: {
    list: (params = {}) => request(`/enquiries.php?action=list${qs(params)}`),
    get: (id) => request(`/enquiries.php?action=get&id=${id}`),
    create: (data) => request('/enquiries.php?action=create', { method: 'POST', body: data }),
    update: (id, data) => request(`/enquiries.php?action=update&id=${id}`, { method: 'POST', body: data }),
    linkClient: (id, client_id) => request(`/enquiries.php?action=link_client&id=${id}`, { method: 'POST', body: { client_id } }),
    convert: (id, data) => request(`/enquiries.php?action=convert&id=${id}`, { method: 'POST', body: data }),
  },

  // Measurement sets and templates (workshop roles; approve, reject and templates owner-only)
  measurements: {
    templates: (all = false) => request(`/measurements.php?action=templates${all ? '&all=1' : ''}`),
    templateSave: (data) => request('/measurements.php?action=template_save', { method: 'POST', body: data }),
    list: (customerId) => request(`/measurements.php?action=list&customer_id=${customerId}`),
    get: (id) => request(`/measurements.php?action=get&id=${id}`),
    create: (data) => request('/measurements.php?action=create', { method: 'POST', body: data }),
    approve: (id, unit) => request(`/measurements.php?action=approve&id=${id}`, { method: 'POST', body: unit ? { unit } : {} }),
    reject: (id, reason) => request(`/measurements.php?action=reject&id=${id}`, { method: 'POST', body: { reason } }),
    convertPreview: (id, to) => request(`/measurements.php?action=convert_preview&id=${id}&to=${to}`),
  },

  // Versioned quotes (owner roles)
  quotes: {
    list: (params) => request(`/quotes.php?action=list${qs(params)}`),
    get: (id) => request(`/quotes.php?action=get&id=${id}`),
    create: (data) => request('/quotes.php?action=create', { method: 'POST', body: data }),
    save: (id, data) => request(`/quotes.php?action=save&id=${id}`, { method: 'POST', body: data }),
    send: (id, channel) => request(`/quotes.php?action=send&id=${id}`, { method: 'POST', body: { channel } }),
    revise: (id, request_key) => request(`/quotes.php?action=revise&id=${id}`, { method: 'POST', body: { request_key } }),
    accept: (id, data) => request(`/quotes.php?action=accept&id=${id}`, { method: 'POST', body: data }),
    decline: (id, note) => request(`/quotes.php?action=decline&id=${id}`, { method: 'POST', body: { note } }),
    withdraw: (id, note) => request(`/quotes.php?action=withdraw&id=${id}`, { method: 'POST', body: { note } }),
  },

  // Job payment ledger (owner roles; append-only)
  ledger: {
    list: (params = {}) => request(`/ledger.php?action=list${qs(params)}`),
    due: () => request('/ledger.php?action=due'),
    credits: () => request('/ledger.php?action=credits'),
    record: (data) => request('/ledger.php?action=record', { method: 'POST', body: data }),
    verify: (id) => request(`/ledger.php?action=verify&id=${id}`, { method: 'POST', body: {} }),
    reverse: (id, reason, request_key) => request(`/ledger.php?action=reverse&id=${id}`, { method: 'POST', body: { reason, request_key } }),
    refund: (data) => request('/ledger.php?action=refund', { method: 'POST', body: data }),
  },

  // Tailoring & production
  tailoring: {
    meta: () => request('/tailoring.php?action=meta'),
    update: (id, data) => request(`/tailoring.php?action=update&id=${id}`, { method: 'POST', body: data }),
    moveStage: (id, data) => request(`/tailoring.php?action=stage&id=${id}`, { method: 'POST', body: data }),
    confirmReview: (id, outcome) => request(`/tailoring.php?action=confirm_review&id=${id}`, { method: 'POST', body: { outcome } }),
    attachMeasurements: (id, set_id, reason) =>
      request(`/tailoring.php?action=attach_measurements&id=${id}`, { method: 'POST', body: { set_id, reason } }),
    handovers: (id) => request(`/tailoring.php?action=handovers&id=${id}`),
    handoverSave: (id, data) => request(`/tailoring.php?action=handover_save&id=${id}`, { method: 'POST', body: data }),
    handoverComplete: (id, hid, data) => request(`/tailoring.php?action=handover_complete&id=${id}&hid=${hid}`, { method: 'POST', body: data }),
    document: (id, doc, ref) => request(`/tailoring.php?action=document&id=${id}&doc=${doc}${ref ? `&ref=${ref}` : ''}`),
    list: (params = {}) => request(`/tailoring.php?action=list${qs(params)}`),
    get: (id) => request(`/tailoring.php?action=get&id=${id}`),
    tailors: () => request('/tailoring.php?action=tailors'),
    create: (data) => request('/tailoring.php?action=create', { method: 'POST', body: data }),
    setStage: (id, stage, note) => request(`/tailoring.php?action=stage&id=${id}`, { method: 'POST', body: { stage, note } }),
    assign: (id, data) => request(`/tailoring.php?action=assign&id=${id}`, { method: 'POST', body: data }),
    setMeasurements: (id, measurements, sync_customer = false) =>
      request(`/tailoring.php?action=measure&id=${id}`, { method: 'POST', body: { measurements, sync_customer } }),
    pay: (id, amount) => request(`/tailoring.php?action=pay&id=${id}`, { method: 'POST', body: { amount } }),
    setCosts: (id, fabric_cost, labour_cost) =>
      request(`/tailoring.php?action=costs&id=${id}`, { method: 'POST', body: { fabric_cost, labour_cost } }),
    setFitting: (id, fitting_date) => request(`/tailoring.php?action=fitting&id=${id}`, { method: 'POST', body: { fitting_date } }),
    remind: (id, data) => request(`/tailoring.php?action=remind&id=${id}`, { method: 'POST', body: data }),
    groupList: () => request('/tailoring.php?action=group_list'),
    groupGet: (id) => request(`/tailoring.php?action=group_get&id=${id}`),
    groupCreate: (data) => request('/tailoring.php?action=group_create', { method: 'POST', body: data }),
  },

  // Products & variants (catalogue)
  products: {
    list: () => request('/products.php?action=list'),
    get: (id) => request(`/products.php?action=get&id=${id}`),
    create: (data) => request('/products.php?action=create', { method: 'POST', body: data }),
    update: (id, data) => request(`/products.php?action=update&id=${id}`, { method: 'POST', body: data }),
    setStock: (variantId, stock) => request(`/products.php?action=stock&id=${variantId}`, { method: 'POST', body: { stock } }),
    setStatus: (id, status) => request(`/products.php?action=status&id=${id}`, { method: 'POST', body: { status } }),
  },

  // Customers / CRM
  customers: {
    list: (q) => request(`/customers.php?action=list${qs({ q })}`),
    match: (phone, email) => request(`/customers.php?action=match${qs({ phone, email })}`),
    get: (id) => request(`/customers.php?action=get&id=${id}`),
    create: (data) => request('/customers.php?action=create', { method: 'POST', body: data }),
    update: (id, data) => request(`/customers.php?action=update&id=${id}`, { method: 'POST', body: data }),
    setMeasurements: (id, measurements) => request(`/customers.php?action=measure&id=${id}`, { method: 'POST', body: { measurements } }),
    birthdays: () => request('/customers.php?action=birthdays'),
  },

  // Inventory & stock
  inventory: {
    list: () => request('/stock.php?action=list'),
    history: (variantId) => request(`/stock.php?action=history&id=${variantId}`),
    adjust: (variantId, delta, reason, note) =>
      request(`/stock.php?action=adjust&id=${variantId}`, { method: 'POST', body: { delta, reason, note } }),
    setCount: (variantId, stock, note) => request(`/stock.php?action=set&id=${variantId}`, { method: 'POST', body: { stock, note } }),
  },

  // Orders (selling side)
  orders: {
    list: () => request('/orders.php?action=list'),
    get: (id) => request(`/orders.php?action=get&id=${id}`),
    create: (data) => request('/orders.php?action=create', { method: 'POST', body: data }),
    setStatus: (id, status) => request(`/orders.php?action=status&id=${id}`, { method: 'POST', body: { status } }),
    track: (id, data) => request(`/orders.php?action=track&id=${id}`, { method: 'POST', body: data }),
    setReturn: (id, return_status, return_reason) =>
      request(`/orders.php?action=return&id=${id}`, { method: 'POST', body: { return_status, return_reason } }),
    pay: (id, data) => request(`/orders.php?action=pay&id=${id}`, { method: 'POST', body: data }),
    refund: (id, data) => request(`/orders.php?action=refund&id=${id}`, { method: 'POST', body: data }),
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

  // Content hub — public Blog (Journal) + curated Testimonials (staff CRUD)
  content: {
    blogList: () => request('/content.php?action=blog_list'),
    blogGet: (id) => request(`/content.php?action=blog_get&id=${id}`),
    blogSave: (data) => request('/content.php?action=blog_save', { method: 'POST', body: data }),
    blogDelete: (id) => request(`/content.php?action=blog_delete&id=${id}`, { method: 'POST' }),
    testiList: () => request('/content.php?action=testi_list'),
    testiSave: (data) => request('/content.php?action=testi_save', { method: 'POST', body: data }),
    testiDelete: (id) => request(`/content.php?action=testi_delete&id=${id}`, { method: 'POST' }),
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

  // Re-engagement — restock waitlist + abandoned carts
  engage: {
    waitlist: () => request('/engage.php?action=waitlist'),
    waitlistNotify: (data) => request('/engage.php?action=waitlist_notify', { method: 'POST', body: data }),
    abandoned: () => request('/engage.php?action=abandoned'),
    abandonedNudge: (id, message) => request(`/engage.php?action=abandoned_nudge&id=${id}`, { method: 'POST', body: { message } }),
  },

  // Reviews + UGC
  reviews: {
    list: (slug) => request(`/reviews.php?action=list&slug=${encodeURIComponent(slug)}`, { auth: false }),
    // Carries the customer session when signed in: only a verified session marks a review verified.
    submit: (data) => crequest('/reviews.php?action=submit', { method: 'POST', body: data }),
    gallery: () => request('/reviews.php?action=gallery', { auth: false }),
    moderate: (status = 'pending') => request(`/reviews.php?action=moderate&status=${status}`),
    setStatus: (id, status) => request(`/reviews.php?action=status&id=${id}`, { method: 'POST', body: { status } }),
    respond: (id, response) => request(`/reviews.php?action=respond&id=${id}`, { method: 'POST', body: { response } }),
    qaList: (slug) => request(`/reviews.php?action=qa_list&slug=${encodeURIComponent(slug)}`, { auth: false }),
    answer: (id, answer) => request(`/reviews.php?action=answer&id=${id}`, { method: 'POST', body: { answer } }),
  },

  // Referrals
  referrals: {
    leaderboard: () => request('/referrals.php?action=leaderboard'),
    code: (customerId) => request(`/referrals.php?action=code&customer_id=${customerId}`),
  },

  // Coupons & promotions
  coupons: {
    list: () => request('/coupons.php?action=list'),
    create: (data) => request('/coupons.php?action=create', { method: 'POST', body: data }),
    update: (id, data) => request(`/coupons.php?action=update&id=${id}`, { method: 'POST', body: data }),
    toggle: (id, active) => request(`/coupons.php?action=toggle&id=${id}`, { method: 'POST', body: { active } }),
    remove: (id) => request(`/coupons.php?action=delete&id=${id}`, { method: 'POST' }),
  },

  // Data / accounting export — fetch CSV (with auth) and trigger a download.
  downloadCsv: async (type) => {
    const data = await request(`/export.php?type=${type}`)
    const blob = new Blob([data.csv || ''], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = data.filename || `${type}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    return data.rows ?? 0
  },

  // Dashboard stats
  stats: () => request('/stats.php'),

  // Enquiries / contact
  contact: {
    submit: (data) => request('/contact.php', { method: 'POST', body: data, auth: false }),
    list: () => request('/contact.php?action=list'),
    setStatus: (id, status) => request(`/contact.php?action=status&id=${id}`, { method: 'POST', body: { status } }),
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
    changePassword: (current, next) => request('/users.php?action=password', { method: 'POST', body: { current, next } }),
  },

  // Public storefront (no auth) — catalogue, checkout, payment
  store: {
    catalogue: () => request('/store.php?action=catalogue', { auth: false }),
    // public store config (socials, store name) — set by admins in Settings
    config: () => request('/store.php?action=config', { auth: false }),
    // public blog (Journal) + testimonials, published only
    blog: (limit = 24) => request(`/store.php?action=blog&limit=${limit}`, { auth: false }),
    blogPost: (slug) => request(`/store.php?action=blog&slug=${encodeURIComponent(slug)}`, { auth: false }),
    testimonials: () => request('/store.php?action=testimonials', { auth: false }),
    // Store credit applies only for the signed-in customer's own session (server rule).
    checkout: (data) => crequest('/store.php?action=checkout', { method: 'POST', body: data }),
    payInit: (code, email) => request('/store.php?action=pay_init', { method: 'POST', body: { code, email }, auth: false }),
    payVerify: (reference) => request(`/store.php?action=pay_verify&reference=${encodeURIComponent(reference)}`, { auth: false }),
    validateCoupon: (code, subtotal, shipping = 0) =>
      request(`/coupons.php?action=validate&code=${encodeURIComponent(code)}&subtotal=${subtotal}&shipping=${shipping}`, { auth: false }),
    creditBalance: () => crequest('/loyalty.php?action=credit_balance'),
    giftCheck: (code) => request(`/loyalty.php?action=gift_check&code=${encodeURIComponent(code)}`, { auth: false }),
    // POST with a JSON body so the phone number never reaches server access logs (K-14).
    track: (code, phone) => request('/store.php?action=track', { method: 'POST', body: { code, phone }, auth: false, lookup: true }),
    waitlistJoin: (data) => request('/store.php?action=waitlist_join', { method: 'POST', body: data, auth: false }),
    saveCart: (data) => request('/store.php?action=save_cart', { method: 'POST', body: data, auth: false }),
  },

  // Appointments and availability (Phase 3; reads workshop, writes owner)
  appointments: {
    list: (params = {}) => request(`/appointments.php?action=list${qs(params)}`),
    get: (id) => request(`/appointments.php?action=get&id=${id}`),
    requests: () => request('/appointments.php?action=requests'),
    slots: (type, from, days = 7) => request(`/appointments.php?action=slots${qs({ type, from, days })}`),
    create: (data) => post('/appointments.php?action=create', data),
    reschedule: (id, data) => post(`/appointments.php?action=reschedule&id=${id}`, data),
    /** action: confirm, decline, complete, no_show or cancel */
    setStatus: (id, action, reason) => post(`/appointments.php?action=${action}&id=${id}`, reason ? { reason } : {}),
    availabilityGet: () => request('/appointments.php?action=availability_get'),
    availabilitySave: (data) => post('/appointments.php?action=availability_save', data),
    blocks: (from, to) => request(`/appointments.php?action=blocks${qs({ from, to })}`),
    blockSave: (data) => post('/appointments.php?action=block_save', data),
    blockDelete: (id) => post(`/appointments.php?action=block_delete&id=${id}`),
  },

  // Job messages, change requests and feedback (owner)
  messages: {
    inbox: () => request('/messages.php?action=inbox'),
    unreadCount: () => request('/messages.php?action=unread_count'),
    thread: (jobId) => request(`/messages.php?action=thread&job_id=${jobId}`),
    post: (data) => post('/messages.php?action=post', data),
    markRead: (job_id) => post('/messages.php?action=mark_read', { job_id }),
    changeRequests: (params = {}) => request(`/messages.php?action=change_requests${qs(params)}`),
    changeDecide: (id, data) => post(`/messages.php?action=change_decide&id=${id}`, data),
    feedbackList: (params = {}) => request(`/messages.php?action=feedback_list${qs(params)}`),
    feedbackUpdate: (id, follow_up) => post(`/messages.php?action=feedback_update&id=${id}`, { follow_up }),
    feedbackPublish: (id) => post(`/messages.php?action=feedback_publish&id=${id}`),
  },

  // Customer access: public start/verify/redeem, owner invites and revocation
  access: {
    start: (reference, contact, hp_url = '') => pub('/access.php?action=start', { reference, contact, hp_url }),
    verify: (challenge, code) => pub('/access.php?action=verify', { challenge, code }),
    redeem: (invite) => pub('/access.php?action=redeem', { invite }),
    logout: () => cpost('/access.php?action=logout'),
    logoutAll: () => cpost('/access.php?action=logout_all'),
    requests: () => request('/access.php?action=requests'),
    invite: (data) => post('/access.php?action=invite', data),
    revoke: (customer_id) => post('/access.php?action=revoke', { customer_id }),
  },

  // Public appointment requests (off until public_booking_enabled)
  booking: {
    config: () => pub('/booking.php?action=config'),
    slots: (type, from, days = 14) => pub(`/booking.php?action=slots${qs({ type, from, days })}`),
    request: (data) => pub('/booking.php?action=request', data),
  },

  // Customer portal over tailoring jobs (portal.php; customer session)
  client: {
    me: () => crequest('/portal.php?action=me'),
    jobs: () => crequest('/portal.php?action=jobs'),
    job: (ref) => crequest(`/portal.php?action=job&ref=${enc(ref)}`),
    messages: (ref) => crequest(`/portal.php?action=messages&ref=${enc(ref)}`),
    message: (ref, body, request_key) => cpost('/portal.php?action=message', { ref, body, request_key }),
    changeRequest: (data) => cpost('/portal.php?action=change_request', data),
    slots: (type, from, days = 14) => crequest(`/portal.php?action=slots${qs({ type, from, days })}`),
    appointmentRequest: (data) => cpost('/portal.php?action=appointment_request', data),
    rescheduleRequest: (data) => cpost('/portal.php?action=appointment_reschedule_request', data),
    measurements: () => crequest('/portal.php?action=measurements'),
    measurementTemplates: () => crequest('/portal.php?action=measurement_templates'),
    proposeMeasurements: (data) => cpost('/portal.php?action=propose_measurements', data),
    feedback: (data) => cpost('/portal.php?action=feedback', data),
    quoteAccept: (data) => cpost('/portal.php?action=quote_accept', data),
    sampleDecide: (data) => cpost('/portal.php?action=sample_decide', data),
    setToken: (t) => setCustomerToken(t),
    clearToken: () => clearCustomerToken(),
    token: () => customerToken(),
  },

  // Retail customer self-service (account.php; shares the customer session)
  portal: {
    login: (phone, order_code) => request('/account.php?action=login', { method: 'POST', body: { phone, order_code }, auth: false }),
    me: () => crequest('/account.php?action=me'),
    orders: () => crequest('/account.php?action=orders'),
    order: (code) => crequest(`/account.php?action=order&code=${encodeURIComponent(code)}`),
    reorder: (code) => crequest(`/account.php?action=reorder&code=${encodeURIComponent(code)}`, { method: 'POST' }),
    saveMeasurements: (measurements) => crequest('/account.php?action=measurements', { method: 'POST', body: { measurements } }),
    requestReturn: (order_code, reason) => crequest('/account.php?action=return', { method: 'POST', body: { order_code, reason } }),
    referral: () => crequest('/account.php?action=referral'),
    wishlist: () => crequest('/account.php?action=wishlist'),
    wishlistToggle: (slug, name) => crequest('/account.php?action=wishlist_toggle', { method: 'POST', body: { slug, name } }),
    setBirthday: (birthday) => crequest('/account.php?action=set_birthday', { method: 'POST', body: { birthday } }),
    npsSubmit: (score, comment) => crequest('/account.php?action=nps_submit', { method: 'POST', body: { score, comment } }),
    setToken: (t) => setCustomerToken(t),
    logout: () => clearCustomerToken(),
    token: () => customerToken(),
  },

  // Company orders (Phase 5; owner roles, item progress also for tailors)
  companies: {
    list: (q) => request(`/companies.php?action=list${qs({ q })}`),
    get: (id) => request(`/companies.php?action=get&id=${enc(id)}`),
    match: (name) => request(`/companies.php?action=match${qs({ name })}`),
    save: (data) => request('/companies.php?action=save', { method: 'POST', body: data }),
    contactSave: (data) => request('/companies.php?action=contact_save', { method: 'POST', body: data }),
    contactDeactivate: (id) => request(`/companies.php?action=contact_deactivate&id=${enc(id)}`, { method: 'POST', body: {} }),
  },
  companyJobs: {
    create: (data) => request('/company_jobs.php?action=create', { method: 'POST', body: data }),
    get: (jobId) => request(`/company_jobs.php?action=job&job_id=${enc(jobId)}`),
    act: (action, jobId, data = {}) => request(`/company_jobs.php?action=${enc(action)}&job_id=${enc(jobId)}`, { method: 'POST', body: data }),
  },

  // Public website projection (site.php; published content only, no sign-in)
  site: {
    config: () => pub('/site.php?action=config'),
    home: () => pub('/site.php?action=home'),
    page: (key) => pub(`/site.php?action=page&key=${enc(key)}`),
    services: () => pub('/site.php?action=services'),
    service: (slug) => pub(`/site.php?action=service&slug=${enc(slug)}`),
    work: (service) => pub(`/site.php?action=work${qs({ service })}`),
    workItem: (slug) => pub(`/site.php?action=work_item&slug=${enc(slug)}`),
    faqs: (home) => pub(`/site.php?action=faqs${home ? '&home=1' : ''}`),
    policy: (key) => pub(`/site.php?action=policy&key=${enc(key)}`),
    journal: () => pub('/site.php?action=journal'),
    journalPost: (slug) => pub(`/site.php?action=journal_post&slug=${enc(slug)}`),
  },

  // Website CMS (cms.php; owner roles and editor). Entities: service, project, faq, policy, page.
  cms: {
    list: (entity) => request(`/cms.php?action=list&entity=${enc(entity)}`),
    get: (entity, { id, key } = {}) => request(`/cms.php?action=get&entity=${enc(entity)}${qs({ id, key })}`),
    saveDraft: (entity, body) => request(`/cms.php?action=save_draft&entity=${enc(entity)}`, { method: 'POST', body }),
    preview: (entity, id) => request(`/cms.php?action=preview&entity=${enc(entity)}&id=${enc(id)}`),
    publish: (entity, id, confirmLeak = false) =>
      request(`/cms.php?action=publish&entity=${enc(entity)}&id=${enc(id)}`, { method: 'POST', body: confirmLeak ? { confirm_leak: true } : {} }),
    act: (action, entity, id) => request(`/cms.php?action=${enc(action)}&entity=${enc(entity)}&id=${enc(id)}`, { method: 'POST', body: {} }),
    reorder: (entity, ids) => request(`/cms.php?action=reorder&entity=${enc(entity)}`, { method: 'POST', body: { ids } }),
    mediaList: () => request('/cms.php?action=media_list'),
    mediaUpload: (file, fields = {}) => upload('/cms.php?action=media_upload', file, fields),
    mediaUpdate: (id, data) => request(`/cms.php?action=media_update&id=${enc(id)}`, { method: 'POST', body: data }),
    mediaDelete: (id) => request(`/cms.php?action=media_delete&id=${enc(id)}`, { method: 'POST', body: {} }),
    profileGet: () => request('/cms.php?action=profile_get'),
    profileSave: (data) => request('/cms.php?action=profile_save', { method: 'POST', body: data }),
  },

  // Generic escape hatches for feature modules
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' }),
}

export default heritApi
