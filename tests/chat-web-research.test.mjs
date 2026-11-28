import test from "node:test";
import assert from "node:assert/strict";
import { chatResearchRequest, formatChatResearch, rankResearchResults, readLiverpoolArchive, searchChatWeb } from "../lib/core/chat-web-research.ts";

const chatResearchQuery = (messages) => chatResearchRequest(messages)?.query ?? null;

test("explicit web requests resolve short follow-ups from user turns only", () => {
  const messages = [
    { role: "user", content: "Fenerbahçe Liverpool maçı hakkında bilgi ver" },
    { role: "assistant", content: "Sunucudan gelen metin" },
    { role: "user", content: "İnternette araştır" },
  ];
  assert.equal(chatResearchQuery(messages), "Fenerbahçe Liverpool");
  assert.equal(chatResearchQuery([{ role: "user", content: "Bana internette Fenerbahçe Liverpool maçı hakkında bilgi ver." }]), "Fenerbahçe Liverpool");
  assert.equal(chatResearchQuery([{ role: "user", content: "İnternette çok zaman geçiriyorum." }]), null);
  assert.equal(chatResearchQuery([{ role: "user", content: "Fenerbahçe Liverpool" }]), "Fenerbahçe Liverpool");
  assert.equal(chatResearchQuery([{ role: "user", content: "İnternette birisi@example.com ara" }]), "");
  assert.equal(chatResearchQuery([{ role: "user", content: "İnternette araştır" }]), "");
});

test("Fenerbahçe Liverpool match questions search without a keyword and carry the requested year", () => {
  const question = { role: "user", content: "bana fenerbahçe -liverpool maçı hakkında bilgi ver" };
  assert.equal(chatResearchQuery([question]), "Fenerbahçe Liverpool");
  assert.equal(chatResearchQuery([question, { role: "assistant", content: "Maç hangi yıl?" },
    { role: "user", content: "2026 daki maç" }]), "Fenerbahçe Liverpool 2026");
  assert.equal(chatResearchQuery([question, { role: "user", content: "2026 3-2" }]), "Fenerbahçe Liverpool 2026");
  assert.equal(chatResearchQuery([{ role: "user", content: "2026 daki maç" }]), "");
});

test("unlisted teams and current news trigger topic-specific research without an explicit web command", () => {
  const ask = content => chatResearchRequest([{ role: "user", content }]);
  assert.deepEqual(ask("Galatasaray Aston Villa maçı kaç kaç bitti?"), { topic: "match", query: "Galatasaray Aston Villa" });
  assert.equal(ask("Samsunspor'un güncel kadrosu")?.topic, "squad");
  assert.equal(ask("Trabzonspor transfer haberleri")?.topic, "transfer");
  assert.equal(ask("İzmir'de bugün ne oldu?")?.topic, "news");
  assert.equal(ask("Bu dizinin oyuncu kadrosu üzerine bir hikâye yaz."), null);
});

test("topic search accepts an approved publisher from the news index and rejects lookalikes", async () => {
  const calls = [];
  const xmlItem = (publisher, id, label) => `<item><title>Galatasaray Aston Villa ${label}</title>
    <link>https://news.google.com/rss/articles/${id}</link>
    <source url="https://${publisher}">Kaynak</source><pubDate>Tue, 24 Nov 2026 19:10:25 GMT</pubDate></item>`;
  const results = await searchChatWeb("Galatasaray Aston Villa", new AbortController().signal, async input => {
    const url = new URL(input);
    calls.push(url);
    if (url.hostname === "news.google.com") {
      return new Response(xmlItem("www.mackolik.com", "valid_article", "maç sonucu")
        + xmlItem("mackolik.com.example.org", "wrong_host", "maç sonucu")
        + xmlItem("www.mackolik.com", "wrong_team", "U19 maç sonucu"));
    }
    return Response.json({});
  }, "match");
  assert.deepEqual(results.map(result => result.url), ["https://news.google.com/rss/articles/valid_article"]);
  assert.match(formatChatResearch(results), /mackolik\.com · 2026-11-24/);
  assert.ok(calls.find(url => url.hostname === "news.google.com").searchParams.get("q").includes("site:mackolik.com"));
  assert.ok(calls.find(url => url.hostname === "api.gdeltproject.org").searchParams.get("query").includes("domainis:uefa.com"));
  assert.equal(calls.some(url => url.hostname.endsWith("mackolik.com")), false);
});

test("official matches rank above reports and unverifiable or unrelated hosts are discarded", () => {
  const results = rankResearchResults([
    { title: "Fenerbahçe Liverpool", url: "https://uefa.com.example.org/fake" },
    { title: "Fenerbahçe Liverpool", url: "https://www.reuters.com/sports/match" },
    { title: "Fenerbahçe Barcelona", url: "https://www.uefa.com/other" },
    { title: "Fenerbahçe 3-2 Liverpool", url: "https://www.uefa.com/match" },
  ], "Fenerbahçe Liverpool");
  assert.deepEqual(results.map(row => new URL(row.url).hostname), ["www.uefa.com", "www.reuters.com"]);
  assert.match(formatChatResearch(results), /\[Fenerbahçe 3-2 Liverpool\]\(https:\/\/www\.uefa\.com\/match\)/);
});

test("unavailable search providers do not produce an invented answer", async () => {
  const signal = new AbortController().signal;
  const results = await searchChatWeb("Fenerbahçe Liverpool", signal, async () => new Response(null, { status: 503 }));
  assert.deepEqual(results, []);
  assert.match(formatChatResearch(results), /doğrulanabilir bir kaynak bulamadım/);
});

test("automatic research returns trusted live-index results without visiting result URLs", async () => {
  const urls = [];
  const results = await searchChatWeb("Fenerbahçe Liverpool", new AbortController().signal, async input => {
    const url = new URL(input);
    urls.push(url);
    assert.ok(["api.gdeltproject.org", "tr.wikipedia.org", "en.wikipedia.org", "api.search.brave.com", "www.liverpoolfc.com"].includes(url.hostname));
    if (url.hostname === "api.gdeltproject.org") {
      return Response.json({ articles: [
        { title: "Fenerbahçe 3-2 Liverpool", url: "https://www.tff.org/fixture" },
        { title: "Fenerbahçe Liverpool", url: "https://127.0.0.1/fixture" },
      ] });
    }
    return Response.json({});
  });
  assert.ok(urls.some(url => url.hostname === "api.gdeltproject.org"));
  assert.deepEqual(results.map(row => row.url), ["https://www.tff.org/fixture"]);
});

test("official archive ties both scores to the same matching fixture card", () => {
  const card = `<article data-testid="fixture-card-slotted">
    <span class="fixture__score__test">3</span>
    <span class="fixture__score__test">2</span>
    <a href="/matches/mens-team/fenerbahce-v-liverpool-uefa-champions-league-20261104">Match Centre</a>
  </article>`;
  const [match] = readLiverpoolArchive(card, "Fenerbahçe Liverpool 2026");
  assert.equal(match.title, "Fenerbahçe 3-2 Liverpool");
  assert.match(match.excerpt, /04\.11\.2026 · UEFA Şampiyonlar Ligi/);
  assert.match(match.url, /^https:\/\/www\.liverpoolfc\.com\//);
  assert.deepEqual(readLiverpoolArchive(card, "Barcelona Liverpool"), []);
  assert.deepEqual(readLiverpoolArchive(card, "Fenerbahçe Liverpool 2025"), []);
});
