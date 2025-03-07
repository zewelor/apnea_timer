// Update this version when making changes to force cache refresh
const CACHE_VERSION = 5;
const CACHE_NAME = 'apnea-timer-v' + CACHE_VERSION;
const urlsToCache = [
  '/apnea_timer/',
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
    return event.respondWith(fetch(event.request));
  }

  event.respondWith(
    caches.match(event.request).then(cacheResponse => {
      const networkFetch = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const clonedResponse = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clonedResponse);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback to cache if network fails
        return cacheResponse;
      });
      return cacheResponse || networkFetch;
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
