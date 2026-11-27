// Public model metadata only: no auth header, inference, API keys, or account reads.
import assert from "node:assert/strict";
import {parseFreeCatalog} from "../lib/core/free-catalog.ts";
import {chooseModel} from "../lib/core/model-policy.ts";
import {FREE_MODELS} from "../lib/core/plans.ts";
const response=await fetch("https://openrouter.ai/api/v1/models",{
 headers:{Accept:"application/json"},redirect:"error",signal:AbortSignal.timeout(20000)
});
assert.equal(response.status,200,"Public provider catalog unavailable");
const catalog=parseFreeCatalog(await response.json());
const text=chooseModel(catalog,"auto","","Merhaba",0,1024);
const vision=chooseModel(catalog,"auto","","Görseli açıkla",1,10240);
assert.ok(text,"No eligible zero-priced text model");
assert.ok(vision?.vision,"No eligible zero-priced vision model");
console.log(JSON.stringify({check:"public-free-catalog",eligible:catalog.length,visionEligible:catalog.filter(x=>x.vision).length,textRoute:text.id,visionRoute:vision.id,preferredAvailable:Object.fromEntries(Object.entries(FREE_MODELS).map(([role,id])=>[role,catalog.some(m=>m.id===id)])),inferenceCalls:0,credentialsUsed:false}));
