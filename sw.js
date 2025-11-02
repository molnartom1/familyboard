const CACHE_NAME = 'familyboard-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  // Ha van: '/manifest.webmanifest', '/icon.png', stb.
];

// Telepítéskor gyorsítótárazás
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Aktiválás után kontroll átvétele
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// Minden kérés kiszolgálása cache-ből vagy hálózatról
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
