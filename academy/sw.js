/* Only the public application shell is cached. Private authenticated API responses are never cached. */
"use strict";
importScripts("./offline-config.js?v=reference-20261119-23");
const { cacheName, files } = self.SCM_OFFLINE_CONFIG;
const urls = new Set(files.map(file => new URL(file, self.registration.scope).href));
self.addEventListener("install", event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll([...urls])).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("scm-academy-shell-") && key !== cacheName).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  // Fragments identify client-side screens, not different public-shell resources.
  const resource = new URL(event.request.url);
  resource.hash = "";
  // Only the exact public release token is equivalent to a cached shell asset.
  if(resource.searchParams.size===1 && resource.searchParams.get("v")===self.SCM_OFFLINE_CONFIG.release && /\.(js|css)$/.test(resource.pathname)) resource.search="";
  // Exact allowlist: no query strings, private documents, arbitrary navigation or other origin.
  if (event.request.method !== "GET" || !urls.has(resource.href)) return;
  event.respondWith(fetch(event.request).catch(async () => {
    const response = await caches.match(resource.href, { cacheName });
    return response || Response.error();
  }));
});
