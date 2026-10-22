import { afterEach, describe, it, expect, vi } from 'vitest'
import { saveAttribution, readAttribution } from '@/app/(public)/site/attribution'

const DAY = 24 * 60 * 60 * 1000

afterEach(() => {
  vi.useRealTimers()
})

describe('attribution kept for 30 days (D-024, K-13)', () => {
  it('reads back a value just saved', () => {
    saveAttribution('herit_ref', 'ADA10')
    expect(readAttribution('herit_ref')).toBe('ADA10')
  })

  it('stores the value with a saved-at time, not as a bare string', () => {
    saveAttribution('herit_ref', 'ADA10')
    const entry = JSON.parse(localStorage.getItem('herit_ref'))
    expect(entry.v).toBe('ADA10')
    expect(typeof entry.t).toBe('number')
  })

  it('is still there on day 29 and gone and removed on day 31', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-01T09:00:00Z'))
    saveAttribution('herit_ref', 'ADA10')

    vi.setSystemTime(new Date('2026-10-01T09:00:00Z').getTime() + 29 * DAY)
    expect(readAttribution('herit_ref')).toBe('ADA10')

    vi.setSystemTime(new Date('2026-10-01T09:00:00Z').getTime() + 31 * DAY)
    expect(readAttribution('herit_ref')).toBe('')
    expect(localStorage.getItem('herit_ref')).toBeNull()
  })

  it('expires exactly at 30 days', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-01T09:00:00Z'))
    saveAttribution('herit_ref', 'ADA10')

    vi.setSystemTime(new Date('2026-10-01T09:00:00Z').getTime() + 30 * DAY)
    expect(readAttribution('herit_ref')).toBe('')
  })

  it('removes a value saved before dates were kept (a plain string)', () => {
    localStorage.setItem('herit_ref', 'OLDCODE')
    expect(readAttribution('herit_ref')).toBe('')
    expect(localStorage.getItem('herit_ref')).toBeNull()
  })

  it.each([
    ['an entry with no date', JSON.stringify({ v: 'X' })],
    ['an entry with a non-string value', JSON.stringify({ v: 5, t: Date.now() })],
    ['an entry with a date in a form that is not a number', JSON.stringify({ v: 'X', t: 'yesterday' })],
    ['JSON null', 'null'],
  ])('removes %s', (_name, raw) => {
    localStorage.setItem('herit_ref', raw)
    expect(readAttribution('herit_ref')).toBe('')
    expect(localStorage.getItem('herit_ref')).toBeNull()
  })

  it('reads an empty string when nothing was saved', () => {
    expect(readAttribution('never_saved')).toBe('')
  })

  it('stores a non-string value as text', () => {
    saveAttribution('herit_ref', 42)
    expect(readAttribution('herit_ref')).toBe('42')
  })

  it('loses attribution quietly when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    expect(() => saveAttribution('herit_ref', 'ADA10')).not.toThrow()
    expect(readAttribution('herit_ref')).toBe('')
  })
})
