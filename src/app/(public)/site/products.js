/**
 * Storefront catalogue. The live source is the products table via
 * store.php?action=catalogue (published pieces). This static set is the
 * guaranteed FALLBACK — used until the API resolves, or if it's unreachable /
 * empty — so the shop is never bare. `useCatalogue()` is the React entry point.
 */
import { useEffect, useState } from 'react';
import heritApi from '@/helpers/heritApi';

export const STATIC_PRODUCTS = [
  {
    slug: 'everyday-shirt-ankara',
    name: 'Everyday Shirt',
    fabric: 'Ankara',
    fabricKey: 'ankara',
    tile: 'hc-tile-ankara',
    type: 'Shirts',
    occasion: 'Everyday',
    priceNgn: 18500,
    priceUsd: 12,
    short: 'Hand-cut Ankara, lined for comfort and made to be lived in. Heritage, tailored for now.',
    story: 'This shirt is made from bold Ankara wax print, chosen for the way the pattern carries movement. Cut for an easy everyday fit, it takes culture out of the festival and into your week.',
    fit: 'True to size; size up for a relaxed fit.',
    material: '100% cotton Ankara, lined yoke.',
    model: 'Model wears size M, height 5’9".',
  },
  {
    slug: 'signature-shirt-adire',
    name: 'Signature Shirt',
    fabric: 'Adire (hand-dyed)',
    fabricKey: 'adire',
    tile: 'hc-tile-adire',
    type: 'Shirts',
    occasion: 'Everyday',
    priceNgn: 24000,
    priceUsd: 16,
    short: 'Hand-dyed Adire, finished to be lived in. No two pieces are ever exactly the same.',
    story: 'This shirt is made from Adire, hand-dyed by hand in Yorubaland — which means no two are ever exactly alike. We chose it for the deep indigo and the way the pattern moves. Wear it your way, and wear it with pride.',
    fit: 'True to size.',
    material: '100% cotton, hand-dyed Adire.',
    model: 'Model wears size M, height 5’9".',
  },
  {
    slug: 'wrap-dress-adire',
    name: 'Wrap Dress',
    fabric: 'Adire (hand-dyed)',
    fabricKey: 'adire',
    tile: 'hc-tile-adire',
    type: 'Dresses',
    occasion: 'Owambe',
    priceNgn: 32000,
    priceUsd: 21,
    short: 'A modern wrap silhouette in hand-dyed Adire — made to move, made to last.',
    story: 'Cut as a contemporary wrap, this dress is made from hand-dyed Adire. Each length of cloth is dyed by hand, so the indigo and pattern are unique to your piece. Heritage, tailored for now.',
    fit: 'True to size; adjustable wrap tie.',
    material: '100% cotton, hand-dyed Adire.',
    model: 'Model wears size M, height 5’9".',
  },
  {
    slug: 'two-piece-set-ankara',
    name: 'Two-Piece Set',
    fabric: 'Ankara',
    fabricKey: 'ankara',
    tile: 'hc-tile-ankara',
    type: 'Sets',
    occasion: 'Owambe',
    priceNgn: 45000,
    priceUsd: 30,
    short: 'A considered, modern two-piece in bold Ankara — made to be lived in.',
    story: 'A coordinated two-piece in bold Ankara wax print, cut for a clean modern silhouette. Wear it together for an occasion, or split it across your everyday wardrobe.',
    fit: 'True to size; relaxed through the body.',
    material: '100% cotton Ankara, lined.',
    model: 'Model wears size M, height 5’9".',
  },
  {
    slug: 'heritage-set-asooke',
    name: 'Heritage Set',
    fabric: 'Aso-Oke',
    fabricKey: 'asooke',
    tile: 'hc-tile-asooke',
    type: 'Sets',
    occasion: 'Owambe',
    priceNgn: 68000,
    priceUsd: 45,
    premium: true,
    short: 'Our premium woven Aso-Oke set — ceremonial heritage, contemporary tailoring.',
    story: 'Made from woven Aso-Oke, the cloth of ceremony, this premium set honours its origin while sitting in a modern cut. A piece for the moments that matter, built to last for years.',
    fit: 'True to size; structured fit.',
    material: 'Handwoven Aso-Oke, fully lined.',
    model: 'Model wears size M, height 5’9".',
  },
  {
    slug: 'heritage-accessory',
    name: 'Headwrap / Tie',
    fabric: 'Mixed',
    fabricKey: 'mixed',
    tile: 'hc-tile-mixed',
    type: 'Accessories',
    occasion: 'Gift',
    priceNgn: 6500,
    priceUsd: 5,
    short: 'A finishing piece in mixed heritage fabric — headwrap or tie, your way.',
    story: 'A small piece with the same heritage behind it. Made from offcuts of our heritage fabrics, each accessory is one of a kind — the perfect way to add a little culture to any outfit, or to gift one.',
    fit: 'One size.',
    material: 'Mixed heritage fabrics.',
    model: '—',
  },
];

export const formatNgn = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;

// Module-level cache of the live catalogue (null until first load).
let CACHE = null;
let inflight = null;

/** Fetch the live catalogue once; fall back to the static set on empty/error. */
export function loadCatalogue() {
  if (CACHE) return Promise.resolve(CACHE);
  if (inflight) return inflight;
  inflight = heritApi.store.catalogue()
    .then((res) => {
      const list = Array.isArray(res?.products) ? res.products : [];
      const mapped = list.map((p) => ({ ...p, priceNgn: Number(p.priceNgn ?? p.price_ngn ?? 0) }));
      // Only trust the API once it returns the RICH storefront shape (tile etc).
      // An older/minimal store.php (pre-phase-11) → keep the curated static set so
      // the live shop never degrades before the backend is deployed.
      const rich = mapped.length > 0 && mapped.every((p) => p.tile);
      CACHE = rich ? mapped : STATIC_PRODUCTS;
      return CACHE;
    })
    .catch(() => { CACHE = STATIC_PRODUCTS; return CACHE; })
    .finally(() => { inflight = null; });
  return inflight;
}

/** Synchronous lookup against whatever's loaded (static until the API resolves). */
export const getProduct = (slug) => (CACHE || STATIC_PRODUCTS).find((p) => p.slug === slug);

/** React hook: live catalogue with the static set as the initial value. */
export function useCatalogue() {
  const [products, setProducts] = useState(CACHE || STATIC_PRODUCTS);
  const [ready, setReady] = useState(!!CACHE);
  useEffect(() => {
    let live = true;
    loadCatalogue().then((l) => { if (live) { setProducts(l); setReady(true); } });
    return () => { live = false; };
  }, []);
  return { products, ready, getProduct: (s) => products.find((p) => p.slug === s) };
}

// Back-compat alias for any synchronous importer.
export const PRODUCTS = STATIC_PRODUCTS;
