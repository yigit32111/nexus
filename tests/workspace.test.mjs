import test from "node:test";import assert from "node:assert/strict";import {runMiniCode,relevantMemory,parseChart,summarizeHistory} from "../lib/workspace/intelligence.ts";
test("safe arithmetic",()=>assert.equal(runMiniCode("a = 2\nprint(a*(3+4))"),"14"));
test("reject arbitrary execution",()=>assert.throws(()=>runMiniCode("fetch('https://example.com')")));
test("reject nonfinite",()=>assert.throws(()=>runMiniCode("print(1/0)")));
test("select relevant memories",()=>assert.equal(relevantMemory("Python öğreniyorum\nMüzik seviyorum","Python kodu"),"Python öğreniyorum"));
test("chart validation",()=>{assert.equal(parseChart('{"title":"x","bars":[{"label":"a","value":-1}]}'),null);assert.equal(parseChart('{"title":"x","bars":[{"label":"a","value":1}]}').bars.length,1)});
test("summary length",()=>assert.ok(summarizeHistory(Array.from({length:30},()=>({role:"user",content:"x".repeat(300)}))).length<=2200));
