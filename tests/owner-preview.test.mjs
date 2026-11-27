import test from "node:test";
import assert from "node:assert/strict";
import {ownerPreviewPlan,BILLING_RELEASE,PRO_MODELS} from "../lib/core/plans.ts";
import {parseFreeCatalog} from "../lib/core/free-catalog.ts";
test("owner preview requires verified admin boolean, not account metadata or client values",()=>{
 assert.equal(ownerPreviewPlan(true),"pro");
 for(const v of [false,undefined,null,1,"true","pro",{plan:"pro"},{isAdmin:true}])assert.equal(ownerPreviewPlan(v),"free");
 assert.equal(BILLING_RELEASE.premiumEnabled,false);
 assert.equal(BILLING_RELEASE.paymentsEnabled,false);
});
test("owner preview models remain ineligible for inference",()=>{
 const data=PRO_MODELS.map(id=>({id,context_length:128000,architecture:{input_modalities:["text"],output_modalities:["text"]},pricing:{prompt:"0.001",completion:"0.001"}}));
 assert.deepEqual(parseFreeCatalog({data}),[]);
});
