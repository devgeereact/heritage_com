/* HeritOS service worker: installable and offline-capable for the stall.
 * Network-first for navigations (so deploys land; each good load refreshes the
 * offline shell). Cache-first only for files whose content never changes under
 * the same name: Vite's hashed /assets/, the self-hosted /fonts/ and the icons.
 * Everything else (the API, uploads, sitemap.xml, robots.txt) goes to the
 * network and is never cached. Bump CACHE to invalidate (K-20). */
const CACHE = 'heritos-v2';
const IMMUTABLE = /^\/(assets|fonts)\/|^\/(icon[\w-]*\.(svg|png)|apple-touch-icon\.png|favicon\.ico)$/;
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Never cache the API.
  if (url.pathname.endsWith('.php') || url.pathname.startsWith('/api')) return;

  // Navigations: network-first; keep the latest shell for offline use.
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put('/index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Unchanging same-origin files: cache-first, then network (and cache it).
  if (url.origin === self.location.origin && IMMUTABLE.test(url.pathname)) {
    e.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return res;
      }).catch(() => hit))
    );
  }
});
