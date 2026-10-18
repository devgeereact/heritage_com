import { describe, it, expect, vi } from 'vitest'
import { heritApi } from '@/helpers/heritApi'
import { API_BASE } from '@/context/constants'
import { setOnline, mockFetch, jsonResponse, textResponse, setStaffCookie, headerOf } from './helpers'

const OFFLINE_WRITE = 'You are offline, so nothing was saved. Reconnect and try again.'
const NO_CONNECTION = 'Could not reach the server. Check your connection and try again.'
const NO_CONNECTION_WRITE = 'Could not reach the server, so this may not have been saved. Check your connection, then check before trying again.'

/** Run a promise to its rejection and hand back the error. */
const rejection = async (promise) => {
  try {
    await promise
  } catch (e) {
    return e
  }
  throw new Error('Expected the promise to reject')
}

describe('heritApi: writes while the device is offline (D-016, A16)', () => {
  it('refuses a staff write before fetch is called, with the offline message and the network flag', async () => {
    setOnline(false)
    const fetchMock = mockFetch()

    const err = await rejection(heritApi.addItem('x'))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(err.message).toBe(OFFLINE_WRITE)
    expect(err.network).toBe(true)
    expect(err.status).toBe(0)
  })

  it.each([
    ['post', () => heritApi.post('/api.php', { a: 1 })],
    ['put', () => heritApi.put('/api.php', { a: 1 })],
    ['delete', () => heritApi.del('/api.php')],
    ['login (a public write)', () => heritApi.login('a@b.co', 'secret')],
    ['customer-session write', () => heritApi.client.message('REF', 'hello', 'key-key-key-key-1')],
    ['multipart upload', () => heritApi.cms.mediaUpload(new Blob(['x'], { type: 'image/png' }), { alt: 'a' })],
  ])('refuses %s offline without sending anything', async (_name, run) => {
    setOnline(false)
    const fetchMock = mockFetch()

    const err = await rejection(run())

    expect(fetchMock).not.toHaveBeenCalled()
    expect(err.network).toBe(true)
    expect(err.message).toBe(OFFLINE_WRITE)
  })

  it('still sends a read while offline, so cached or reachable data can load', async () => {
    setOnline(false)
    const fetchMock = mockFetch(() => jsonResponse({ items: [] }))

    await expect(heritApi.listItems()).resolves.toEqual({ items: [] })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('sends the same write once the device is back online', async () => {
    setOnline(true)
    const fetchMock = mockFetch(() => jsonResponse({ ok: true }))

    await expect(heritApi.addItem('x')).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('heritApi: a request that never reaches the server', () => {
  it('gives a read the plain "could not reach" message, marked as a network error', async () => {
    mockFetch(() => {
      throw new TypeError('Failed to fetch')
    })

    const err = await rejection(heritApi.stats())

    expect(err.message).toBe(NO_CONNECTION)
    expect(err.network).toBe(true)
    expect(err.status).toBe(0)
  })

  it('warns that a failed write may have been saved, which is a different message from a read', async () => {
    mockFetch(() => {
      throw new TypeError('Failed to fetch')
    })

    const err = await rejection(heritApi.post('/orders.php?action=create', { total: 1 }))

    expect(err.message).toBe(NO_CONNECTION_WRITE)
    expect(err.message).not.toBe(NO_CONNECTION)
    expect(err.network).toBe(true)
  })

  it('treats a customer-session read and write the same way', async () => {
    mockFetch(() => {
      throw new TypeError('Failed to fetch')
    })

    expect((await rejection(heritApi.client.jobs())).message).toBe(NO_CONNECTION)
    expect((await rejection(heritApi.client.message('R', 'hi', 'key-key-key-key-1'))).message).toBe(NO_CONNECTION_WRITE)
  })

  it('does not mark an HTTP error from the server as a network error', async () => {
    mockFetch(() => jsonResponse({ error: 'Nope' }, 500))

    const err = await rejection(heritApi.stats())

    expect(err.network).toBeUndefined()
    expect(err.status).toBe(500)
  })
})

describe('heritApi: Bearer header', () => {
  it('sends the token held in the session cookie', async () => {
    setStaffCookie({ token: 'abc123', email: 'dev@heritclothing.com' })
    const fetchMock = mockFetch()

    await heritApi.stats()

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${API_BASE}/stats.php`)
    expect(headerOf(init, 'Authorization')).toBe('Bearer abc123')
    expect(headerOf(init, 'Content-Type')).toBe('application/json')
  })

  it('sends no Authorization header when there is no session cookie', async () => {
    const fetchMock = mockFetch()

    await heritApi.stats()

    expect(headerOf(fetchMock.mock.calls[0][1], 'Authorization')).toBeUndefined()
  })

  it('sends none when the cookie holds a session without a token', async () => {
    setStaffCookie({ email: 'dev@heritclothing.com' })
    const fetchMock = mockFetch()

    await heritApi.stats()

    expect(headerOf(fetchMock.mock.calls[0][1], 'Authorization')).toBeUndefined()
  })

  it('sends none, and does not throw, when the cookie is not valid JSON', async () => {
    document.cookie = '_LARKON_AUTH_KEY_=%7Bnot-json; path=/'
    const fetchMock = mockFetch()

    await expect(heritApi.stats()).resolves.toEqual({})
    expect(headerOf(fetchMock.mock.calls[0][1], 'Authorization')).toBeUndefined()
  })

  it('leaves the token off public calls even while a staff session exists', async () => {
    setStaffCookie({ token: 'abc123' })
    const fetchMock = mockFetch()

    await heritApi.login('a@b.co', 'secret')
    await heritApi.site.config()
    await heritApi.booking.request({ name: 'Ada' })

    fetchMock.mock.calls.forEach(([, init]) => {
      expect(headerOf(init, 'Authorization')).toBeUndefined()
    })
  })

  it('posts the login credentials as a JSON body', async () => {
    const fetchMock = mockFetch(() => jsonResponse({ token: 't', user: { role: 'manager' } }))

    const res = await heritApi.login('dev@heritclothing.com', 'pa55')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${API_BASE}/auth.php?action=login`)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ email: 'dev@heritclothing.com', password: 'pa55' })
    expect(res.token).toBe('t')
  })

  it('sends both sign-in calls as JSON, which the server requires (A15 login CSRF)', async () => {
    const fetchMock = mockFetch(() => jsonResponse({ user: { role: 'manager' }, cookie_auth: true }))

    await heritApi.login('dev@heritclothing.com', 'pa55')
    await heritApi.pinLogin('1234')

    const [[loginUrl, loginInit], [pinUrl, pinInit]] = fetchMock.mock.calls
    expect(loginUrl).toBe(`${API_BASE}/auth.php?action=login`)
    expect(pinUrl).toBe(`${API_BASE}/auth.php?action=pin_login`)
    expect(headerOf(loginInit, 'Content-Type')).toBe('application/json')
    expect(headerOf(pinInit, 'Content-Type')).toBe('application/json')
    expect(JSON.parse(pinInit.body)).toEqual({ pin: '1234' })
  })

  it('sends the staff token with a multipart upload and lets the browser set the content type', async () => {
    setStaffCookie({ token: 'abc123' })
    const fetchMock = mockFetch(() => jsonResponse({ id: 9 }))

    await heritApi.cms.mediaUpload(new Blob(['x'], { type: 'image/png' }), { alt: 'Front view', skipped: undefined })

    const [, init] = fetchMock.mock.calls[0]
    expect(headerOf(init, 'Authorization')).toBe('Bearer abc123')
    expect(headerOf(init, 'Content-Type')).toBeUndefined()
    expect(init.body).toBeInstanceOf(FormData)
    expect(init.body.get('alt')).toBe('Front view')
    expect(init.body.has('skipped')).toBe(false)
    expect(init.body.has('file')).toBe(true)
  })
})

describe('heritApi: mapping API errors', () => {
  it('uses the server sentence as the message and keeps the status and body', async () => {
    mockFetch(() => jsonResponse({ error: 'Email or password is wrong.' }, 401))

    const err = await rejection(heritApi.login('a@b.co', 'bad'))

    expect(err.message).toBe('Email or password is wrong.')
    expect(err.status).toBe(401)
    expect(err.data).toEqual({ error: 'Email or password is wrong.' })
  })

  it('keeps structured detail a screen can act on, such as duplicate candidates on a 409', async () => {
    const body = { error: 'This may be an existing client.', candidates: [{ id: 4, name: 'Ada Okafor' }] }
    mockFetch(() => jsonResponse(body, 409))

    const err = await rejection(heritApi.customers.create({ name: 'Ada Okafor' }))

    expect(err.status).toBe(409)
    expect(err.data.candidates).toEqual([{ id: 4, name: 'Ada Okafor' }])
  })

  it('falls back to "Request failed (status)" when the body is not JSON', async () => {
    mockFetch(() => textResponse('<b>Fatal error</b>', 500))

    const err = await rejection(heritApi.stats())

    expect(err.message).toBe('Request failed (500)')
    expect(err.status).toBe(500)
    expect(err.data).toEqual({})
  })

  it('falls back to the status message when the JSON has no error field', async () => {
    mockFetch(() => jsonResponse({ detail: 'x' }, 403))

    const err = await rejection(heritApi.stats())

    expect(err.message).toBe('Request failed (403)')
    expect(err.data).toEqual({ detail: 'x' })
  })

  it('resolves an empty object when a successful response has no JSON body', async () => {
    mockFetch(() => textResponse('', 200))

    await expect(heritApi.stats()).resolves.toEqual({})
  })

  it('maps errors on customer-session calls the same way', async () => {
    mockFetch(() => jsonResponse({ error: 'Please sign in again.' }, 401))

    const err = await rejection(heritApi.client.jobs())

    expect(err.status).toBe(401)
    expect(err.message).toBe('Please sign in again.')
  })
})

describe('heritApi: URLs and query strings', () => {
  it('leaves empty values out of the query string and encodes the rest', async () => {
    const fetchMock = mockFetch()

    await heritApi.customers.list('')
    await heritApi.customers.list('ada & co')
    await heritApi.appointments.slots('fitting', '', 7)
    await heritApi.tailoring.list({ stage: 'in_production', q: '', page: 0 })

    const urls = fetchMock.mock.calls.map(([u]) => u.replace(API_BASE, ''))
    expect(urls[0]).toBe('/customers.php?action=list')
    expect(urls[1]).toBe('/customers.php?action=list&q=ada%20%26%20co')
    expect(urls[2]).toBe('/appointments.php?action=slots&type=fitting&days=7')
    // 0 is a real value and must survive; '' must not.
    expect(urls[3]).toBe('/tailoring.php?action=list&stage=in_production&page=0')
  })

  it('encodes user-supplied values placed in a path segment', async () => {
    const fetchMock = mockFetch()

    await heritApi.cms.list('page&x=1')

    const urls = fetchMock.mock.calls.map(([u]) => u.replace(API_BASE, ''))
    expect(urls[0]).toBe('/cms.php?action=list&entity=page%26x%3D1')
  })

  it('order lookup keeps the phone number out of the URL (K-14)', async () => {
    const fetchMock = mockFetch()

    await heritApi.store.track('HC 12/3', '0803 000 0000')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url.replace(API_BASE, '')).toBe('/store.php?action=track')
    expect(url).not.toContain('0803')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ code: 'HC 12/3', phone: '0803 000 0000' })
  })

  it('order lookup is a read sent as POST, so the offline write refusal does not block it', async () => {
    const fetchMock = mockFetch()
    setOnline(false)

    await heritApi.store.track('HC-1', '08030000000')

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('heritApi: customer-portal token', () => {
  it('keeps the token in sessionStorage and nowhere else', () => {
    heritApi.client.setToken('cust-1')

    expect(sessionStorage.getItem('herit_customer_token')).toBe('cust-1')
    expect(localStorage.getItem('herit_customer_token')).toBeNull()
    expect(heritApi.client.token()).toBe('cust-1')
  })

  it('moves an older token from localStorage into sessionStorage on first read', () => {
    localStorage.setItem('herit_customer_token', 'legacy-1')

    expect(heritApi.portal.token()).toBe('legacy-1')

    expect(sessionStorage.getItem('herit_customer_token')).toBe('legacy-1')
    expect(localStorage.getItem('herit_customer_token')).toBeNull()
  })

  it('prefers the session token over a stale legacy one', () => {
    sessionStorage.setItem('herit_customer_token', 'fresh')
    localStorage.setItem('herit_customer_token', 'stale')

    expect(heritApi.client.token()).toBe('fresh')
  })

  it('removes a legacy copy when a new token is stored', () => {
    localStorage.setItem('herit_customer_token', 'stale')

    heritApi.portal.setToken('fresh')

    expect(localStorage.getItem('herit_customer_token')).toBeNull()
    expect(heritApi.portal.token()).toBe('fresh')
  })

  it('clears both stores on logout', () => {
    sessionStorage.setItem('herit_customer_token', 'a')
    localStorage.setItem('herit_customer_token', 'b')

    heritApi.portal.logout()

    expect(heritApi.client.token()).toBeNull()
    expect(sessionStorage.getItem('herit_customer_token')).toBeNull()
    expect(localStorage.getItem('herit_customer_token')).toBeNull()
  })

  it('reads null, and does not throw, when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })

    expect(heritApi.client.token()).toBeNull()
    expect(() => heritApi.client.setToken('x')).not.toThrow()
  })

  it('sends the customer token on portal calls, never the staff token', async () => {
    setStaffCookie({ token: 'staff-token' })
    heritApi.client.setToken('cust-token')
    const fetchMock = mockFetch()

    await heritApi.client.jobs()

    expect(headerOf(fetchMock.mock.calls[0][1], 'Authorization')).toBe('Bearer cust-token')
  })

  it('sends no Authorization header on a portal call without a customer token', async () => {
    setStaffCookie({ token: 'staff-token' })
    const fetchMock = mockFetch()

    await heritApi.client.jobs()

    expect(headerOf(fetchMock.mock.calls[0][1], 'Authorization')).toBeUndefined()
  })

  it('marks a review verified only through the customer session (no staff token)', async () => {
    setStaffCookie({ token: 'staff-token' })
    heritApi.client.setToken('cust-token')
    const fetchMock = mockFetch()

    await heritApi.reviews.submit({ slug: 'agbada', rating: 5 })

    expect(headerOf(fetchMock.mock.calls[0][1], 'Authorization')).toBe('Bearer cust-token')
  })
})

describe('heritApi: CSRF header under staff cookie auth (A15)', () => {
  const live = 'a'.repeat(64)
  const local = 'b'.repeat(64)
  const withCookies = async (cookie, call) => {
    const spy = vi.spyOn(Document.prototype, 'cookie', 'get').mockReturnValue(cookie)
    try {
      const fetchMock = mockFetch()
      await call()
      return fetchMock.mock.calls[0][1]
    } finally {
      spy.mockRestore()
    }
  }

  it('echoes the live __Host-herit_csrf cookie on a write', async () => {
    const init = await withCookies(`__Host-herit_csrf=${live}`, () => heritApi.logout())
    expect(headerOf(init, 'X-Herit-CSRF')).toBe(live)
  })

  it('echoes the bare herit_csrf cookie used on local http staging', async () => {
    const init = await withCookies(`other=1; herit_csrf=${local}`, () => heritApi.logout())
    expect(headerOf(init, 'X-Herit-CSRF')).toBe(local)
  })

  it('prefers the __Host- cookie when a bare one is also present', async () => {
    const init = await withCookies(`herit_csrf=${local}; __Host-herit_csrf=${live}`, () => heritApi.logout())
    expect(headerOf(init, 'X-Herit-CSRF')).toBe(live)
  })

  it('sends no CSRF header on a read, or when the cookie is malformed', async () => {
    const read = await withCookies(`__Host-herit_csrf=${live}`, () => heritApi.stats())
    const bad = await withCookies('herit_csrf=not-hex', () => heritApi.logout())
    expect(headerOf(read, 'X-Herit-CSRF')).toBeUndefined()
    expect(headerOf(bad, 'X-Herit-CSRF')).toBeUndefined()
  })
})

describe('heritApi: staff cookie auth (A15)', () => {
  // The server sets herit_staff (HttpOnly, never visible here) and herit_csrf,
  // a readable 64-hex value that every staff write must echo in X-Herit-CSRF.
  const CSRF = 'a1'.repeat(32)
  const setCsrfCookie = (value = CSRF) => {
    document.cookie = `herit_csrf=${value}; path=/`
  }
  const cookieSession = () => setStaffCookie({ id: 1, email: 'dev@heritclothing.com', role: 'manager', cookie_auth: true })

  it('sends X-Herit-CSRF from the herit_csrf cookie on a staff write', async () => {
    cookieSession()
    setCsrfCookie()
    const fetchMock = mockFetch()

    await heritApi.addItem('x')

    const [, init] = fetchMock.mock.calls[0]
    expect(init.method).toBe('POST')
    expect(headerOf(init, 'X-Herit-CSRF')).toBe(CSRF)
    // Under cookie auth the profile holds no token, so no Bearer header either.
    expect(headerOf(init, 'Authorization')).toBeUndefined()
  })

  it('sends X-Herit-CSRF on sign-out and on a multipart upload', async () => {
    cookieSession()
    setCsrfCookie()
    const fetchMock = mockFetch(() => jsonResponse({ ok: true }))

    await heritApi.logout()
    await heritApi.cms.mediaUpload(new Blob(['x'], { type: 'image/png' }), { alt: 'a' })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    fetchMock.mock.calls.forEach(([, init]) => expect(headerOf(init, 'X-Herit-CSRF')).toBe(CSRF))
  })

  it('leaves X-Herit-CSRF off a GET', async () => {
    cookieSession()
    setCsrfCookie()
    const fetchMock = mockFetch()

    await heritApi.stats()

    expect(fetchMock.mock.calls[0][1].method).toBe('GET')
    expect(headerOf(fetchMock.mock.calls[0][1], 'X-Herit-CSRF')).toBeUndefined()
  })

  it('leaves X-Herit-CSRF off public calls, writes included', async () => {
    setCsrfCookie()
    const fetchMock = mockFetch()

    await heritApi.login('a@b.co', 'secret')
    await heritApi.booking.request({ name: 'Ada' })

    fetchMock.mock.calls.forEach(([, init]) => expect(headerOf(init, 'X-Herit-CSRF')).toBeUndefined())
  })

  it('sends no X-Herit-CSRF when the cookie is missing or not 64 hex characters', async () => {
    cookieSession()
    const fetchMock = mockFetch()

    await heritApi.addItem('x')
    setCsrfCookie('not-a-token')
    await heritApi.addItem('y')

    fetchMock.mock.calls.forEach(([, init]) => expect(headerOf(init, 'X-Herit-CSRF')).toBeUndefined())
  })

  it('sends both Bearer and X-Herit-CSRF on a write while an old-style token is still stored', async () => {
    setStaffCookie({ token: 'abc123' })
    setCsrfCookie()
    const fetchMock = mockFetch()

    await heritApi.addItem('x')

    const [, init] = fetchMock.mock.calls[0]
    expect(headerOf(init, 'Authorization')).toBe('Bearer abc123')
    expect(headerOf(init, 'X-Herit-CSRF')).toBe(CSRF)
  })

  it("asks for credentials: 'include' on staff, public and upload requests, so the session cookie travels", async () => {
    cookieSession()
    const fetchMock = mockFetch()

    await heritApi.stats()
    await heritApi.addItem('x')
    await heritApi.login('a@b.co', 'secret')
    await heritApi.site.config()
    await heritApi.cms.mediaUpload(new Blob(['x'], { type: 'image/png' }))

    expect(fetchMock).toHaveBeenCalledTimes(5)
    fetchMock.mock.calls.forEach(([, init]) => expect(init.credentials).toBe('include'))
  })

  it('hands a cookie-auth sign-in answer back unchanged: user and cookie_auth, no token', async () => {
    const answer = { user: { id: 1, email: 'dev@heritclothing.com', role: 'manager' }, cookie_auth: true }
    mockFetch(() => jsonResponse(answer))

    await expect(heritApi.login('dev@heritclothing.com', 'pa55')).resolves.toEqual(answer)
    await expect(heritApi.pinLogin('1234')).resolves.toEqual(answer)
  })
})

describe('heritApi: reads that used to change state are now separate writes (K-28)', () => {
  it.each([
    ['WhatsApp thread', () => heritApi.whatsapp.thread('+2348000000000'), '/whatsapp.php?action=thread&phone=%2B2348000000000'],
    ['inbox message', () => heritApi.inbox.get(7), '/inbox.php?action=get&uid=7'],
    ['referral code', () => heritApi.referrals.code(5), '/referrals.php?action=code&customer_id=5'],
  ])('%s is a GET with no body', async (_name, run, path) => {
    setOnline(true)
    const fetchMock = mockFetch()

    await run()

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${API_BASE}${path}`)
    expect((init.method || 'GET').toUpperCase()).toBe('GET')
    expect(init.body).toBeUndefined()
  })

  it.each([
    ['marking a WhatsApp thread seen', () => heritApi.whatsapp.markSeen('+2348000000000'), '/whatsapp.php?action=mark_seen', { phone: '+2348000000000' }],
    ['marking an email read', () => heritApi.inbox.setSeen(7, true), '/inbox.php?action=seen&uid=7', { seen: true }],
    ['creating a referral code', () => heritApi.referrals.ensureCode(5), '/referrals.php?action=ensure_code', { customer_id: 5 }],
  ])('%s is a POST with a JSON body', async (_name, run, path, body) => {
    setOnline(true)
    const fetchMock = mockFetch()

    await run()

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${API_BASE}${path}`)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual(body)
  })
})
