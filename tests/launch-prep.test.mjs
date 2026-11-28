import test from "node:test";
import assert from "node:assert/strict";
import { asksForDeveloper, DEVELOPER_CREDIT, developerCreditResponse } from "../lib/core/developer-credit.ts";
import { selectPdfContext } from "../lib/core/pdf-context.ts";
import { fetchUntilHeaders, retryCompletion } from "../lib/core/provider-timeout.ts";
import { PRO_MODELS, accountPlan } from "../lib/core/plans.ts";

test("developer credit uses the chat streaming protocol and the JSON reply", async () => {
  assert.equal(DEVELOPER_CREDIT, "NEXUS AI’ın ana geliştiricisi Yiğit Yumak, yardımcı geliştiricisi İsmet Berat Karakülah.");
  assert.equal(asksForDeveloper("Seni kim geliştirdi?"), true);
  assert.equal(asksForDeveloper("Selam, NEXUS AI’ı kim geliştirdi?"), true);
  assert.equal(asksForDeveloper("Yapay zekâ nasıl geliştirilir?"), false);
  const response = developerCreditResponse(true);
  assert.match(response.headers.get("content-type"), /^text\/event-stream/);
  const [first, done] = (await response.text()).trim().split("\n\n");
  assert.deepEqual(JSON.parse(first.slice(6)), { type: "content", text: DEVELOPER_CREDIT });
  assert.equal(done, "data: [DONE]");
  assert.equal((await developerCreditResponse(false).json()).reply, DEVELOPER_CREDIT);
});

test("PDF selection prioritizes relevant blocks and counts escaped UTF-8 bytes", () => {
  const baseBytes = 40_000;
  const docs = [{
    name: 'Örnek "PDF"',
    text: ("alakasız 🌱 ".repeat(75) + "\n\n").repeat(20) + "Çözünürlük ve İstanbul",
  }];
  const result = selectPdfContext(docs, "İstanbul çözünürlük", baseBytes, "free");
  assert.match(result.appendix, /Çözünürlük ve İstanbul/);
  assert.ok(result.selectedBlocks < result.totalBlocks);
  assert.ok(baseBytes + Buffer.byteLength(JSON.stringify(result.appendix)) - 2 + 2048 <= 45_000);
  assert.equal(selectPdfContext(docs, "", 45_000, "free").overBudget, true);
  assert.equal(selectPdfContext(docs, "", 90_000, "pro").overBudget, true);
  const pro = selectPdfContext(docs, "İstanbul", baseBytes, "pro");
  assert.equal(pro.selectedBlocks, pro.totalBlocks);
});

test("fake Pro provider: header timeout selects the alternate model before streaming", async () => {
  assert.equal(accountPlan({ plan: "pro" }), "pro");
  assert.equal(accountPlan({ user_metadata: { plan: "pro" } }), "free");
  const signal = new AbortController().signal;
  const [luna, haiku] = PRO_MODELS;
  const visited = [luna];
  const timeout = await fetchUntilHeaders(async attemptSignal => {
    await new Promise((_, reject) => {
      attemptSignal.addEventListener("abort", () => reject(attemptSignal.reason), { once: true });
    });
    throw new Error("unexpected completion");
  }, signal, 5);
  const response = await retryCompletion(timeout, signal, async () => {
    visited.push(haiku);
    return new Response("data: [DONE]\n\n", { headers: { "Content-Type": "text/event-stream" } });
  });
  assert.deepEqual(visited, [luna, haiku]);
  assert.equal(await response.text(), "data: [DONE]\n\n");
  const rateLimit = new Response(null, { status: 429 });
  assert.equal(await retryCompletion(rateLimit, signal, async () => {
    assert.fail("rate limits must never be retried");
  }), rateLimit);
});

test("header deadline is cleared for an active response stream", async () => {
  let attempt;
  const signal = new AbortController().signal;
  const result = await fetchUntilHeaders(async value => {
    attempt = value;
    return new Response("stream");
  }, signal, 5);
  await new Promise(resolve => setTimeout(resolve, 15));
  assert.equal(attempt.aborted, false);
  assert.equal(await result.text(), "stream");
});
