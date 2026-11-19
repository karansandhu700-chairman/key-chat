/* Key Chat Platinum Native: additions use the original app's state and router. */
(()=>{
"use strict";
const q=(x,r=document)=>r.querySelector(x);
const mk=(tag,cls,t)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(t!==undefined)e.textContent=t;return e};
const btn=(t,fn)=>{const e=mk("button","",t);e.type="button";e.onclick=fn;return e};
const go=(path)=>location.assign(path);
const close=()=>{try{closeSide()}catch(_){}};
function openSettingsPage(page){close();renderSettings();openSheet("#settings");window.kcSettingsGo?.(page);}
function openHub(tab){const b=q(`[data-open-kc="${tab}"]`);if(b)b.click();else toast("This feature is not available in this view.");}
const catalog=[
 ["✎","Writing","Draft, revise and polish text.","kc-v28-writing"],
 ["⌘","Code","Review, debug and explain code.","kc-v28-coding"],
 ["▥","Data analyst","Analyze data and check calculations.","kc-v28-analysis"],
 ["◎","Research planner","Organize questions and evaluate evidence.","kc-v28-research"],
];
const definition={
 "kc-v28-writing":"Match the user's requested audience and tone. Preserve facts and identify missing details.",
 "kc-v28-coding":"Explain causes, propose minimal safe fixes and tests. Never claim execution without evidence.",
 "kc-v28-analysis":"Verify calculations, explain assumptions and recommend reproducible analysis.",
 "kc-v28-research":"Distinguish facts, assumptions and open questions. Cite only retrieved sources."
};
const apps=[
 ["↗","GitHub","Existing Workspace repository settings; separate permission required.",()=>{q("#agentBtn").click()}],
 ["⇄","Webhook connectors","Configure and test HTTPS webhooks.",()=>openHub("connectors")],
 ["☁","Sync","Configure a compatible sync endpoint.",()=>openHub("sync")],
 ["▧","Artifacts","Review local HTML version history.",()=>openHub("artifacts")],
 ["◉","Live media","Open media workspace.",()=>openHub("media")],
 ["⚙","AI providers","Configure model credentials and relay.",()=>openSettingsPage("providers")]
];
const panel=mk("div","sheet");panel.id="kcNativeDiscover";
const card=mk("div","card"),head=mk("div","hd"),title=mk("b","","Discover");
const x=btn("×",()=>panel.classList.remove("show"));x.className="iconbtn";x.setAttribute("aria-label","Close discovery");
head.append(title,x);const body=mk("div","bd"), search=mk("input");search.type="search";search.placeholder="Search skills and connections";search.setAttribute("aria-label","Search skills and connections");
const tabs=mk("div","seg"),rows=mk("div","kc-native-directory"),note=mk("p","hint","Skills enhance instructions; they do not grant access to external services. Connections require separate configuration.");
const importBtn=btn("Manage imported skills",()=>{panel.classList.remove("show");openSettingsPage("plugins")});importBtn.className="kc-native-action";
let tab="Featured";
function row(icon,name,desc,action,fn){
 const b=btn("",fn),mark=mk("span","mark",icon),info=mk("span");info.append(mk("b","",name),mk("small","",desc));b.append(mark,info,mk("span","",action));return b;
}
function render(){
 const query=search.value.trim().toLowerCase(), match=(name,desc)=>`${name} ${desc}`.toLowerCase().includes(query);
 for(const t of tabs.children)t.setAttribute("aria-pressed",String(t.textContent===tab));rows.replaceChildren();
 const list=plugs();
 if(tab==="Featured"||tab==="Skills"){
  for(const [icon,name,desc,id] of catalog){
   if(!match(name,desc))continue;
   const p=list.find(x=>x.id===id);
   rows.append(row(icon,name,desc,p?.on?"✓":"+",()=>{
    const e=plugs().find(x=>x.id===id);
    if(e)e.on=!e.on;else plugs().push({id,pkg:id,name,on:true,files:{[id+"/SKILL.md"]:definition[id]}});
    save();window.__chief?.render?.();render();
   }));
  }
 }
 if(tab==="Installed"){
  for(const p of list){if(match(p.name,p.pkg||""))rows.append(row("◇",p.name||p.pkg,"Imported instruction skill",p.on?"Enabled":"Off",()=>{p.on=!p.on;save();window.__chief?.render?.();render()}));}
 }
 if(tab==="Featured"||tab==="Connections"){
  for(const [icon,name,desc,fn] of apps)if(match(name,desc))rows.append(row(icon,name,desc,"›",()=>{panel.classList.remove("show");fn()}));
 }
 if(!rows.children.length)rows.append(mk("p","hint","No matching items."));
}
for(const name of ["Featured","Installed","Skills","Connections"])tabs.append(btn(name,()=>{tab=name;render()}));
search.oninput=render;body.append(search,tabs,note,rows,importBtn);card.append(head,body);panel.append(card);document.body.append(panel);
panel.onclick=e=>{if(e.target===panel)panel.classList.remove("show")};
function discover(){close();tab="Featured";search.value="";render();panel.classList.add("show")}
const settings=q("#quickSettings");if(settings)settings.onclick=()=>{close();q("#openSettings").click()}
const attach=q("#attachBtn");
if(attach)attach.onclick=()=>popMenu([
 {label:"Photos & files",sub:"Images, documents and source files",fn:()=>q("#file").click()},
 {label:"Web search",sub:"Search-enabled chat provider",on:searchOn,fn:()=>setToggle("search",!searchOn)},
 {label:"Create image",sub:"Uses your configured image provider",on:imageOn,fn:()=>setToggle("image",!imageOn)},
 {label:"Create a file",sub:"Make a document, presentation, spreadsheet or project",fn:()=>q("[data-open-create]")?.click()},
 {label:"Workspace",sub:"Plan, build and manage a project",fn:()=>q("#agentBtn").click()}
]);
const camera=mk("input");camera.type="file";camera.accept="image/*";camera.setAttribute("capture","environment");camera.hidden=true;document.body.append(camera);camera.onchange=()=>{addFiles([...camera.files]);camera.value=""};
// Test up to three configured chat-capable models, using the same provider functions and stats as chat.
const section=mk("section");section.id="kcNativeHealth";
section.append(mk("b","","Measured model health"),mk("p","","Run a short live request for up to 3 configured chat models. Tests may consume API credits. Counts above show configuration, not live availability."));
const actions=mk("div","kc-health-actions"),out=mk("output");out.setAttribute("aria-live","polite");
let controller=null;
const test=btn("Test 3 models",async()=>{
 if(controller)return;
 const tested=S.chain.filter(e=>e.on&&configured(e.p)&&!NONCHAT.test(e.m)).filter((e,i,a)=>a.findIndex(x=>x.p===e.p&&x.m===e.m)===i).slice(0,3);
 if(!tested.length){out.textContent="No configured chat models.";return}
 controller=new AbortController();test.disabled=true;stop.disabled=false;out.textContent="";
 for(const e of tested){
  if(controller.signal.aborted)break;
  const a=new AbortController(), cancel=()=>a.abort(), t=performance.now();
  controller.signal.addEventListener("abort",cancel,{once:true});const timeout=setTimeout(cancel,15000);
  const state=st(e.p,e.m);
  try{
   const res=await fetch(endpoint(e.p,"/chat/completions"),{method:"POST",headers:authHeaders(e.p),body:JSON.stringify({model:e.m,messages:[{role:"user",content:"Reply OK."}],stream:false,max_tokens:12}),signal:a.signal});
   if(!res.ok){const err=new Error("HTTP "+res.status);err.status=res.status;throw err}
   const result=await res.json();if(!result.choices?.[0]?.message?.content?.trim())throw Error("Empty or invalid response");
   const ms=Math.round(performance.now()-t);state.ok++;state.lat=state.lat?Math.round(state.lat*.7+ms*.3):ms;state.last="ok";state.cool=0;
   out.textContent+=`${e.m}: success · ${ms} ms\n`;
  }catch(err){
   if(controller.signal.aborted)break;
   state.fail++;state.last=err.name==="AbortError"?"timeout":err.message;state.cool=Date.now()+COOLDOWN_MS;
   out.textContent+=`${e.m}: ${state.last}\n`;
  }finally{clearTimeout(timeout);controller.signal.removeEventListener("abort",cancel)}
 }
 if(controller.signal.aborted)out.textContent+="Stopped.\n";
 controller=null;test.disabled=false;stop.disabled=true;save();renderRouting();
});
const stop=btn("Stop",()=>controller?.abort());stop.disabled=true;
actions.append(test,stop,btn("Research model settings",()=>go("kc-intelligence.html")));section.append(actions,out);
q("#routeSummary")?.after(section);
// Opt-in memory-only credentials for the original chat/relay and coding GitHub token.
const security=q('#settings [data-page="security"]');
if(security){
 const wrap=mk("section","kc-v28-section"), label=mk("label"), check=mk("input");check.type="checkbox";check.id="kcSessionCredentials";
 label.append(check,document.createTextNode(" Keep chat credentials only for this session"));
 const detail=mk("p","","When enabled, chat provider keys, relay tokens and Workspace GitHub tokens are omitted from future saves. You must re-enter them after reloading. This does not encrypt existing data or change connector storage.");
 check.onchange=async()=>{if(check.checked&&!confirm("Stop saving chat provider, relay and Workspace GitHub credentials? You will need to enter them again after reloading.")){check.checked=false;return}S.sessionCredentials=check.checked;await flush();};
 const refresh=()=>{check.checked=!!S.sessionCredentials};new MutationObserver(refresh).observe(q("#settings"),{attributes:true,attributeFilter:["data-page","class"]});
 wrap.append(label,detail);security.append(wrap);
}
// Keep workspace themes aligned with the selected main background without reading chat data.
const theme=()=>{try{localStorage.setItem("kc-native-workspace-theme",document.documentElement.hasAttribute("data-light")?"light":"dark")}catch(_){}};
theme();new MutationObserver(theme).observe(document.documentElement,{attributes:true,attributeFilter:["data-light","data-bg"]});
})();
