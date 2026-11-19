/* Key Chat v28 — uses the existing app's settings and skills store. */
(() => {
  "use strict";
  const q=(s,r=document)=>r.querySelector(s);
  const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
  const logo=make("img","kc-v28-locklogo");logo.src="monogram.png";logo.alt="Key Chat";
  const lock=q("#lkTitle");if(lock&&!q(".kc-v28-locklogo"))lock.before(logo);
  const directory=[
    ["writing","Writing assistant","Draft, revise and polish text.","Help the user draft and revise text. Match requested audience, tone and format. Preserve facts; mark missing details."],
    ["coding","Code assistant","Debug, explain and review code.","Review code carefully, explain root causes, suggest minimal safe changes and tests. Never claim execution, deployment or external access without evidence."],
    ["analysis","Data analyst","Explore data and explain findings.","Identify assumptions, verify calculations, explain limitations and provide reproducible analysis. Do not invent data."],
    ["research","Research planner","Organize questions and evidence.","Distinguish evidence, assumptions and open questions. Cite only sources actually available; do not claim external browsing if unavailable."]
  ];
  const page=q('#settings [data-page="plugins"]'), list=q("#plugList");
  if(page&&list&&typeof plugs==="function"&&typeof save==="function"){
    const section=make("section","kc-v28-section");
    section.append(make("h3",null,"Explore skills"),make("p",null,"Optional instructions for your AI. Enable only the skills you need. These do not connect external services."));
    const rows=make("div");section.append(rows);page.append(section);
    function renderDirectory(){
      rows.replaceChildren();
      const query=(q("#plugQ")?.value||"").trim().toLowerCase();
      for(const [slug,name,desc,instruction] of directory){
        if(query&&!`${name} ${desc}`.toLowerCase().includes(query))continue;
        const id="kc-v28-"+slug, pkg=id, p=plugs().find(x=>x.id===id), on=!!p?.on;
        const row=make("div","kc-v28-skill"), info=make("div"), btn=make("button",null,on?"Enabled":"Enable");
        info.append(make("b",null,name),make("small",null,desc));
        btn.type="button";btn.setAttribute("aria-pressed",String(on));
        btn.onclick=()=>{
          const existing=plugs().find(x=>x.id===id);
          if(existing)existing.on=!existing.on;
          else plugs().push({id,pkg,name,on:true,files:{[pkg+"/SKILL.md"]:instruction}});
          try{save();window.__chief?.render?.();renderDirectory();}catch(e){if(typeof toast==="function")toast("Could not save skill: "+e.message);}
        };
        row.append(info,btn);rows.append(row);
      }
      if(!rows.children.length)rows.append(make("p",null,"No matching built-in skills."));
    }
    q("#plugQ")?.addEventListener("input",renderDirectory);
    new MutationObserver(renderDirectory).observe(list,{childList:true,subtree:true});
    renderDirectory();
  }
  const prompt=q("#sysPrompt");
  if(prompt){
    const section=make("section","kc-v28-section"), choices=make("div","kc-v28-presets"), status=make("p",null,"Choose a style to add it to your existing instructions.");
    section.append(make("h3",null,"Response style"),choices,status);prompt.before(section);
    const styles=[
      ["Default",""],["Concise","Be concise and prioritize the answer."],
      ["Professional","Use a clear, professional tone."],
      ["Friendly","Use a warm, conversational tone."],
      ["Creative","Offer imaginative ideas while staying accurate."]
    ];
    const marker="Key Chat response style: ";
    function update(){
      const line=prompt.value.split("\n").find(s=>s.startsWith(marker))||"";
      for(const b of choices.children)b.setAttribute("aria-pressed",String(line===b.dataset.style||(!line&&!b.dataset.style)));
    }
    for(const [name,value] of styles){
      const b=make("button",null,name);b.type="button";b.dataset.style=value?marker+value:"";
      b.onclick=()=>{
        let parts=prompt.value.split("\n").filter(s=>!styles.some(([,v])=>v&&s===marker+v));
        if(value){
          if(parts.length&&parts[parts.length-1]!=="")parts.push("");
          parts.push(marker+value);
        }
        prompt.value=parts.join("\n").trim();
        prompt.dispatchEvent(new Event("change",{bubbles:true}));
        status.textContent="Response style saved in your instructions.";
        update();
      };choices.append(b);
    }
    prompt.addEventListener("input",update);
    const settings=q("#settings");
    if(settings)new MutationObserver(update).observe(settings,{attributes:true,attributeFilter:["data-page","class"]});
    update();
  }
})();
