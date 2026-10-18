import { useEffect, useState } from 'react'

/**
 * Plain offline notice for staff screens (D-016, A16). Pages already on screen
 * stay readable; saving is refused by heritApi until the connection returns.
 * The POS keeps its own queue and message.
 */
const OfflineBanner = () => {
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && navigator.onLine === false)
  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  if (!offline) return null
  return (
    <div className="alert alert-warning mb-3" role="status">
      <strong>You are offline.</strong> You can still read what is on screen, but changes cannot be saved until you reconnect.
    </div>
  )
}

export default OfflineBanner
