const CACHE_NAME = 'dewanchef-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/menu.json',
  '/config.json',
  '/manifest.json',
  '/assets/logo.png'
];

// Instalar Service Worker y cachear archivos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
    .then(cache => {
      console.log('Cache abierto');
      return cache.addAll(urlsToCache);
    })
    .catch(err => console.log('Error cacheando:', err))
  );
});

// Interceptar peticiones y servir desde cache si no hay internet
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
    .then(response => {
      // Si está en cache, devolverlo. Si no, buscar en red.
      return response || fetch(event.request);
    })
  );
});

// Actualizar cache cuando hay nueva versión
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});