// sw.js — service worker for offline use (PWA).
// Precaches the app shell on install. At runtime it is NETWORK-FIRST: always
// serve the freshest copy when online (and refresh the cache), fall back to the
// cache when offline. This avoids stale-cache surprises on a site that updates.
// Bump CACHE on release to drop old entries.

const CACHE = 'pali-ime-v2';
const SHELL = [
  './',
  'index.html',
  'styles.css',
  'pali.js',
  'glossary.js',
  'roots.js',
  'roots.data.js',
  'predict.js',
  'app.js',
  'freq-words.json',
  'manifest.webmanifest',
  'icon.svg',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
];

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
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        // cache same-origin + opaque (e.g. Google Fonts) responses for offline
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((c) => c || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
