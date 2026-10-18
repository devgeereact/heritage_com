// Shared Vitest setup: jest-dom matchers, automatic cleanup and a clean browser
// state between tests (cookies, storage, the online flag, stubbed globals).
// Test files import describe, it, expect and vi from 'vitest' themselves; there
// are no globals, so the ESLint config needs no change.
import { afterEach } from 'vitest'
import { vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Node 25 and later define their own global `localStorage` getter that returns
// undefined unless --localstorage-file is given, and Vitest does not replace it
// with the jsdom one. Put the jsdom storage back so tests see a browser, as they
// do on Node 22 (CI).
if (typeof globalThis.localStorage === 'undefined' && globalThis.jsdom?.window?.localStorage) {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: globalThis.jsdom.window.localStorage,
  })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  // Expire every cookie (js-cookie writes with path=/).
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0].trim()
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  })
  sessionStorage.clear()
  localStorage.clear()
  // Drop any own-property override so navigator.onLine reads the jsdom default again.
  delete navigator.onLine
})
