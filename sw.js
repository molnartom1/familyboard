const CACHE_NAME = 'family-board-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
\nself.addEventListener('install',(e)=>{e.waitUntil(caches.open('familyboard-cache').then(c=>c.addAll(['/blog/blog.html','/blog/blog.css','/blog/blog.js'])));});\n