const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
 const browser=await chromium.launch({headless:true});
 for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
  const page=await browser.newPage({viewport});
  await page.route("https://**/*",route=>route.abort());
  const errors=[];page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error"&&!/Failed to load resource/.test(m.text()))errors.push(m.text())});
  await page.goto("http://127.0.0.1:8765/",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>window.__keychat?.ready&&document.querySelector("[data-open-kc=artifacts]"),{timeout:20000});
  if(await page.locator("#welcome.show").count()) await page.locator("#wGo").click();
  await page.evaluate(()=>{let x=window.__keychat.S;x.chats=[{id:"test-a",title:"Existing chat",msgs:[{role:"user",content:"hello"},{role:"assistant",content:"\`\`\`html\n<!doctype html><title>Launch board</title><h1>Ready</h1>\n\`\`\`"}],updated:Date.now()},{id:"test-b",title:"Archived chat",msgs:[],archived:true,updated:Date.now()}];x.cur="test-a";renderAll();});
  if(viewport.width<820)await page.locator("#menu").click();
  await page.locator('[data-chatmenu="test-a"]').click();page.once("dialog",d=>d.accept("Work"));await page.getByRole("button",{name:"Move to project"}).click();
  assert.ok(await page.getByText("Work",{exact:true}).isVisible());
  await page.locator('[data-chatmenu="test-a"]').click();await page.getByRole("button",{name:"Archive chat",exact:true}).click();await page.locator("#archiveView").click();
  assert.ok(await page.getByText("Existing chat",{exact:true}).isVisible());
  await page.locator('[data-chatmenu="test-a"]').click();await page.getByRole("button",{name:"Restore chat",exact:true}).click();await page.locator("#archiveView").click();
  if(viewport.width<820 && await page.locator("#scrim").isVisible()) await page.locator("#scrim").click();
  assert.equal(await page.getByText("Incognito",{exact:true}).count(),0);
  for(const action of ["media","artifacts","connectors","sync"])assert.equal(await page.locator('[data-open-kc="'+action+'"]').count(),1);
  await page.locator('[data-open-kc="artifacts"]').click();await page.waitForTimeout(150);assert.ok(await page.locator("#kcArtifactList summary").filter({hasText:"Launch board"}).isVisible());
  await page.locator('[data-kc-tab="connectors"]').click();assert.ok(await page.getByRole("heading",{name:"Tools & connectors"}).isVisible());
  await page.locator('[data-kc-tab="sync"]').click();assert.ok(await page.getByText("model API keys are excluded",{exact:false}).isVisible());
  await page.locator("#kcClose").click();
  assert.equal(await page.locator("[data-open-create]").count(),1);
  await page.locator("[data-open-create]").click();
  assert.ok(await page.getByText("Create a file",{exact:true}).isVisible());
  assert.equal(await page.locator("#kcTypeList [data-type]").count(),7);
  const signatures=await page.evaluate(async()=>{
    const out={};
    for(const t of KeyChatCreate.types){const b=await KeyChatCreate.build(t,"Verified file","alpha,beta\n1,2");out[t]=Array.from(b.slice(0,8))}
    return out;
  });
  assert.deepEqual(signatures.pdf.slice(0,4),[37,80,68,70]);
  assert.deepEqual(signatures.html.slice(0,4),[60,33,100,111]);
  for(const t of ["docx","pptx","xlsx","zip"]) assert.deepEqual(signatures[t].slice(0,4),[80,75,3,4]);
  assert.deepEqual(signatures.png.slice(0,8),[137,80,78,71,13,10,26,10]);
  await page.locator("#kcCreateClose").click();
  assert.equal(errors.length,0,errors.join("\n"));
  console.log("PASS",viewport.width,"advanced features and project lifecycle");
  await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});