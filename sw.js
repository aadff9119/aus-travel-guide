const CACHE_NAME = 'aus-travel-v2';
const CORE = [
  '/aus-travel-guide.html',
  '/manifest.json',
  '/pwa-icon-192.png',
  '/pwa-icon-512.png'
];

// Install — pre-cache core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Fetch — cache-first for HTML, network-first for images
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Skip non-GET and chrome-extension requests
  if (e.request.method !== 'GET') return;

  // HTML / core — Cache First (offline works immediately)
  if (e.request.destination === 'document' || url.pathname.endsWith('.html')) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetchAndCache(e.request))
    );
    return;
  }

  // Images — Network First, fallback to cache
  if (e.request.destination === 'image') {
    e.respondWith(
      fetch(e.request, { mode: 'no-cors' })
        .then(res => { cachePut(e.request, res.clone()); return res; })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Everything else — Stale While Revalidate
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request)
        .then(res => { cachePut(e.request, res.clone()); return res; })
        .catch(() => null);
      return cached || fetchPromise;
    })
  );
});

function fetchAndCache(req) {
  return fetch(req).then(res => {
    if (res.ok) cachePut(req, res.clone());
    return res;
  });
}

function cachePut(req, res) {
  caches.open(CACHE_NAME).then(cache => {
    try { cache.put(req, res); } catch(e) { /* ignore opaque */ }
  });
}
