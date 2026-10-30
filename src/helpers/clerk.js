/**
 * Clerk bridge for non-React code (helpers/heritApi.js).
 *
 * Sign-in is Clerk (email code). Clerk's session token is short-lived, so it is fetched fresh for
 * each request via the getter registered by <ClerkBridge/>. When VITE_CLERK_PUBLISHABLE_KEY is not set
 * the app keeps the legacy email-and-password flow, so a build without the key still works.
 *
 * Roles never come from Clerk: the PHP API verifies the token and returns the staff record
 * (auth.php?action=me), exactly as before.
 */
export const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || ''
export const clerkEnabled = CLERK_KEY !== ''

let state = { loaded: false, signedIn: false, getToken: async () => null, signOut: async () => {} }
let waiters = []

export function setClerkState(next) {
  state = next
  if (next.loaded) {
    const w = waiters
    waiters = []
    w.forEach((f) => f())
  }
}

/** Wait for Clerk to finish loading, but never longer than `ms` (offline: clerk-js cannot load). */
function whenLoaded(ms) {
  if (state.loaded) return Promise.resolve()
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms)
    waiters.push(() => { clearTimeout(t); resolve() })
  })
}

/** @returns {Promise<{kind:'token',token:string}|{kind:'signed-out'}|{kind:'unavailable'}>} */
export async function clerkToken(waitMs = 4000) {
  await whenLoaded(waitMs)
  if (!state.loaded) return { kind: 'unavailable' }
  if (!state.signedIn) return { kind: 'signed-out' }
  try {
    const token = await state.getToken()
    return token ? { kind: 'token', token } : { kind: 'unavailable' }
  } catch {
    return { kind: 'unavailable' }
  }
}

export const clerkSignOut = () => state.signOut()
