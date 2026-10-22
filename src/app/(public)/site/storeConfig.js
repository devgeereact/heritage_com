import { useEffect, useState } from 'react';
import { heritApi } from '@/helpers/heritApi';

// Public store config (socials, store name, shop_enabled) from
// store.php?action=config, fetched once per page load and shared by every page.
let cache = null;
let pending = null;

const loadStoreConfig = () => {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = heritApi.store.config()
      .then((cfg) => { cache = cfg || {}; return cache; })
      .catch(() => { cache = {}; return cache; });
  }
  return pending;
};

/** Store config, or null while it loads. */
export const useStoreConfig = () => {
  const [cfg, setCfg] = useState(cache);
  useEffect(() => {
    if (cache) return undefined;
    let live = true;
    loadStoreConfig().then((c) => { if (live) setCfg(c); });
    return () => { live = false; };
  }, []);
  return cfg;
};

/**
 * Is the retail shop shown in public navigation? Off unless an admin switches
 * it on (Store & Channels). The shop pages still work by direct URL either way.
 */
export const useShopEnabled = () => useStoreConfig()?.shop_enabled === true;
