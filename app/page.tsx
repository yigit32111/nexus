"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, Archive, ArchiveRestore, AudioLines, Brain, Check, ChevronDown, Globe,
  CircleHelp, Cloud, Code2, Copy, Download, FileJson, FileText, Image as ImageIcon,
  LogOut, Menu, MessageSquare, Mic, MoreHorizontal, Paperclip, Pencil, Pin,
  Plus, RefreshCw, Search, Send, Settings, ShieldCheck, Sparkles, Sun, Moon,
  Trash2, Upload, Volume2, VolumeX, X, Zap, PanelLeftClose, SlidersHorizontal,
  LockKeyhole, CheckCheck, Command, RotateCcw, BookOpen, Eye, EyeOff
} from "lucide-react";
import { createClient } from "../utils/supabase/client";

type AttachmentMeta = { name: string; type: string; size?: number };
type UploadAttachment = AttachmentMeta & { dataUrl: string };
type Message = { id: string; role: "user" | "assistant"; content: string; createdAt: number; attachments?: AttachmentMeta[] };
type Chat = { id: string; title: string; messages: Message[]; updatedAt: number; pinned?: boolean; archived?: boolean };
type MemoryCategory = "Profil" | "Tercih" | "Hedef" | "Proje" | "Diğer";
type MemoryItem = { id: string; text: string; category: MemoryCategory; createdAt: number; approved: boolean };
type ModelInfo = { id: string; name: string; description?: string; contextLength?: number; free?: boolean; vision?: boolean; supportedParameters?: string[] };
type Prefs = {
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
};

const CHAT_KEY = "nexus_chats_v3";
const PREF_KEY = "nexus_prefs_v3";
const LEGACY_CHAT_KEY = "nexus_chats_v2";
const LEGACY_PREF_KEY = "nexus_prefs_v2";
const MAX_FILES = 4;
const ALLOWED_TYPES = ["application/pdf", "text/plain", "image/jpeg", "image/png", "image/webp"];
const defaults: Prefs = {
  memoryItems: [], memoryMode: "hybrid", style: "balanced", tone: "natural",
  temperature: 0.7, model: "", theme: "dark", voiceResponses: false, systemPrompt: "", webSearch: false, codeExecution: false
};
const intro: Message = { id: "intro", role: "assistant", content: "Merhaba, ben NEXUS. Ne üzerinde çalışmak istersin? Bir soru sorabilir, dosya ekleyebilir veya birlikte bir proje geliştirebiliriz.", createdAt: Date.now() };

