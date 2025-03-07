// Update this version when making changes to force cache refresh
const CACHE_VERSION = 3;
const CACHE_NAME = 'apnea-timer-v' + CACHE_VERSION;
const urlsToCache = [
  './',
  './index.html',
  './script.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './favicon.ico'
];

// Install event - cache assets
self.addEventListener('install', event => {
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache if available
self.addEventListener('fetch', event => {
  if (event.request.url.startsWith('chrome-extension:')) {
    // Skip caching for chrome-extension requests
    return event.respondWith(fetch(event.request));
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Try network first for HTML files to ensure fresh content
        if (event.request.url.endsWith('.html') || event.request.url.endsWith('/')) {
          return fetch(event.request)
            .then(networkResponse => {
              // If network fetch successful, update the cache
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
              return networkResponse;
            })
            .catch(() => {
              // If network fetch fails, fall back to cache
              return response || new Response('Network error occurred', {
                status: 408,
                headers: { 'Content-Type': 'text/plain' }
              });
            });
        }

        // Return cached response if found
        if (response) {
          return response;
        }

        // If not in cache, fetch from network
        return fetch(event.request)
          .then(response => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response as it can only be consumed once
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];

  // Claim any clients immediately
  event.waitUntil(clients.claim());

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Listen for messages from clients
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
