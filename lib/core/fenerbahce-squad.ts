const UEFA_SQUAD_URL = "https://www.uefa.com/uefachampionsleague/clubs/52692--fenerbahce/squad/";
const GROUPS = [
  ["Goalkeepers", "Kaleciler"],
  ["Defenders", "Defans"],
  ["Midfielders", "Orta saha"],
  ["Forwards", "Forvetler"],
] as const;

function currentSeason(now: Date): string {
  const year = now.getUTCFullYear() - Number(now.getUTCMonth() < 6);
  return `${year}/${String(year + 1).slice(-2)}`;
}

export function asksForCurrentFenerbahceSquad(question: string, now = new Date()): boolean {
  const text = question.toLocaleLowerCase("tr-TR").replaceAll("ı", "i")
    .normalize("NFKD").replace(/\p{M}/gu, "");
  if (!/\b(?:fenerbahce(?:['’]?nin)?|fener(?:['’]?in)?)\b/u.test(text) || !/\b(?:kadro\w*|futbolcu\w*|oyuncu\w*)\b/u.test(text)) return false;
  if (/\b(?:basketbol\w*|voleybol\w*|kadin\w*|u(?:17|19|21)|ilk\s*(?:11|on\s*bir)|mac\s+kadrosu|transfer\s+kadrosu|hayali|eski\s+kadro)\b/u.test(text)) return false;
  const season = text.match(/\b((?:19|20)\d\d)\s*[-–/]\s*((?:19|20)?\d\d)\b/u);
  if (season) return `${season[1]}/${season[2].slice(-2)}` === currentSeason(now);
  const year = text.match(/\b(?:19|20)\d\d\b/u);
  return !year || year[0] === String(now.getUTCFullYear());
}

function decodeName(encoded: string): string {
  const symbols: Record<string, string> = { amp: "&", apos: "'", quot: '"', nbsp: " " };
  return encoded.replace(/&(#x[\da-f]+|#\d+|amp|apos|quot|nbsp);/gi, (match, entity: string) => {
    if (!entity.startsWith("#")) return symbols[entity.toLowerCase()] ?? match;
    const hex = entity[1]?.toLowerCase() === "x";
    const point = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : "";
  }).trim();
}

export function readUefaSquad(html: string, now = new Date()) {
  const heading = html.match(/<h1\b[^>]{0,180}>([^<]{1,180})<\/h1>/gi)
    ?.find(value => /SK Squad UEFA Champions League \d{4}\/\d{2}/i.test(value));
  const season = heading?.match(/\b\d{4}\/\d{2}\b/)?.[0];
  if (season !== currentSeason(now)) return null;

  const groups = GROUPS.map(([role, label]) => {
    const start = html.indexOf(`class="squadlist--role">${role}</h2>`);
    if (start < 0) return { label, players: [] };
    const end = html.indexOf("</pk-table>", start);
    const table = end >= 0 && end - start <= 60000 ? html.slice(start, end) : "";
    const players = [...new Set([...table.matchAll(/href="\/uefachampionsleague\/clubs\/players\/\d+--[a-z0-9-]+\/"\s+title="([^"]{1,160})"/gi)]
      .map(match => decodeName(match[1]))
      .filter(name => /^[\p{L}\p{M} .’'\-]{2,100}$/u.test(name)))].slice(0, 30);
    return { label, players };
  });
  return groups.every(group => group.players.length) ? { season, groups } : null;
}

export async function readFenerbahceSquadResponse(requestSignal: AbortSignal, fetcher = fetch, now = new Date()): Promise<string> {
  const source = `[UEFA Fenerbahçe kadro sayfası](${UEFA_SQUAD_URL})`;
  const unavailable = `UEFA kaynağından güncel kadrodaki isimleri şu anda doğrulayamadım. Kayıtlı listeyi burada kontrol edebilirsin: ${source}`;
  try {
    const response = await fetcher(UEFA_SQUAD_URL, {
      signal: AbortSignal.any([requestSignal, AbortSignal.timeout(8000)]),
      headers: { "User-Agent": "NEXUS (https://nexus-ifn5.onrender.com)" },
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok || !response.body) return unavailable;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let html = "";
    let bytes = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 500_000) return unavailable;
        html += decoder.decode(value, { stream: true });
      }
      const roster = readUefaSquad(html + decoder.decode(), now);
      if (!roster) return unavailable;
      const players = roster.groups.map(group => `- **${group.label}** — ${group.players.join(", ")}`);
      return `**Fenerbahçe — ${roster.season} UEFA Şampiyonlar Ligi kayıtlı kadrosu**\n\n${players.join("\n")}\n\nBu liste UEFA kaydıdır. Süper Lig kadrosu veya belirli bir maçın ilk 11’i farklı olabilir. ${source}`;
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  } catch {
    return unavailable;
  }
}
