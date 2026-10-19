import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { recordSectionVisit, USAGE_SECTIONS, USAGE_STORAGE_KEY } from '@/helpers/usage'
import heritApi from '@/helpers/heritApi'
import { mockFetch, jsonResponse, setOnline } from './helpers'

// Phase 7: one hit per section per browser per Lagos day, never blocking,
// errors ignored, nothing sent offline. The server stores no person.

/** A Storage-like object over a plain map. */
const memoryStorage = () => {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m }
}

describe('section usage sender', () => {
  let storage
  let send
  beforeEach(() => {
    storage = memoryStorage()
    send = vi.fn(() => Promise.resolve({ ok: true }))
  })

  it('sends one hit for a section, then nothing more that day', () => {
    expect(recordSectionVisit('/jobs/12', { send, storage, day: '2026-10-19', online: true })).toBe(true)
    expect(recordSectionVisit('/jobs', { send, storage, day: '2026-10-19', online: true })).toBe(false)
    expect(recordSectionVisit('/jobs/groups', { send, storage, day: '2026-10-19', online: true })).toBe(false)
    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith('jobs')
  })

  it('on a shared device, counts the next role that opens the same section that day', () => {
    recordSectionVisit('/jobs', { send, storage, day: '2026-10-19', online: true, role: 'super_admin' })
    recordSectionVisit('/jobs', { send, storage, day: '2026-10-19', online: true, role: 'tailor' })
    recordSectionVisit('/jobs/3', { send, storage, day: '2026-10-19', online: true, role: 'tailor' })
    expect(send).toHaveBeenCalledTimes(2)
    expect(JSON.parse(storage.getItem(USAGE_STORAGE_KEY))).toEqual({ day: '2026-10-19', role: 'tailor', sections: ['jobs'] })
  })

  it('counts each section separately and starts again on a new day', () => {
    recordSectionVisit('/jobs', { send, storage, day: '2026-10-19', online: true })
    recordSectionVisit('/clients/4', { send, storage, day: '2026-10-19', online: true })
    recordSectionVisit('/jobs', { send, storage, day: '2026-10-20', online: true })
    expect(send.mock.calls.map((c) => c[0])).toEqual(['jobs', 'clients', 'jobs'])
    expect(JSON.parse(storage.getItem(USAGE_STORAGE_KEY))).toEqual({ day: '2026-10-20', role: null, sections: ['jobs'] })
  })

  it('sends nothing while offline and does not mark the section as sent', () => {
    expect(recordSectionVisit('/today', { send, storage, day: '2026-10-19', online: false })).toBe(false)
    expect(send).not.toHaveBeenCalled()
    expect(recordSectionVisit('/today', { send, storage, day: '2026-10-19', online: true })).toBe(true)
  })

  it('reads the browser offline flag when not told', () => {
    setOnline(false)
    expect(recordSectionVisit('/today', { send, storage, day: '2026-10-19' })).toBe(false)
    expect(send).not.toHaveBeenCalled()
  })

  it('ignores paths that are not menu sections', () => {
    ;['/print/quote/3', '/auth/sign-in', '/apps/calendar', '/unknown-thing'].forEach((p) =>
      expect(recordSectionVisit(p, { send, storage, day: '2026-10-19', online: true }), p).toBe(false),
    )
    expect(send).not.toHaveBeenCalled()
  })

  it('swallows a failed request and does not retry it the same day', async () => {
    const failing = vi.fn(() => Promise.reject(new Error('Server error')))
    expect(recordSectionVisit('/payments', { send: failing, storage, day: '2026-10-19', online: true })).toBe(true)
    await Promise.resolve()
    expect(recordSectionVisit('/payments', { send: failing, storage, day: '2026-10-19', online: true })).toBe(false)
    expect(failing).toHaveBeenCalledTimes(1)
  })

  it('swallows a sender that throws straight away', () => {
    const throwing = () => {
      throw new Error('boom')
    }
    expect(() => recordSectionVisit('/today', { send: throwing, storage, day: '2026-10-19', online: true })).not.toThrow()
  })

  it('sends nothing when storage is unavailable or throws', () => {
    expect(recordSectionVisit('/today', { send, storage: null, day: '2026-10-19', online: true })).toBe(false)
    const broken = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('denied') } }
    expect(recordSectionVisit('/today', { send, storage: broken, day: '2026-10-19', online: true })).toBe(false)
    expect(send).not.toHaveBeenCalled()
  })

  it('treats a corrupt stored value as nothing sent yet', () => {
    storage.setItem(USAGE_STORAGE_KEY, '{not json')
    expect(recordSectionVisit('/today', { send, storage, day: '2026-10-19', online: true })).toBe(true)
  })

  it('posts only the section key to usage.php through the API client', async () => {
    const fetchMock = mockFetch(() => jsonResponse({ ok: true, counted: true }))
    await heritApi.usage.hit('jobs')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/usage\.php\?action=hit$/)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ section: 'jobs' })
  })
})

describe('section allowlist', () => {
  it('matches USAGE_SECTIONS in php-api/_review.php exactly, in menu order', () => {
    const php = readFileSync(resolve(process.cwd(), 'php-api/_review.php'), 'utf8')
    const block = php.match(/const USAGE_SECTIONS = \[([\s\S]*?)\];/)
    expect(block, 'USAGE_SECTIONS not found in _review.php').toBeTruthy()
    const server = [...block[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1])
    expect(server).toEqual(USAGE_SECTIONS)
  })

  it('has no duplicates and fits the usage_daily.section column', () => {
    expect(new Set(USAGE_SECTIONS).size).toBe(USAGE_SECTIONS.length)
    USAGE_SECTIONS.forEach((s) => expect(s.length).toBeLessThanOrEqual(40))
  })
})
