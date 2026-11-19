/* Transport and evidence helpers. No persisted keys. */
(function(g){"use strict";
function https(value){const u=new URL(value);if(u.protocol!=="https:"||u.username||u.password)throw Error("Use an HTTPS URL without embedded credentials.");return u.href;}
async function post(url,key,body,signal,timeout=25000){
 const controller=new AbortController(), abort=()=>controller.abort();
 if(signal?.aborted)abort();else signal?.addEventListener("abort",abort,{once:true});
 const timer=setTimeout(abort,timeout), start=performance.now();
 try{
 const headers={"Content-Type":"application/json"};if(key)headers.Authorization="Bearer "+key;
 const r=await fetch(https(url),{method:"POST",headers,body:JSON.stringify(body),signal:controller.signal,credentials:"omit",redirect:"error",cache:"no-store"});
 if(!r.ok){const e=Error("HTTP "+r.status);e.status=r.status;throw e;}
 return {body:await r.json(),ms:Math.round(performance.now()-start)};
 }catch(e){if(e.name==="AbortError"){const x=Error(signal?.aborted?"Cancelled":"Timed out");x.cancelled=!!signal?.aborted;x.timeout=!x.cancelled;throw x;}throw e;}
 finally{clearTimeout(timer);signal?.removeEventListener("abort",abort);}
}
function status(e){return e.cancelled?"Cancelled":e.status===429?"Rate limited":[401,403].includes(e.status)?"Authentication / permission":e.status===404?"Not found":e.timeout?"Timed out":e.status>=500?"Service error":e.status?"Request rejected":"Network / CORS / invalid response";}
function retryable(e){return !e.cancelled&&(e.timeout||[408,429,500,502,503,504].includes(e.status));}
async function completion(m,messages,signal,limit=800){const r=await post(m.endpoint,m.key,{model:m.id,messages,max_tokens:limit,stream:false},signal);const text=r.body?.choices?.[0]?.message?.content;if(typeof text!=="string"||!text.trim())throw Error("No text completion returned");return {text,ms:r.ms};}
async function check(m,signal){try{const r=await completion(m,[{role:"user",content:"Reply with OK."}],signal,16);return {state:"Operational",ms:r.ms,at:Date.now()};}catch(e){return {state:status(e),ms:null,at:Date.now()};}}
function collect(results){const seen=new Set(),out=[];for(const x of results){try{const u=https(x.url);if(seen.has(u))continue;seen.add(u);const excerpt=String(x.content||"").slice(0,2400);if(!excerpt.trim())continue;out.push({id:out.length+1,url:u,title:String(x.title||u).slice(0,300),excerpt});if(out.length>=24)break;}catch(_){}}return out;}
function evidence(question,rows){return "# Research evidence: "+question+"\n\nRetrieved "+new Date().toISOString()+". Search excerpts, not independently verified full articles.\n\n"+rows.map(x=>"## ["+x.id+"] "+x.title+"\n"+x.url+"\n\n"+x.excerpt).join("\n\n");}
function cited(text,rows){const ids=[...text.matchAll(/\[(\d+)\]/g)].map(m=>Number(m[1]));return ids.length>0&&ids.every(n=>rows.some(r=>r.id===n));}
g.KCIntel={https,post,status,retryable,completion,check,collect,evidence,cited};
})(typeof globalThis!=="undefined"?globalThis:window);