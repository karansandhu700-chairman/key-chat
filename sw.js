// Caches the Key Chat app shell and local Studio presentation files.
// AI/provider requests are not cached or intercepted.
const C = "keychat-v29";
const SHELL = ["./", "index.html", "studio-live.html", "studio-preview.html", "studio-polish.css", "studio-polish.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "key.webp", "fx.js"];
self.addEventListener("install", event => { event.waitUntil(caches.open(C).then(cache => cache.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== C).map(key => caches.delete(key))))); self.clients.claim(); });
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== location.origin) return;
  event.respondWith(fetch(event.request).then(response => { const copy = response.clone(); caches.open(C).then(cache => cache.put(event.request, copy)); return response; }).catch(() => caches.match(event.request).then(response => response || caches.match("index.html"))));
});
