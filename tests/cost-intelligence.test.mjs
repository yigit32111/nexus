import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {utcUsageWindow,summarizeUsage,formatMicrousd,proportionalPercent} from "../lib/core/cost-intelligence.ts";
const now=new Date("2026-11-27T18:00:00Z");
const row=(overrides={})=>({created_at:"2026-11-27T12:00:00Z",model:"model:free",prompt_tokens:10,completion_tokens:5,cost_microusd:0,...overrides});
test("seven calendar days UTC inclusive today, exclusive next midnight",()=>{
 const w=utcUsageWindow(now);
 assert.deepEqual(w.days,["2026-11-21","2026-11-22","2026-11-23","2026-11-24","2026-11-25","2026-11-26","2026-11-27"]);
 assert.equal(w.start,"2026-11-21T00:00:00.000Z");assert.equal(w.end,"2026-11-28T00:00:00.000Z");
});
test("zero and unknown cost remain distinct; aggregate by day and model",()=>{
 const r=summarizeUsage([row(),row({cost_microusd:null}),row({model:"other:free",created_at:"2026-11-21T00:00:00Z",cost_microusd:"125000",prompt_tokens:"20"})],now,3);
 assert.equal(r.total.known,2);assert.equal(r.total.unknown,1);assert.equal(r.total.knownCost,125000n);assert.equal(r.total.input+r.total.output,55n);
 assert.equal(r.days[0].records,1);assert.equal(r.days[6].records,2);assert.equal(r.models[0].model,"model:free");assert.equal(r.partial,false);
});
test("partial and invalid data cannot masquerade as a full total",()=>{
 const r=summarizeUsage([row({created_at:"2026-11-28T00:00:00Z"}),row({cost_microusd:-1,prompt_tokens:"bad"}),row({cost_microusd:NaN,completion_tokens:-2})],now,7);
 assert.equal(r.ignored,1);assert.equal(r.partial,true);assert.equal(r.total.unknown,2);assert.equal(r.total.known,0);assert.equal(r.total.invalidTokens,2);
 assert.equal(summarizeUsage([],now,null).partial,true);
 assert.equal(summarizeUsage([],now,0).partial,false);
});
test("integer USD formatting and bounded chart heights",()=>{
 assert.equal(formatMicrousd(1n),"$0.000001");assert.equal(formatMicrousd(5000001n),"$5.000001");
 assert.equal(proportionalPercent(0n,0n),0);assert.equal(proportionalPercent(1n,3n),33.33);assert.equal(proportionalPercent(100n,3n),100);
});
test("admin auth precedes service role and queries only bounded technical usage fields",()=>{
 const s=readFileSync(new URL("../app/admin/page.tsx",import.meta.url),"utf8");
 assert.ok(s.indexOf("if(!await getCoreAdmin())")<s.indexOf("const db=createAdminClient()"));
 assert.match(s,/select\("created_at,model,prompt_tokens,completion_tokens,cost_microusd",\{count:"exact"\}\)/);
 assert.match(s,/\.limit\(1000\)/);
 assert.match(s,/usage\.error\?/);
 assert.doesNotMatch(s,/\.insert\(|\.update\(|\.delete\(/);
});
