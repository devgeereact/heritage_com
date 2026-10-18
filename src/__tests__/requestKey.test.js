import { describe, it, expect, vi } from 'vitest'
import { newRequestKey } from '@/helpers/requestKey'

// The server accepts 16 to 64 characters of [A-Za-z0-9_-] (BR-02, BR-22).
const SERVER_RULE = /^[A-Za-z0-9_-]{16,64}$/

describe('newRequestKey', () => {
  it('produces a key the server will accept', () => {
    expect(newRequestKey()).toMatch(SERVER_RULE)
  })

  it('produces a different key each time', () => {
    const keys = new Set(Array.from({ length: 200 }, () => newRequestKey()))
    expect(keys.size).toBe(200)
  })

  it('still produces an acceptable key when randomUUID is missing', () => {
    const real = globalThis.crypto
    vi.stubGlobal('crypto', { getRandomValues: (a) => real.getRandomValues(a) })
    const key = newRequestKey()
    expect(key).toMatch(SERVER_RULE)
    expect(key).toHaveLength(32)
  })

  it('falls back when randomUUID throws, as it can in an insecure context', () => {
    vi.stubGlobal('crypto', {
      randomUUID: () => {
        throw new Error('insecure context')
      },
      getRandomValues: (a) => {
        a.fill(255)
        return a
      },
    })
    expect(newRequestKey()).toBe('f'.repeat(32))
  })
})
