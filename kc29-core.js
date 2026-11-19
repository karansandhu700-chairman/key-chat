/* Key Chat v29: local file engine. No network requests. */
(function(g){
"use strict";
const enc=new TextEncoder(), dec=new TextDecoder(), bytes=x=>typeof x==="string"?enc.encode(x):x;
const MAX=32*1024*1024;
const table=Uint32Array.from({length:256},(_,i)=>{for(let j=0;j<8;j++)i=i&1?0xedb88320^(i>>>1):i>>>1;return i>>>0});
function crc(a){let c=0xffffffff;for(const n of a)c=table[(c^n)&255]^(c>>>8);return (c^0xffffffff)>>>0}
function hdr(n){return new Uint8Array(n)}
function put(a,o,n,b=4){let d=new DataView(a.buffer,a.byteOffset,a.byteLength);b===2?d.setUint16(o,n,true):d.setUint32(o,n,true)}
function read(a,o,b=4){if(o<0||o+b>a.length)throw Error("Invalid ZIP structure");let d=new DataView(a.buffer,a.byteOffset,a.byteLength);return b===2?d.getUint16(o,true):d.getUint32(o,true)}
function concat(list){let sz=list.reduce((s,a)=>s+a.length,0),out=new Uint8Array(sz),o=0;for(const a of list){out.set(a,o);o+=a.length}return out}
function path(name){if(typeof name!=="string"||!name||name.length>240||/[\x00-\x1f\\:]/.test(name)||name.startsWith("/")||name.split("/").some(p=>!p||p==="."||p===".."))throw Error("Unsafe file path: "+name);return name}
function zip(entries){const chunks=[],central=[],seen=new Set();let offset=0,total=0, count=0;
 for(const [name,value] of Object.entries(entries)){path(name);if(seen.has(name))throw Error("Duplicate filename");seen.add(name);
 const b=bytes(value),n=bytes(name),c=crc(b);total+=b.length;if(total>MAX||++count>2000)throw Error("Archive exceeds 32 MB or 2000 files.");
 const h=hdr(30);put(h,0,0x04034b50);put(h,4,20,2);put(h,6,0x800,2);put(h,12,33,2);put(h,14,c);put(h,18,b.length);put(h,22,b.length);put(h,26,n.length,2);
 const e=hdr(46);put(e,0,0x02014b50);put(e,4,20,2);put(e,6,20,2);put(e,8,0x800,2);put(e,14,33,2);put(e,16,c);put(e,20,b.length);put(e,24,b.length);put(e,28,n.length,2);put(e,42,offset);
 chunks.push(h,n,b);central.push(e,n);offset+=30+n.length+b.length}
 const cd=concat(central),end=hdr(22);put(end,0,0x06054b50);put(end,8,count,2);put(end,10,count,2);put(end,12,cd.length);put(end,16,offset);return concat([...chunks,cd,end])}
async function unzip(a){if(a.length>MAX+1024*1024)throw Error("ZIP too large");let e=-1;for(let i=a.length-22;i>=Math.max(0,a.length-65557);i--)if(read(a,i)===0x06054b50&&i+22+read(a,i+20,2)===a.length){e=i;break}
 if(e<0||read(a,e+4,2)||read(a,e+6,2)||read(a,e+8,2)!==read(a,e+10,2))throw Error("Unsupported multi-disk or invalid ZIP");
 const count=read(a,e+10,2),start=read(a,e+16),end=start+read(a,e+12);if(count>2000||end>e)throw Error("Invalid ZIP directory");let at=start,total=0,out=Object.create(null);
 for(let i=0;i<count;i++){if(at+46>end||read(a,at)!==0x02014b50)throw Error("Invalid ZIP entry");const flags=read(a,at+8,2),method=read(a,at+10,2),expected=read(a,at+16),cs=read(a,at+20),sz=read(a,at+24),nl=read(a,at+28,2),xl=read(a,at+30,2),cl=read(a,at+32,2),lo=read(a,at+42);if(at+46+nl+xl+cl>end)throw Error("Invalid entry length");
 const name=dec.decode(a.slice(at+46,at+46+nl));at+=46+nl+xl+cl;if(name.endsWith("/")){path(name.slice(0,-1));continue}path(name);if(Object.hasOwn(out,name)||flags&1||![0,8].includes(method)||sz>MAX||total+sz>MAX)throw Error("Unsupported, duplicate, encrypted or oversized ZIP member");
 if(read(a,lo)!==0x04034b50)throw Error("Invalid local ZIP header");const off=lo+30+read(a,lo+26,2)+read(a,lo+28,2);if(off+cs>start)throw Error("Invalid ZIP data range");let v=a.slice(off,off+cs);
 if(method===8){let stream=new Blob([v]).stream().pipeThrough(new DecompressionStream("deflate-raw")),reader=stream.getReader(),parts=[],len=0;try{while(true){let {done,value}=await reader.read();if(done)break;len+=value.length;if(len>sz||total+len>MAX)throw Error("ZIP expansion limit exceeded");parts.push(value)}}finally{await reader.cancel().catch(()=>{})}v=concat(parts)}
 if(v.length!==sz||crc(v)!==expected)throw Error("Corrupted ZIP: "+name);out[name]=v;total+=sz
 }return out}
const xml=s=>String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g,"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[x]));
const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const template=type=>Object.fromEntries(Object.entries(g.KC29_TEMPLATES[type]).map(([n,v])=>[n,b64(v)]));
const get=(a,n)=>dec.decode(a[n]);
const set=(a,n,v)=>a[n]=bytes(v);
function docx(title,text){let a=template("docx"),n="word/document.xml";let body=get(a,n).replace("KC_TITLE",()=>xml(title));body=body.replace(/<w:p><w:r><w:t>KC_BODY<\/w:t><\/w:r><\/w:p>/,()=>text.split(/\r?\n/).map(line=>`<w:p><w:r><w:t xml:space="preserve">${xml(line)}</w:t></w:r></w:p>`).join(""));if(body.includes("<w:t>KC_BODY</w:t>"))throw Error("Word template mismatch");set(a,n,body);return zip(a)}
function col(i){let s="";for(i++;i;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s}
function csv(rows){if(!Array.isArray(rows)||rows.some(r=>!Array.isArray(r)))throw Error("Use JSON rows, such as [[\"Item\",\"Price\"],[\"Book\",15]].");return rows}
function xlsx(rows){csv(rows);if(rows.length>10000||rows.some(r=>r.length>256)||rows.reduce((s,r)=>s+r.length,0)>100000)throw Error("Excel export limit is 10,000 rows, 256 columns, 100,000 cells.");
 let a=template("xlsx"),n="xl/worksheets/sheet1.xml",s=get(a,n),data=rows.map((row,i)=>`<row r="${i+1}">${row.map((v,j)=>{let p=col(j)+(i+1);
 if(v===null||v===undefined)return "";
 if(typeof v==="number"&&Number.isFinite(v))return `<c r="${p}" t="n"><v>${v}</v></c>`;
 if(typeof v==="boolean")return `<c r="${p}" t="b"><v>${Number(v)}</v></c>`;
 if(typeof v==="object"&&typeof v.formula==="string"){let f=v.formula.replace(/^=/,"");if(!/^(?:(?:SUM|AVERAGE|MIN|MAX|COUNT|ROUND)\([A-Z0-9:.,+\-*/ ()]+\)|[A-Z0-9.,+\-*/ ()^%]+)$/i.test(f)||/[\[\]!]/.test(f))throw Error("Only basic local Excel formulas are supported");return `<c r="${p}"><f>${xml(f)}</f><v></v></c>`}
 if(typeof v==="object")throw Error("Unsupported cell object");if(String(v).length>32767)throw Error("Excel cell exceeds 32767 characters.");return `<c r="${p}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`}).join("")}</row>`).join("");
 let last=col(Math.max(0,...rows.map(r=>r.length-1)))+Math.max(1,rows.length);s=s.replace(/<dimension ref="[^"]*"\s*\/>/,`<dimension ref="A1:${last}"/>`).replace(/<sheetData>[\s\S]*?<\/sheetData>/,()=>`<sheetData>${data}</sheetData>`);set(a,n,s);return zip(a)}
function wrap(t,max){let lines=[];for(let original of String(t).split(/\r?\n/)){let line="";for(const word of original.split(/(\s+)/)){if(Array.from(line+word).length<=max){line+=word;continue}if(line.trim())lines.push(line.trimEnd());line="";let chars=Array.from(word.trimStart());while(chars.length>max)lines.push(chars.splice(0,max).join(""));line=chars.join("")}lines.push(line)}return lines}
function pptx(title,text){let a=template("pptx"),s=get(a,"ppt/slides/slide1.xml"),rel=get(a,"ppt/slides/_rels/slide1.xml.rels"),p=get(a,"ppt/presentation.xml"),pr=get(a,"ppt/_rels/presentation.xml.rels"),ct=get(a,"[Content_Types].xml");if(wrap(title,45).length>2)throw Error("Presentation title is too long; use a shorter title.");let lines=wrap(text,55),pages=[];for(let i=0;i<lines.length;i+=10)pages.push(lines.slice(i,i+10));if(!pages.length)pages=[[""]];if(pages.length>100)throw Error("Presentation exceeds 100 slides.");
 let ids=[],rels=[],types=[];pages.forEach((page,i)=>{let k=i+1,rid="rIdKC"+k;
 let slide=s.replace("KC_TITLE",()=>xml(wrap(title,45).slice(0,2).join(" "))).replace("KC_PAGE",()=>String(k)+" / "+pages.length);
 slide=slide.replace(/<a:t>KC_BODY<\/a:t>/,()=>`<a:t>${page.map(xml).join("</a:t></a:r><a:br/><a:r><a:t>")}</a:t>`);
 // Preserve the original run style for each inserted line.
 let base=s.match(/<a:r>(<a:rPr(?:(?!<\/a:rPr>)[\s\S])*<\/a:rPr>)<a:t>KC_BODY<\/a:t><\/a:r>/);
 if(base)slide=slide.replace(/<a:br\/><a:r><a:t>/g,()=>`<a:br/><a:r>${base[1]}<a:t>`);
 set(a,`ppt/slides/slide${k}.xml`,slide);set(a,`ppt/slides/_rels/slide${k}.xml.rels`,rel);
 ids.push(`<p:sldId id="${255+k}" r:id="${rid}"/>`);rels.push(`<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${k}.xml"/>`);
 types.push(`<Override PartName="/ppt/slides/slide${k}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`)});
 p=p.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/,()=>`<p:sldIdLst>${ids.join("")}</p:sldIdLst>`);pr=pr.replace(/<Relationship\b[^>]*Type="[^"]*\/slide"[^>]*\/>/g,"").replace("</Relationships>",rels.join("")+"</Relationships>");ct=ct.replace(/<Override\b[^>]*PartName="\/ppt\/slides\/slide\d+\.xml"[^>]*\/>/g,"").replace("</Types>",types.join("")+"</Types>");set(a,"ppt/presentation.xml",p);set(a,"ppt/_rels/presentation.xml.rels",pr);set(a,"[Content_Types].xml",ct);return zip(a)}
function csvText(rows){return csv(rows).map(row=>row.map(v=>{let t=typeof v==="object"&&v!==null?JSON.stringify(v):String(v??"");if(typeof v==="string"&&/^[\s]*[=+\-@\t\r]/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"'}).join(",")).join("\r\n")}
function cleanName(s){return String(s).normalize("NFKC").replace(/[\\/:*?"<>|\x00-\x1f]/g,"-").trim().slice(0,100)||"key-chat"}
g.KC29={zip,unzip,docx,xlsx,pptx,csvText,cleanName,path,bytes,dec,concat,xml,wrap,MAX};
})(globalThis);
