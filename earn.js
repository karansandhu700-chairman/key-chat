/* Key Chat Earn desk: offers, leads, AI drafts, invoices and a paid tracker.
   Everything stays on this device (localStorage "kc-earn-v1"). Nothing is sent anywhere by this file:
   the only network call is the normal Key Chat router, used to draft text that you review and send yourself. */
(function(){
"use strict";
if(window.__kcEarn) return; window.__kcEarn=true;

const KEY="kc-earn-v1";
const STAGES=["pitched","replied","call","won","paid","lost"];
const CURS=["USD","EUR","GBP","AED","SGD","INR"];
const STARTERS=[
  {name:"Workflow & Visibility Audit",price:750,cur:"USD",desc:"One workflow or site, seven scored checks, ranked 30/60/90 fix list. 5 days. Credited into the build."},
  {name:"AI Assistant Pilot",price:2500,cur:"USD",desc:"One agent for one workflow, tested on your own examples, documented and handed over. 2 weeks, 50/50."},
  {name:"Care Plan",price:1200,cur:"USD",desc:"One system kept alive: monitoring, tuning, one improvement a month. Per month, 3-month minimum."}
];

function blank(){ return {offers:[],leads:[],invoices:[],profile:{},seqs:{}}; }
function load(){
  try{ const d=JSON.parse(localStorage.getItem(KEY)||"null"); if(d&&typeof d==="object") return Object.assign(blank(),d); }catch(e){}
  return blank();
}
let D=load(), tab="offers", prefill=null, running=null;
const drafts={};

function save(){ try{ localStorage.setItem(KEY,JSON.stringify(D)); return true; }catch(e){ say("Could not save: browser storage is full or blocked"); return false; } }
const uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-3);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const q=(s,r)=>(r||document).querySelector(s);
function say(t){ try{ if(typeof toast==="function") return toast(t); }catch(e){} }
function money(n,cur){ try{ return new Intl.NumberFormat("en",{style:"currency",currency:cur||"USD"}).format(n||0); }catch(e){ return (cur||"")+" "+(n||0); } }
function num(v){ const n=Number(String(v==null?"":v).replace(/,/g,"").trim()); return isFinite(n)&&n>=0?n:NaN; }
const offer=id=>D.offers.find(o=>o.id===id), lead=id=>D.leads.find(l=>l.id===id);
const today=()=>new Date().toISOString().slice(0,10);

/* ---------- styles ---------- */
const css=document.createElement("style");
css.textContent=`
#earn .ea-tabs{display:flex;gap:6px;padding:0 16px 10px;overflow-x:auto}
#earn .ea-tabs button{flex:1;min-width:76px;padding:9px 6px;border-radius:999px;border:1px solid var(--line);background:none;color:var(--muted);font-size:14px;font-weight:600}
#earn .ea-tabs button.on{background:var(--accent);color:var(--accentText);border-color:var(--accent)}
#earn .bd{overflow-y:auto;padding:4px 16px 18px}
.ea-card{border:1px solid var(--line);border-radius:14px;padding:12px;margin:0 0 10px;background:var(--hover)}
.ea-card b{font-size:15px}.ea-sub{color:var(--muted);font-size:13px;line-height:1.4}
.ea-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}
.ea-row .field{flex:1;min-width:110px}
.ea-sec{font-size:12px;font-weight:700;color:var(--muted);margin:16px 0 8px}
.ea-card textarea.field{min-height:64px;resize:vertical;font-family:inherit}
.ea-tot{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ea-big{font-size:22px;font-weight:700;font-variant-numeric:tabular-nums}
.ea-pill{display:inline-block;padding:2px 9px;border-radius:999px;border:1px solid var(--line);font-size:12px;color:var(--muted)}
.ea-pill.ok{color:var(--ok);border-color:var(--ok)}
.ea-note{font-size:12px;color:var(--muted);margin:6px 0 0;line-height:1.4}
#earnInv{z-index:60}
#earnInv iframe{flex:1;width:100%;border:0;background:#fff;border-radius:12px}
#earnInv .bd{display:flex;flex-direction:column;gap:10px;min-height:60vh}
`;
document.head.appendChild(css);

/* ---------- markup ---------- */
const sheet=document.createElement("div");
sheet.className="sheet"; sheet.id="earn";
sheet.innerHTML=`<div class="card">
  <div class="hd"><div><b>Earn</b><small style="display:block;color:var(--muted);font-size:12px;margin-top:2px">Private on this device. You send everything yourself.</small></div><button class="iconbtn" data-close aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
  <div class="ea-tabs" id="earnTabs" role="tablist"></div>
  <div class="bd" id="earnBody"></div>
</div>`;
const inv=document.createElement("div");
inv.className="sheet"; inv.id="earnInv";
inv.innerHTML=`<div class="card">
  <div class="hd"><div><b id="earnInvTitle">Invoice</b></div><button class="iconbtn" data-close aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
  <div class="bd"><iframe id="earnInvFrame" title="Invoice preview"></iframe>
    <div class="ea-row"><button class="btn" id="earnInvCopy">Copy text</button><button class="btn ghost" id="earnInvDl">Download</button><button class="btn ghost" id="earnInvPrint">Print or save PDF</button></div></div>
</div>`;
document.body.appendChild(sheet); document.body.appendChild(inv);
[sheet,inv].forEach(s=>s.addEventListener("click",e=>{ if(e.target===s||e.target.closest("[data-close]")){ if(running&&s===sheet) {} s.classList.remove("show"); } }));

/* ---------- sidebar entry ---------- */
const nav=document.createElement("button");
nav.className="navitem"; nav.id="earnNav"; nav.type="button";
nav.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.2c-.5-.8-1.5-1.2-2.8-1.2-1.6 0-2.7.8-2.7 2 0 3 5.6 1.4 5.6 4.2 0 1.2-1.2 2-2.9 2-1.4 0-2.5-.5-3-1.4M12 6.5V8m0 8v1.5"/></svg>Earn';
const agentNav=q("#agentNav");
if(agentNav&&agentNav.parentNode) agentNav.parentNode.insertBefore(nav,agentNav.nextSibling);
nav.onclick=()=>{ render(); sheet.classList.add("show"); try{ if(typeof closeSide==="function") closeSide(); }catch(e){} };

/* ---------- views ---------- */
function offerOptions(sel){ return '<option value="">No offer</option>'+D.offers.map(o=>`<option value="${esc(o.id)}"${o.id===sel?" selected":""}>${esc(o.name)}</option>`).join(""); }
function curOptions(sel){ return CURS.map(c=>`<option${c===sel?" selected":""}>${c}</option>`).join(""); }

function viewOffers(){
  let h="";
  if(!D.offers.length) h+=`<div class="ea-card"><b>No offers yet</b><p class="ea-sub">An offer is one thing you sell, with a price.</p><div class="ea-row"><button class="btn" data-act="starters">Add 3 starter offers</button></div><p class="ea-note">Starter prices are planning assumptions from your plan doc, not market data. Edit or delete them.</p></div>`;
  h+=D.offers.map(o=>`<div class="ea-card"><b>${esc(o.name)}</b> <span class="ea-pill">${esc(money(o.price,o.cur))}</span><div class="ea-sub">${esc(o.desc)}</div><div class="ea-row"><button class="btn ghost" data-act="delOffer" data-id="${esc(o.id)}">Delete</button></div></div>`).join("");
  h+=`<div class="ea-sec">Add an offer</div><div class="ea-card">
    <input class="field" id="eaOName" placeholder="Name, for example Launch check" maxlength="80">
    <div class="ea-row"><input class="field" id="eaOPrice" inputmode="decimal" placeholder="Price"><select class="field" id="eaOCur">${curOptions("USD")}</select></div>
    <input class="field" id="eaODesc" placeholder="One line on what the client gets" maxlength="160" style="margin-top:8px">
    <div class="ea-row"><button class="btn" data-act="addOffer">Add offer</button></div></div>`;
  return h;
}

function viewLeads(){
  let h="";
  if(!D.leads.length) h+=`<div class="ea-card"><b>No leads yet</b><p class="ea-sub">Add someone you plan to pitch. Write what you noticed about them, and the draft will use only that.</p></div>`;
  h+=D.leads.map(l=>{
    const o=offer(l.offerId), d=drafts[l.id]||"";
    const busy=running===l.id;
    return `<div class="ea-card" data-lead="${esc(l.id)}"><b>${esc(l.name)}</b> ${l.contact?`<span class="ea-sub">${esc(l.contact)}</span>`:""}
      <div class="ea-row"><select class="field" data-act="stage" data-id="${esc(l.id)}">${STAGES.map(s=>`<option${s===l.stage?" selected":""}>${s}</option>`).join("")}</select>
      <select class="field" data-act="leadOffer" data-id="${esc(l.id)}">${offerOptions(l.offerId)}</select></div>
      <textarea class="field" data-act="note" data-id="${esc(l.id)}" placeholder="What did you notice about them? Facts only." style="margin-top:8px">${esc(l.note||"")}</textarea>
      <div class="ea-row"><button class="btn" data-act="draft" data-kind="pitch" data-id="${esc(l.id)}">${busy?"Stop":"Draft pitch"}</button><button class="btn ghost" data-act="draft" data-kind="follow" data-id="${esc(l.id)}"${busy?" disabled":""}>Draft follow-up</button><button class="btn ghost" data-act="toInvoice" data-id="${esc(l.id)}">Invoice</button><button class="btn ghost" data-act="delLead" data-id="${esc(l.id)}">Delete</button></div>
      ${d||busy?`<textarea class="field" data-act="draftText" data-id="${esc(l.id)}" style="margin-top:8px;min-height:120px" aria-label="Draft message">${esc(d)}</textarea><div class="ea-row"><button class="btn ghost" data-act="copy" data-id="${esc(l.id)}">Copy draft</button></div><p class="ea-note">Draft only. Key Chat never sends it. Check every line before you do.</p>`:""}
      ${o?`<p class="ea-note">Offer: ${esc(o.name)}, ${esc(money(o.price,o.cur))}</p>`:""}</div>`;
  }).join("");
  h+=`<div class="ea-sec">Add a lead</div><div class="ea-card">
    <input class="field" id="eaLName" placeholder="Person or company" maxlength="80">
    <input class="field" id="eaLContact" placeholder="Email, site or handle" maxlength="120" style="margin-top:8px">
    <select class="field" id="eaLOffer" style="margin-top:8px">${offerOptions("")}</select>
    <textarea class="field" id="eaLNote" placeholder="What did you notice about them? Facts only." style="margin-top:8px"></textarea>
    <div class="ea-row"><button class="btn" data-act="addLead">Add lead</button></div></div>`;
  return h;
}

function viewPay(){
  const p=D.profile||{}; let h="";
  h+=`<div class="ea-sec" style="margin-top:0">Create an invoice</div><div class="ea-card">`;
  if(!D.leads.length) h+=`<p class="ea-sub">Add a lead first, then invoice them from here.</p>`;
  else{
    const pl=prefill&&lead(prefill), po=pl&&offer(pl.offerId);
    h+=`<select class="field" id="eaILead">${D.leads.map(l=>`<option value="${esc(l.id)}"${pl&&pl.id===l.id?" selected":""}>${esc(l.name)}</option>`).join("")}</select>
    <div class="ea-row"><input class="field" id="eaIAmt" inputmode="decimal" placeholder="Amount" value="${po?esc(po.price):""}"><select class="field" id="eaICur">${curOptions(po?po.cur:(p.cur||"USD"))}</select></div>
    <input class="field" id="eaIDesc" placeholder="What the invoice is for" maxlength="160" value="${po?esc(po.name):""}" style="margin-top:8px">
    <div class="ea-row"><input class="field" id="eaIDue" inputmode="numeric" placeholder="Due in days" value="7"></div>
    <div class="ea-row"><button class="btn" data-act="makeInvoice">Create invoice</button></div>`;
  }
  h+=`</div>`;
  h+=`<div class="ea-sec">Invoices</div>`;
  if(!D.invoices.length) h+=`<p class="ea-sub">None yet.</p>`;
  h+=D.invoices.slice().reverse().map(i=>{ const l=lead(i.leadId);
    return `<div class="ea-card"><b>${esc(i.no)}</b> <span class="ea-pill${i.paid?" ok":""}">${i.paid?"paid "+esc(i.paid):"unpaid"}</span>
      <div class="ea-sub">${esc(l?l.name:"(deleted lead)")}, ${esc(money(i.amount,i.cur))}, ${esc(i.desc)}</div>
      <div class="ea-row"><button class="btn ghost" data-act="viewInv" data-id="${esc(i.id)}">View</button><button class="btn ghost" data-act="paid" data-id="${esc(i.id)}">${i.paid?"Mark unpaid":"Mark paid"}</button><button class="btn ghost" data-act="delInv" data-id="${esc(i.id)}">Delete</button></div></div>`; }).join("");
  h+=`<div class="ea-sec">Your payout details</div><div class="ea-card">
    <input class="field" id="eaPName" placeholder="Your name or business name" value="${esc(p.name||"")}" maxlength="80">
    <textarea class="field" id="eaPPay" placeholder="Bank details clients can pay into, for example your Wise USD account details" style="margin-top:8px">${esc(p.pay||"")}</textarea>
    <input class="field" id="eaPLink" placeholder="Payment link, if you have one (Wise, PayPal.me, Dodo)" value="${esc(p.link||"")}" maxlength="300" style="margin-top:8px">
    <input class="field" id="eaPUpi" placeholder="UPI ID (optional, adds a pay link to INR invoices)" value="${esc(p.upi||"")}" maxlength="80" style="margin-top:8px">
    <textarea class="field" id="eaPTax" placeholder="Tax note for invoices (optional). Ask your CA what to write." style="margin-top:8px;min-height:48px">${esc(p.tax||"")}</textarea>
    <div class="ea-row"><button class="btn" data-act="saveProfile">Save details</button></div>
    <p class="ea-note">Stored only in this browser. Never put card numbers or passwords here.</p></div>`;
  return h;
}

function viewTotals(){
  const now=new Date(), ym=now.toISOString().slice(0,7);
  const paid=D.invoices.filter(i=>i.paid), open=D.invoices.filter(i=>!i.paid);
  const sum=(arr)=>{ const m={}; arr.forEach(i=>{ m[i.cur]=(m[i.cur]||0)+i.amount; }); return m; };
  const fmt=m=>Object.keys(m).length?Object.keys(m).map(c=>`<div class="ea-big">${esc(money(m[c],c))}</div>`).join(""):`<div class="ea-big">0</div>`;
  const stageCount=STAGES.map(s=>`${s}: ${D.leads.filter(l=>l.stage===s).length}`).join(" · ");
  return `<div class="ea-tot">
    <div class="ea-card"><div class="ea-sub">Paid this month</div>${fmt(sum(paid.filter(i=>i.paid.slice(0,7)===ym)))}</div>
    <div class="ea-card"><div class="ea-sub">Paid all time</div>${fmt(sum(paid))}</div>
    <div class="ea-card"><div class="ea-sub">Waiting to be paid</div>${fmt(sum(open))}</div>
    <div class="ea-card"><div class="ea-sub">Leads</div><div class="ea-big">${D.leads.length}</div></div></div>
    <p class="ea-note">${esc(stageCount)}</p>
    <p class="ea-note">Currencies are never added together, because rates change. Totals only count invoices you marked paid.</p>
    <div class="ea-sec">Backup</div><div class="ea-card"><div class="ea-row"><button class="btn ghost" data-act="export">Download backup</button><button class="btn ghost" data-act="import">Restore backup</button></div>
    <input type="file" id="eaImp" accept="application/json" hidden><p class="ea-note">Browser storage can be cleared. Download a backup now and then.</p></div>`;
}

const VIEWS={offers:viewOffers,leads:viewLeads,pay:viewPay,totals:viewTotals};
const TABNAMES={offers:"Offers",leads:"Leads",pay:"Get paid",totals:"Totals"};
function render(){
  q("#earnTabs").innerHTML=Object.keys(VIEWS).map(k=>`<button type="button" role="tab" data-tab="${k}" class="${k===tab?"on":""}" aria-selected="${k===tab}">${TABNAMES[k]}</button>`).join("");
  q("#earnBody").innerHTML=VIEWS[tab]();
  prefill=null;
}

/* ---------- drafting through the Key Chat router ---------- */
function senderName(){ return (D.profile&&D.profile.name)||"[Your name]"; }
async function draft(id,kind){
  const l=lead(id); if(!l) return;
  if(running===id){ try{ running_ctl&&running_ctl.abort(); }catch(e){} return; }
  if(running){ say("Another draft is running"); return; }
  if(typeof routeChat!=="function"){ say("The model router is not ready yet. Reload and try again."); return; }
  if(!l.note||l.note.trim().length<10){ say("Write what you noticed about them first, so the draft has real facts"); return; }
  const o=offer(l.offerId);
  const sys=["You draft short business messages for a freelancer to review and send themselves.",
    "Rules: under 120 words. Plain, specific, friendly, no hype words. Use ONLY the facts supplied below.",
    "Never invent clients, results, numbers, case studies, mutual connections, deadlines or scarcity.",
    "If something is not supplied, leave it out. One small, easy ask at the end.",
    "Write in the first person as the sender. Sign off with the sender name. Output only the message text, with a subject line first if it is an email."].join("\n");
  const facts=[`Sender name: ${senderName()}`,`Recipient: ${l.name}`,l.contact?`Contact: ${l.contact}`:"",`What the sender noticed about the recipient: ${l.note}`,
    o?`Offer: ${o.name}. ${o.desc}. Price: ${money(o.price,o.cur)}`:"No specific offer chosen; offer a short call instead.",
    kind==="follow"?"Write a short follow-up to an earlier message. Do not say 'just following up'. Add one new useful thing from the facts above. Do not pretend the recipient replied.":"Write a first outreach message."].filter(Boolean).join("\n");
  running=id; running_ctl=new AbortController(); drafts[id]=""; render(); keepScroll(id);
  try{
    const r=await routeChat([{role:"system",content:sys},{role:"user",content:facts}],{},t=>{ drafts[id]=t||""; const ta=q(`textarea[data-act="draftText"][data-id="${id}"]`); if(ta) ta.value=drafts[id]; },running_ctl.signal);
    drafts[id]=(r&&r.text)||drafts[id]||"";
  }catch(err){ if(!(err&&err.stopped)) say("Draft failed: "+((err&&err.message)||"unknown error").slice(0,140)); }
  running=null; running_ctl=null; render(); keepScroll(id);
}
let running_ctl=null;
function keepScroll(id){ const el=q(`[data-lead="${id}"]`); if(el) el.scrollIntoView({block:"nearest"}); }

/* ---------- invoices ---------- */
function upiLink(i){ const p=D.profile||{}; if(i.cur!=="INR"||!p.upi) return ""; return "upi://pay?pa="+encodeURIComponent(p.upi)+"&pn="+encodeURIComponent(p.name||"")+"&am="+encodeURIComponent(i.amount.toFixed(2))+"&cu=INR&tn="+encodeURIComponent(i.no); }
function invText(i){
  const p=D.profile||{}, l=lead(i.leadId), up=upiLink(i);
  return [`INVOICE ${i.no}`,`Date: ${i.date}`,`Due: ${i.due}`,"",`From: ${p.name||"[your name]"}`,`To: ${l?l.name:""}`,"",`${i.desc}`,`Amount: ${money(i.amount,i.cur)}`,"",
    p.pay?`Pay to:\n${p.pay}`:"", p.link?`Payment link: ${p.link}`:"", up?`UPI link: ${up}`:"", p.tax?`\n${p.tax}`:""].filter(x=>x!=="").join("\n");
}
function invHtml(i){
  const p=D.profile||{}, l=lead(i.leadId), up=upiLink(i);
  const link=u=>/^https?:\/\//i.test(u)?`<a href="${esc(u)}">${esc(u)}</a>`:esc(u);
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(i.no)}</title>
<style>body{font:15px/1.55 -apple-system,system-ui,Segoe UI,sans-serif;color:#111;margin:0;padding:26px;max-width:640px}h1{font-size:22px;margin:0 0 4px}.m{color:#555;font-size:13px}table{width:100%;border-collapse:collapse;margin:22px 0}td{padding:10px 0;border-bottom:1px solid #ddd}td:last-child{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}.box{background:#f5f5f5;border-radius:10px;padding:12px 14px;margin-top:14px;white-space:pre-wrap;word-break:break-word;font-size:14px}</style></head><body>
<h1>Invoice ${esc(i.no)}</h1><div class="m">Date ${esc(i.date)} · Due ${esc(i.due)}</div>
<p><b>From</b><br>${esc(p.name||"")}</p><p><b>To</b><br>${esc(l?l.name:"")}${l&&l.contact?"<br>"+esc(l.contact):""}</p>
<table><tr><td>${esc(i.desc)}</td><td>${esc(money(i.amount,i.cur))}</td></tr></table>
${p.pay?`<div class="box"><b>Pay to</b>\n${esc(p.pay)}</div>`:""}${p.link?`<div class="box"><b>Payment link</b>\n${link(p.link)}</div>`:""}${up?`<div class="box"><b>UPI link</b>\n<a href="${esc(up)}">${esc(up)}</a></div>`:""}${p.tax?`<p class="m">${esc(p.tax)}</p>`:""}
</body></html>`;
}
let curInv=null;
function showInvoice(id){
  const i=D.invoices.find(x=>x.id===id); if(!i) return; curInv=i;
  q("#earnInvTitle").textContent="Invoice "+i.no;
  q("#earnInvFrame").srcdoc=invHtml(i); inv.classList.add("show");
}
q("#earnInvCopy").onclick=async()=>{ if(!curInv) return; try{ await navigator.clipboard.writeText(invText(curInv)); say("Invoice text copied"); }catch(e){ say("Copy failed. Use Download instead"); } };
q("#earnInvDl").onclick=()=>{ if(!curInv) return; const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([invHtml(curInv)],{type:"text/html"})); a.download=curInv.no+".html"; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1000); };
q("#earnInvPrint").onclick=()=>{ try{ q("#earnInvFrame").contentWindow.print(); }catch(e){ say("Printing is not available here. Use Download"); } };

/* ---------- actions ---------- */
function val(id){ const el=q("#"+id); return el?el.value.trim():""; }
const click={
  starters(){ STARTERS.forEach(s=>D.offers.push(Object.assign({id:uid()},s))); save(); render(); },
  addOffer(){ const n=val("eaOName"), p=num(val("eaOPrice")); if(!n) return say("Give the offer a name"); if(isNaN(p)) return say("Enter the price as a number"); D.offers.push({id:uid(),name:n,price:p,cur:val("eaOCur")||"USD",desc:val("eaODesc")}); save(); render(); },
  delOffer(b){ const o=offer(b.dataset.id); if(o&&confirm("Delete offer \""+o.name+"\"?")){ D.offers=D.offers.filter(x=>x.id!==o.id); D.leads.forEach(l=>{ if(l.offerId===o.id) l.offerId=""; }); save(); render(); } },
  addLead(){ const n=val("eaLName"); if(!n) return say("Give the lead a name"); D.leads.unshift({id:uid(),name:n,contact:val("eaLContact"),offerId:val("eaLOffer"),note:val("eaLNote"),stage:"pitched",created:today()}); save(); render(); },
  delLead(b){ const l=lead(b.dataset.id); if(l&&confirm("Delete lead \""+l.name+"\"? Its invoices stay.")){ D.leads=D.leads.filter(x=>x.id!==l.id); delete drafts[l.id]; save(); render(); } },
  draft(b){ draft(b.dataset.id,b.dataset.kind); },
  copy(b){ const t=drafts[b.dataset.id]||""; if(!t) return; navigator.clipboard.writeText(t).then(()=>say("Draft copied"),()=>say("Copy failed. Select the text and copy it by hand")); },
  toInvoice(b){ prefill=b.dataset.id; tab="pay"; const keep=prefill; render(); const sel=q("#eaILead"); if(sel){ sel.value=keep; const l=lead(keep), o=l&&offer(l.offerId); if(o){ q("#eaIAmt").value=o.price; q("#eaICur").value=o.cur; q("#eaIDesc").value=o.name; } } },
  makeInvoice(){
    const l=lead(val("eaILead")), a=num(val("eaIAmt")), d=val("eaIDesc"), due=parseInt(val("eaIDue"),10);
    if(!l) return say("Pick a lead"); if(isNaN(a)||a<=0) return say("Enter the amount as a number above zero"); if(!d) return say("Say what the invoice is for");
    const t=new Date(), ym=t.toISOString().slice(0,7).replace("-","");
    D.seqs[ym]=(D.seqs[ym]||0)+1; const no="KC-"+ym+"-"+String(D.seqs[ym]).padStart(3,"0");
    const dueDate=new Date(t.getTime()+(isNaN(due)||due<0?7:due)*864e5).toISOString().slice(0,10);
    const rec={id:uid(),no,leadId:l.id,amount:a,cur:val("eaICur")||"USD",desc:d,date:today(),due:dueDate,paid:""};
    D.invoices.push(rec); save(); render(); showInvoice(rec.id);
    if(!(D.profile&&(D.profile.pay||D.profile.link||D.profile.upi))) say("No payout details saved yet. Add them under Get paid so clients know where to pay");
  },
  viewInv(b){ showInvoice(b.dataset.id); },
  paid(b){ const i=D.invoices.find(x=>x.id===b.dataset.id); if(!i) return; i.paid=i.paid?"":today(); const l=lead(i.leadId); if(l&&i.paid) l.stage="paid"; save(); render(); },
  delInv(b){ const i=D.invoices.find(x=>x.id===b.dataset.id); if(i&&confirm("Delete invoice "+i.no+"?")){ D.invoices=D.invoices.filter(x=>x.id!==i.id); save(); render(); } },
  saveProfile(){ D.profile={name:val("eaPName"),pay:val("eaPPay"),link:val("eaPLink"),upi:val("eaPUpi"),tax:val("eaPTax"),cur:(D.profile||{}).cur}; if(save()) say("Details saved"); },
  export(){ const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([JSON.stringify(D,null,1)],{type:"application/json"})); a.download="keychat-earn-backup-"+today()+".json"; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1000); },
  import(){ const f=q("#eaImp"); if(f) f.click(); }
};
const body=q("#earnBody");
body.addEventListener("click",e=>{ const b=e.target.closest("[data-act]"); if(!b||b.tagName==="SELECT"||b.tagName==="TEXTAREA"||b.tagName==="INPUT") return; const f=click[b.dataset.act]; if(f) f(b); });
body.addEventListener("change",e=>{
  const t=e.target;
  if(t.id==="eaImp"&&t.files&&t.files[0]){
    const r=new FileReader(); r.onload=()=>{ try{ const d=JSON.parse(r.result); if(!d||typeof d!=="object"||!Array.isArray(d.offers)||!Array.isArray(d.leads)||!Array.isArray(d.invoices)) throw 0; if(!confirm("Replace your current Earn data with this backup?")) return; D=Object.assign(blank(),d); save(); render(); say("Backup restored"); }catch(x){ say("That file is not a Key Chat Earn backup"); } };
    r.readAsText(t.files[0]); t.value=""; return;
  }
  const id=t.dataset&&t.dataset.id, l=id&&lead(id);
  if(!l) return;
  if(t.dataset.act==="stage"){ l.stage=t.value; save(); }
  else if(t.dataset.act==="leadOffer"){ l.offerId=t.value; save(); render(); }
  else if(t.dataset.act==="note"){ l.note=t.value; save(); }
});
body.addEventListener("input",e=>{ const t=e.target; if(t.dataset&&t.dataset.act==="draftText") drafts[t.dataset.id]=t.value; });
q("#earnTabs").addEventListener("click",e=>{ const b=e.target.closest("[data-tab]"); if(b){ tab=b.dataset.tab; render(); } });

window.kcEarn={open(){ nav.click(); },data:()=>D};
})();
