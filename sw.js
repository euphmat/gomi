const CACHE_NAME = 'rpg-game-cache-v5';
const urlsToCache = [
  "./",
  "./index.html",
  "./manifest.json",
  "./js/app.js",
  "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4",
  "https://fonts.googleapis.com/css2?family=DotGothic16&display=swap",
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
];

// Install event: Precache all necessary files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache: ', CACHE_NAME);
        return Promise.allSettled(
          urlsToCache.map(url => {
            return cache.add(url).catch(err => console.error('Failed to cache:', url, err));
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim())
    .then(() => self.clients.matchAll({ type: 'window' }))
    .then(windowClients => {
      windowClients.forEach(client => {
        client.postMessage({ type: 'RELOAD_CLIENTS' });
      });
    })
  );
});

// Fetch event: Cache First with Network Fallback for fast processing
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached response if found (Cache First)
        if (cachedResponse) {
          return cachedResponse;
        }

        // If not in cache, fetch from network
        return fetch(event.request).then(networkResponse => {
          // Don't cache if not a valid response (opaque responses are valid for no-cors, but we'll cache them separately)
          if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque')) {
            return networkResponse;
          }

          // Clone the response to store in cache
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return networkResponse;
        }).catch(error => {
          console.error('Fetch failed, offline mode:', error);
          throw error;
        });
      })
  );
});
