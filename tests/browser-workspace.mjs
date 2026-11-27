import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.SMOKE_URL || "http://127.0.0.1:3001";
const html = await readFile(".next/server/app/workspace.html", "utf8");
const browser = await chromium.launch();
try {
  const context = await browser.newContext();
  const user = { id: "00000000-0000-4000-8000-000000000001", aud: "authenticated", role: "authenticated" };
  const session = { access_token: "fixture-token", refresh_token: "fixture-refresh", expires_at: Math.floor(Date.now() / 1000) + 3600, user };
  await context.addCookies([{ name: "sb-example-auth-token", value: "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url"), url: base }]);
  const page = await context.newPage();
  // Render the production client bundle with a fake session. The HTTP smoke suite tests the real middleware separately.
  await page.route(base + "/workspace", route => route.fulfill({ contentType: "text/html", body: html }));
  await page.route("https://example.supabase.co/**", route => route.fulfill({
    headers: { "access-control-allow-origin": "*" },
    json: route.request().url().includes("/auth/v1/user") ? user : [],
  }));

  const prompts = [];
  await page.route(base + "/api/chat", route => {
    const request = route.request().postDataJSON();
    prompts.push(request);
    return route.fulfill({ json: {
      model: request.excludeModel ? "fixture/second" : "fixture/first",
      reply: "Örnek yanıt " + prompts.length,
    } });
  });

  await page.goto(base + "/workspace");
  await page.getByRole("button", { name: "Multi-AI" }).click();
  await page.getByLabel("Karşılaştırma sorusu").fill("Örnek konu");
  await page.getByRole("button", { name: "İlk modeli çalıştır" }).click();
  await page.getByRole("heading", { name: "fixture/first" }).waitFor();
  await page.getByRole("button", { name: "İkinci modeli çalıştır" }).click();
  await page.getByRole("heading", { name: "fixture/second" }).waitFor();
  assert.equal(prompts[0].messages[0].content, prompts[1].messages[0].content);
  assert.equal(prompts[1].excludeModel, "fixture/first");
  assert.equal(prompts[1].preferences.memoryMode, "off");
  await page.getByRole("button", { name: "Karşılaştırmalı özet oluştur" }).click();
  await page.getByRole("button", { name: "Özeti dosyaya aktar" }).click();
  assert.equal(await page.getByLabel("Dosya içeriği").inputValue(), "Örnek yanıt 3");

  await page.getByRole("button", { name: "Agent Mode" }).click();
  await page.getByLabel("Yazı konusu").fill("Bahçe");
  await page.getByRole("button", { name: "Plan oluştur" }).click();
  await page.getByRole("heading", { name: "Yazı planı" }).waitFor();
  assert.equal(prompts.length, 4);
  await page.getByRole("button", { name: "Planı onayla ve taslağı yaz" }).click();
  await page.getByRole("heading", { name: "Yazı taslağı" }).waitFor();
  assert.match(prompts[4].messages[0].content, /Örnek yanıt 4/);

  await page.getByRole("button", { name: "Code Lab" }).click();
  await page.getByLabel("Sayısal kod").fill("print(6*7)");
  await page.getByRole("button", { name: "Çalıştır", exact: true }).click();
  assert.equal(await page.locator("pre[aria-live]").textContent(), "42");
  console.log("OK workspace browser: comparison, synthesis, artifact transfer, agent approval, Code Lab");

  const home = await readFile(".next/server/app/index.html", "utf8");
  await page.route(base + "/", route => route.fulfill({contentType:"text/html",body:home}));
  const chats = ["visible", "archived"].map((id, index) => ({
    id, title:id, archived: Boolean(index), updated_at:new Date().toISOString(),
    messages:[{id,role:"user",content:"fixture-" + id,createdAt:1}],
  }));
  await page.route("**/rest/v1/nexus_chats*", route => route.fulfill({
    json: route.request().method() === "GET" ? chats : [],
  }));
  await page.route(base + "/api/status", route => route.fulfill({json:{model:"auto",provider:"OPENROUTER",configured:true,accountId:user.id,plan:"free",premiumEnabled:false}}));
  let releaseStatus;
  const statusGate=new Promise(resolve=>{releaseStatus=resolve});
  await page.unroute(base + "/api/status");
  await page.route(base + "/api/status",async route=>{
    await statusGate;
    await route.fulfill({json:{model:"auto",provider:"OPENROUTER",configured:true,accountId:user.id,plan:"free",premiumEnabled:false}});
  });
  await page.goto(base + "/");
  try {
    await page.locator(".nexus-splash img").waitFor({state:"visible"});
    await page.getByText("5.0 RC1",{exact:true}).waitFor();
    assert.equal(await page.locator(".nexus-splash img").getAttribute("src"),"/icon.svg");
    console.log("OK branded loading state");
  } finally { releaseStatus(); }
  await page.getByText("fixture-visible", {exact:true}).waitFor();
  assert.equal(await page.getByTitle("Görsel üretim modunu aç/kapat").count(),0);
  assert.ok(await page.locator('input[type="file"]').count()>0);
  console.log("OK image generation UI removed; file input retained");
  page.once("dialog", dialog => dialog.accept());
  await page.getByTitle("Sil", {exact:true}).click();
  await page.getByText("fixture-visible", {exact:true}).waitFor({state:"detached"});
  assert.equal(await page.getByText("fixture-archived",{exact:true}).count(),0);
  await page.locator(".chat-select").filter({hasText:"Yeni sohbet"}).waitFor();
  await page.getByRole("heading",{name:"Merhaba! Bugün ne üzerinde çalışalım?",exact:true}).waitFor();
  await page.locator(".nexus-welcome-logo img").waitFor({state:"visible"});
  assert.equal(await page.getByRole("button",{name:/Görsel üret/}).count(),0);
  await page.getByRole("button",{name:/Fikir geliştir/}).waitFor();
  console.log("OK warm new-chat welcome and supported starters");
  await page.getByTitle("Ayarlar",{exact:true}).click();
  await page.getByRole("button",{name:"Lavanta",exact:true}).click();
  await page.getByRole("button",{name:"Kompakt",exact:true}).click();
  await page.getByLabel("Azaltılmış animasyon").check();
  await page.waitForFunction(()=>document.querySelector(".nexus-app")?.getAttribute("data-accent")==="lavender"&&document.querySelector(".nexus-app")?.getAttribute("data-density")==="compact"&&document.querySelector(".nexus-app")?.getAttribute("data-motion")==="reduced");
  await page.getByRole("button",{name:"Ayarları kapat"}).click();
  assert.equal(await page.locator(".nexus-app").evaluate(el=>getComputedStyle(el).getPropertyValue("--accent").trim()),"#c7b5ff");
  await page.getByTitle("Model seç",{exact:true}).click();
  await page.getByRole("region",{name:"Model seçimi"}).waitFor();
  assert.equal(await page.locator(".model-option").filter({has:page.getByText("NEXUS Auto",{exact:true})}).count(),1);
  await page.getByLabel("Model ara",{exact:true}).press("Escape");
  await page.getByRole("region",{name:"Model seçimi"}).waitFor({state:"detached"});
  assert.equal(await page.getByTitle("Model seç",{exact:true}).getAttribute("aria-expanded"),"false");
  const viewport=page.viewportSize();
  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});
    await page.getByTitle("Model seç",{exact:true}).click();
    await page.getByRole("region",{name:"Model seçimi"}).waitFor();
    const pop=await page.locator(".model-popover").boundingBox();
    assert.ok(pop&&pop.x>=0&&pop.x+pop.width<=width+1,"model picker fits narrow viewport");
    await page.getByLabel("Model ara",{exact:true}).press("Escape");
    await page.getByLabel("NEXUS’a mesaj yaz").fill("Deneme metni");
    const send=await page.getByTitle("Gönder",{exact:true}).boundingBox();
    assert.ok(send&&send.x>=0&&send.x+send.width<=width+1,"send button fits narrow viewport");
    assert.equal(await page.getByTitle("Ayarlar",{exact:true}).isVisible(),true);
  }
  await page.setViewportSize(viewport);
  await page.getByLabel("NEXUS’a mesaj yaz").fill("");
  console.log("OK 5.2 appearance controls, keyboard model picker and 390/320px chat layout");

  await page.evaluate(() => {
    window.SpeechRecognition=class {
      start(){ window.testRecognizer=this;this.onstart?.(); }
      stop(){ this.onend?.(); }
      abort(){ this.onend?.(); }
    };
  });
  await page.getByTitle("Sesle yaz",{exact:true}).click();
  await page.evaluate(()=>window.testRecognizer.onresult({results:[[{transcript:"Merhaba"}],[{transcript:"Nexus"}]]}));
  await page.waitForFunction(() => document.querySelector(".composer-box textarea")?.value === "Merhaba Nexus", undefined, {timeout:5000});
  await page.getByTitle("Kaydı durdur",{exact:true}).click();
  await page.getByTitle("NEXUS Live — Tam ekran eller serbest sesli sohbet").click();
  await page.getByRole("button",{name:"Mikrofonu aç",exact:true}).click();
  await page.getByText("Dinliyor…",{exact:true}).waitFor();
  await page.evaluate(()=>window.testRecognizer.onerror({error:"not-allowed"}));
  await page.getByText(/Mikrofon veya konuşma tanıma izni verilmedi/).waitFor();
  await page.getByTitle("Canlı sohbeti bitir").click();
  console.log("OK browser voice controls with simulated speech and permission failure");
  console.log("OK deleting the last visible chat opens a fresh conversation");
  await page.getByTitle("Ayarlar",{exact:true}).click();
  await page.getByRole("button",{name:"Hesap ve veri"}).click();
  await page.getByText("Planlanan ortak API bütçesi",{exact:true}).waitFor();
  assert.equal(await page.getByText("5 USD / ay",{exact:true}).count(),1);
  assert.equal(await page.getByText("399 TL / ay",{exact:true}).count(),1);
  await page.getByText("Premium model erişimi",{exact:true}).waitFor();
  await page.getByText("Kapalı",{exact:true}).waitFor();
  await page.getByText("Free erişimi. Ücretli modeller ve ödeme kapalıdır.",{exact:true}).waitFor();
  assert.equal(await page.getByText("GPT-5.6 Luna",{exact:true}).count(),0);
  assert.equal(await page.getByText("Claude Haiku 5.5",{exact:true}).count(),0);
  console.log("OK free account: no owner-only premium controls");
  await page.getByRole("button",{name:"Üyelik ve ödeme önizlemesi"}).click();
  await page.getByRole("heading",{name:"Üyelik planları"}).waitFor();
  assert.equal(new URL(page.url()).pathname,"/plans");
  console.log("OK planned subscription UI: premium access remains disabled");

  const beforeOwner=prompts.length;
  // Fresh client session render; status responses are fixtures, not production authentication.
  await page.unroute(base + "/api/status");
  await page.route(base + "/api/status", route=>route.fulfill({json:{
    model:"auto",provider:"OPENROUTER",configured:true,accountId:user.id,
    plan:"pro",isAdmin:true,premiumEnabled:false,paymentsEnabled:false
  }}));
  await page.goto(base+"/");
  await page.getByTitle("Ayarlar",{exact:true}).click();
  await page.getByRole("button",{name:"Hesap ve veri"}).click();
  await page.getByText("Pro · Yönetici önizlemesi",{exact:true}).waitFor();
  for(const name of ["GPT-5.6 Luna","Claude Haiku 5.5"]){
    const row=page.locator(".system-info-row").filter({has:page.getByText(name,{exact:true})});
    assert.equal(await row.getByRole("button",{name:"Kilitli",exact:true}).isDisabled(),true);
  }
  assert.equal(prompts.length,beforeOwner);
  console.log("OK owner Pro preview: both model placeholders disabled, no chat request");

} finally {
  await browser.close();
}
