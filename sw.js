// Key Chat app shell: network-first, cached offline fallback.
const C="keychat-v34-ui-fix";
const SHELL=["./","index.html","keychat-premium.css","premium-features.css","premium-features.js","studio-live.html","studio-preview.html","studio-polish.css","studio-polish.js","manifest.webmanifest","icon-192.png","icon-512.png","apple-touch-icon.png","key.webp","fx.js"];
self.addEventListener("install",e=>e.waitUntil((async()=>{const c=await caches.open(C);await c.addAll(SHELL);await self.skipWaiting()})()));
self.addEventListener("activate",e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==C&&k.startsWith("keychat-"))await caches.delete(k);await self.clients.claim()})()));
self.addEventListener("fetch",e=>{
 const u=new URL(e.request.url),scope=new URL(self.registration.scope);
 if(e.request.method!=="GET"||u.origin!==scope.origin||!u.pathname.startsWith(scope.pathname))return;
 const nav=e.request.mode==="navigate";
 const shell=SHELL.some(s=>new URL(s,scope).pathname===u.pathname);
 if(!nav&&!shell)return;
 e.respondWith((async()=>{
   const c=await caches.open(C);
   try{const r=await fetch(e.request);if(r.ok)try{await c.put(e.request,r.clone())}catch{}return r}
   catch{const exact=await c.match(e.request);if(exact)return exact;
     if(!nav){const base=await c.match(e.request,{ignoreSearch:true});if(base)return base}
     if(nav&&(u.pathname===scope.pathname||u.pathname===new URL("index.html",scope).pathname)){const home=await c.match(new URL("index.html",scope));if(home)return home}
     return new Response("Unavailable offline",{status:503,headers:{"Content-Type":"text/plain"}});
   }
 })());
});
