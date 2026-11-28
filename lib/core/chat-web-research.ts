type ChatTurn = { role: string; content: unknown };
type SearchResult = { title: string; url: string; excerpt?: string };
type IndexRow = { title?: unknown; url?: unknown; description?: unknown };
type WikiRow = { title?: unknown; pageid?: unknown; extract?: unknown };

const WEB_REFERENCE = /\b(?:internette(?:n)?|webde(?:n)?|google['’]?da|online)\b/u;
const SEARCH_ACTION = /\b(?:ara|arastir|bul|dogrula|kontrol et|bilgi ver|ne oldu)\b/u;
const REQUEST_WORDS = new Set([
  "bana", "bilgi", "ver", "ara", "araştır", "arastir", "bul", "kontrol", "doğrula", "dogrula",
  "et", "hakkında", "hakkinda", "lütfen", "lutfen", "internette", "internetten",
  "webde", "webden", "online", "google", "güncel", "guncel", "maçı", "maci", "ne", "oldu",
]);
const OFFICIAL = ["uefa.com", "tff.org", "fifa.com", "fenerbahce.org", "liverpoolfc.com",
  "who.int", "un.org", "europa.eu", "nasa.gov"];
const NEWS = ["aa.com.tr", "trthaber.com", "reuters.com", "apnews.com", "bbc.com", "bbc.co.uk"];

function normalize(value: string) {
  return value.toLocaleLowerCase("tr-TR").replaceAll("ı", "i")
    .normalize("NFKD").replace(/\p{M}/gu, "");
}

function topicTerms(text: string) {
  return (text.match(/[\p{L}\p{N}]{2,}/gu) ?? [])
    .filter(word => !REQUEST_WORDS.has(word.toLocaleLowerCase("tr-TR")))
    .slice(0, 12);
}

export function chatResearchQuery(turns: readonly ChatTurn[]): string | null {
  const last = turns.at(-1);
  if (last?.role !== "user" || typeof last.content !== "string") return null;
  const intent = normalize(last.content);
  if (!WEB_REFERENCE.test(intent) || !SEARCH_ACTION.test(intent)) return null;
  const previous = turns.slice(0, -1).reverse().find(turn => turn.role === "user");
  const current = last.content;
  const topic = topicTerms(current).length ? current
    : typeof previous?.content === "string" ? previous.content : "";
  if (topic.length > 250 || /[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:parola|şifre|api.key|tc kimlik|iban|telefon numarası)\s*[:=]|\b\d{11,}\b/iu.test(topic)) return "";
  return topicTerms(topic).join(" ");
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

function matchesDomain(host: string, domains: string[]) {
  return domains.some(domain => host === domain || host.endsWith("." + domain));
}

function readIndexRows(value: unknown, max: number): SearchResult[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, max).flatMap((row: IndexRow | null) => {
    if (typeof row?.title !== "string" || typeof row?.url !== "string") return [];
    return [{ title: row.title.slice(0, 220), url: row.url,
      excerpt: typeof row.description === "string" ? row.description.slice(0, 300) : undefined }];
  });
}

export function rankResearchResults(results: readonly SearchResult[], query: string): SearchResult[] {
  const tokens = [...new Set(topicTerms(query).map(normalize).filter(token => /\p{L}/u.test(token)))];
  const ranked = results.flatMap(result => {
    const url = normalizeUrl(result.url);
    if (!url) return [];
    const host = url.hostname;
    const quality = matchesDomain(host, OFFICIAL) || /\.(?:gov|edu|gov\.tr|edu\.tr)$/.test(host) ? 3
      : matchesDomain(host, NEWS) ? 2 : matchesDomain(host, ["wikipedia.org"]) ? 1 : 0;
    if (!quality || !tokens.length) return [];
    const title = normalize(result.title);
    const relevance = tokens.filter(token => title.includes(token)).length;
    if (relevance < Math.min(2, tokens.length)) return [];
    const score = relevance * 4 + quality;
    return [{ score, result: { ...result, url: url.href } }];
  }).sort((a, b) => b.score - a.score);
  return [...new Map(ranked.map(({ result }) => [result.url, result])).values()].slice(0, 5);
}

export async function searchChatWeb(query: string, requestSignal: AbortSignal, fetcher = fetch): Promise<SearchResult[]> {
  const signal = AbortSignal.any([requestSignal, AbortSignal.timeout(9000)]);
  const headers = { "User-Agent": "NEXUS (https://nexus-ifn5.onrender.com)" };
  const get = async (url: string, extraHeaders?: Record<string, string>) => {
    const response = await fetcher(url, { signal, headers: { ...headers, ...extraHeaders }, redirect: "error", cache: "no-store" });
    if (!response.ok) throw new Error("Search unavailable");
    return response.json();
  };
  const news = async (): Promise<SearchResult[]> => {
    const terms = topicTerms(query).filter(word => /\p{L}/u.test(word)).slice(0, 5);
    if (!terms.length) return [];
    const params = new URLSearchParams({
      query: terms.map(word => `"${word}"`).join(" "),
      mode: "artlist", format: "json", maxrecords: "40", timespan: "3months",
    });
    const data = await get(`https://api.gdeltproject.org/api/v2/doc/doc?${params}`);
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
  const tasks = [news(), wiki("tr"), wiki("en")];
  const key = process.env.BRAVE_SEARCH_API_KEY?.trim();
  if (key) {
    tasks.push((async () => {
      const params = new URLSearchParams({ q: query, count: "15", safesearch: "strict", text_decorations: "false" });
      const data = await get(`https://api.search.brave.com/res/v1/web/search?${params}`, {
        "X-Subscription-Token": key,
      });
      return readIndexRows(data?.web?.results, 15);
    })());
  }
  const outcomes = await Promise.allSettled(tasks);
  return rankResearchResults(outcomes.flatMap(result => result.status === "fulfilled" ? result.value : []), query);
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
