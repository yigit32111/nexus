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

export function detectMemoryCandidate(
  text: string
): { text: string; category: MemoryCategory } | null {
  const trimmed = text.trim();
  const patterns: { regex: RegExp; category: MemoryCategory }[] = [
    { regex: /^(?:hatırla|aklında tut|unutma)\s+(.{4,220})/i, category: "Diğer" },
    { regex: /^(?:benim adım|adım)\s+(.{3,100})/i, category: "Profil" },
    {
      regex: /^(?:tercihim|bundan sonra|cevaplarını|şöyle cevap ver|tercih ederim)\s+(.{4,180})/i,
      category: "Tercih",
    },
    { regex: /^(?:hedefim|amacım|hayalim)\s+(.{4,180})/i, category: "Hedef" },
    { regex: /^(?:projem|üzerinde çalıştığım proje)\s+(.{4,180})/i, category: "Proje" },
  ];

  for (const p of patterns) {
    const res = trimmed.match(p.regex);
    if (res?.[1]) {
      return { text: res[1], category: p.category };
    }
  }
  return null;
}

export function buildEnhancedPrompt(raw: string): string {
  const clean = raw.trim();
  if (!clean) return "";
  return `Aşağıdaki isteği derinlemesine, yapılandırılmış ve uygulanabilir şekilde yanıtla. Gerekirse adım adım plan, somut örnekler ve dikkat edilmesi gereken kritik noktaları ekle:\n\n"${clean}"`;
}