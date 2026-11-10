// Offline support. The page: network first, cache when offline. Other files: cache first, refreshed in
// the background. Bump CACHE when the file list changes.
// Cache storage is shared by every game on this domain, so only caches with our own prefix are ours to delete.
const CACHE = "ten-rules-v1";
// Only our own files and Google Fonts are cached. Everything else (analytics counts) goes straight to the network.
const CACHEABLE = [self.location.origin, "https://fonts.googleapis.com", "https://fonts.gstatic.com"];
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "./favicon-32.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("ten-rules-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || !CACHEABLE.includes(new URL(e.request.url).origin)) return;
  // The page itself: network first so players get updates at once; the cached copy is the offline fallback.
  if (e.request.mode === "navigate") {
    e.respondWith(caches.open(CACHE).then(cache => fetch(e.request)
      .then(res => { if (res.ok) cache.put("./", res.clone()); return res; })
      .catch(() => cache.match("./"))));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(e.request, { ignoreSearch: true });
    const fresh = fetch(e.request)
      .then(res => { if (res.ok || res.type === "opaque") cache.put(e.request, res.clone()); return res; })
      .catch(() => hit);
    if (hit) { e.waitUntil(fresh); return hit; }
    return fresh;
  }));
});
