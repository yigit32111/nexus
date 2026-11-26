export type AttachmentMeta = {
  name: string;
  type: string;
  size?: number;
};

export type UploadAttachment = AttachmentMeta & {
  dataUrl: string;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  createdAt: number;
  attachments?: AttachmentMeta[];
};

export type Chat = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
  pinned?: boolean;
  archived?: boolean;
  gemId?: string;
};

export type MemoryCategory = "Profil" | "Tercih" | "Hedef" | "Proje" | "Diğer";

export type MemoryItem = {
  id: string;
  text: string;
  category: MemoryCategory;
  createdAt: number;
  approved: boolean;
};

export type Gem = {
  id: string;
  name: string;
  description: string;
  instruction: string;
  icon: "code" | "search" | "pen" | "graduation" | "sparkles";
  model?: string;
  builtIn?: boolean;
};

export type ModelInfo = {
  id: string;
  name: string;
  description?: string;
  contextLength?: number;
  free?: boolean;
  vision?: boolean;
  supportedParameters?: string[];
};

export type CanvasDoc = {
  title: string;
  language: string;
  content: string;
};

export type Prefs = {
  memoryItems: MemoryItem[];
  memoryMode: "hybrid" | "manual" | "off";
  style: "balanced" | "concise" | "detailed";
  tone: "natural" | "friendly" | "professional";
  temperature: number;
  model: string;
  theme: "dark" | "light";
  voiceResponses: boolean;
  systemPrompt: string;
  webSearch: boolean;
  codeExecution: boolean;
  gems: Gem[];
};

export const BUILTIN_GEMS: Gem[] = [
  {
    id: "gem-code-architect",
    name: "Kod Mimarı",
    description: "Temiz, ölçeklenebilir ve üretim seviyesinde kod yazar.",
    instruction:
      "Sen kıdemli bir yazılım mimarısın. Her zaman tip güvenli, modüler, performanslı ve kenar durumları (edge-case) düşünülmüş kod üret. Gereksiz açıklamalar yerine doğrudan uygulanabilir çözümler ve kısa mimari gerekçeler sun.",
    icon: "code",
    builtIn: true,
  },
  {
    id: "gem-deep-analyst",
    name: "Derin Analist",
    description: "Karşılaştırmalı tablolar ve yapılandırılmış raporlar hazırlar.",
    instruction:
      "Sen analitik bir araştırma uzmanısın. Konuları artıları, eksileri, riskleri ve alternatifleriyle birlikte yapılandırılmış başlıklar ve Markdown tabloları kullanarak derinlemesine analiz et.",
    icon: "search",
    builtIn: true,
  },
  {
    id: "gem-editor",
    name: "Yazım Editörü",
    description: "Metinleri akıcı, ikna edici ve kusursuz hale getirir.",
    instruction:
      "Sen profesyonel bir içerik editörüsün. Kullanıcının verdiği metinleri dilbilgisi, akıcılık, ton ve etki açısından iyileştir. Gerektiğinde farklı ton seçenekleri (resmi, samimi, kısa) sun.",
    icon: "pen",
    builtIn: true,
  },
  {
    id: "gem-tutor",
    name: "Öğrenme Koçu",
    description: "Karmaşık konuları sıfırdan, örneklerle öğretir.",
    instruction:
      "Sen sabırlı ve etkili bir eğitmensin. Karmaşık kavramları önce günlük hayattan bir benzetme ile açıkla, ardından teknik detaylara geç ve sonunda kullanıcının bilgisini pekiştirecek kısa bir soru sor.",
    icon: "graduation",
    builtIn: true,
  },
];

export const DEFAULT_PREFS: Prefs = {
  memoryItems: [],
  memoryMode: "hybrid",
  style: "balanced",
  tone: "natural",
  temperature: 0.7,
  model: "",
  theme: "dark",
  voiceResponses: false,
  systemPrompt: "",
  webSearch: false,
  codeExecution: false,
  gems: [],
};

export const INTRO_MESSAGE: Message = {
  id: "intro",
  role: "assistant",
  content:
    "Merhaba, ben NEXUS 3.1. Ne üzerinde çalışmak istersin? Soru sorabilir, dosya ekleyebilir, bir Gem seçebilir veya Canvas ile canlı kod/metin geliştirebilirsin.",
  createdAt: Date.now(),
};