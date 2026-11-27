import test from "node:test";
import assert from "node:assert/strict";
import { thinkingProfile, canRetryFreeModel } from "../lib/core/chat-profiles.ts";
import { isFreeModel } from "../lib/core/model-policy.ts";
import { relevantMemory } from "../lib/workspace/intelligence.ts";

test("thinking profiles preserve existing defaults and bound fast replies", () => {
  assert.deepEqual(thinkingProfile(undefined), thinkingProfile("balanced"));
  assert.equal(thinkingProfile({ maxTokens: 100000 }).maxTokens, 4096);
  assert.equal(thinkingProfile("fast").maxTokens, 1024);
  assert.match(thinkingProfile("deep").routingHint, /analiz/);
});

test("model fallback is restricted to temporary upstream failures", () => {
  for (const status of [408, 500, 502, 503, 504]) assert.equal(canRetryFreeModel(status), true);
  for (const status of [200, 400, 401, 402, 403, 404, 422, 429]) assert.equal(canRetryFreeModel(status), false);
});

test("a nonzero price in any modality disqualifies a free model", () => {
  const model = { prompt: 0, completion: 0, request: 0, image: 0 };
  assert.equal(isFreeModel(model), true);
  for (const field of Object.keys(model)) assert.equal(isFreeModel({ ...model, [field]: 1e-10 }), false);
});

test("memory ranks exact matches above inflections and ignores filler words", () => {
  assert.equal(relevantMemory("bana anlat\nVeritabanında arama\nVeritabanı", "bana veritabanı"),
    "Veritabanı\nVeritabanında arama");
  assert.equal(relevantMemory("bana anlat", "bana"), "");
});

test("local concepts recall bilingual notes without depending on an outside provider", () => {
  assert.equal(relevantMemory("Müzik dinlerim\nKitap okurum", "music"), "Müzik dinlerim");
  assert.equal(relevantMemory("Sınav yarın\nİmtihan bugün", "imtihan"), "İmtihan bugün\nSınav yarın");
});
