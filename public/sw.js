// Basit service worker: PWA kurulabilirligi + uygulama kabugu icin hafif cache.
// API istekleri her zaman aga gider (sohbetler guncel kalsin).
const CACHE = "yasam-ekibi-v1";
const KABUK = ["/", "/index.html", "/styles.css", "/app.js", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(KABUK)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // API ve diger origin istekleri: dogrudan aga.
  if (url.pathname.startsWith("/api/") || url.origin !== self.location.origin) return;
  // Statik kabuk: once ag, olmazsa cache (offline'da en azindan acilir).
  e.respondWith(
    fetch(e.request).then((r) => {
      const kopya = r.clone();
      caches.open(CACHE).then((c) => c.put(e.request, kopya)).catch(() => {});
      return r;
    }).catch(() => caches.match(e.request).then((m) => m || caches.match("/")))
  );
});
