type ChatTurn = { role: string; content: unknown };
type SearchResult = { title: string; url: string; excerpt?: string; publisherHost?: string };
type IndexRow = { title?: unknown; url?: unknown; description?: unknown; snippets?: unknown };
type WikiRow = { title?: unknown; pageid?: unknown; extract?: unknown };
type ResearchTopic = "match" | "squad" | "transfer" | "news" | "general";

const WEB_REFERENCE = /\b(?:internette(?:n)?|webde(?:n)?|google['’]?da|online)\b/u;
const SEARCH_ACTION = /\b(?:ara|arastir|bul|dogrula|kontrol et|bilgi ver|ne oldu)\b/u;
const MATCH_YEAR = /\b(?:19|20)\d{2}\b/u;
const MATCH_FOLLOW_UP = /^(?:19|20)\d{2}(?:\s*(?:['’]?(?:deki|daki)|yil(?:indaki|i|inda)|sezon(?:u|undaki|unda)|mac(?:i)?|\d{1,2}\s*[-–:]\s*\d{1,2}))*[?.!]?$/u;
const SPORTS_MATCH = /\b(?:mac(?:i|in|inda|inin|lar|lari)?|karsilasma\w*|fikstur\w*|skor\w*|puan durumu|ilk 11|kac kac)\b/u;
const SCORE_IN_TITLE = /(?<![\d.-])\d{1,2}\s*[-–]\s*\d{1,2}(?![\d.-])/u;
const SPORTS_SQUAD = /\b(?:kadro\w*|futbolcu\w*)\b/u;
const SPORTS_TRANSFER = /\btransfer\w*\b/u;
const NEWS_REQUEST = /\b(?:son dakika|son durum|haber\w*|guncel|bugun|dun|ne oldu)\b/u;
const REQUEST_WORDS = new Set([
  "bana", "bilgi", "ver", "ara", "araştır", "arastir", "bul", "kontrol", "doğrula", "dogrula",
  "et", "hakkında", "hakkinda", "lütfen", "lutfen", "internette", "internetten",
  "webde", "webden", "online", "google", "güncel", "guncel", "maçı", "maci", "ne", "oldu",
  "son", "dakika", "durum", "nedir", "kaç", "kac", "sonuç", "sonuc", "hangi", "kim",
  "bitti", "söyle", "soyle", "say", "göster", "goster", "bugün", "bugun", "oyuncuları", "oyunculari",
  "nin", "nun", "ın", "in", "un", "ün",
  "sonucu", "sonucunu", "daki", "deki", "yılındaki", "yilindaki",
]);
const OFFICIAL = ["uefa.com", "tff.org", "fifa.com", "fenerbahce.org", "liverpoolfc.com",
  "who.int", "un.org", "europa.eu", "nasa.gov"];
const NEWS = ["aa.com.tr", "trthaber.com", "reuters.com", "apnews.com", "bbc.com", "bbc.co.uk", "ntv.com.tr"];
const SPORTS = ["mackolik.com", "transfermarkt.com.tr", "transfermarkt.com", "ntvspor.net", "trtspor.com.tr"];
const TOPIC_DOMAINS: Partial<Record<ResearchTopic, readonly string[]>> = {
  match: ["uefa.com", "tff.org", "mackolik.com", "aa.com.tr", "trtspor.com.tr"],
  squad: ["uefa.com", "tff.org", "transfermarkt.com.tr", "mackolik.com"],
  transfer: ["transfermarkt.com.tr", "mackolik.com", "aa.com.tr", "trtspor.com.tr", "reuters.com"],
  news: ["aa.com.tr", "trthaber.com", "reuters.com", "apnews.com", "bbc.com", "ntv.com.tr"],
};

function normalize(value: string) {
  return value.toLocaleLowerCase("tr-TR").replaceAll("ı", "i")
    .normalize("NFKD").replace(/\p{M}/gu, "");
}

function topicTerms(text: string) {
  return (text.match(/[\p{L}\p{N}]{2,}/gu) ?? [])
    .filter(word => !REQUEST_WORDS.has(word.toLocaleLowerCase("tr-TR")))
    .slice(0, 12);
}

function isFenerbahceLiverpoolMatch(text: string): boolean {
  return /\bfenerbahce\b/u.test(text) && /\bliverpool\b/u.test(text) &&
    (/\b(?:mac\w*|karsilasma\w*|skor\w*|sonuc\w*|fikstur\w*|ne zaman)\b/u.test(text) ||
      MATCH_YEAR.test(text) || /^fenerbahce\s*[-–/ ]\s*liverpool[?.!]?$/u.test(text));
}

function topicFor(intent: string): ResearchTopic {
  if (!/\b(?:film\w*|dizi\w*|tiyatro\w*|dosya\w*|banka\w*)\b/u.test(intent)) {
    if (SPORTS_MATCH.test(intent)) return "match";
    if (SPORTS_TRANSFER.test(intent)) return "transfer";
    if (SPORTS_SQUAD.test(intent)) return "squad";
  }
  return NEWS_REQUEST.test(intent) ? "news" : "general";
}

export function chatResearchRequest(turns: readonly ChatTurn[]): { query: string; topic: ResearchTopic } | null {
  const last = turns.at(-1);
  if (last?.role !== "user" || typeof last.content !== "string") return null;
  const intent = normalize(last.content);
  const previous = turns.slice(0, -1).reverse().find(turn => turn.role === "user");
  const priorIntent = typeof previous?.content === "string" ? normalize(previous.content) : "";
  const isKnownMatch = isFenerbahceLiverpoolMatch(intent);
  const isMatchFollowUp = MATCH_FOLLOW_UP.test(intent.trim()) && isFenerbahceLiverpoolMatch(priorIntent);
  if (isKnownMatch || isMatchFollowUp) {
    const year = intent.match(MATCH_YEAR)?.[0];
    return { query: year ? `Fenerbahçe Liverpool ${year}` : "Fenerbahçe Liverpool", topic: "match" };
  }
  const directTopic = topicFor(intent);
  const previousTopic = topicFor(priorIntent);
  const shortYear = MATCH_FOLLOW_UP.test(intent.trim());
  const followUp = shortYear && ["match", "squad", "transfer"].includes(previousTopic);
  const explicit = WEB_REFERENCE.test(intent) && SEARCH_ACTION.test(intent);
  if (!explicit && directTopic === "general" && !followUp) return null;
  const current = last.content;
  const text = followUp && typeof previous?.content === "string" ? `${previous.content} ${current}`
    : topicTerms(current).length ? current
    : typeof previous?.content === "string" ? previous.content : "";
  const topic = directTopic === "general" || followUp ? topicFor(normalize(text)) : directTopic;
  if (shortYear && !followUp) return { query: "", topic };
  if (text.length > 250 || /[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:parola|şifre|api.key|tc kimlik|iban|telefon numarası)\s*[:=]|\b\d{11,}\b/iu.test(text)) {
    return { query: "", topic };
  }
  const terms = topicTerms(text);
  if (!terms.some(word => !/^(?:kadro\w*|mac\w*|skor\w*|haber\w*|transfer\w*|fikstur\w*|futbolcu\w*)$/u.test(normalize(word)))) {
    return { query: "", topic };
  }
  return { query: terms.join(" "), topic };
}

function normalizeUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port || value.length > 600) return null;
    url.protocol = "https:";
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function matchesDomain(host: string, domains: readonly string[]) {
  return domains.some(domain => host === domain || host.endsWith("." + domain));
}

function readIndexRows(value: unknown, max: number): SearchResult[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, max).flatMap((row: IndexRow | null) => {
    if (typeof row?.title !== "string" || typeof row?.url !== "string") return [];
    const snippet = Array.isArray(row.snippets) ? row.snippets.find(value => typeof value === "string") : undefined;
    return [{ title: row.title.slice(0, 220), url: row.url,
      excerpt: typeof snippet === "string" ? snippet.slice(0, 500)
        : typeof row.description === "string" ? row.description.slice(0, 300) : undefined }];
  });
}

export async function boundedText(response: Response, limit: number): Promise<string> {
  if (!response.ok || !response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) return text + decoder.decode();
      bytes += value.byteLength;
      if (bytes > limit) return "";
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export function readNewsFeed(xml: string): SearchResult[] {
  const decode = (value: string) => value.replace(/&(amp|lt|gt|quot|apos|#39);/g, (entity) => ({
    "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&#39;": "'",
  })[entity] ?? entity).trim();
  return [...xml.matchAll(/<item>([\s\S]{1,12000}?)<\/item>/g)].slice(0, 40).flatMap(([, item]) => {
    const title = item.match(/<title>([^<]{1,1000})<\/title>/)?.[1];
    const link = item.match(/<link>([^<]{1,600})<\/link>/)?.[1];
    const publisherUrl = item.match(/<source\s+url="([^"]{1,300})">/)?.[1];
    if (!title || !link || !publisherUrl) return [];
    const url = normalizeUrl(decode(link));
    const publisher = normalizeUrl(decode(publisherUrl));
    if (!url || url.hostname !== "news.google.com" || !/^\/rss\/articles\/[A-Za-z0-9_-]+$/.test(url.pathname) || !publisher) return [];
    const date = Date.parse(item.match(/<pubDate>([^<]{1,110})<\/pubDate>/)?.[1] ?? "");
    const dateText = Number.isFinite(date) ? " · " + new Date(date).toISOString().slice(0, 10) : "";
    return [{ title: decode(title).slice(0, 220), url: url.href, publisherHost: publisher.hostname,
      excerpt: `${publisher.hostname.replace(/^www\./, "")}${dateText} · Haber dizini bağlantısı` }];
  });
}

const LIVERPOOL_ORIGIN = "https://www.liverpoolfc.com";

export function readLiverpoolArchive(html: string, query: string): SearchResult[] {
  const matches: SearchResult[] = [];
  const requestedYear = query.match(MATCH_YEAR)?.[0];
  const cards = html.matchAll(/<article\b[^>]{0,512}\bdata-testid="fixture-card-slotted"[^>]{0,512}>([\s\S]{1,24000}?)<\/article>/g);
  for (const [, card] of cards) {
    const match = card.match(/href="(\/matches\/mens-team\/([a-z0-9-]+)-v-([a-z0-9-]+)-(uefa-champions-league|premier-league|fa-cup|carabao-cup)-(\d{4})(\d{2})(\d{2}))"/);
    if (!match) continue;
    const [, path, home, away, competition, year, month, day] = match;
    if (home !== "liverpool" && away !== "liverpool") continue;
    if (requestedYear && year !== requestedYear) continue;
    const displayTeam = (team: string) => team === "fenerbahce" ? "Fenerbahçe"
      : team.split("-").map(segment => segment.charAt(0).toUpperCase() + segment.slice(1)).join(" ");
    const homeName = displayTeam(home);
    const awayName = displayTeam(away);
    const scores = [...card.matchAll(/<span\b[^>]{0,500}class="[^"]{0,300}__score__[^"]{0,300}"[^>]{0,300}>\s*(\d{1,2})\s*<\/span>/g)];
    const score = scores.length === 2 ? ` ${scores[0][1]}-${scores[1][1]} ` : " – ";
    const label = competition === "uefa-champions-league" ? "UEFA Şampiyonlar Ligi" : competition.replaceAll("-", " ");
    matches.push({
      title: `${homeName}${score}${awayName}`,
      url: LIVERPOOL_ORIGIN + path,
      excerpt: `${day}.${month}.${year} · ${label} · Liverpool FC resmî maç arşivi`,
    });
  }
  return rankResearchResults(matches, query);
}

export function rankResearchResults(results: readonly SearchResult[], query: string, topic: ResearchTopic = "general"): SearchResult[] {
  const tokens = [...new Set(topicTerms(query).map(normalize).filter(token =>
    /\p{L}/u.test(token) && !/^(?:kadro\w*|mac\w*|skor\w*|haber\w*|transfer\w*|futbolcu\w*|fikstur\w*)$/u.test(token)))];
  const ranked = results.flatMap(result => {
    const url = normalizeUrl(result.url);
    if (!url) return [];
    const host = url.hostname === "news.google.com" && url.pathname.startsWith("/rss/articles/")
      ? result.publisherHost ?? "" : url.hostname;
    const quality = matchesDomain(host, OFFICIAL) || /\.(?:gov|edu|gov\.tr|edu\.tr)$/.test(host) ? 3
      : matchesDomain(host, [...NEWS, ...SPORTS]) ? 2 : topic === "general" && matchesDomain(host, ["wikipedia.org"]) ? 1 : 0;
    if (!quality || !tokens.length) return [];
    const title = normalize(result.title);
    const content = normalize(result.excerpt ?? "");
    if (topic === "match" && /\bu(?:17|19|21)\b/u.test(title) && !/\bu(?:17|19|21)\b/u.test(normalize(query))) return [];
    if (topic === "squad" && !/\b(?:kadro\w*|squad|roster|futbolcu\w*)\b/u.test(title + " " + content)) return [];
    const titleRelevance = tokens.filter(token => title.includes(token)).length;
    const relevance = tokens.filter(token => title.includes(token) || content.includes(token)).length;
    if (!titleRelevance || relevance < Math.min(2, tokens.length)) return [];
    const score = relevance * 4 + titleRelevance * 2 + quality * 2
      + Number(matchesDomain(host, TOPIC_DOMAINS[topic] ?? [])) + (topic === "match" && SCORE_IN_TITLE.test(title) ? 3 : 0);
    return [{ score, result: { ...result, url: url.href }, fingerprint: title + "|" + host }];
  }).sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  return ranked.flatMap(({ result, fingerprint }) => {
    if (seen.has(result.url) || seen.has(fingerprint)) return [];
    seen.add(result.url);
    seen.add(fingerprint);
    return [result];
  }).slice(0, 5);
}

export async function searchChatWeb(query: string, requestSignal: AbortSignal, fetcher = fetch, topic: ResearchTopic = "general"): Promise<SearchResult[]> {
  const signal = AbortSignal.any([requestSignal, AbortSignal.timeout(9000)]);
  const headers = { "User-Agent": "NEXUS (https://nexus-ifn5.onrender.com)" };
  const get = async (url: string, extraHeaders?: Record<string, string>, timeout?: number) => {
    const requestSignal = timeout ? AbortSignal.any([signal, AbortSignal.timeout(timeout)]) : signal;
    const response = await fetcher(url, { signal: requestSignal, headers: { ...headers, ...extraHeaders }, redirect: "error", cache: "no-store" });
    const text = await boundedText(response, 500_000);
    return text ? JSON.parse(text) : {};
  };
  const news = async (): Promise<SearchResult[]> => {
    const terms = topicTerms(query).filter(word => /\p{L}/u.test(word)).slice(0, 5);
    if (!terms.length) return [];
    const domainFilter = TOPIC_DOMAINS[topic]?.map(domain => `domainis:${domain}`).join(" OR ");
    const params = new URLSearchParams({
      query: terms.map(word => `"${word}"`).join(" ") + (domainFilter ? ` (${domainFilter})` : ""),
      mode: "artlist", format: "json", maxrecords: "40", timespan: "3months",
    });
    const data = await get(`https://api.gdeltproject.org/api/v2/doc/doc?${params}`, undefined, 4500);
    return readIndexRows(data?.articles, 40);
  };
  const wiki = async (lang: "tr" | "en"): Promise<SearchResult[]> => {
    const params = new URLSearchParams({
      action: "query", generator: "search", gsrsearch: query, gsrlimit: "5",
      prop: "extracts", exintro: "1", explaintext: "1", exchars: "300", format: "json", formatversion: "2",
    });
    const data = await get(`https://${lang}.wikipedia.org/w/api.php?${params}`);
    const pages: (WikiRow | null)[] = Array.isArray(data?.query?.pages) ? data.query.pages : [];
    return pages.slice(0, 5).flatMap(row => {
      if (typeof row?.title !== "string" || typeof row.pageid !== "number"
          || !Number.isSafeInteger(row.pageid) || row.pageid <= 0) return [];
      return [{ title: row.title.slice(0, 220), url: `https://${lang}.wikipedia.org/?curid=${row.pageid}`,
        excerpt: typeof row.extract === "string" ? row.extract.slice(0, 300) : undefined }];
    });
  };
  const terms = topicTerms(query).map(normalize);
  if ((topic === "match" || topic === "general") && terms.includes("liverpool") && terms.filter(term => /\p{L}/u.test(term)).length >= 2) {
    const year = query.match(MATCH_YEAR)?.[0] ?? String(new Date().getUTCFullYear());
    const official = await (async () => {
      const response = await fetcher(`${LIVERPOOL_ORIGIN}/matches/mens-team/results/${year}`, {
        signal: AbortSignal.any([signal, AbortSignal.timeout(4000)]), headers, redirect: "error", cache: "no-store",
      });
      return readLiverpoolArchive(await boundedText(response, 2_000_000), query);
    })().catch(() => []);
    if (official.length) return official;
  }
  const tasks = [news()];
  if (topic === "general") tasks.push(wiki("tr"), wiki("en"));
  const domains = TOPIC_DOMAINS[topic];
  if (domains) {
    tasks.push((async () => {
      const scopedQuery = `${query} (${domains.map(domain => `site:${domain}`).join(" OR ")})`;
      const params = new URLSearchParams({
        q: scopedQuery + (MATCH_YEAR.test(query) ? "" : " when:30d"), hl: "tr", gl: "TR", ceid: "TR:tr",
      });
      const response = await fetcher(`https://news.google.com/rss/search?${params}`, {
        signal, headers, redirect: "error", cache: "no-store",
      });
      return readNewsFeed(await boundedText(response, 500_000));
    })());
  }
  const key = process.env.BRAVE_SEARCH_API_KEY?.trim();
  if (key) {
    tasks.push((async () => {
      const scoped = domains ? `${query} (${domains.map(domain => `site:${domain}`).join(" OR ")})` : query;
      const params = new URLSearchParams({
        q: scoped, maximum_number_of_tokens: "2048", safesearch: "strict",
        context_threshold_mode: "balanced",
      });
      const data = await get(`https://api.search.brave.com/res/v1/llm/context?${params}`, {
        "X-Subscription-Token": key,
      });
      return readIndexRows(data?.grounding?.generic, 20);
    })());
  }
  const outcomes = await Promise.allSettled(tasks);
  return rankResearchResults(outcomes.flatMap(result => result.status === "fulfilled" ? result.value : []), query, topic);
}

export function formatChatResearch(results: readonly SearchResult[]): string {
  if (!results.length) return "Bu aramada konuyla ilgili doğrulanabilir bir kaynak bulamadım. Daha belirgin bir konu ya da tarih yazarak yeniden deneyebilirsin.";
  const plain = (text: string) => text.replace(/[\r\n\[\]*`<>]/g, " ").replace(/\s+/g, " ").trim();
  const items = results.map((result, index) => {
    const url = result.url.replaceAll("(", "%28").replaceAll(")", "%29");
    const title = plain(result.title);
    const excerpt = result.excerpt ? ` — ${plain(result.excerpt)}` : "";
    return `${index + 1}. [${title}](${url})${excerpt}`;
  });
  return "Webde konuyla ilgili şu kaynakları buldum. Bağlantıların yanında arama sonucunda bulunan kısa bilgiler var.\n\n" + items.join("\n");
}
