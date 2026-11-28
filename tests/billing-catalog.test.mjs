import test from "node:test";
import assert from "node:assert/strict";
import {premiumCatalog} from "../lib/billing/premium.ts";
const model={id:"provider/text",context_length:64000,architecture:{input_modalities:["text"],output_modalities:["text"]},pricing:{prompt:"0.000001",completion:"0.000004"}};
test("only listed, priced text models with bounded charges enter the paid catalog",()=>{
 assert.deepEqual(premiumCatalog([model],[]),[]);
 assert.equal(premiumCatalog([model],[model.id])[0].completion,0.000004);
 for(const extra of [{active:false},{pricing:{...model.pricing,image:0.01}},{pricing:{...model.pricing,input_cache_write:0.1}},{pricing:{...model.pricing,completion:null}}])
  assert.equal(premiumCatalog([{...model,...extra}],[model.id]).length,0);
});
