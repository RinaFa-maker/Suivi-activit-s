// Service Worker - Canopy Madagascar
// Rôle : mettre en cache l'application elle-même (page, manifest, icônes)
// pour qu'elle puisse se recharger même sans connexion internet.
// Les données de l'app (chefs d'équipe, tâches, saisies) NE PASSENT PAS
// par ce cache : elles restent gérées côté page via localStorage.

const CACHE_NAME = 'canopy-shell-v1';

const CORE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png'
];

// Installation : on tente de mettre en cache les fichiers de l'app.
// On ajoute chaque fichier séparément pour qu'un fichier manquant
// (ex: icône absente) ne fasse pas échouer toute l'installation.
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.all(
                CORE_ASSETS.map((url) =>
                    cache.add(url).catch(() => {
                        // Fichier non trouvé ou inaccessible : on l'ignore simplement.
                    })
                )
            );
        }).then(() => self.skipWaiting())
    );
});

// Activation : on supprime les anciennes versions du cache.
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

// Interception des requêtes :
// - On ne touche jamais aux appels vers l'API (Google Apps Script) :
//   ils doivent toujours aller sur le réseau pour que la synchro
//   fonctionne normalement (succès/échec gérés par le code de la page).
// - Pour la page et ses ressources statiques : on essaie le réseau
//   d'abord (pour avoir la dernière version), et si ça échoue
//   (hors-ligne), on sert la version mise en cache.
self.addEventListener('fetch', (event) => {
    const req = event.request;

    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // Ne jamais intercepter les appels API externes (synchronisation des données).
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
