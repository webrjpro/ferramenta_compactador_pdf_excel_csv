const CACHE_NAME = 'organizador-alunos-v4';

// Cache essencial para o shell principal e a rota RED isolada.
const ASSETS = [
    './',
    './index.html',
    './red.html',
    './stylesred.css',
    './red.js',
    './manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const requestUrl = new URL(event.request.url);
            const isSameOrigin = requestUrl.origin === self.location.origin;

            const networkFetch = fetch(event.request)
                .then((networkResponse) => {
                    if (isSameOrigin && networkResponse && networkResponse.ok) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, networkResponse.clone());
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                    return undefined;
                });

            return cachedResponse || networkFetch;
        })
    );
});
