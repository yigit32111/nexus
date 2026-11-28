import test from "node:test";
import assert from "node:assert/strict";
import {FREE_MODELS,PRO_MODELS,PRO_OFFER,modelPriority,accountPlan,canReservePro} from "../lib/core/plans.ts";
import {chooseModel} from "../lib/core/model-policy.ts";
const mk=(id,extra={})=>({id,context:128000,vision:false,prompt:0,completion:0,request:0,image:0,supported:[],...extra});
test("Auto 3 priorities by task, with catalog capability checks",()=>{
 const models=Object.values(FREE_MODELS).map(id=>mk(id,{vision:[FREE_MODELS.vision,FREE_MODELS.fallback].includes(id)}));
 for(const [q,images,id] of [["Merhaba",0,FREE_MODELS.chat],["python kod",0,FREE_MODELS.code],["matematik analiz",0,FREE_MODELS.reasoning],["fotoğraf",1,FREE_MODELS.vision]])assert.equal(chooseModel(models,"auto","",q,images,100).id,id);
 assert.equal(chooseModel(models.filter(m=>m.id!==FREE_MODELS.vision),"auto","","görsel",1,100).id,FREE_MODELS.fallback);
});
test("Auto never selects a priority model if it is paid",()=>{
 assert.equal(chooseModel([mk(FREE_MODELS.chat,{request:.1}),mk(FREE_MODELS.fallback)],"auto","","merhaba",0,100).id,FREE_MODELS.fallback);
});
test("Auto may prefer the 2026 model only when the free catalog lists it",()=>{
 const fresh = mk(FREE_MODELS.recentCode);
 const standard = mk(FREE_MODELS.chat);
 assert.equal(chooseModel([fresh, standard],"auto","","2026 hakkında bilgi",0,100).id, fresh.id);
 assert.equal(chooseModel([standard],"auto","","2026 hakkında bilgi",0,100).id, standard.id);
 assert.equal(chooseModel([{...fresh,prompt:0.001},standard],"auto","","2026 hakkında bilgi",0,100).id, standard.id);
});
test("planned Pro limit is shared and rejects invalid amounts",()=>{
 assert.equal(PRO_MODELS.length,2);assert.equal(PRO_OFFER.monthlyBudgetMicrousd,5_000_000);
 assert.equal(canReservePro(2_000_000,2_000_000,1_000_000),true);
 for(const n of [-1,NaN,Infinity,1.5,1_000_001])assert.equal(canReservePro(2_000_000,2_000_000,n),false);
});
test("plan metadata is fail closed for unexpected values",()=>{
 for(const v of [undefined,null,{}, {plan:"PRO"}, {plan:true}])assert.equal(accountPlan(v),"free");
 assert.equal(accountPlan({plan:"pro"}),"pro");
});
