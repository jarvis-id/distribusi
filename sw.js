const CACHE_NAME = 'dis-nrw-v4';
const ASSETS = [
  './',
  './index.html',
  './login.html',
  './css/main.css',
  './css/print-pdf.css',
  './js/skala.js',
  './js/auth-guard.js',
  './js/core.js',
  './js/jarvis.js',
  './js/image-compressor.js',
  './assets/manifest.json',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/logo.png',
  './pages/status.html',
  './pages/tampildata.html',
  './pages/form-apel.html',
  './pages/form-perbaikan.html',
  './pages/form-tugaslain.html',
  './pages/form-uji-tekanan.html',
  './pages/form-valve.html',
  './pages/print-preview.html',
  './pages/panduan.html',
  './pages/privacy.html'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    }).catch(err => console.log('ServiceWorker cache addAll error:', err))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Hanya tangani GET requests
  if (e.request.method !== 'GET') return;
  
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(networkResponse => {
        return networkResponse;
      }).catch(() => cached);
    })
  );
});
