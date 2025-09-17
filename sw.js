const CACHE_NAME = 'easyleague-shell-v2';
const RUNTIME_CACHE = 'easyleague-runtime-v2';

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => ![CACHE_NAME, RUNTIME_CACHE].includes(k)).map(k => caches.delete(k)));
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
      client.postMessage({ type: 'SW_UPDATED' });
    }
  })());
});

// Stale-while-revalidate for same-origin requests; passthrough for cross-origin
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const cached = await cache.match(request);
      const networkPromise = fetch(request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          cache.put(request, response.clone());
        }
        return response;
      }).catch(() => cached);
      return cached || networkPromise;
    })());
  }
});

// Background sync placeholder for offline score submissions
self.addEventListener('sync', async (event) => {
  if (event.tag === 'sync-scores') {
    event.waitUntil((async () => {
      // A simple placeholder; actual queue handled in page using IndexedDB/localStorage
      // Here we only trigger a fetch to wake the SW if needed
      try { await fetch('/'); } catch (_) {}
    })());
  }
});

