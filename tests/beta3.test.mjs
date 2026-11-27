import test from "node:test";import assert from "node:assert/strict";
import {runMiniCode} from "../lib/workspace/intelligence.ts";
import {parseArtifact,parseCalculator,calculate} from "../lib/workspace/cards.ts";
import pdf from "../lib/workspace/pdf.cjs";
import { extractPdfText } from "../lib/core/pdf-text.ts";
test("bounded Python-like loops",()=>assert.equal(runMiniCode("s = 0\nfor i in range(5):\n    s = s + i\nprint(s)"),"10"));
test("loop limits and unsafe imports",()=>{assert.throws(()=>runMiniCode("for i in range(10000):\n    print(i)"));assert.throws(()=>runMiniCode("import os"));assert.throws(()=>runMiniCode("for i in range(100):\n    for j in range(100):\n        print(j)"));});
test("artifact schema rejects executable format",()=>{assert.equal(parseArtifact('{"title":"x","format":"html","text":"x"}'),null);assert.equal(parseArtifact('{"title":"x","format":"pdf","text":"x"}').format,"pdf")});
test("calculator schema and zero division",()=>{const c=parseCalculator('{"title":"x","operation":"sum","inputs":[{"label":"a","min":0,"max":10,"value":1},{"label":"b","min":0,"max":10,"value":2}]}');assert.equal(calculate(c.operation,c.inputs.map(x=>x.value)),3);assert.equal(calculate("ratio",[1,0]),null);assert.equal(parseCalculator('{"title":"x","operation":"eval","inputs":[]}'),null)});
test("PDF generation and server extraction preserve Turkish text", async () => {
  const buffer = await pdf.createPdf("Türkçe: Çığ, İstanbul, Şüphe, Özgürlük.", "NEXUS Test");
  assert.equal(buffer.subarray(0, 5).toString(), "%PDF-");
  assert.match(await extractPdfText(buffer), /İstanbul/);
});
