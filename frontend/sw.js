const CACHE = "cymor-ai-v2";
const ASSETS = ["/", "/index.html", "/style.css", "/app.js", "/manifest.json"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  if (e.request.url.includes("/api/")) { e.respondWith(fetch(e.request).catch(() => new Response(JSON.stringify({error:"You are offline 📵"}),{headers:{"Content-Type":"application/json"}}))); return; }
  e.respondWith(caches.match(e.request).then(c => c || fetch(e.request).then(res => { caches.open(CACHE).then(c => c.put(e.request, res.clone())); return res; })));
});
