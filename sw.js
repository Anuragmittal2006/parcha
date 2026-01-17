const CACHE_NAME = "tyreledger-v1";

const ASSETS = [
  "/",
  "/index.html",
  "/dealer.html",
  "/bill.html",
  "/orders.html",
  "/styles.css",
  "/db.js",
  "/app-home.js",
  "/data/dealers.json",
  "/data/products.json"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
