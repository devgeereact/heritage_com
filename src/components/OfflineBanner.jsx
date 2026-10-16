import { useEffect, useState } from 'react'
import { OFFLINE_MESSAGE } from '@/helpers/heritApi'
import './OfflineBanner.css'

const BACK_MS = 4000

/**
 * Connection notice for the website, sign-in and admin (A16, D-016). Shows the
 * offline message while the browser reports no connection, then "Back online"
 * for a few seconds. Saves are refused in heritApi while offline; nothing is
 * queued, and forms keep what was typed.
 */
const OfflineBanner = () => {
  const [state, setState] = useState(() => (typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'online'))

  useEffect(() => {
    let timer
    const down = () => {
      clearTimeout(timer)
      setState('offline')
    }
    const up = () => {
      setState((s) => (s === 'offline' ? 'back' : s))
      clearTimeout(timer)
      timer = setTimeout(() => setState('online'), BACK_MS)
    }
    window.addEventListener('offline', down)
    window.addEventListener('online', up)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('offline', down)
      window.removeEventListener('online', up)
    }
  }, [])

  return (
    <div className="hc-net" role="status" aria-live="polite">
      {state !== 'online' && (
        <div className={`hc-net-bar${state === 'back' ? ' is-back' : ''}`}>
          {state === 'offline' ? OFFLINE_MESSAGE : 'Back online. You can save again.'}
        </div>
      )}
    </div>
  )
}

export default OfflineBanner
