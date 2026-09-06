// TechHunt 2026 — Service Worker
// Caches static assets, serves API fresh from network, handles push notifications

const CACHE_NAME = 'techhunt-orange-v4';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/techhunt-mark.svg',
  '/node_modules/qr-scanner/qr-scanner.min.js',
  '/node_modules/qr-scanner/qr-scanner-worker.min.js',
];

// Install: cache the shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API calls: always go to network (fresh data), no caching
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request).catch(() =>
      new Response(JSON.stringify({ error: 'You are offline. Please reconnect.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } })
    ));
    return;
  }

  // Keep the app shell fresh so new event themes are visible immediately.
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok && e.request.method === 'GET' && url.pathname !== '/') {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});

// Push notification handler
self.addEventListener('push', e => {
  if (!e.data) return;
  
  try {
    const data = e.data.json();
    const options = {
      body: data.body || 'New notification',
      icon: data.icon || '/icon-192.png',
      badge: data.badge || '/icon-192.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'techhunt-notification',
      requireInteraction: true,
      data: data.data || {},
      actions: [
        { action: 'view', title: 'View' },
        { action: 'close', title: 'Dismiss' }
      ]
    };
    
      e.waitUntil(
      self.registration.showNotification(data.title || 'TechHunt 2026', options)
    );
  } catch (err) {
    console.error('Push notification error:', err);
  }
});

// Notification click handler
self.addEventListener('notificationclick', e => {
  e.notification.close();
  
  if (e.action === 'view' || !e.action) {
    e.waitUntil(
      clients.openWindow('/') // Open the app
    );
  }
});