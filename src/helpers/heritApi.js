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

  // Generic escape hatches for feature modules
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};

export default heritApi;
