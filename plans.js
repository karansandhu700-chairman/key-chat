/* Key Chat plans.

   Key Chat does not resell model usage: every user pays their own provider, or uses the free
   no-key models. So there is no margin on tokens, and the money has to come from the app itself.
   That means a one-time licence for the software, and a small monthly charge only for the one
   thing that genuinely costs money every month — hosted sync and backup on the Worker.

   TEST MODE. Nothing is charged and nothing is verified on a server, so the licence recorded here
   is only what this phone says it is. A real licence needs a key checked against the Worker. */
(function(){
"use strict";
if(window.__kcPlans) return; window.__kcPlans=true;

const KEY="kc-plan-v1";
/* Prices are proposals. Reference checked 24 Nov 2026: TypingMind, the main bring-your-own-key
   chat app, sells a one-time licence at $39 Standard / $79 Extended / $99 Premium, with model
   usage billed separately by the provider, and charges separately for cloud sync and for teams. */
const TIERS=[
 {id:"free", name:"Free", price:{usd:0,inr:0}, kind:"", tag:"",
  line:"Chat with the free models, or plug in your own API keys",
  has:["Free no-key models","Your own API keys, no markup","Unlimited chats on this device","Artifacts and plugins"],
  not:["Studio coding","Earn desk","Sync between devices"]},
 {id:"pro", name:"Pro licence", price:{usd:29,inr:2499}, kind:"once", tag:"Pay once",
  line:"Buy the app once. Every update after that is included.",
  has:["Everything in Free","Studio: plan, build and spec","Pursue goal mode, 3 tasks at once","Earn desk: offers, leads, invoices","Unlimited plugins and MCP","Lifetime updates, no subscription"],
  not:[]},
 {id:"sync", name:"Sync", price:{usd:3,inr:249}, kind:"month", tag:"Optional",
  line:"The only part with a real monthly cost: your chats on a server, not just this phone.",
  has:["Chats and settings on every device","Hosted backup, restorable if the phone is lost","Needs the Pro licence"],
  not:[]}
];

function load(){ try{ const d=JSON.parse(localStorage.getItem(KEY)||"null"); if(d&&typeof d==="object") return Object.assign({pro:false,sync:false,cur:"USD",used:{}},d); }catch(e){}
  return {pro:false,sync:false,cur:"USD",used:{}}; }
let D=load();
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(D)); }catch(e){} }
function say(t){ try{ if(typeof toast==="function") toast(t); }catch(e){} }
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const q=(s,r)=>(r||document).querySelector(s);
const today=()=>new Date().toISOString().slice(0,10);

/* Free keeps working for chat; the licence gates the extras only. */
const GATED={studio:"Studio",earn:"Earn desk",sync:"Sync"};
function has(feature){ if(feature==="sync") return D.pro&&D.sync; return D.pro; }
function need(feature){
  if(has(feature)) return true;
  say((GATED[feature]||"That")+" needs the Pro licence");
  open(); return false;
}
function bump(kind){ const d=today(); if(D.used.d!==d) D.used={d:d}; D.used[kind]=(D.used[kind]||0)+1; save(); return D.used[kind]; }
function usedToday(kind){ return D.used.d===today()?(D.used[kind]||0):0; }

const css=document.createElement("style");
css.textContent=`
#plans .bd{overflow-y:auto;padding:4px 16px 20px}
.pl-note{font-size:12px;color:var(--muted);line-height:1.5;margin:8px 0 0}
.pl-why{border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin:0 0 14px;font-size:13px;line-height:1.55}
.pl-why b{display:block;margin-bottom:4px}
.pl-seg{display:flex;border:1px solid var(--line);border-radius:999px;overflow:hidden;width:140px;margin:0 0 14px}
.pl-seg button{flex:1;padding:7px 4px;border:0;background:none;color:var(--muted);font-size:13px;font-weight:600}
.pl-seg button.on{background:var(--accent);color:var(--accentText)}
.pl-card{border:1px solid var(--line);border-radius:16px;padding:14px;margin:0 0 10px;background:var(--hover)}
.pl-card.now{border-color:var(--accent)}
.pl-top{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.pl-name{font-size:17px;font-weight:700}
.pl-price{margin-left:auto;font-size:20px;font-weight:700;font-variant-numeric:tabular-nums}
.pl-per{font-size:12px;color:var(--muted);font-weight:400}
.pl-line{color:var(--muted);font-size:13px;margin:5px 0 10px;line-height:1.45}
.pl-has{list-style:none;padding:0;margin:0 0 12px}
.pl-has li{font-size:13.5px;line-height:1.5;padding-left:20px;position:relative}
.pl-has li:before{content:"";position:absolute;left:4px;top:7px;width:6px;height:6px;border-radius:50%;background:var(--accent)}
.pl-has li.no{color:var(--muted)}
.pl-has li.no:before{background:none;border:1px solid var(--muted);width:6px;height:6px}
.pl-tag{font-size:11px;font-weight:700;color:var(--accent);border:1px solid var(--accent);border-radius:999px;padding:1px 8px}
.pl-test{border:1px solid var(--line);border-radius:12px;padding:9px 12px;margin:0 0 14px;font-size:12.5px;color:var(--muted);line-height:1.5}
.pl-use{display:flex;gap:10px;margin:0 0 14px}
.pl-use div{flex:1;border:1px solid var(--line);border-radius:12px;padding:10px}
.pl-use b{display:block;font-size:18px;font-variant-numeric:tabular-nums}
.pl-use span{font-size:11.5px;color:var(--muted)}
`;
document.head.appendChild(css);

