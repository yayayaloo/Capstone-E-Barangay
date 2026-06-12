const CACHE_NAME = 'e-barangay-pwa-v3';
const OFFLINE_URL = '/~offline';

const PRECACHE_ASSETS = [
  OFFLINE_URL,
  '/logo.png',
  '/manifest.json',
  '/favicon.ico',
];

// On install, pre-cache core resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Clean up old caches on activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercept fetch requests
self.addEventListener('fetch', (event) => {
  // Only handle GET requests to prevent issues with POST/PUT mutations
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Ignore cross-origin requests (e.g. Supabase API queries) in service worker cache.
  // We will cache Supabase query data client-side in localStorage for safety and convenience.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Handle HTML document requests (navigation)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If successful, cache a copy of the navigated page
          const responseCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseCopy);
          });
          return response;
        })
        .catch(async () => {
          // Fall back to cache or the offline page
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // Stale-While-Revalidate caching strategy for local static assets
  const isStaticAsset = 
    url.pathname.startsWith('/_next/') || 
    url.pathname.startsWith('/static/') || 
    url.pathname.endsWith('.png') || 
    url.pathname.endsWith('.jpg') || 
    url.pathname.endsWith('.jpeg') || 
    url.pathname.endsWith('.svg') || 
    url.pathname.endsWith('.ico') || 
    url.pathname.endsWith('.woff') || 
    url.pathname.endsWith('.woff2');

  if (isStaticAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Silently consume offline fetch errors
          });
          
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // For other same-origin requests, try network first, then cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const responseCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseCopy);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
