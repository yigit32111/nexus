import assert from "node:assert/strict";
import {chromium,webkit,devices} from "playwright";
const base=process.env.SMOKE_URL||"http://127.0.0.1:3000";
const modes=[{name:"Chromium desktop",engine:chromium,options:{viewport:{width:1280,height:720}}},{name:"WebKit iPhone 13 emulation",engine:webkit,options:devices["iPhone 13"]},{name:"WebKit 320px",engine:webkit,options:{viewport:{width:320,height:568},isMobile:true,hasTouch:true}}];
for(const mode of modes){
 const browser=await mode.engine.launch({headless:true});
 try{
  const context=await browser.newContext(mode.options);const page=await context.newPage();const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(base+"/login",{waitUntil:"domcontentloaded"});
  const email=page.locator('input[type="email"]');const pass=page.locator('input[type="password"]');
  await email.waitFor({state:"visible"});await pass.waitFor({state:"visible"});
  assert.equal(await email.isVisible(),true);assert.equal(await pass.isVisible(),true);
  await email.fill("mobile-test@example.invalid");await pass.fill("test-only-no-submit");
  const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:window.innerWidth,input:parseFloat(getComputedStyle(document.querySelector('input[type="email"]')).fontSize)}));
  assert.ok(size.scroll<=size.width+2,mode.name+" horizontal overflow: "+JSON.stringify(size));
  assert.ok(size.input>=16,mode.name+" login input font");
  await page.getByRole("button",{name:"Kayıt ol",exact:true}).click();
  await page.getByRole("button",{name:"HESAP OLUŞTUR",exact:true}).waitFor({state:"visible"});
  await page.goto(base+"/workspace",{waitUntil:"domcontentloaded"});
  await page.locator('input[type="email"]').waitFor({state:"visible"});
  assert.equal(new URL(page.url()).pathname,"/login");
  assert.deepEqual(errors,[],mode.name+" browser errors");
  console.log("OK browser",mode.name);await context.close();
 }finally{await browser.close()}
}
