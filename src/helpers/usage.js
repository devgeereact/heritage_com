// HeritOS: section usage counting (Phase 7, learn and simplify).
//
// The admin layout calls recordSectionVisit() on every route change. It sends
// POST usage.php?action=hit {section} at most once per section per browser per
// Lagos day, never blocks navigation, ignores every error and sends nothing
// while offline. The server stores day, section, role and a count; nothing
// about the person (docs/DATA-PRIVACY.md).
import { MENU_ITEMS } from '@/assets/data/menu-items'
import { pathSection } from '@/helpers/roles'
import { lagosToday } from '@/helpers/format'

const flat = (items) => items.flatMap((i) => (i.children ? flat(i.children) : [i]))

/**
 * Sections that may be counted: every menu item's key, in menu order. Must match
 * USAGE_SECTIONS in php-api/_review.php (checked by src/__tests__/usage.test.js).
 */
export const USAGE_SECTIONS = flat(MENU_ITEMS)
  .filter((i) => !i.isTitle && i.url)
  .map((i) => i.key)

export const USAGE_STORAGE_KEY = 'herit_usage_sent'

// The list is kept per day AND role, so a shared shop tablet still counts the
// tailor who opens Jobs after the owner did on the same day.
const readSent = (storage, day, role) => {
  try {
    const raw = JSON.parse(storage.getItem(USAGE_STORAGE_KEY) || 'null')
    return raw && raw.day === day && (raw.role ?? null) === role && Array.isArray(raw.sections) ? raw.sections : []
  } catch {
    return []
  }
}

const writeSent = (storage, day, role, sections) => {
  try {
    storage.setItem(USAGE_STORAGE_KEY, JSON.stringify({ day, role, sections }))
    return true
  } catch {
    return false
  }
}

const defaultStorage = () => {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * Count a visit to the section of `path`. Returns true when a hit was sent.
 * `send(section)` posts the hit (heritApi.usage.hit); its promise is never awaited
 * by the caller and its errors are swallowed. Without working storage nothing is
 * sent, so a browser that cannot remember never counts the same section twice.
 */
export function recordSectionVisit(path, { send, storage = defaultStorage(), day = lagosToday(), online, role = null } = {}) {
  const section = pathSection(path)
  if (!USAGE_SECTIONS.includes(section) || typeof send !== 'function' || !storage) return false
  const isOnline = online ?? (typeof navigator === 'undefined' || navigator.onLine !== false)
  if (!isOnline) return false
  const sent = readSent(storage, day, role)
  if (sent.includes(section)) return false
  // Remember first: a failed or slow request is not retried, so one section is
  // counted at most once a day even if the answer never arrives.
  if (!writeSent(storage, day, role, [...sent, section])) return false
  try {
    Promise.resolve(send(section)).catch(() => {})
  } catch {
    /* ignore */
  }
  return true
}
