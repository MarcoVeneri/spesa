const CACHE='buoni-spesa-v13';
const ASSETS=['./','./index.html','./manifest.json','./icon-v12.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('buoni-spesa-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(resp=>{
      const clone=resp.clone(); caches.open(CACHE).then(c=>c.put('./index.html',clone)); return resp;
    }).catch(()=>caches.match('./index.html')));
    return;
  }
  e.respondWith(fetch(e.request).then(resp=>{
    const clone=resp.clone(); caches.open(CACHE).then(c=>c.put(e.request,clone)); return resp;
  }).catch(()=>caches.match(e.request)));
});