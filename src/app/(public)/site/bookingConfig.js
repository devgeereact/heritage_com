import { useEffect, useState } from 'react';
import { heritApi } from '@/helpers/heritApi';

// Public booking config (booking.php?action=config), fetched once per page load
// and shared by the navigation and the Book page. Off on any error.
let cache = null;
let pending = null;

export const loadBookingConfig = () => {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = heritApi.booking.config()
      .then((c) => { cache = c || { enabled: false }; return cache; })
      .catch(() => { cache = { enabled: false, failed: true }; return cache; });
  }
  return pending;
};

/** Booking config, or null while it loads. */
export const useBookingConfig = () => {
  const [cfg, setCfg] = useState(cache);
  useEffect(() => {
    if (cache) return undefined;
    let live = true;
    loadBookingConfig().then((c) => { if (live) setCfg(c); });
    return () => { live = false; };
  }, []);
  return cfg;
};

/** Is the "Book appointment" link shown? Only when online requests are on and ready. */
export const useBookingEnabled = () => useBookingConfig()?.enabled === true;
