// Small helpers shared by the test files. Not a test file itself (the Vitest
// include pattern only picks up *.test.js and *.test.jsx).
import { vi } from 'vitest'

/** Make navigator.onLine report a value; setup.js removes the override after each test. */
export const setOnline = (value) => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => value })
}

/** A real Response carrying JSON, as fetch would resolve it. */
export const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/** A Response whose body is not JSON (a PHP fatal error page, for example). */
export const textResponse = (text, status = 500) => new Response(text, { status })

/**
 * Replace global fetch with a mock. `handler(url, init)` returns a Response (or
 * a promise of one) or throws/rejects to simulate a dropped connection.
 * Returns the mock so tests can read its calls.
 */
export const mockFetch = (handler = () => jsonResponse({})) => {
  const fn = vi.fn(async (url, init) => handler(String(url), init || {}))
  vi.stubGlobal('fetch', fn)
  return fn
}

/** Put a staff session in the cookie exactly as useAuthContext writes it. */
export const setStaffCookie = (session) => {
  document.cookie = `_LARKON_AUTH_KEY_=${encodeURIComponent(JSON.stringify(session))}; path=/`
}

/** The header value a fetch call carried, whatever the key's case. */
export const headerOf = (init, name) => {
  const headers = init?.headers || {}
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase())
  return key ? headers[key] : undefined
}
