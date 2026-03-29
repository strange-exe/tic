const CACHE_NAME = "ttt-v2";
const ASSETS = [
    "/",
    "/index.html",
    "/style.css",
    "/script.js",
    "/js/sound.js",
    "/js/game.js",
    "/js/ai.js",
    "/js/multiplayer.js",
    "/js/ui.js",
    "/manifest.json",
    "/asset/icons/icon.svg"
];

self.addEventListener("install", e => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", e => {
    const url = new URL(e.request.url);

    // Never cache PeerJS or external CDN requests — they need to be live
    if (url.origin !== location.origin) {
        e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
        return;
    }

    // Network-first for HTML (to get latest), cache-first for assets
    if (e.request.destination === "document") {
        e.respondWith(
            fetch(e.request)
                .then(res => {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
                    return res;
                })
                .catch(() => caches.match(e.request))
        );
    } else {
        e.respondWith(
            caches.match(e.request)
                .then(cached => cached || fetch(e.request).then(res => {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
                    return res;
                }))
        );
    }
});
