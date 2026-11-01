const CACHE='lunch-menu-v7';
const FILES=['./','./index.html','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const request=event.request;if(request.mode==='navigate'||new URL(request.url).pathname.endsWith('/index.html')){event.respondWith(fetch(request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));return response}).catch(()=>caches.match(request).then(cached=>cached||caches.match('./index.html'))));return}event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));return response}).catch(()=>caches.match('./index.html'))))});

self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{}}catch{data={body:event.data?.text()||''}}
  event.waitUntil(self.registration.showNotification(data.title||'好好吃饭 · 今日菜单',{
    body:data.body||'今天的四道菜已准备好，点开查看食材和下厨步骤。',
    icon:'./icon.svg',
    badge:'./icon.svg',
    data:{url:data.url||'https://200611lxzys.github.io/lunch-menu-app/'}
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=event.notification.data?.url||'https://200611lxzys.github.io/lunch-menu-app/';
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const client of list){if('focus'in client)return client.navigate(target).then(()=>client.focus())}
    return clients.openWindow(target);
  }));
});
