/* Key Chat v28 — scope-limited, network-first shell caching. */
const CACHE="keychat-v36-freetier-1";
const BASE=new URL(self.registration.scope);
const FILES=["index.html","keychat-premium.css","premium-features.css","premium-features.js","studio-live.html","studio-preview.html","studio-polish.css","studio-polish.js","manifest.webmanifest","icon-192.png","icon-512.png","apple-touch-icon.png","monogram.png","key.webp","fx.js","keychat-v28.css","keychat-v28.js","kc29-studio.html","kc29-studio.css","kc29-studio.js","kc29-core.js","kc29-templates.js","kc29-logo.png","kc-intelligence.html","kc-intelligence.css","kc-intelligence.js","kc-intelligence-core.js","native.css","native.js","earn.js","plans.js","workspace-theme.js","workspace-native.css"];
const PATHS=new Set(FILES.map(f=>new URL(f,BASE).pathname));
self.addEventListener("install",event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(FILES.map(f=>new Request(new URL(f,BASE),{cache:"reload"})));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    for(const k of await caches.keys()) if(k.startsWith("keychat-")&&k!==CACHE) await caches.delete(k); /* drop old versions */
    await self.clients.claim();
  })());
});
self.addEventListener("fetch",event=>{
  const req=event.request,url=new URL(req.url);
  if(req.method!=="GET"||url.origin!==BASE.origin)return;
  const isRoot=url.pathname===BASE.pathname||url.pathname===new URL("index.html",BASE).pathname;
  const isNav=req.mode==="navigate"&&isRoot;
  if(!isNav&&!PATHS.has(url.pathname))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const response=await fetch(req);
      if(response.ok&&!response.redirected&&(!isNav||response.headers.get("content-type")?.includes("text/html"))){
        try{await cache.put(req,response.clone());}catch(_){}
      }
      return response;
    }catch(err){
      const cached=isNav?await cache.match(new URL("index.html",BASE)):await cache.match(req)||await cache.match(req,{ignoreSearch:true});
      return cached||new Response("Key Chat resource unavailable offline.",{status:503,headers:{"Content-Type":"text/plain; charset=utf-8"}});
    }
  })());
});
