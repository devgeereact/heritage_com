/**
 * POS offline support. The market stall can lose signal mid-trade, so the till
 * must keep selling: we cache the catalogue locally and queue any sale made
 * while offline, then flush the queue to orders.php when the network returns.
 *
 * Two localStorage keys:
 *   herit_pos_catalogue — last good variant list (for the product grid offline)
 *   herit_pos_queue     — sales taken offline, awaiting sync
 */
const CAT_KEY = 'herit_pos_catalogue';
const QUEUE_KEY = 'herit_pos_queue';

const safeRead = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const safeWrite = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* quota / private mode */ }
};

export const cacheCatalogue = (variants) => safeWrite(CAT_KEY, variants || []);
export const readCatalogue = () => safeRead(CAT_KEY, []);

export const readQueue = () => safeRead(QUEUE_KEY, []);
export const writeQueue = (q) => safeWrite(QUEUE_KEY, q);
export const enqueueSale = (sale) => {
  const q = readQueue();
  q.push(sale);
  writeQueue(q);
  return q.length;
};

/** A fetch that failed at the network layer (offline), not an API error. */
export const isNetworkError = (e) => /failed to fetch|networkerror|load failed/i.test(e?.message || '');
