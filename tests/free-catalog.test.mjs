import test from "node:test";
import assert from "node:assert/strict";
import {parseFreeCatalog,validProviderBase} from "../lib/core/free-catalog.ts";
const item=(id="fixture/model:free",extra={})=>({id,name:"Fixture",context_length:64000,architecture:{input_modalities:["text","image"],output_modalities:["text"]},pricing:{prompt:"0",completion:"0",request:"0",image:"0"},...extra});
test("only exact configured OpenRouter API base is accepted",()=>{
 assert.equal(validProviderBase("https://openrouter.ai/api/v1/"),true);
 for(const v of ["https://openrouter.ai","https://openrouter.ai/api/v1?x=1","https://example.invalid/api/v1",null,"https://openrouter.ai.example.invalid/api/v1"])assert.equal(validProviderBase(v),false);
});
test("catalog rejects nonfree aliases, changed pricing, missing pricing, unsupported modalities and unknown paid fields",()=>{
 const rows=[item(),item("fixture/paid",{pricing:{prompt:"0.001",completion:"0"}}),item("fixture/no-suffix"),item("openrouter/auto:free"),item("fixture/tool:free",{pricing:{prompt:"0",completion:"0",web_search:"0.05"}}),item("fixture/reason:free",{pricing:{prompt:"0",completion:"0",internal_reasoning:"0.01"}}),item("fixture/missing:free",{pricing:{prompt:"0"}}),item("fixture/null:free",{pricing:{prompt:"0",completion:"0",image:null}}),item("fixture/short:free",{context_length:100}),item("fixture/image:free",{architecture:{input_modalities:["image"],output_modalities:["text"]}}),item("fixture/disabled:free",{active:false}),item("fixture/model:free"),null];
 const parsed=parseFreeCatalog({data:rows});assert.equal(parsed.length,1);assert.equal(parsed[0].id,"fixture/model:free");assert.equal(parsed[0].vision,true);
});
test("bad provider data fails closed",()=>{for(const p of [null,{}, {data:"wrong"}])assert.throws(()=>parseFreeCatalog(p));});

test("expired or invalid model entries never appear in free routing",()=>{
 const now=Date.parse("2026-11-27T12:00:00Z");
 const rows=[item("fixture/current:free",{expiration_date:null}),item("fixture/future:free",{expiration_date:"2026-12-01"}),item("fixture/expired:free",{expiration_date:"2026-11-26"}),item("fixture/today:free",{expiration_date:"2026-11-27"}),item("fixture/bad:free",{expiration_date:"2026-02-30"})];
 assert.deepEqual(parseFreeCatalog({data:rows},now).map(x=>x.id),["fixture/current:free","fixture/future:free"]);
});
