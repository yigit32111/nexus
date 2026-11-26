import test from "node:test";import assert from "node:assert/strict";import {readJsonLimited,boundedHistory} from "../lib/core/request-guard.ts";
const request=(body,headers={})=>new Request("https://example.test/api",{method:"POST",headers:{"Content-Type":"application/json",...headers},body});
test("valid bounded JSON",async()=>assert.deepEqual(await readJsonLimited(request('{"x":1}'),100),{ok:true,value:{x:1}}));
test("reject cross-site",async()=>assert.equal((await readJsonLimited(request('{}',{"sec-fetch-site":"cross-site"}),100)).status,403));
test("reject incorrect content type",async()=>assert.equal((await readJsonLimited(request('{}',{"Content-Type":"text/plain"}),100)).status,415));
test("reject actual byte limit",async()=>assert.equal((await readJsonLimited(request('{"x":"123456"}'),8)).status,413));
test("reject declared byte limit",async()=>assert.equal((await readJsonLimited(request('{}',{"Content-Length":"500"}),100)).status,413));
test("reject invalid body and arrays",async()=>{assert.equal((await readJsonLimited(request('{'),100)).status,400);assert.equal((await readJsonLimited(request('[]'),100)).status,400)});
test("history bounded to 50 newest",()=>{const a=boundedHistory(Array.from({length:80},(_,i)=>i));assert.equal(a.length,50);assert.equal(a[0],30);assert.equal(a[49],79)});
