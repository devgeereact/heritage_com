/**
 * Storefront catalogue. The only source is the products table via
 * store.php?action=catalogue (published pieces). There is no static fallback:
 * empty or unreachable means an empty catalogue (A07). `useCatalogue()` is the
 * React entry point.
 */
import { useEffect, useState } from 'react';
import heritApi from '@/helpers/heritApi';

export const formatNgn = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;

// Module-level cache of the live catalogue (null until first load).
let CACHE = null;
let inflight = null;

/** Fetch the live catalogue once; empty on error. */
export function loadCatalogue() {
  if (CACHE) return Promise.resolve(CACHE);
  if (inflight) return inflight;
  inflight = heritApi.store.catalogue()
    .then((res) => {
      const list = Array.isArray(res?.products) ? res.products : [];
      const mapped = list.map((p) => ({ ...p, priceNgn: Number(p.priceNgn ?? p.price_ngn ?? 0) }));
      CACHE = mapped;
      return CACHE;
    })
    .catch(() => [])
    .finally(() => { inflight = null; });
  return inflight;
}

/** Synchronous lookup against whatever's loaded (nothing until the API resolves). */
export const getProduct = (slug) => (CACHE || []).find((p) => p.slug === slug);

/** React hook: live catalogue, empty until it loads. */
export function useCatalogue() {
  const [products, setProducts] = useState(CACHE || []);
  const [ready, setReady] = useState(!!CACHE);
  useEffect(() => {
    let live = true;
    loadCatalogue().then((l) => { if (live) { setProducts(l); setReady(true); } });
    return () => { live = false; };
  }, []);
  return { products, ready, getProduct: (s) => products.find((p) => p.slug === s) };
}
