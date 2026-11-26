import test from "node:test";
import assert from "node:assert/strict";
import {readJsonLimited,boundedHistory} from "../lib/core/request-guard.ts";
import {chooseModel,isFreeModel} from "../lib/core/model-policy.ts";
import {safeInternalPath} from "../lib/core/navigation.ts";
import {relevantMemory,recallChats,runMiniCode,parseChart} from "../lib/workspace/intelligence.ts";
import {parseArtifact,parseCalculator,calculate} from "../lib/workspace/cards.ts";
import {canRetryFreeModel} from "../lib/core/chat-profiles.ts";
import {speechText,speechError} from "../lib/core/speech.ts";

test("128 concurrent bounded requests with multibyte payloads", async()=>{
  const body=JSON.stringify({text:"İ".repeat(1024)});
  const bytes=Buffer.byteLength(body);
  const results=await Promise.all(Array.from({length:128},(_,i)=>readJsonLimited(
    new Request("https://fixture.invalid/api",{method:"POST",headers:{"Content-Type":"application/json"},body}),
    i%2===0?bytes:bytes-1)));
  results.forEach((r,i)=>i%2===0?assert.equal(r.ok,true):assert.equal(r.status,413));
});
test("model routing with 1000 synthetic candidates and 100 queries",()=>{
 const catalog=Array.from({length:1000},(_,i)=>({id:"fixture/"+i,context:i%5===0?2048:128000,vision:i%3===0,prompt:i%2===0?0:0.0001,completion:0,request:0,image:0,supported:[]}));
 for(let i=0;i<100;i++){const images=i%2;const model=chooseModel(catalog,"auto","","analiz",images,8192);
 assert.ok(model&&isFreeModel(model));assert.ok(model.context>=12288);if(images)assert.equal(model.vision,true);}
 assert.equal(chooseModel(catalog,"auto","","",0,200000),undefined);
});
test("retry policy and navigation boundaries",()=>{
 for(let s=400;s<600;s++)assert.equal(canRetryFreeModel(s),[408,429,500,502,503,504].includes(s));
 for(const path of ["//fixture.invalid","https://fixture.invalid","/%2f","/admin/../unknown","/other"])assert.equal(safeInternalPath(path),"/");
 assert.equal(safeInternalPath("/workspace?view=research"),"/workspace?view=research");
});
test("memory bounds, project isolation and large histories",()=>{
 const text=Array.from({length:1000},(_,i)=>"veritabanı not "+i).join("\n");
 assert.ok(relevantMemory(text,"veritabanı").split("\n").length<=8);
 const rows=[{id:"own",project_id:"p",title:"own",messages:[{role:"user",content:"veritabanı"}]},{id:"other",project_id:"q",title:"other",messages:[{role:"user",content:"veritabanı"}]}];
 assert.match(recallChats(rows,"veritabanı","current","p"),/own/);
 assert.doesNotMatch(recallChats(rows,"veritabanı","current","p"),/other/);
 assert.deepEqual(boundedHistory(Array.from({length:10000},(_,i)=>i)),Array.from({length:50},(_,i)=>9950+i));
});
test("bounded calculators, artifact and chart validation",()=>{
 for(let i=0;i<500;i++){assert.equal(calculate("ratio",[i,0]),null);assert.equal(calculate("sum",[i,1]),i+1);assert.equal(parseArtifact(JSON.stringify({title:"x",format:"pdf",text:"a".repeat(24001)})),null);}
 assert.ok(parseArtifact(JSON.stringify({title:"x",format:"pdf",text:"a".repeat(24000)})));
 assert.equal(parseChart(JSON.stringify({title:"x",bars:Array.from({length:21},()=>({label:"x",value:1}))})),null);
 assert.equal(parseCalculator(JSON.stringify({title:"x",operation:"sum",inputs:[{label:"x",min:0,max:10,value:11},{label:"y",min:0,max:10,value:1}]})),null);
});
test("code lab bounded repeated work and invalid arithmetic",()=>{
 for(let i=0;i<100;i++)assert.equal(runMiniCode("s = 0\nfor i in range(100):\n    s = s + i\nprint(s)"),"4950");
 for(const code of ["print(1/0)","for i in range(101):\n    print(i)","for i in range(100):\n    for j in range(100):\n        print(j)","import os","x".repeat(4001)])assert.throws(()=>runMiniCode(code));
});
test("voice transcript assembly and permission/network failures",()=>{
 const result=Array.from({length:100},()=>[{transcript:" Merhaba "}]);
 assert.equal(speechText(result).split(" ").length,100);
 for(const code of ["not-allowed","network","audio-capture","no-speech","language-not-supported"])assert.ok(speechError(code).length>10);
});
