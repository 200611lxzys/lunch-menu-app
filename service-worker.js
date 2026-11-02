const CACHE='lunch-menu-v10';
const FILES=[
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './images/dishes-meat.svg',
  './images/dishes-side.svg',
  './images/dishes-veg.svg',
  './images/dishes-soup.svg'
];
self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())
));
self.addEventListener('activate',event=>event.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(key=>key.startsWith('lunch-menu-')&&key!==CACHE).map(key=>caches.delete(key))))
    .then(()=>self.clients.claim())
));
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const isPage=request.mode==='navigate'||new URL(request.url).pathname.endsWith('/index.html');
  if(isPage){
    const cacheKey=new URL('./index.html',self.registration.scope).href;
    const cachedPage=caches.open(CACHE).then(cache=>cache.match(request).then(hit=>hit||cache.match(cacheKey)));
    const refreshPage=fetch(request,{cache:'no-store'}).then(async response=>{
      if(!response.ok)return response;
      const previous=await cachedPage;
      let changed=false;
      if(previous){
        try{changed=(await previous.clone().text())!==(await response.clone().text())}catch{}
      }
      const cache=await caches.open(CACHE);
      await cache.put(request,response.clone());
      await cache.put(cacheKey,response.clone());
      if(changed){
        const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
        clients.forEach(client=>client.postMessage({type:'APP_UPDATED'}));
      }
      return response;
    });
    event.waitUntil(refreshPage.then(()=>{}).catch(()=>{}));
    event.respondWith(cachedPage.then(cached=>cached||refreshPage).catch(()=>caches.match(cacheKey)));
    return;
  }
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy))}
    return response;
  }).catch(()=>caches.match('./index.html'))));
});
