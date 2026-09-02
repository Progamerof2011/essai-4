const CACHE_NAME = 'trajet-v1';
const CORE_FILES = ['./index.html', './app.js', './manifest.json', './icons/icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// Stratégie : réseau d'abord pour les données (API), cache d'abord pour les fichiers de l'appli.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isAppFile = CORE_FILES.some(f => url.pathname.endsWith(f.replace('./', '/')));
  if (isAppFile) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
  }
  // Les appels vers l'API SNCF, la passerelle Pronote et Open-Meteo passent
  // directement par le réseau ; l'appli gère elle-même son propre cache
  // (localStorage) et l'affichage "donnée non actualisée" en cas d'échec.
});
