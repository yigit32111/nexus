import { Chat, MemoryCategory, Message, INTRO_MESSAGE } from "../types/nexus";

export const MAX_FILES = 4;
export const ALLOWED_TYPES = [
  "application/pdf",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
];
export const VISION_ID_RE =
  /(?:vision|vl\b|-vl-|qwen3|gpt-4o|gpt-4\.1|claude-3|claude-sonnet-4|gemini|pixtral|llava)/i;

export function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function newChat(gemId?: string): Chat {
  return {
    id: uid(),
    title: "Yeni sohbet",
    messages: [{ ...INTRO_MESSAGE, id: "intro", createdAt: Date.now() }],
    updatedAt: Date.now(),
    gemId,
  };
}

export function titleFrom(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 42 ? `${clean.slice(0, 42)}…` : clean || "Yeni sohbet";
}

export function bytesLabel(n = 0): string {
  return n < 1024 * 1024
    ? `${Math.max(1, Math.round(n / 1024))} KB`
    : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () =>
      typeof r.result === "string" ? resolve(r.result) : reject(new Error("Dosya okunamadı."));
    r.onerror = () => reject(new Error("Dosya okunamadı."));
    r.readAsDataURL(file);
  });
}

export function safeMessageList(value: unknown): Message[] {
  if (!Array.isArray(value)) return [{ ...INTRO_MESSAGE, id: uid() }];
  const parsed = value
    .filter(
      (m: any) =>
        m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
    )
    .slice(0, 500)
    .map((m: any) => ({
      id: typeof m.id === "string" ? m.id : uid(),
      role: m.role as "user" | "assistant",
      content: m.content.slice(0, 80000),
      reasoning: typeof m.reasoning === "string" ? m.reasoning.slice(0, 40000) : undefined,
      imageUrl: typeof m.imageUrl === "string" ? m.imageUrl : undefined,
      ragSources: Array.isArray(m.ragSources) ? m.ragSources.slice(0, 6) : undefined,
      createdAt: Number(m.createdAt) || Date.now(),
      attachments: Array.isArray(m.attachments)
        ? m.attachments.slice(0, MAX_FILES).map((a: any) => ({
            name: String(a.name || "Dosya"),
            type: String(a.type || "application/octet-stream"),
            size: Number(a.size) || 0,
          }))
        : [],
    }));
  return parsed.length ? parsed : [{ ...INTRO_MESSAGE, id: uid() }];
}

export function extractThinkingTags(
  raw: string,
  explicitReasoning = ""
): {
  thinking: string;
  cleanContent: string;
  isThinkingOpen: boolean;
} {
  let thinking = explicitReasoning.trim();
  let text = raw;
  let isThinkingOpen = false;

  const closedMatch = text.match(/<think>([\s\S]*?)<\/think>/i);
  if (closedMatch) {
    const extracted = closedMatch[1].trim();
    thinking = thinking ? `${thinking}\n\n${extracted}` : extracted;
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  } else {
    const openIdx = text.search(/<think>/i);
    if (openIdx !== -1) {
      isThinkingOpen = true;
      const extracted = text.slice(openIdx + 7).trim();
      thinking = thinking ? `${thinking}\n\n${extracted}` : extracted;
      text = text.slice(0, openIdx).trim();
    }
  }

  return { thinking, cleanContent: text, isThinkingOpen };
}

/**
 * Autonomous & explicit memory detector for natural Turkish conversations.
 */
export function detectMemoryCandidates(
  text: string,
  autonomous = true
): { text: string; category: MemoryCategory }[] {
  const results: { text: string; category: MemoryCategory }[] = [];
  const trimmed = text.trim();

  const explicitPatterns: { regex: RegExp; category: MemoryCategory }[] = [
    { regex: /^(?:hatırla|aklında tut|unutma)\s+(.{4,220})/i, category: "Diğer" },
    { regex: /^(?:benim adım|adım)\s+(.{3,100})/i, category: "Profil" },
    {
      regex: /^(?:tercihim|bundan sonra|cevaplarını|şöyle cevap ver|tercih ederim)\s+(.{4,180})/i,
      category: "Tercih",
    },
    { regex: /^(?:hedefim|amacım|hayalim)\s+(.{4,180})/i, category: "Hedef" },
    { regex: /^(?:projem|üzerinde çalıştığım proje)\s+(.{4,180})/i, category: "Proje" },
  ];

  for (const p of explicitPatterns) {
    const res = trimmed.match(p.regex);
    if (res?.[1]) {
      results.push({ text: res[1].trim(), category: p.category });
    }
  }

  if (autonomous && results.length === 0) {
    const autoPatterns: { regex: RegExp; category: MemoryCategory; prefix?: string }[] = [
      {
        regex: /\bben\s+(?:bir\s+)?([a-zçğıöşü0-9\s-]{3,45}(?:mühendisiyim|geliştiricisiyim|öğrencisiyim|tasarımcısıyım|doktoruyum|öğretmeniyim|uzmanıyım))\b/i,
        category: "Profil",
        prefix: "Meslek/Rol: ",
      },
      {
        regex: /\b([a-zçğıöşü0-9\s-]{3,40})\s+(?:şehrinde|ilinde)\s+yaşıyorum\b/i,
        category: "Profil",
        prefix: "Konum: ",
      },
      {
        regex: /\b(?:genellikle|çoğunlukla|her zaman)\s+([a-zçğıöşü0-9+#.\s-]{3,80})\s+(?:kullanıyorum|tercih ediyorum)\b/i,
        category: "Tercih",
        prefix: "Tercih: ",
      },
      {
        regex: /\b(?:geliştirdiğim|üzerinde çalıştığım)\s+([a-zçğıöşü0-9\s-]{3,80})\s+(?:uygulaması|projesi|sitesi|sistemi)\b/i,
        category: "Proje",
        prefix: "Aktif proje: ",
      },
    ];

    for (const ap of autoPatterns) {
      const m = trimmed.match(ap.regex);
      if (m?.[1]) {
        results.push({
          text: `${ap.prefix || ""}${m[1].trim()}`,
          category: ap.category,
        });
      }
    }
  }

  return results;
}

export function buildEnhancedPrompt(raw: string): string {
  const clean = raw.trim();
  if (!clean) return "";
  return `Aşağıdaki isteği derinlemesine, yapılandırılmış ve uygulanabilir şekilde yanıtla. Gerekirse adım adım plan, somut örnekler ve dikkat edilmesi gereken kritik noktaları ekle:\n\n"${clean}"`;
}

export function chunkText(text: string, chunkSize = 1000, overlap = 180): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length && chunks.length < 60) {
    const end = Math.min(start + chunkSize, clean.length);
    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start += chunkSize - overlap;
  }
  return chunks.filter(Boolean);
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}