function uid() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function newChat(): Chat { return { id: uid(), title: "Yeni sohbet", messages: [{ ...intro, id: "intro", createdAt: Date.now() }], updatedAt: Date.now() }; }
function titleFrom(text: string) { const clean = text.replace(/\s+/g, " ").trim(); return clean.length > 42 ? `${clean.slice(0, 42)}…` : clean || "Yeni sohbet"; }
function bytesLabel(n = 0) { return n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`; }
function fileToDataUrl(file: File): Promise<string> { return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => typeof r.result === "string" ? resolve(r.result) : reject(new Error("Dosya okunamadı.")); r.onerror = () => reject(new Error("Dosya okunamadı.")); r.readAsDataURL(file); }); }
function safeMessageList(value: any): Message[] {
  if (!Array.isArray(value)) return [{ ...intro, id: uid() }];
  const parsed = value.filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string").slice(0, 500).map((m: any) => ({
    id: typeof m.id === "string" ? m.id : uid(), role: m.role, content: m.content.slice(0, 80000),
    createdAt: Number(m.createdAt) || Date.now(), attachments: Array.isArray(m.attachments) ? m.attachments.slice(0, MAX_FILES).map((a: any) => ({ name: String(a.name || "Dosya"), type: String(a.type || "application/octet-stream"), size: Number(a.size) || 0 })) : []
  }));
  return parsed.length ? parsed : [{ ...intro, id: uid() }];
}

function RichText({ text }: { text: string }) {
  const blocks = text.split(/```([\w-]*)\n?([\s\S]*?)```/g);
  return <div className="rich-text">{blocks.map((part, i) => {
    if (i % 3 === 2) return <pre className="code-block" key={i}><code>{part}</code></pre>;
    if (i % 3 === 1) return null;
    return part.split("\n").map((line, j) => {
      const trimmed = line.trim();
      if (!trimmed) return <div className="text-gap" key={`${i}-${j}`} />;
      const heading = trimmed.match(/^(#{1,3})\s+(.*)$/);
      if (heading) return <div className={`rich-heading h${heading[1].length}`} key={`${i}-${j}`}>{heading[2]}</div>;
      if (/^[-*]\s+/.test(trimmed)) return <div className="rich-list" key={`${i}-${j}`}><span>•</span>{trimmed.replace(/^[-*]\s+/, "")}</div>;
      if (/^\d+[.)]\s+/.test(trimmed)) return <div className="rich-list" key={`${i}-${j}`}><span>{trimmed.match(/^\d+/)?.[0]}.</span>{trimmed.replace(/^\d+[.)]\s+/, "")}</div>;
      return <p key={`${i}-${j}`}>{line}</p>;
    });
  })}</div>;
}

export default function Home() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState("Bağlanıyor");
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState("");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [archiveView, setArchiveView] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"general" | "memory" | "account" | "system">("general");
  const [prefs, setPrefs] = useState<Prefs>(defaults);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelsError, setModelsError] = useState("");
  const [provider, setProvider] = useState("AI SAĞLAYICISI");
  const [configured, setConfigured] = useState(false);
  const [files, setFiles] = useState<UploadAttachment[]>([]);
  const [notice, setNotice] = useState("");
  const [memoryDraft, setMemoryDraft] = useState("");
  const [memoryCategory, setMemoryCategory] = useState<MemoryCategory>("Diğer");
  const [editingMemory, setEditingMemory] = useState<string | null>(null);
  const [editingMemoryText, setEditingMemoryText] = useState("");
  const [typing, setTyping] = useState<{ messageId: string; chatId: string; text: string } | null>(null);
  const [typingText, setTypingText] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeChat = chats.find(c => c.id === activeId) || null;
  const visibleChats = useMemo(() => chats.filter(c => Boolean(c.archived) === archiveView && c.title.toLocaleLowerCase("tr-TR").includes(search.toLocaleLowerCase("tr-TR"))).sort((a,b) => Number(Boolean(b.pinned))-Number(Boolean(a.pinned)) || b.updatedAt-a.updatedAt), [chats, archiveView, search]);
  const approvedMemory = useMemo(() => prefs.memoryItems.filter(m => m.approved), [prefs.memoryItems]);
  const selectedModel = models.find(m => m.id === prefs.model);

  const setTheme = useCallback((theme: "dark" | "light") => {
    document.documentElement.dataset.theme = theme;
  }, []);
  useEffect(() => { setTheme(prefs.theme); }, [prefs.theme, setTheme]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const { data, error } = await supabase.auth.getUser();
      if (cancelled) return;
      if (error || !data.user) { router.replace("/login"); setLoading(false); return; }
      const id = data.user.id;
      setUserId(id); setEmail(data.user.email || "");
      setSyncStatus("Bulut verileri yükleniyor");

      const cloudChatResult = await supabase.from("nexus_chats").select("id,title,messages,updated_at,pinned,archived").eq("user_id", id).order("updated_at", { ascending: false });
      if (cancelled) return;
      let localChats: Chat[] = [];
      try {
        const saved = localStorage.getItem(`${CHAT_KEY}_${id}`) || localStorage.getItem(`${LEGACY_CHAT_KEY}_${id}`);
        const json = saved ? JSON.parse(saved) : [];
        if (Array.isArray(json)) localChats = json.map((c: any) => ({ id: String(c.id || uid()), title: String(c.title || "Yeni sohbet"), messages: safeMessageList(c.messages), updatedAt: Number(c.updatedAt) || Date.now(), pinned: Boolean(c.pinned), archived: Boolean(c.archived) }));
      } catch { localChats = []; }
      let loadedChats: Chat[] = [];
      if (!cloudChatResult.error && Array.isArray(cloudChatResult.data) && cloudChatResult.data.length) {
        loadedChats = cloudChatResult.data.map((r: any) => ({ id: String(r.id), title: String(r.title || "Yeni sohbet"), messages: safeMessageList(r.messages), updatedAt: r.updated_at ? new Date(r.updated_at).getTime() : Date.now(), pinned: Boolean(r.pinned), archived: Boolean(r.archived) }));
        setSyncStatus("Buluttan yüklendi");
      } else if (localChats.length) {
        loadedChats = localChats;
        setSyncStatus(cloudChatResult.error ? "Yerel yedekten yüklendi" : "Yeni bulut alanı");
      } else {
        loadedChats = [newChat()];
        setSyncStatus(cloudChatResult.error ? "Çevrimdışı çalışma" : "Hazır");
      }
      if (cancelled) return;
      setChats(loadedChats); setActiveId(loadedChats[0]?.id || "");
      localStorage.setItem(`${CHAT_KEY}_${id}`, JSON.stringify(loadedChats));

      let savedPrefs: any = {};
      try { savedPrefs = JSON.parse(localStorage.getItem(`${PREF_KEY}_${id}`) || localStorage.getItem(`${LEGACY_PREF_KEY}_${id}`) || "{}"); } catch { savedPrefs = {}; }
      const cloudPrefsResult = await supabase.from("nexus_user_settings").select("prefs").eq("user_id", id).maybeSingle();
      if (cancelled) return;
      const source = cloudPrefsResult.data?.prefs && typeof cloudPrefsResult.data.prefs === "object" ? cloudPrefsResult.data.prefs : savedPrefs;
      const hydrated: Prefs = {
        ...defaults, ...source,
        memoryItems: Array.isArray(source.memoryItems) ? source.memoryItems.filter((m: any) => m && typeof m.text === "string").slice(0, 100) : [],
        memoryMode: ["hybrid", "manual", "off"].includes(source.memoryMode) ? source.memoryMode : "hybrid",
        theme: source.theme === "light" ? "light" : "dark",
      };
      setPrefs(hydrated); setPrefsLoaded(true);
      if (cloudPrefsResult.error) setSyncStatus("Hafıza yerel yedekten yüklendi");

      const [statusResponse, modelResponse] = await Promise.all([
        fetch("/api/status", { cache: "no-store" }).catch(() => null),
        fetch("/api/models", { cache: "no-store" }).catch(() => null),
      ]);
      if (cancelled) return;
      if (statusResponse?.ok) {
        const s = await statusResponse.json(); setProvider(String(s.provider || "AI")); setConfigured(Boolean(s.configured));
        if (!hydrated.model && s.model) setPrefs(p => ({ ...p, model: String(s.model) }));
      }
      if (modelResponse?.ok) {
        const m = await modelResponse.json(); setModels(Array.isArray(m.models) ? m.models : []); setModelsError(m.note || "");
      } else if (modelResponse) {
        const m = await modelResponse.json().catch(() => ({})); setModelsError(m.error || "Model listesi alınamadı.");
      }
      setLoading(false);
    }
    init().catch(error => { console.error("NEXUS INIT ERROR", error); setNotice("Uygulama başlatılırken bir hata oluştu."); setLoading(false); });
    return () => { cancelled = true; };
  }, [router, supabase]);

  useEffect(() => {
    if (!userId || loading) return;
    try { localStorage.setItem(`${CHAT_KEY}_${userId}`, JSON.stringify(chats)); } catch { setSyncStatus("Yerel kayıt alanı dolu olabilir"); }
  }, [chats, userId, loading]);
  useEffect(() => {
    if (!userId || loading || !prefsLoaded) return;
    try { localStorage.setItem(`${PREF_KEY}_${userId}`, JSON.stringify(prefs)); } catch { /* storage is optional */ }
    const timer = window.setTimeout(async () => {
      const { error } = await supabase.from("nexus_user_settings").upsert({ user_id: userId, prefs, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) { console.error("NEXUS PREFS SAVE", error); setSyncStatus("Hafıza yerel olarak kaydedildi"); }
      else setSyncStatus("Hafıza ve ayarlar kaydedildi");
    }, 650);
    return () => window.clearTimeout(timer);
  }, [prefs, prefsLoaded, userId, loading, supabase]);
  useEffect(() => {
    if (!userId || loading || chats.length === 0) return;
    const timer = window.setTimeout(async () => {
      const rows = chats.map(c => ({ id: c.id, user_id: userId, title: c.title.slice(0, 100), messages: c.messages, pinned: Boolean(c.pinned), archived: Boolean(c.archived), updated_at: new Date(c.updatedAt || Date.now()).toISOString() }));
      const { error } = await supabase.from("nexus_chats").upsert(rows, { onConflict: "id" });
      if (error) { console.error("NEXUS CHAT SYNC", error); setSyncStatus("Sohbet yerel olarak kaydedildi"); }
      else setSyncStatus("Tüm değişiklikler eşitlendi");
    }, 850);
    return () => window.clearTimeout(timer);
  }, [chats, userId, loading, supabase]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [activeChat?.messages.length, busy, typingText]);
  useEffect(() => {
    if (!typing) return;
    let index = 0;
    const increment = Math.max(2, Math.ceil(typing.text.length / 520));
    const timer = window.setInterval(() => {
      index = Math.min(index + increment, typing.text.length);
      setTypingText(typing.text.slice(0, index));
      if (index >= typing.text.length) { window.clearInterval(timer); setTyping(null); }
    }, 12);
    return () => window.clearInterval(timer);
  }, [typing]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typingInField = target && ["INPUT", "TEXTAREA"].includes(target.tagName);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); createChat(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "/") { e.preventDefault(); setSidebarOpen(true); window.setTimeout(() => document.querySelector<HTMLInputElement>(".sidebar-search")?.focus(), 50); }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); void send(); }
      if (e.key === "Escape") { setShowSettings(false); setMobileMenu(false); }
      if (!typingInField && e.key === "n" && !e.ctrlKey && !e.metaKey && !e.altKey) createChat();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function updateChat(id: string, updater: (chat: Chat) => Chat) { setChats(prev => prev.map(c => c.id === id ? updater(c) : c)); }
  function createChat() { const c = newChat(); setChats(prev => [c, ...prev]); setActiveId(c.id); setInput(""); setFiles([]); setEditingMessageId(null); setArchiveView(false); if (window.innerWidth < 820) setSidebarOpen(false); }
  function patchMessages(id: string, messages: Message[]) { updateChat(id, c => ({ ...c, messages, updatedAt: Date.now() })); }
  function toggleChat(id: string, key: "pinned" | "archived") { updateChat(id, c => ({ ...c, [key]: !c[key], updatedAt: Date.now() })); if (key === "archived" && activeId === id && !chats.find(c => c.id === id)?.archived) { const next = chats.find(c => c.id !== id && !c.archived); if (next) setActiveId(next.id); else createChat(); } }
  function renameChat(chat: Chat) { const name = window.prompt("Sohbet adını yaz:", chat.title); if (name?.trim()) updateChat(chat.id, c => ({ ...c, title: name.trim().slice(0, 100), updatedAt: Date.now() })); }
  function deleteChat(id: string) {
    if (!window.confirm("Bu sohbeti kalıcı olarak silmek istiyor musun?")) return;
    const left = chats.filter(c => c.id !== id);
    const next = left.length ? left : [newChat()];
    setChats(next); if (activeId === id) setActiveId(next[0].id);
    void supabase.from("nexus_chats").delete().eq("id", id).eq("user_id", userId);
  }

  function addMemory(text: string, category: MemoryCategory, approved = true) {
    const clean = text.trim().replace(/\s+/g, " ").slice(0, 240);
    if (!clean) return;
    setPrefs(p => {
      if (p.memoryItems.some(m => m.text.toLocaleLowerCase("tr-TR") === clean.toLocaleLowerCase("tr-TR"))) return p;
      return { ...p, memoryItems: [{ id: uid(), text: clean, category, createdAt: Date.now(), approved }, ...p.memoryItems].slice(0, 100) };
    });
  }
  function detectMemorySuggestion(text: string) {
    if (prefs.memoryMode !== "hybrid") return;
    const trimmed = text.trim();
    const patterns: { regex: RegExp; category: MemoryCategory }[] = [
      { regex: /^(?:hatırla|aklında tut|unutma)\s+(.{4,220})/i, category: "Diğer" },
      { regex: /^(?:benim adım|adım)\s+(.{3,100})/i, category: "Profil" },
      { regex: /^(?:tercihim|bundan sonra|cevaplarını|şöyle cevap ver|tercih ederim)\s+(.{4,180})/i, category: "Tercih" },
      { regex: /^(?:hedefim|amacım|hayalim)\s+(.{4,180})/i, category: "Hedef" },
      { regex: /^(?:projem|üzerinde çalıştığım proje)\s+(.{4,180})/i, category: "Proje" },
    ];
    const match = patterns.map(p => ({ ...p, result: trimmed.match(p.regex) })).find(p => p.result);
    if (match?.result?.[1]) addMemory(match.result[1], match.category, false);
  }
  function saveMemoryEdit(id: string) { const value = editingMemoryText.trim().replace(/\s+/g, " "); if (value) setPrefs(p => ({ ...p, memoryItems: p.memoryItems.map(m => m.id === id ? { ...m, text: value.slice(0, 240) } : m) })); setEditingMemory(null); setEditingMemoryText(""); }

  async function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    const chosen = Array.from(list);
    if (files.length + chosen.length > MAX_FILES) { setNotice(`Bir mesajda en fazla ${MAX_FILES} dosya ekleyebilirsin.`); return; }
    const added: UploadAttachment[] = [];
    for (const file of chosen) {
      if (!ALLOWED_TYPES.includes(file.type)) { setNotice(`${file.name}: Bu dosya türü desteklenmiyor.`); continue; }
      const image = file.type.startsWith("image/");
      const limit = image ? 5 : file.type === "application/pdf" ? 8 : 2;
      if (file.size > limit * 1024 * 1024) { setNotice(`${file.name}: En fazla ${limit} MB olabilir.`); continue; }
      try { added.push({ name: file.name, type: file.type, size: file.size, dataUrl: await fileToDataUrl(file) }); }
      catch { setNotice(`${file.name}: Dosya okunamadı.`); }
    }
    if (added.length) { setFiles(prev => [...prev, ...added]); setNotice(""); }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function send(text?: string, opts?: { regenerateFrom?: Message[]; editIndex?: number }) {
    const content = (text ?? input).trim();
    if ((!content && !files.length && !opts?.regenerateFrom) || busy || !activeChat) return;
    const selectedFiles = [...files];
    const meta = selectedFiles.map(({ name, type, size }) => ({ name, type, size }));
    let baseMessages = opts?.regenerateFrom || activeChat.messages;
    let outgoing: Message[];
    if (opts?.regenerateFrom) outgoing = baseMessages;
    else if (opts?.editIndex !== undefined) outgoing = [...baseMessages.slice(0, opts.editIndex), { id: uid(), role: "user", content, createdAt: Date.now(), attachments: meta }];
    else outgoing = [...baseMessages, { id: uid(), role: "user", content: content || "Eklediğim dosyaları incele ve açıkla.", createdAt: Date.now(), attachments: meta }];
    const userText = content || "Eklediğim dosyaları incele ve açıkla.";
    const toolsModel = prefs.model || "openai/gpt-oss-20b";
    if ((prefs.webSearch || prefs.codeExecution) && !/^openai\/gpt-oss-(20b|120b)$/.test(toolsModel)) { setNotice("Groq Web Arama ve Kod Çalıştırma araçları openai/gpt-oss-20b veya openai/gpt-oss-120b modellerini gerektirir. Modeli ayarlardan değiştir."); return; }
    if (!opts?.regenerateFrom) detectMemorySuggestion(userText);
    patchMessages(activeChat.id, outgoing);
    setInput(""); setFiles([]); setEditingMessageId(null); setBusy(true); setNotice("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: outgoing.map(m => ({ role: m.role, content: m.content })),
          memory: approvedMemory.map(m => `• [${m.category}] ${m.text}`).join("\n"),
          model: prefs.model || undefined,
          modelSupportsVision: selectedModel?.vision === true || /qwen3\.8|vision/i.test(prefs.model),
          modelSupportsTemperature: true,
          preferences: { style: prefs.style, tone: prefs.tone, temperature: prefs.temperature, memoryMode: prefs.memoryMode, systemPrompt: prefs.systemPrompt, webSearch: prefs.webSearch, codeExecution: prefs.codeExecution },
          attachments: selectedFiles,
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "İstek başarısız oldu.");
      const answer = String(data.reply || "Yanıt alınamadı.");
      const assistantMessage: Message = { id: uid(), role: "assistant", content: answer, createdAt: Date.now() };
      patchMessages(activeChat.id, [...outgoing, assistantMessage]);
      setTyping({ messageId: assistantMessage.id, chatId: activeChat.id, text: answer }); setTypingText("");
      updateChat(activeChat.id, c => ({ ...c, title: c.title === "Yeni sohbet" ? titleFrom(userText) : c.title, updatedAt: Date.now() }));
      if (prefs.voiceResponses && "speechSynthesis" in window) { window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(answer); utterance.lang = "tr-TR"; window.speechSynthesis.speak(utterance); }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bilinmeyen hata";
      patchMessages(activeChat.id, [...outgoing, { id: uid(), role: "assistant", content: `**Bağlantı hatası**\n${message}\n\nAPI anahtarını, modelini ve sağlayıcı limitlerini kontrol et.`, createdAt: Date.now() }]);
    } finally { setBusy(false); }
  }

  function regenerate() {
    if (!activeChat || busy) return;
    const lastUserIndex = activeChat.messages.map(m => m.role).lastIndexOf("user");
    if (lastUserIndex < 0) return;
    void send(undefined, { regenerateFrom: activeChat.messages.slice(0, lastUserIndex + 1) });
  }
  function editMessage(message: Message) {
    if (!activeChat) return;
    const index = activeChat.messages.findIndex(m => m.id === message.id);
    if (index < 0) return;
    setInput(message.content); setEditingMessageId(message.id); setNotice("Mesajı düzenliyorsun. Gönderdiğinde bu mesajdan sonraki yanıtlar yenilenir.");
    textareaRef.current?.focus();
  }
  function submitComposer() {
    if (editingMessageId && activeChat) {
      const idx = activeChat.messages.findIndex(m => m.id === editingMessageId);
      if (idx >= 0) { void send(undefined, { editIndex: idx }); return; }
    }
    void send();
  }
  function dictate() {
    const w = window as any; const Speech = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Speech) { setNotice("Bu tarayıcı sesle yazmayı desteklemiyor."); return; }
    const rec = new Speech(); rec.lang = "tr-TR"; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = (event: any) => setInput(prev => `${prev}${prev ? " " : ""}${event.results?.[0]?.[0]?.transcript || ""}`);
    rec.onerror = () => setNotice("Ses tanıma tamamlanamadı."); rec.start();
  }
  async function copyText(text: string) { try { await navigator.clipboard.writeText(text); setNotice("Panoya kopyalandı."); } catch { setNotice("Kopyalama izni alınamadı."); } }
  function speak(text: string) { if (!("speechSynthesis" in window)) { setNotice("Sesli okuma bu tarayıcıda desteklenmiyor."); return; } window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = "tr-TR"; window.speechSynthesis.speak(u); }

  function exportActive(format: "txt" | "md" | "json" = "md") {
    if (!activeChat) return;
    let content = "";
    if (format === "json") content = JSON.stringify(activeChat, null, 2);
    else content = activeChat.messages.map(m => `${m.role === "user" ? "## Sen" : "## NEXUS"}\n\n${m.content}${m.attachments?.length ? `\n\nDosyalar: ${m.attachments.map(a => a.name).join(", ")}` : ""}`).join("\n\n---\n\n");
    const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/plain;charset=utf-8" });
    downloadBlob(blob, `nexus-${activeChat.title.replace(/[^a-z0-9-_ğüşöçıİĞÜŞÖÇ]+/gi, "-").slice(0,45)}.${format}`);
  }
  function exportAll() {
    const backup = { app: "NEXUS AI", version: "3.0.0", exportedAt: new Date().toISOString(), chats, prefs };
    downloadBlob(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }), `nexus-yedek-${new Date().toISOString().slice(0,10)}.json`);
  }
  function downloadBlob(blob: Blob, name: string) { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); }
  async function importBackup(file?: File) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const incoming = Array.isArray(parsed) ? parsed : parsed.chats;
      if (!Array.isArray(incoming)) throw new Error("Yedek dosyasında sohbet listesi bulunamadı.");
      const imported: Chat[] = incoming.slice(0, 500).filter((c: any) => c && Array.isArray(c.messages)).map((c: any) => ({ id: uid(), title: String(c.title || "İçe aktarılan sohbet").slice(0,100), messages: safeMessageList(c.messages), updatedAt: Date.now(), pinned: Boolean(c.pinned), archived: Boolean(c.archived) }));
      if (!imported.length) throw new Error("İçe aktarılabilecek sohbet bulunamadı.");
      setChats(prev => [...imported, ...prev]); setActiveId(imported[0].id); setNotice(`${imported.length} sohbet içe aktarıldı.`);
      if (parsed.prefs && typeof parsed.prefs === "object") setPrefs(p => ({ ...p, ...parsed.prefs, memoryItems: Array.isArray(parsed.prefs.memoryItems) ? parsed.prefs.memoryItems.slice(0, 100) : p.memoryItems }));
    } catch (error) { setNotice(error instanceof Error ? error.message : "Yedek dosyası okunamadı."); }
    finally { if (importRef.current) importRef.current.value = ""; }
  }

  async function logout() { await supabase.auth.signOut(); setChats([]); setPrefs(defaults); setUserId(""); setEmail(""); router.replace("/login"); router.refresh(); }
  async function clearAllChats() {
    if (!window.confirm("Tüm sohbetlerin bu hesaptan silinecek. Bu işlem geri alınamaz. Devam edilsin mi?")) return;
    await supabase.from("nexus_chats").delete().eq("user_id", userId);
    const fresh = newChat(); setChats([fresh]); setActiveId(fresh.id); setNotice("Sohbet geçmişi temizlendi.");
  }

  if (loading || !userId) return <main className="loading-screen"><div className="loading-mark"><div className="brand-symbol"><Sparkles size={24}/></div><strong>NEXUS<span>3.0</span></strong><small>ÇALIŞMA ALANI HAZIRLANIYOR</small><i/></div></main>;

  return (
    <main className={`nexus-app ${sidebarOpen ? "sidebar-visible" : "sidebar-hidden"}`}>
      {mobileMenu && <button className="mobile-scrim" onClick={() => setMobileMenu(false)} aria-label="Menüyü kapat"/>}
      <aside className={`sidebar ${mobileMenu ? "mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-symbol"><Sparkles size={19}/></div>
          <div className="brand-word"><b>NEXUS</b><span>PERSONAL INTELLIGENCE</span></div>
          <button className="icon-button sidebar-close" title="Paneli kapat" onClick={() => { setSidebarOpen(false); setMobileMenu(false); }}><PanelLeftClose size={17}/></button>
        </div>
        <button className="new-chat-button" onClick={createChat}><Plus size={17}/>Yeni sohbet <kbd>⌘ K</kbd></button>
        <div className="sidebar-section-label"><span>ÇALIŞMA ALANI</span><button className="subtle-icon" onClick={createChat} title="Yeni sohbet"><Plus size={15}/></button></div>
        <div className="sidebar-search"><Search size={15}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Sohbetlerde ara…"/><kbd>⌘/</kbd></div>
        <div className="chat-list-heading"><span>{archiveView ? "ARŞİV" : "SON SOHBETLER"}</span><button onClick={() => setArchiveView(v => !v)}>{archiveView ? <ArchiveRestore size={14}/> : <Archive size={14}/>} {archiveView ? "Sohbetler" : "Arşiv"}</button></div>
        <div className="chat-list">
          {visibleChats.map(chat => <div className={`chat-list-item ${chat.id === activeId ? "active" : ""}`} key={chat.id}>
            <button className="chat-select" onClick={() => { setActiveId(chat.id); if (window.innerWidth < 820) setMobileMenu(false); }}><MessageSquare size={15}/><span>{chat.title}</span>{chat.pinned && <Pin size={12} className="pin-indicator"/>}</button>
            <div className="chat-actions"><button title="Yeniden adlandır" onClick={() => renameChat(chat)}><Pencil size={13}/></button><button title={chat.pinned ? "Sabitlemeyi kaldır" : "Sabitle"} onClick={() => toggleChat(chat.id,"pinned")}><Pin size={13}/></button><button title={chat.archived ? "Arşivden çıkar" : "Arşivle"} onClick={() => toggleChat(chat.id,"archived")}><Archive size={13}/></button><button title="Sil" onClick={() => deleteChat(chat.id)}><Trash2 size={13}/></button></div>
          </div>)}
          {!visibleChats.length && <div className="empty-history">{search ? "Eşleşen sohbet bulunamadı." : "Henüz sohbet yok."}</div>}
        </div>
        <div className="sidebar-bottom">
          <div className="sync-line"><span className={`sync-dot ${syncStatus.toLowerCase().includes("hata") ? "warning" : ""}`}/><span>{syncStatus}</span><Cloud size={13}/></div>
          <button className="nav-button" onClick={() => { setSettingsTab("memory"); setShowSettings(true); }}><Brain size={16}/>Hafızam <span>{approvedMemory.length}</span></button>
          <button className="nav-button" onClick={() => { setSettingsTab("general"); setShowSettings(true); }}><Settings size={16}/>Ayarlar</button>
          <div className="user-panel"><div className="user-avatar">{email.charAt(0).toUpperCase() || "N"}</div><div className="user-meta"><b>{email.split("@")[0] || "NEXUS Kullanıcısı"}</b><span>{email}</span></div><button className="subtle-icon" onClick={logout} title="Çıkış yap"><LogOut size={16}/></button></div>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <button className="icon-button" onClick={() => { setSidebarOpen(v => !v); setMobileMenu(v => !v); }} title="Menü"><Menu size={18}/></button>
          <div className="topbar-context"><span className="topbar-dot"/><span>{activeChat?.title || "NEXUS"}</span><b>3.0</b></div>
          <div className="topbar-right"><div className="model-chip"><Zap size={13}/><span>{prefs.model || provider}</span></div><button className="icon-button" onClick={() => setPrefs(p => ({ ...p, theme: p.theme === "dark" ? "light" : "dark" }))} title="Temayı değiştir">{prefs.theme === "dark" ? <Sun size={17}/> : <Moon size={17}/>}</button><button className="icon-button" onClick={() => exportActive("md")} title="Sohbeti dışa aktar"><Download size={17}/></button><button className="icon-button" onClick={() => { setSettingsTab("general"); setShowSettings(true); }} title="Ayarlar"><SlidersHorizontal size={17}/></button></div>
        </header>

        <div className="conversation-scroll">
          {activeChat && activeChat.messages.length <= 1 && <section className="welcome-panel">
            <div className="welcome-eyebrow"><span/> PERSONAL INTELLIGENCE SYSTEM <span/></div>
            <div className="welcome-orb"><div className="orb-ring"/><div className="orb-ring ring-2"/><div className="orb-core"><Sparkles size={32}/></div></div>
            <h1>Merhaba, <em>nasıl yardımcı olayım?</em></h1>
            <p>Sorularını sor, fikirlerini geliştir veya bir dosya ekle. NEXUS yardımcı olmaya hazır.</p>
            <div className="prompt-grid">
              <button onClick={() => setInput("Bugün çalışmam gereken konular için bir plan hazırla.")}><BookOpen size={17}/><span><b>Çalışma planı</b><small>Konuları planla ve takip et</small></span></button>
              <button onClick={() => setInput("Bu fikri birlikte geliştirelim. Bana önce doğru soruları sor.")}><Sparkles size={17}/><span><b>Fikir geliştir</b><small>Bir düşünceyi projeye dönüştür</small></span></button>
              <button onClick={() => setInput("Bu kodu incele, hataları bul ve daha iyi hâle getir.")}><Code2 size={17}/><span><b>Kod desteği</b><small>Hata ayıkla ve kod üret</small></span></button>
              <button onClick={() => fileRef.current?.click()}><FileText size={17}/><span><b>Dosya incele</b><small>PDF, metin veya görsel ekle</small></span></button>
            </div>
            <div className="welcome-foot"><ShieldCheck size={14}/> Sohbetlerin ve hafızan hesabına özel saklanır.</div>
          </section>}

          <div className="messages-area">
            {activeChat?.messages.filter((m, i) => !(i === 0 && m.role === "assistant" && m.content === intro.content)).map((message, index, arr) => {
              const isLastAssistant = message.role === "assistant" && index === arr.length - 1;
              const isTyping = typing?.chatId === activeChat.id && typing.messageId === message.id;
              const displayContent = isTyping ? typingText : message.content;
              return <article className={`message-row ${message.role}`} key={message.id}>
                <div className={`message-avatar ${message.role === "assistant" ? "nexus-avatar" : "user-avatar-small"}`}>{message.role === "assistant" ? <Sparkles size={16}/> : (email.charAt(0).toUpperCase() || "Y")}</div>
                <div className={`message-main ${message.role === "user" ? "user-message-main" : "assistant-message-main"}`}>
                  {message.role === "user" ? (
                    <>
                      <div className={`message-bubble ${message.content.trim().length <= 24 ? "compact" : "expanded"}`}>
                        <div className="message-content"><RichText text={displayContent}/>{isTyping && <span className="typing-caret"/>}</div>
                        {message.attachments?.length ? <div className="message-files">{message.attachments.map((a,i) => <span key={`${a.name}-${i}`}>{a.type.startsWith("image/") ? <ImageIcon size={13}/> : <FileText size={13}/>} {a.name}</span>)}</div> : null}
                      </div>
                      {!isTyping && <div className="message-toolbar"><button onClick={() => void copyText(message.content)}><Copy size={13}/> Kopyala</button><button onClick={() => editMessage(message)}><Pencil size={13}/> Düzenle</button></div>}
                    </>
                  ) : (
                    <>
                      <div className="message-heading"><b>NEXUS</b><time>{new Date(message.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</time></div>
                      <div className="message-content"><RichText text={displayContent}/>{isTyping && <span className="typing-caret"/>}</div>
                      {message.attachments?.length ? <div className="message-files">{message.attachments.map((a,i) => <span key={`${a.name}-${i}`}>{a.type.startsWith("image/") ? <ImageIcon size={13}/> : <FileText size={13}/>} {a.name}</span>)}</div> : null}
                      {!isTyping && <div className="message-toolbar"><button onClick={() => void copyText(message.content)}><Copy size={13}/> Kopyala</button><button onClick={() => speak(message.content)}><Volume2 size={13}/> Sesli oku</button>{isLastAssistant && <button onClick={regenerate}><RefreshCw size={13}/> Yeniden üret</button>}</div>}
                    </>
                  )}
                </div>
              </article>;
            })}
            {busy && <div className="thinking-row"><div className="message-avatar nexus-avatar"><Sparkles size={16}/></div><div><b>NEXUS düşünüyor</b><div className="thinking-dots"><i/><i/><i/></div></div></div>}
            <div ref={endRef}/>
          </div>
        </div>

        <div className="composer-zone">
          {notice && <div className="notice-bar"><span>{notice}</span><button onClick={() => setNotice("")}><X size={14}/></button></div>}
          {editingMessageId && <div className="edit-indicator"><Pencil size={13}/> Önceki mesaj düzenleniyor <button onClick={() => { setEditingMessageId(null); setInput(""); setNotice(""); }}><X size={13}/></button></div>}
          {files.length > 0 && <div className="attachment-tray">{files.map((f,i) => <div className="attachment-chip" key={`${f.name}-${i}`}>{f.type.startsWith("image/") ? <ImageIcon size={14}/> : <FileText size={14}/>}<span>{f.name}<small>{bytesLabel(f.size)}</small></span><button onClick={() => setFiles(prev => prev.filter((_,j) => j !== i))}><X size={13}/></button></div>)}</div>}
          <div className="composer-box">
            <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComposer(); } }} placeholder="NEXUS'a sor" rows={1} disabled={busy}/>
            <div className="composer-controls"><div className="composer-tools"><input ref={fileRef} type="file" multiple accept=".pdf,.txt,image/png,image/jpeg,image/webp" hidden onChange={e => void handleFiles(e.target.files)}/><button onClick={() => fileRef.current?.click()} title="Dosya ekle"><Paperclip size={17}/></button><button onClick={dictate} title="Sesle yaz"><Mic size={17}/></button><button className={`composer-tool-toggle ${prefs.webSearch ? "active" : ""}`} onClick={() => setPrefs(p => ({...p,webSearch:!p.webSearch}))} title="Groq web aramasını aç/kapat"><Globe size={16}/><span>Web</span></button><button className={`composer-tool-toggle ${prefs.codeExecution ? "active" : ""}`} onClick={() => setPrefs(p => ({...p,codeExecution:!p.codeExecution}))} title="Kod çalıştırmayı aç/kapat"><Code2 size={16}/><span>Kod</span></button><span className="composer-model">{prefs.model || "Varsayılan model"}</span></div><div className="composer-send"><span>Enter ile gönder · Shift+Enter yeni satır</span><button onClick={submitComposer} disabled={busy || (!input.trim() && !files.length)} title="Gönder"><Send size={17}/></button></div></div>
          </div>
          <div className="composer-disclaimer"><span><LockKeyhole size={12}/> Hesabına özel çalışma alanı</span><span>Yanıtlar yapay zekâ tarafından oluşturulur; önemli bilgileri doğrula.</span></div>
        </div>
      </section>

      {showSettings && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowSettings(false); }}><section className="settings-dialog">
        <header className="settings-header"><div><div className="settings-eyebrow">NEXUS CONTROL CENTER</div><h2>Ayarlar</h2><p>Çalışma alanını ve kişisel deneyimini yönet.</p></div><button className="icon-button" onClick={() => setShowSettings(false)}><X size={18}/></button></header>
        <div className="settings-body"><nav className="settings-nav">
          <button className={settingsTab === "general" ? "selected" : ""} onClick={() => setSettingsTab("general")}><SlidersHorizontal size={16}/> Genel</button>
          <button className={settingsTab === "memory" ? "selected" : ""} onClick={() => setSettingsTab("memory")}><Brain size={16}/> Hafıza <span>{approvedMemory.length}</span></button>
          <button className={settingsTab === "account" ? "selected" : ""} onClick={() => setSettingsTab("account")}><ShieldCheck size={16}/> Hesap ve veri</button>
          <button className={settingsTab === "system" ? "selected" : ""} onClick={() => setSettingsTab("system")}><Activity size={16}/> Sistem</button>
        </nav>
        <div className="settings-content">
          {settingsTab === "general" && <>
            <div className="settings-section-title">GÖRÜNÜM</div><label className="setting-label">Tema</label><div className="segmented"><button className={prefs.theme === "dark" ? "active" : ""} onClick={() => setPrefs(p => ({...p,theme:"dark"}))}><Moon size={15}/> Koyu</button><button className={prefs.theme === "light" ? "active" : ""} onClick={() => setPrefs(p => ({...p,theme:"light"}))}><Sun size={15}/> Açık</button></div>
            <div className="setting-divider"/><div className="settings-section-title">YANIT TERCİHLERİ</div><label className="setting-label">Yanıt uzunluğu</label><div className="segmented three"><button className={prefs.style === "concise" ? "active" : ""} onClick={() => setPrefs(p => ({...p,style:"concise"}))}>Kısa</button><button className={prefs.style === "balanced" ? "active" : ""} onClick={() => setPrefs(p => ({...p,style:"balanced"}))}>Dengeli</button><button className={prefs.style === "detailed" ? "active" : ""} onClick={() => setPrefs(p => ({...p,style:"detailed"}))}>Detaylı</button></div>
            <label className="setting-label spaced">Konuşma tonu</label><div className="segmented three"><button className={prefs.tone === "natural" ? "active" : ""} onClick={() => setPrefs(p => ({...p,tone:"natural"}))}>Doğal</button><button className={prefs.tone === "friendly" ? "active" : ""} onClick={() => setPrefs(p => ({...p,tone:"friendly"}))}>Samimi</button><button className={prefs.tone === "professional" ? "active" : ""} onClick={() => setPrefs(p => ({...p,tone:"professional"}))}>Profesyonel</button></div>
            <div className="setting-divider"/><div className="settings-section-title">MODEL SEÇİMİ</div><label className="setting-label">Aktif model</label><select className="settings-select" value={prefs.model} onChange={e => setPrefs(p => ({...p,model:e.target.value}))}><option value="">Sunucu varsayılanı</option>{models.map(m => <option key={m.id} value={m.id}>{m.name}{m.vision ? " · Görsel" : ""}</option>)}</select>
            <div className="model-health"><span className={`health-dot ${configured ? "" : "offline"}`}/><div><b>{provider}</b><small>{models.length ? `${models.length} model bulundu` : modelsError || "Model kataloğu bekleniyor"}</small></div><button onClick={() => { fetch("/api/models", { cache:"no-store" }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setModels(d.models || []); setModelsError(""); }).catch(e => setModelsError(e.message)); }}>Yenile</button></div>
            <label className="setting-label spaced">Yaratıcılık seviyesi <b className="value-label">{Math.round(prefs.temperature * 100)}%</b></label><input className="range-input" type="range" min="0" max="100" value={Math.round(prefs.temperature * 100)} onChange={e => setPrefs(p => ({...p,temperature:Number(e.target.value)/100}))}/><div className="range-ends"><span>Daha tutarlı</span><span>Daha yaratıcı</span></div>
            <div className="setting-divider"/><div className="settings-section-title">GELİŞMİŞ ARAÇLAR</div><label className="toggle-setting"><span><Globe size={16}/> Web araması varsayılanı</span><input type="checkbox" checked={prefs.webSearch} onChange={e => setPrefs(p => ({...p,webSearch:e.target.checked}))}/><i/></label><label className="toggle-setting"><span><Code2 size={16}/> Kod çalıştırma varsayılanı</span><input type="checkbox" checked={prefs.codeExecution} onChange={e => setPrefs(p => ({...p,codeExecution:e.target.checked}))}/><i/></label><div className="field-hint">Bu iki araç Groq GPT-OSS 20B veya 120B modelini gerektirir. İstek başına alt kısımdaki düğmelerden de açıp kapatabilirsin.</div><div className="setting-divider"/><label className="toggle-setting"><span><Volume2 size={16}/> Yanıtları otomatik seslendir</span><input type="checkbox" checked={prefs.voiceResponses} onChange={e => setPrefs(p => ({...p,voiceResponses:e.target.checked}))}/><i/></label>
            <label className="setting-label spaced">Kişisel sistem talimatı</label><textarea className="memory-textarea" value={prefs.systemPrompt} onChange={e => setPrefs(p => ({...p,systemPrompt:e.target.value.slice(0,1800)}))} placeholder="NEXUS'un yanıtlarında uymasını istediğin ek tercihleri yaz…"/><small className="field-hint">Bu talimat her istekte modele eklenir. Parola veya gizli bilgi yazma.</small>
          </>}
          {settingsTab === "memory" && <>
            <div className="settings-section-title">KİŞİSEL HAFIZA</div><p className="settings-description">NEXUS yalnızca onayladığın kayıtları yanıtlarında kullanır. Öneriler sen onaylayana kadar etkin değildir.</p>
            <label className="setting-label">Hafıza modu</label><div className="segmented three memory-modes"><button className={prefs.memoryMode === "hybrid" ? "active" : ""} onClick={() => setPrefs(p => ({...p,memoryMode:"hybrid"}))}>Akıllı</button><button className={prefs.memoryMode === "manual" ? "active" : ""} onClick={() => setPrefs(p => ({...p,memoryMode:"manual"}))}>Manuel</button><button className={prefs.memoryMode === "off" ? "active" : ""} onClick={() => setPrefs(p => ({...p,memoryMode:"off"}))}>Kapalı</button></div>
            <div className="memory-stats"><div><b>{approvedMemory.length}</b><span>Onaylı kayıt</span></div><div><b>{prefs.memoryItems.filter(m => !m.approved).length}</b><span>Bekleyen öneri</span></div><div><b>{prefs.memoryItems.length}</b><span>Toplam kayıt</span></div></div>
            <div className="memory-add"><input value={memoryDraft} onChange={e => setMemoryDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && (addMemory(memoryDraft,memoryCategory,true),setMemoryDraft(""))} placeholder="Hatırlanmasını istediğin bilgiyi yaz…"/><select value={memoryCategory} onChange={e => setMemoryCategory(e.target.value as MemoryCategory)}><option>Profil</option><option>Tercih</option><option>Hedef</option><option>Proje</option><option>Diğer</option></select><button onClick={() => { addMemory(memoryDraft,memoryCategory,true); setMemoryDraft(""); }} disabled={!memoryDraft.trim()}><Plus size={16}/></button></div>
            <div className="memory-list">{prefs.memoryItems.slice().sort((a,b) => Number(a.approved)-Number(b.approved) || b.createdAt-a.createdAt).map(item => <div className={`memory-entry ${item.approved ? "" : "pending"}`} key={item.id}><div className="memory-entry-main"><div><span className="memory-category">{item.category}</span><span className="memory-date">{new Date(item.createdAt).toLocaleDateString("tr-TR")}</span></div>{editingMemory === item.id ? <input className="memory-edit" value={editingMemoryText} onChange={e => setEditingMemoryText(e.target.value)} onKeyDown={e => e.key === "Enter" && saveMemoryEdit(item.id)}/> : <p>{item.text}</p>}</div><div className="memory-entry-actions">{editingMemory === item.id ? <><button onClick={() => saveMemoryEdit(item.id)} title="Kaydet"><Check size={14}/></button><button onClick={() => setEditingMemory(null)} title="İptal"><X size={14}/></button></> : <><button onClick={() => {setEditingMemory(item.id);setEditingMemoryText(item.text);}} title="Düzenle"><Pencil size={14}/></button>{!item.approved && <button className="approve" onClick={() => setPrefs(p => ({...p,memoryItems:p.memoryItems.map(m => m.id === item.id ? {...m,approved:true} : m)}))} title="Onayla"><Check size={14}/></button>}<button className="delete" onClick={() => setPrefs(p => ({...p,memoryItems:p.memoryItems.filter(m => m.id !== item.id)}))} title="Sil"><Trash2 size={14}/></button></>}</div></div>)}{!prefs.memoryItems.length && <div className="memory-empty"><Brain size={24}/><b>Henüz kayıt yok</b><span>Yeni bir bilgi ekleyerek kişisel hafızanı oluştur.</span></div>}</div>
            <div className="memory-footer"><ShieldCheck size={14}/> Hafıza bu hesaba özel bulut ayarlarında saklanır.</div><button className="clear-memory-button" onClick={() => { if (window.confirm("Bu hesaptaki tüm hafıza kayıtları silinsin mi?")) setPrefs(p => ({...p, memoryItems:[]})); }}> <Trash2 size={13}/> Tüm hafızayı temizle</button>
          </>}
          {settingsTab === "account" && <>
            <div className="settings-section-title">HESAP GÜVENLİĞİ</div><div className="account-card"><div className="account-avatar">{email.charAt(0).toUpperCase() || "N"}</div><div><b>{email.split("@")[0]}</b><span>{email}</span><small><ShieldCheck size={12}/> Supabase oturumu aktif</small></div></div>
            <div className="privacy-card"><ShieldCheck size={18}/><div><b>Kullanıcı verileri ayrılmış durumda</b><p>Sohbet ve ayar kayıtları oturum açmış kullanıcının kimliğiyle saklanır. Veritabanı erişimi ayrıca RLS politikalarıyla sınırlandırılmalıdır.</p></div></div>
            <div className="account-actions"><button onClick={exportAll}><Download size={15}/> Tüm verilerimi yedekle (.json)</button><button onClick={() => importRef.current?.click()}><Upload size={15}/> Yedek dosyası içe aktar</button><input hidden ref={importRef} type="file" accept="application/json,.json" onChange={e => void importBackup(e.target.files?.[0])}/><button onClick={clearAllChats}><Trash2 size={15}/> Tüm sohbetleri sil</button><button className="logout-action" onClick={logout}><LogOut size={15}/> Hesaptan çıkış yap</button></div>
          </>}
          {settingsTab === "system" && <>
            <div className="settings-section-title">SİSTEM DURUMU</div><div className="system-status-card"><span className={`health-dot ${configured ? "" : "offline"}`}/><div><b>{configured ? "AI bağlantısı yapılandırılmış" : "AI bağlantısı yapılandırılmamış"}</b><small>{provider} · {prefs.model || "Sunucu varsayılanı"}</small></div></div>
            {[ ["Uygulama sürümü","NEXUS AI 3.0"], ["Hesap oturumu", "Aktif"], ["Hafıza kayıtları", String(prefs.memoryItems.length)], ["Sohbet sayısı", String(chats.length)], ["Model kataloğu", `${models.length} model`] ].map(([k,v]) => <div className="system-info-row" key={k}><span>{k}</span><b>{v}</b></div>)}
            {modelsError && <p className="inline-warning">{modelsError}</p>}
            <div className="system-note"><CircleHelp size={15}/> Web araması ve çevrimiçi kaynak taraması bu pakette etkin değil. Böyle bir özellik eklemek için ayrı bir arama sağlayıcısı ve sunucu anahtarı gerekir.</div>
          </>}
        </div></div>
        <footer className="settings-footer"><span><CheckCheck size={14}/> Değişiklikler otomatik kaydedilir</span><button className="done-button" onClick={() => setShowSettings(false)}>Tamam</button></footer>
      </section></div>}
    </main>
  );
}
