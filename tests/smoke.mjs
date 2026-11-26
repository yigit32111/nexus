import assert from "node:assert/strict";
const base=process.env.SMOKE_URL||"http://127.0.0.1:3000";
async function wait(){for(let i=0;i<40;i++){try{const r=await fetch(base+"/login",{signal:AbortSignal.timeout(1000)});if(r.ok)return}catch{}await new Promise(r=>setTimeout(r,500))}throw Error("server not ready")}
await wait();
for(const path of ["/login","/manifest.webmanifest","/icon.svg"]){const r=await fetch(base+path,{redirect:"manual"});assert.equal(r.status,200,path);assert.equal(r.headers.get("x-content-type-options"),"nosniff",path);console.log("OK public",path)}
for(const path of ["/","/workspace","/admin"]){const r=await fetch(base+path,{redirect:"manual"});assert.ok([302,303,307,308,401,404].includes(r.status),path+" returned "+r.status);console.log("OK protected",path)}
for(const path of ["/api/chat","/api/image","/api/artifacts","/api/research","/api/share","/api/gems/docs"]){const r=await fetch(base+path,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}",redirect:"manual"});assert.equal(r.status,401,path);console.log("OK unauthorized API",path)}
for(const path of ["/api/status","/api/models","/api/gems/docs"]){const r=await fetch(base+path,{method:path.endsWith("/docs")?"DELETE":"GET",redirect:"manual"});assert.equal(r.status,401,path);console.log("OK unauthorized API",path)}

for (const [path, body] of [
  ["/api/chat", { comparison: true, excludeModel: "example/free", model: "auto", messages: [{ role: "user", content: "Örnek" }] }],
  ["/api/research", { query: "Örnek", scope: "academic" }],
]) {
  const response = await fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    redirect: "manual",
  });
  assert.equal(response.status, 401, path);
  console.log("OK 4.0 authenticated-only operation", path);
}
