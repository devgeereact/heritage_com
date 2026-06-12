/**
 * Storefront cart — a tiny provider-less store backed by localStorage.
 *
 * Lives outside React so the basket survives page navigation (each public page
 * mounts its own SiteLayout, so a context provider there would reset on every
 * route change). Components subscribe with the `useCart` hook below.
 *
 * A line is keyed by slug+size so the same piece in two sizes are separate lines.
 */
import { useSyncExternalStore } from 'react';

const KEY = 'herit_cart_v1';
const listeners = new Set();

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// Cache the parsed array so useSyncExternalStore's getSnapshot returns a stable
// reference between writes (it compares by identity to decide re-renders).
let cache = read();

function commit(next) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode — cart stays in memory for the session */
  }
  listeners.forEach((l) => l());
}

const lineKey = (slug, size) => `${slug}__${size || 'OS'}`;

export const cart = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  snapshot() {
    return cache;
  },
  add(item, qty = 1) {
    const key = lineKey(item.slug, item.size);
    const next = cache.slice();
    const i = next.findIndex((l) => l.key === key);
    if (i >= 0) next[i] = { ...next[i], qty: next[i].qty + qty };
    else next.push({ key, slug: item.slug, name: item.name, fabric: item.fabric, size: item.size || 'One size', priceNgn: item.priceNgn, tile: item.tile, qty });
    commit(next);
  },
  setQty(key, qty) {
    const q = Math.max(0, Math.floor(qty));
    const next = cache.flatMap((l) => (l.key === key ? (q === 0 ? [] : [{ ...l, qty: q }]) : [l]));
    commit(next);
  },
  remove(key) {
    commit(cache.filter((l) => l.key !== key));
  },
  clear() {
    commit([]);
  },
};

export function useCart() {
  const items = useSyncExternalStore(cart.subscribe, cart.snapshot, cart.snapshot);
  const count = items.reduce((n, l) => n + l.qty, 0);
  const subtotal = items.reduce((n, l) => n + l.qty * l.priceNgn, 0);
  return { items, count, subtotal, add: cart.add, setQty: cart.setQty, remove: cart.remove, clear: cart.clear };
}
