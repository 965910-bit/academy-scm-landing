/* Only the public application shell is cached. Private authenticated API responses are never cached. */
"use strict";
importScripts("./offline-config.js?v=document-folders-20261119-25");
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
  // Public resource filters select client-side content, never private API responses.
  const shellPaths=[new URL('./',self.registration.scope).pathname,new URL('index.html',self.registration.scope).pathname];
  const publicFilters=new Set(['folder','dq','q','code','sort','size','kind','etks','category','grade','group','letter','okz','topic','program','level','checked','status']);
  if(resource.origin===new URL(self.registration.scope).origin && shellPaths.includes(resource.pathname) && resource.searchParams.size && [...resource.searchParams.keys()].every(key=>publicFilters.has(key)))resource.search='';
  // Exact public-file allowlist: no private documents, API responses or other origins.
  if (event.request.method !== "GET" || !urls.has(resource.href)) return;
  event.respondWith(fetch(event.request).catch(async () => {
    const response = await caches.match(resource.href, { cacheName });
    return response || Response.error();
  }));
});
