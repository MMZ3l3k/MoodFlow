const CACHE_NAME = 'moodflow-admin-v1';
const STATIC_ASSETS = ['/', '/login', '/super-admin/login'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // K7: cache'ujemy WYŁĄCZNIE zasoby z tej samej domeny (statyki, app shell).
  // Backend API jest na innej domenie — jego odpowiedzi (lista użytkowników,
  // analityka, powiadomienia) nigdy nie trafiają do Cache Storage, więc nie
  // wyciekają po wylogowaniu. Poprzedni warunek (/api/ + port 4000) w produkcji
  // nie łapał niczego (API bez prefiksu /api, port 443).
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
