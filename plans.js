/* Key Chat plans: the subscription tiers, shown in the app and enforced on this device.
   TEST MODE. No payment is taken and nothing is verified on a server, so the plan here is
   whatever this phone says it is. Real paid plans need a login and a plan check on the Worker. */
(function(){
"use strict";
if(window.__kcPlans) return; window.__kcPlans=true;

const KEY="kc-plan-v1";
const CUR={USD:{s:"$",r:1},INR:{s:"₹",r:null}};

/* Prices: USD is the anchor, INR is set per plan (not converted, so it stays a round number).
   These are proposals, not committed prices. Market reference checked 2026-11-24:
   ChatGPT Go $8 / ₹399, Plus $20 / ₹1,999; Claude Pro $20; Google AI Plus $4.99, AI Pro $19.99;
   Perplexity Pro $20 ($17 billed yearly). */
const PLANS=[
 {id:"free", name:"Free",  usd:0,  inr:0,    yr:0,   tag:"",
  line:"The free models, and your own API keys",
  has:["Free no-key models","Add your own API keys","Unlimited chats on this device","Artifacts and plugins"],
  limits:{msgs:60, studio:0, tasks:0}},
 {id:"go",   name:"Go",    usd:5,  inr:399,  yr:49,  tag:"",
  line:"More room each day, and the Earn desk",
  has:["Everything in Free","Higher daily message limit","Earn desk: offers, leads, invoices","Backup and restore"],
  limits:{msgs:300, studio:0, tasks:0}},
 {id:"plus", name:"Plus",  usd:15, inr:1199, yr:149, tag:"Most useful",
  line:"Studio coding, and the stronger models",
  has:["Everything in Go","Studio: build, plan and spec","Pursue goal mode","Up to 3 Studio tasks at once","Stronger hosted models"],
  limits:{msgs:1500, studio:50, tasks:3}},
 {id:"pro",  name:"Pro",   usd:20, inr:1699, yr:199, tag:"",
  line:"The highest limits, for all-day use",
  has:["Everything in Plus","Highest message limits","Longest Studio runs","Priority when a provider is busy"],
  limits:{msgs:99999, studio:400, tasks:5}}
];
const RANK={free:0,go:1,plus:2,pro:3};

function load(){ try{ const d=JSON.parse(localStorage.getItem(KEY)||"null"); if(d&&RANK[d.plan]!=null) return d; }catch(e){}
  return {plan:"free", cur:"USD", yearly:false, used:{}, test:true}; }
let D=load();
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(D)); }catch(e){} }
function say(t){ try{ if(typeof toast==="function") toast(t); }catch(e){} }
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const q=(s,r)=>(r||document).querySelector(s);
const plan=()=>PLANS.find(p=>p.id===D.plan)||PLANS[0];
const today=()=>new Date().toISOString().slice(0,10);

/* ---- usage counting, per day, on this device ---- */
function bump(kind){ const d=today(); if(D.used.d!==d) D.used={d:d}; D.used[kind]=(D.used[kind]||0)+1; save(); return D.used[kind]; }
function usedToday(kind){ return D.used.d===today()?(D.used[kind]||0):0; }
function allowed(kind){
  const L=plan().limits;
  if(kind==="msgs") return usedToday("msgs") < L.msgs;
  if(kind==="studio") return L.studio>0 && usedToday("studio") < L.studio;
  return true;
}
window.kcPlan={
  id:()=>D.plan,
  at:lvl=>RANK[D.plan]>=RANK[lvl],
  limits:()=>plan().limits,
  allowed:allowed,
  use:bump,
  open:()=>{ render(); sheet.classList.add("show"); },
  testMode:()=>D.test!==false
};

/* ---- styles ---- */
const css=document.createElement("style");
css.textContent=`
#plans .bd{overflow-y:auto;padding:4px 16px 20px}
.pl-bar{display:flex;gap:8px;align-items:center;margin:0 0 12px}
.pl-seg{display:flex;border:1px solid var(--line);border-radius:999px;overflow:hidden;flex:1}
.pl-seg button{flex:1;padding:8px 4px;border:0;background:none;color:var(--muted);font-size:13px;font-weight:600}
.pl-seg button.on{background:var(--accent);color:var(--accentText)}
.pl-card{border:1px solid var(--line);border-radius:16px;padding:14px;margin:0 0 10px;background:var(--hover);position:relative}
.pl-card.now{border-color:var(--accent)}
.pl-top{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.pl-name{font-size:17px;font-weight:700}
.pl-price{margin-left:auto;font-size:19px;font-weight:700;font-variant-numeric:tabular-nums}
.pl-per{font-size:12px;color:var(--muted);font-weight:400}
.pl-line{color:var(--muted);font-size:13px;margin:4px 0 10px;line-height:1.4}
.pl-has{list-style:none;padding:0;margin:0 0 12px}
.pl-has li{font-size:13.5px;line-height:1.5;padding-left:20px;position:relative}
.pl-has li:before{content:"";position:absolute;left:4px;top:7px;width:6px;height:6px;border-radius:50%;background:var(--accent)}
.pl-tag{font-size:11px;font-weight:700;color:var(--accent);border:1px solid var(--accent);border-radius:999px;padding:1px 8px}
.pl-note{font-size:12px;color:var(--muted);line-height:1.45;margin:6px 0 0}
.pl-warn{border:1px solid var(--warn,var(--line));border-radius:12px;padding:10px 12px;margin:0 0 14px;font-size:12.5px;color:var(--muted);line-height:1.5}
.pl-use{display:flex;gap:10px;margin:2px 0 14px}
.pl-use div{flex:1;border:1px solid var(--line);border-radius:12px;padding:10px}
.pl-use b{display:block;font-size:18px;font-variant-numeric:tabular-nums}
.pl-use span{font-size:11.5px;color:var(--muted)}
`;
document.head.appendChild(css);

