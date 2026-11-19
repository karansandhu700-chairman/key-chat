const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
 const browser=await chromium.launch({headless:true});
 for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
  const page=await browser.newPage({viewport});
  await page.route("https://**/*",route=>route.abort());
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("http://127.0.0.1:8765/",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>window.__keychat && window.__keychat.ready,{timeout:20000});
  if(await page.locator("#welcome.show").count()) await page.locator("#wGo").click();
  await page.evaluate(()=>{let x=window.__keychat.S;x.chats=[{id:"test-a",title:"Existing chat",msgs:[{role:"user",content:"hello"}],updated:Date.now()},{id:"test-b",title:"Archived chat",msgs:[],archived:true,updated:Date.now()}];x.cur="test-a";renderAll();});
  if(viewport.width<820)await page.locator("#menu").click();
  await page.locator('[data-chatmenu="test-a"]').click();
  page.once("dialog",d=>d.accept("Work"));
  await page.getByRole("button",{name:"Move to project"}).click();
  assert.ok(await page.getByText("Work",{exact:true}).isVisible());
  await page.locator('[data-chatmenu="test-a"]').click();
  await page.getByRole("button",{name:"Archive chat",exact:true}).click();
  await page.locator("#archiveView").click();
  assert.ok(await page.getByText("Existing chat",{exact:true}).isVisible());
  await page.locator('[data-chatmenu="test-a"]').click();
  await page.getByRole("button",{name:"Restore chat",exact:true}).click();
  await page.locator("#archiveView").click();
  await page.getByRole("button",{name:"Files & artifacts"}).click();
  assert.ok(await page.getByText("No saved attachments or HTML artifacts yet.").isVisible());
  assert.equal(errors.length,0,errors.join("\n"));
  console.log("PASS",viewport.width);
  await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
