/* CGP PWA: never cache private athlete pages, API responses or authentication data. */
const CACHE_NAME='cgp-offline-fallback-v1';
const OFFLINE_URL='/pwa/offline.html';

self.addEventListener('install',event=>{
 event.waitUntil(
  caches.open(CACHE_NAME)
   .then(cache=>cache.add(new Request(OFFLINE_URL,{cache:'reload'})))
   .then(()=>self.skipWaiting())
 );
});

self.addEventListener('activate',event=>{
 event.waitUntil(
  caches.keys()
   .then(keys=>Promise.all(keys.filter(key=>key.startsWith('cgp-offline-fallback-')&&key!==CACHE_NAME).map(key=>caches.delete(key))))
   .then(()=>self.clients.claim())
 );
});

self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||request.mode!=='navigate')return;
 if(new URL(request.url).origin!==self.location.origin)return;
 // Network first: always fetch fresh private portal pages while online.
 // Only an anonymous offline information page is stored for offline use.
 event.respondWith(fetch(request).catch(async()=>{
  const fallback=await caches.match(OFFLINE_URL);
  return fallback||Response.error();
 }));
});