const sheet=document.createElement("div");
sheet.className="sheet"; sheet.id="plans"; sheet.setAttribute("data-size","full");
sheet.innerHTML=`<div class="card">
  <div class="hd"><div><b>Plans</b><small style="display:block;color:var(--muted);font-size:12px;margin-top:2px">Test mode — nothing is charged</small></div><button class="iconbtn" data-close aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
  <div class="bd" id="plansBody"></div></div>`;
document.body.appendChild(sheet);
sheet.addEventListener("click",e=>{ if(e.target===sheet||e.target.closest("[data-close]")) sheet.classList.remove("show"); });
function open(){ render(); sheet.classList.add("show"); }

const nav=document.createElement("button");
nav.className="navitem"; nav.id="plansNav"; nav.type="button";
nav.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 14.6 9l6 .9-4.3 4.2 1 6-5.3-2.8L6.7 20l1-6L3.4 9.9 9.4 9z"/></svg>Plans';
const after=q("#earnNav")||q("#agentNav");
if(after&&after.parentNode) after.parentNode.insertBefore(nav,after.nextSibling);
nav.onclick=()=>{ open(); try{ if(typeof closeSide==="function") closeSide(); }catch(e){} };

function price(t){
  if(!t.price.usd) return "Free";
  const v=D.cur==="INR"?"₹"+t.price.inr.toLocaleString("en-IN"):"$"+t.price.usd;
  return v;
}
function held(t){ return t.id==="free"?!D.pro:(t.id==="pro"?D.pro:D.sync&&D.pro); }

function render(){
  let h=`<div class="pl-why"><b>Why there is no monthly fee for the models</b>Key Chat never resells model usage. You use the free models, or your own API key at the provider's own price, with nothing added on top. So the app is what you buy, not the tokens — the same way TypingMind sells a one-time licence and leaves the API bill to you.</div>`;
  h+=`<div class="pl-test"><b>Not live yet.</b> Nothing is charged, and the licence is recorded only on this phone.</div>`;
  h+=`<div class="pl-seg">${["USD","INR"].map(c=>`<button data-cur="${c}" class="${D.cur===c?"on":""}">${c}</button>`).join("")}</div>`;
  h+=`<div class="pl-use"><div><b>${usedToday("msgs")}</b><span>messages today</span></div>
      <div><b>${usedToday("studio")}</b><span>Studio steps today</span></div></div>`;
  h+=TIERS.map(t=>{
    const on=held(t);
    const btn = t.id==="free" ? (on?`<button class="btn ghost" disabled>Your plan</button>`:"")
      : t.id==="pro" ? (D.pro?`<button class="btn ghost" data-off="pro">Remove licence (test)</button>`:`<button class="btn" data-on="pro">Get the licence</button>`)
      : (!D.pro?`<button class="btn ghost" disabled>Needs the Pro licence</button>`
         : D.sync?`<button class="btn ghost" data-off="sync">Turn off sync</button>`:`<button class="btn ghost" data-on="sync">Add sync</button>`);
    return `<div class="pl-card${on?" now":""}">
      <div class="pl-top"><span class="pl-name">${esc(t.name)}</span>${t.tag?`<span class="pl-tag">${esc(t.tag)}</span>`:""}${on&&t.id!=="free"?`<span class="pl-tag">Active</span>`:""}
      <span class="pl-price">${price(t)}${t.kind?`<span class="pl-per"> ${t.kind==="once"?"once":"/ month"}</span>`:""}</span></div>
      <div class="pl-line">${esc(t.line)}</div>
      <ul class="pl-has">${t.has.map(f=>`<li>${esc(f)}</li>`).join("")}${t.not.map(f=>`<li class="no">${esc(f)}</li>`).join("")}</ul>
      ${btn}</div>`;
  }).join("");
  h+=`<p class="pl-note">A one-time licence is the proposal because it is what actually sells for an app like this: TypingMind charges $39 to $99 once, bills no model usage, and had over 20,000 customers in three years (checked 24 Nov 2026). ₹2,499 is roughly the price of one month of ChatGPT Plus in India, paid once.</p>
      <p class="pl-note">Where the rest of the money comes from, in the order it arrives: paid work booked through the Earn desk first, this licence second, and a team licence and the app stores later.</p>
      <p class="pl-note">Three things are still needed before a rupee can be taken: a licence key checked on the Cloudflare Worker, so a licence belongs to a buyer and not a phone; a payment provider — Razorpay in India (2% + 0.99% + GST, supports UPI AutoPay) or Dodo elsewhere (4% + $0.40); and your business KYC with whichever you pick.</p>`;
  q("#plansBody").innerHTML=h;
}
q("#plansBody").addEventListener("click",e=>{
  const t=e.target.closest("[data-cur],[data-on],[data-off]"); if(!t) return;
  if(t.dataset.cur) D.cur=t.dataset.cur;
  else if(t.dataset.on==="pro"){ D.pro=true; say("Pro licence on (test mode, nothing charged)"); }
  else if(t.dataset.off==="pro"){ D.pro=false; D.sync=false; }
  else if(t.dataset.on==="sync"){ D.sync=true; say("Sync on (test mode, nothing charged)"); }
  else if(t.dataset.off==="sync"){ D.sync=false; }
  save(); render();
});

window.kcPlan={ pro:()=>D.pro, sync:()=>D.pro&&D.sync, has:has, need:need, use:bump, usedToday:usedToday, open:open, testMode:()=>true };
})();
