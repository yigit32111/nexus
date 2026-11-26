import test from "node:test";import assert from "node:assert/strict";import {runMiniCode,relevantMemory,parseChart,summarizeHistory,recallChats} from "../lib/workspace/intelligence.ts";
test("safe arithmetic",()=>assert.equal(runMiniCode("a = 2\nprint(a*(3+4))"),"14"));
test("reject arbitrary execution",()=>assert.throws(()=>runMiniCode("fetch('https://example.com')")));
test("reject nonfinite",()=>assert.throws(()=>runMiniCode("print(1/0)")));
test("select relevant memories",()=>assert.equal(relevantMemory("Python öğreniyorum\nMüzik seviyorum","Python kodu"),"Python öğreniyorum"));
test("chart validation",()=>{assert.equal(parseChart('{"title":"x","bars":[{"label":"a","value":-1}]}'),null);assert.equal(parseChart('{"title":"x","bars":[{"label":"a","value":1}]}').bars.length,1)});
test("summary length",()=>assert.ok(summarizeHistory(Array.from({length:30},()=>({role:"user",content:"x".repeat(300)}))).length<=2200));

test("recall is project-scoped and excludes current chat",()=>{const row=(id,project_id,content)=>({id,project_id,title:id,messages:[{role:"user",content}]});const rows=[row("current","p","Python current"),row("other","q","Python secret"),row("global",null,"Python global"),row("match","p","Python proje")];assert.equal(recallChats(rows,"Python","current","p"),"match: Python proje");assert.equal(recallChats(rows,"Python","current",null),"global: Python global")});
test("recall ignores assistant text and unrelated content",()=>{assert.equal(recallChats([{id:"a",project_id:null,messages:[{role:"assistant",content:"Python"}]}],"Python","b",null),"");assert.equal(recallChats([],"Python","b",null),"")});