const CACHE_NAME = 'e-barangay-pwa-v6';
const OFFLINE_URL = '/~offline';

// Pre-cache only public shell assets. Never pre-cache authenticated routes (/resident, /login).
const PRECACHE_ASSETS = [
  '/',
  OFFLINE_URL,
  '/logo.png',
  '/manifest.json',
];

// Routes that require fresh network communication and must NEVER be stored in Service Worker cache.
const isDynamicAuthRoute = (pathname) => {
  return (
    pathname.startsWith('/resident') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/forgot-password')
  );
};

// On install, pre-cache core public resources safely
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          fetch(url)
            .then((res) => {
              if (res.ok || res.type === 'opaque') {
                return cache.put(url, res);
              }
            })
            .catch(() => {})
        )
      );
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

  // 1. Never intercept cross-origin requests (e.g. Supabase API queries)
  if (url.origin !== self.location.origin) {
    return;
  }

  // 2. Bypass API requests completely to guarantee fresh server state and avoid cookie/session interference
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 3. Handle HTML document requests (Navigation)
  if (event.request.mode === 'navigate') {
    // Authenticated and auth-flow pages must ALWAYS be fetched live from the network
    // and NEVER cached, to prevent stale redirects or leaked session views.
    if (isDynamicAuthRoute(url.pathname)) {
      event.respondWith(
        fetch(event.request).catch(async () => {
          const offlineResponse = await caches.match(OFFLINE_URL, { ignoreSearch: true });
          if (offlineResponse) return offlineResponse;
          return getFallbackOfflineHtml();
        })
      );
      return;
    }

    // Public pages navigation: Network-first, fallback to cache or offline page
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
        .catch(async () => {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) return cachedResponse;

          const cachedPath = await caches.match(url.pathname);
          if (cachedPath) return cachedPath;

          const offlineResponse = await caches.match(OFFLINE_URL, { ignoreSearch: true });
          if (offlineResponse) return offlineResponse;

          return getFallbackOfflineHtml();
        })
    );
    return;
  }

  // 4. Stale-While-Revalidate caching strategy for local static assets
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
          }).catch(() => {});
          
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 5. For other same-origin requests:
  // If it's a dynamic auth route, network only
  if (isDynamicAuthRoute(url.pathname)) {
    return;
  }

  // Otherwise, network first then cache
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

// Guaranteed HTML Response fallback — prevents ERR_FAILED browser screen when offline
function getFallbackOfflineHtml() {
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E-Barangay - Offline</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', -apple-system, sans-serif; background: #01120e; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 1.5rem; text-align: center; }
        .card { background: rgba(2, 44, 34, 0.7); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 20px; padding: 3rem 2rem; max-width: 440px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.5); backdrop-filter: blur(12px); }
        .icon { width: 70px; height: 70px; margin: 0 auto 1.5rem; background: rgba(245, 158, 11, 0.15); border: 2px solid #f59e0b; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #f59e0b; font-size: 2rem; font-weight: bold; }
        h1 { font-size: 1.75rem; font-weight: 800; margin-bottom: 0.75rem; color: #fde68a; }
        p { font-size: 0.95rem; color: #a7f3d0; margin-bottom: 2rem; line-height: 1.5; }
        .btn { padding: 0.85rem 2.5rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; border: none; border-radius: 10px; font-size: 1rem; font-weight: 700; cursor: pointer; transition: transform 0.2s; }
        .btn:active { transform: scale(0.98); }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">⚡</div>
        <h1>You are Offline</h1>
        <p>E-Barangay is currently offline. Please reconnect to the internet to access live updates.</p>
        <button class="btn" onclick="window.location.reload()">Retry Connection</button>
    </div>
</body>
</html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}
