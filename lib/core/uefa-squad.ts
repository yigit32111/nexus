import { boundedText } from "./chat-web-research.ts";

const UEFA = "https://www.uefa.com";
const TOURNAMENTS = {
  uefachampionsleague: "UEFA Şampiyonlar Ligi",
  uefaeuropaleague: "UEFA Avrupa Ligi",
  uefaconferenceleague: "UEFA Konferans Ligi",
} as const;
type Tournament = keyof typeof TOURNAMENTS;
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

function normalize(value: string): string {
  return value.toLocaleLowerCase("tr-TR").replaceAll("ı", "i").normalize("NFKD").replace(/\p{M}/gu, "");
}

function asksForCurrentSquad(text: string, now: Date): boolean {
  if (/\b(?:basketbol\w*|voleybol\w*|kadin\w*|u(?:17|19|21)|ilk\s*(?:11|on\s*bir)|mac\s+kadrosu|transfer\s+kadrosu|hayali|eski\s+kadro)\b/u.test(text)) return false;
  const season = text.match(/\b((?:19|20)\d\d)\s*[-–/ ]\s*((?:19|20)?\d\d)\b/u);
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
  const heading = [...html.matchAll(/<h1\b[^>]{0,180}>([^<]{1,180})<\/h1>/gi)]
    .map(match => match[1]).find(value => /\bSquad UEFA (?:Champions League|Europa League|Conference League) \d{4}\/\d{2}/i.test(value));
  const name = heading?.match(/^(.+?)\s+Squad UEFA /i)?.[1];
  const season = heading?.match(/\b\d{4}\/\d{2}\b/)?.[0];
  if (!name || !/^[\p{L}\p{M}\p{N} .’'\-]{2,100}$/u.test(decodeName(name))) return null;
  if (season !== currentSeason(now)) return null;

  const groups = GROUPS.map(([role, label]) => {
    const start = html.indexOf(`class="squadlist--role">${role}</h2>`);
    if (start < 0) return { label, players: [] };
    const end = html.indexOf("</pk-table>", start);
    const table = end >= 0 && end - start <= 60000 ? html.slice(start, end) : "";
    const players = [...new Set([...table.matchAll(/href="\/(?:uefachampionsleague|uefaeuropaleague|uefaconferenceleague)\/clubs\/players\/\d+--[a-z0-9-]+\/"\s+title="([^"]{1,160})"/gi)]
      .map(match => decodeName(match[1]))
      .filter(name => /^[\p{L}\p{M} .’'\-]{2,100}$/u.test(name)))].slice(0, 30);
    return { label, players };
  });
  return groups.every(group => group.players.length) ? { name: decodeName(name), season, groups } : null;
}

export function discoverUefaClub(html: string, query: string, tournament: Tournament): string | null {
  const text = normalize(query).replace(/\bfener(?:in)?\b/gu, "fenerbahce");
  const matches = new Set<string>();
  const pattern = new RegExp(`href="/${tournament}/clubs/(\\d{2,9}--[a-z0-9-]{2,70})/"`, "g");
  for (const [, club] of html.matchAll(pattern)) {
    const name = club.split("--")[1].replaceAll("-", " ");
    if (new RegExp(`\\b${name}(?:['’]?(?:nin|nun|in|un))?\\b`, "u").test(text)) matches.add(club);
  }
  return matches.size === 1 ? [...matches][0] : null;
}

export async function discoverUefaSquad(query: string, requestSignal: AbortSignal, fetcher = fetch, now = new Date()): Promise<string | null> {
  if (!asksForCurrentSquad(normalize(query), now)) return null;
  const signal = AbortSignal.any([requestSignal, AbortSignal.timeout(8500)]);
  const options = {
    signal, headers: { "User-Agent": "NEXUS (https://nexus-ifn5.onrender.com)", "Accept-Language": "en" },
    redirect: "error", cache: "no-store",
  } as const;
  const candidates = await Promise.all((Object.keys(TOURNAMENTS) as Tournament[]).map(async tournament => {
    try {
      const base = `${UEFA}/${tournament}/clubs/`;
      const list = await boundedText(await fetcher(base, options), 600_000);
      const club = discoverUefaClub(list, query, tournament);
      if (!club) return null;
      const url = `${base}${club}/squad/`;
      const roster = readUefaSquad(await boundedText(await fetcher(url, options), 600_000), now);
      return roster ? { url, roster, tournament } : null;
    } catch {
      return null;
    }
  }));
  const match = candidates.find(candidate => candidate !== null);
  if (!match) return null;
  const { roster, tournament, url } = match;
  const players = roster.groups.map(group => `- **${group.label}** — ${group.players.join(", ")}`);
  return `**${roster.name} — ${roster.season} ${TOURNAMENTS[tournament]} kayıtlı kadrosu**\n\n${players.join("\n")}\n\nLig kaydı ve maç kadrosu farklı olabilir. [UEFA kadro sayfası](${url})`;
}