/* ---- sheet ---- */
const sheet=document.createElement("div");
sheet.className="sheet"; sheet.id="plans"; sheet.setAttribute("data-size","full");
sheet.innerHTML=`<div class="card">
  <div class="hd"><div><b>Plans</b><small style="display:block;color:var(--muted);font-size:12px;margin-top:2px">Test mode — nothing is charged</small></div><button class="iconbtn" data-close aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
  <div class="bd" id="plansBody"></div></div>`;
document.body.appendChild(sheet);
sheet.addEventListener("click",e=>{ if(e.target===sheet||e.target.closest("[data-close]")) sheet.classList.remove("show"); });

const nav=document.createElement("button");
nav.className="navitem"; nav.id="plansNav"; nav.type="button";
nav.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 14.6 9l6 .9-4.3 4.2 1 6-5.3-2.8L6.7 20l1-6L3.4 9.9 9.4 9z"/></svg>Plans';
const earnNav=q("#earnNav")||q("#agentNav");
if(earnNav&&earnNav.parentNode) earnNav.parentNode.insertBefore(nav,earnNav.nextSibling);
nav.onclick=()=>{ render(); sheet.classList.add("show"); try{ if(typeof closeSide==="function") closeSide(); }catch(e){} };

function price(p){
  const sym=D.cur==="INR"?"₹":"$";
  if(!p.usd) return "Free";
  if(D.yearly){ const v=D.cur==="INR"?Math.round(p.yr*83/1)*1:p.yr; return sym+(D.cur==="INR"?(p.inr*10).toLocaleString("en-IN"):p.yr); }
  return sym+(D.cur==="INR"?p.inr.toLocaleString("en-IN"):p.usd);
}
function render(){
  const cp=plan(), L=cp.limits;
  let h=`<div class="pl-warn"><b>Not live yet.</b> Nothing is charged, and the plan is stored only on this phone. Prices are proposals.</div>`;
  h+=`<div class="pl-bar"><div class="pl-seg">${["USD","INR"].map(c=>`<button data-cur="${c}" class="${D.cur===c?"on":""}">${c}</button>`).join("")}</div>
      <div class="pl-seg">${[["Monthly",false],["Yearly",true]].map(([t,v])=>`<button data-yr="${v}" class="${D.yearly===v?"on":""}">${t}</button>`).join("")}</div></div>`;
  h+=`<div class="pl-use"><div><b>${usedToday("msgs")}</b><span>messages today${L.msgs<9999?" of "+L.msgs:""}</span></div>
      <div><b>${usedToday("studio")}</b><span>${L.studio?"Studio steps today of "+L.studio:"Studio not in this plan"}</span></div></div>`;
  h+=PLANS.map(p=>{
    const now=p.id===D.plan;
    return `<div class="pl-card${now?" now":""}">
      <div class="pl-top"><span class="pl-name">${esc(p.name)}</span>${p.tag?`<span class="pl-tag">${esc(p.tag)}</span>`:""}${now?`<span class="pl-tag">Your plan</span>`:""}
      <span class="pl-price">${price(p)}${p.usd?`<span class="pl-per"> / ${D.yearly?"year":"month"}</span>`:""}</span></div>
      <div class="pl-line">${esc(p.line)}</div>
      <ul class="pl-has">${p.has.map(f=>`<li>${esc(f)}</li>`).join("")}</ul>
      ${now?`<button class="btn ghost" disabled>Current plan</button>`:`<button class="btn${RANK[p.id]>RANK[D.plan]?"":" ghost"}" data-pick="${p.id}">${RANK[p.id]>RANK[D.plan]?"Try "+esc(p.name):"Switch to "+esc(p.name)}</button>`}
    </div>`;
  }).join("");
  h+=`<p class="pl-note">Yearly is priced at ten months, so two are free.</p>
      <p class="pl-note">Compared with, on 24 Nov 2026: ChatGPT Go $8 / ₹399 and Plus $20 / ₹1,999; Claude Pro $20; Google AI Plus $4.99 and AI Pro $19.99; Perplexity Pro $20, or $17 a month billed yearly.</p>
      <p class="pl-note">Three things are needed before this can take real money: a login, so a plan belongs to an account rather than a phone; a plan check on the Cloudflare Worker, since anything on the phone can be switched on by anyone; and a payment provider — Razorpay Subscriptions in India (2% + 0.99% + GST, supports UPI AutoPay) or Dodo elsewhere (4% + $0.40). Both need your business KYC.</p>
      <div style="margin-top:12px"><button class="btn ghost" data-reset>Reset to Free</button></div>`;
  q("#plansBody").innerHTML=h;
}
q("#plansBody").addEventListener("click",e=>{
  const t=e.target.closest("[data-cur],[data-yr],[data-pick],[data-reset]"); if(!t) return;
  if(t.dataset.cur){ D.cur=t.dataset.cur; }
  else if(t.dataset.yr){ D.yearly=t.dataset.yr==="true"; }
  else if(t.dataset.pick){ D.plan=t.dataset.pick; say("Switched to "+plan().name+" (test mode, nothing charged)"); }
  else if(t.hasAttribute("data-reset")){ D.plan="free"; D.used={}; say("Back on Free"); }
  save(); render();
});
})();
