const CACHE_NAME = 'boh-ws-v001';
// ── WORKSPACE LAB service worker ──────────────────────────────────────────────
// Scope: /brigade-dev/ (separate from production /back-of-house/)
// Cache name DIFFERENT from production boh-vNNN — zero interference.
// Bump version here (ws-v002, ws-v003...) for lab updates.
// NEVER rename to boh-vNNN — that's the production cache namespace.

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => clients.claim())
  );
});

self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  const title = data.title || 'Brigade Workspace Lab';
  const body = data.body || '';
  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/brigade-dev/icon-192.png',
      badge: '/brigade-dev/icon-192.png',
      vibrate: [100, 50, 100],
      data: { url: '/brigade-dev/' }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.openWindow(e.notification.data?.url || '/brigade-dev/')
  );
});
