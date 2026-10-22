// Referral and campaign attribution kept in the browser for 30 days only
// (owner decision D-024, K-13). Each key holds {"v": value, "t": saved-at ms}.
// Older entries, and values saved before this change (plain strings with no
// date), are removed when read. Every storage call is guarded: private windows
// and blocked storage simply lose attribution.
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

export const saveAttribution = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify({ v: String(value), t: Date.now() }))
  } catch {
    /* storage blocked */
  }
}

export const readAttribution = (key) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return ''
    let entry = null
    try {
      entry = JSON.parse(raw)
    } catch {
      entry = null
    }
    if (!entry || typeof entry.v !== 'string' || !(Date.now() - Number(entry.t) < MAX_AGE_MS)) {
      localStorage.removeItem(key)
      return ''
    }
    return entry.v
  } catch {
    return ''
  }
}
