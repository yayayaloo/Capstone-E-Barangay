self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );

  // Force unregister the service worker to fix localhost locking issues
  self.registration.unregister().then(() => {
    console.log("Service worker forcefully unregistered to fix network hangs.");
  });
});

self.addEventListener('fetch', (event) => {
  // Pass through all requests directly to the network without intercepting
  // This prevents the "Failed to fetch" lock bug in Supabase
  event.respondWith(fetch(event.request));
});
