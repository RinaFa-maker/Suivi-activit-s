// Service Worker - Hors connex

const CACHE_NAME = 'canopy-shell-v1';

const CORE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png'
];
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.all(
                CORE_ASSETS.map((url) =>
                    cache.add(url).catch(() => { 
                    })
                )
            );
        }).then(() => self.skipWaiting())
    );
});
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});
self.addEventListener('fetch', (event) => {
    const req = event.request;

    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        fetch(req)
            .then((response) => {
                const copy = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
                return response;
            })
            .catch(() =>
                caches.match(req).then((cached) => cached || caches.match('./index.html'))
            )
    );
});
