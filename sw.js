// CodeHunt 2K26 — Service Worker
// Caches static assets, serves API fresh from network, handles push notifications

const CACHE_NAME = 'codehunt-v1';
const STATIC_ASSETS = ['/'];

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

  // Static (HTML/CSS/JS): cache first, fall back to network
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      });
    })
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
      tag: data.tag || 'codehunt-notification',
      requireInteraction: true,
      data: data.data || {},
      actions: [
        { action: 'view', title: 'View' },
        { action: 'close', title: 'Dismiss' }
      ]
    };
    
    e.waitUntil(
      self.registration.showNotification(data.title || 'CodeHunt 2K26', options)
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