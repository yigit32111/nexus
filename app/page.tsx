"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Upload } from "lucide-react";
import { createClient } from "../utils/supabase/client";
import {
  BUILTIN_GEMS,
  CanvasDoc,
  Chat,
  DEFAULT_PREFS,
  Gem,
  MemoryCategory,
  Message,
  ModelInfo,
  Prefs,
  UploadAttachment,
} from "../types/nexus";
import {
  ALLOWED_TYPES,
  MAX_FILES,
  VISION_ID_RE,
  buildEnhancedPrompt,
  detectMemoryCandidate,
  fileToDataUrl,
  newChat,
  safeMessageList,
  titleFrom,
  uid,
} from "../lib/nexus-utils";
import { Sidebar } from "../components/Sidebar";
import { TopBar } from "../components/TopBar";
import { MessageList } from "../components/MessageList";
import { Composer } from "../components/Composer";
import { CanvasPanel } from "../components/CanvasPanel";
import { GemModal } from "../components/GemModal";
import { SettingsModal } from "../components/SettingsModal";

const CHAT_KEY = "nexus_chats_v3";
const PREF_KEY = "nexus_prefs_v3";
const LEGACY_CHAT_KEY = "nexus_chats_v2";
const LEGACY_PREF_KEY = "nexus_prefs_v2";

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
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [archiveView, setArchiveView] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<
    "general" | "gems" | "memory" | "account" | "system"
  >("general");

  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelsError, setModelsError] = useState("");
  const [provider, setProvider] = useState("AI SAĞLAYICISI");
  const [configured, setConfigured] = useState(false);

  const [files, setFiles] = useState<UploadAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [notice, setNotice] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // NEXUS 3.1 Canvas & Gems state
  const [canvasDoc, setCanvasDoc] = useState<CanvasDoc | null>(null);
  const [gemModalState, setGemModalState] = useState<{ open: boolean; gem?: Gem }>({
    open: false,
  });

  const fileRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);
  const prevChatIdsRef = useRef<Set<string>>(new Set());
  const dirtyChatIdsRef = useRef<Set<string>>(new Set());

  const activeChat = chats.find((c) => c.id === activeId) || null;
  const allGems = useMemo(() => [...BUILTIN_GEMS, ...(prefs.gems || [])], [prefs.gems]);
  const activeGem = useMemo(
    () => allGems.find((g) => g.id === activeChat?.gemId),
    [allGems, activeChat?.gemId]
  );

  const visibleChats = useMemo(
    () =>
      chats
        .filter(
          (c) =>
            Boolean(c.archived) === archiveView &&
            c.title.toLocaleLowerCase("tr-TR").includes(search.toLocaleLowerCase("tr-TR"))
        )
        .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.updatedAt - a.updatedAt),
    [chats, archiveView, search]
  );

  const approvedMemory = useMemo(
    () => prefs.memoryItems.filter((m) => m.approved),
    [prefs.memoryItems]
  );
  const effectiveModelId = activeGem?.model || prefs.model;
  const selectedModel = models.find((m) => m.id === effectiveModelId);
  const isGroqProvider = provider === "GROQ";

  useEffect(() => {
    document.documentElement.dataset.theme = prefs.theme;
  }, [prefs.theme]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 190)}px`;
  }, [input]);

  // Initial load from Supabase + LocalStorage
  useEffect(() => {
    let cancelled = false;
    async function init() {
      const { data, error } = await supabase.auth.getUser();
      if (cancelled) return;
      if (error || !data.user) {
        router.replace("/login");
        setLoading(false);
        return;
      }
      const id = data.user.id;
      setUserId(id);
      setEmail(data.user.email || "");
      setSyncStatus("Bulut verileri yükleniyor");

      const cloudChatResult = await supabase
        .from("nexus_chats")
        .select("id,title,messages,updated_at,pinned,archived")
        .eq("user_id", id)
        .order("updated_at", { ascending: false });
      if (cancelled) return;

      let localChats: Chat[] = [];
      try {
        const saved =
          localStorage.getItem(`${CHAT_KEY}_${id}`) ||
          localStorage.getItem(`${LEGACY_CHAT_KEY}_${id}`);
        const json = saved ? JSON.parse(saved) : [];
        if (Array.isArray(json)) {
          localChats = json.map((c: any) => ({
            id: String(c.id || uid()),
            title: String(c.title || "Yeni sohbet"),
            messages: safeMessageList(c.messages),
            updatedAt: Number(c.updatedAt) || Date.now(),
            pinned: Boolean(c.pinned),
            archived: Boolean(c.archived),
            gemId: typeof c.gemId === "string" ? c.gemId : undefined,
          }));
        }
      } catch {
        localChats = [];
      }

      let loadedChats: Chat[] = [];
      if (!cloudChatResult.error && Array.isArray(cloudChatResult.data) && cloudChatResult.data.length) {
        const localGemMap = new Map(localChats.map((lc) => [lc.id, lc.gemId]));
        loadedChats = cloudChatResult.data.map((r: any) => ({
          id: String(r.id),
          title: String(r.title || "Yeni sohbet"),
          messages: safeMessageList(r.messages),
          updatedAt: r.updated_at ? new Date(r.updated_at).getTime() : Date.now(),
          pinned: Boolean(r.pinned),
          archived: Boolean(r.archived),
          gemId: localGemMap.get(String(r.id)),
        }));
        setSyncStatus("Buluttan yüklendi");
      } else if (localChats.length) {
        loadedChats = localChats;
        setSyncStatus(cloudChatResult.error ? "Yerel yedekten yüklendi" : "Yeni bulut alanı");
      } else {
        loadedChats = [newChat()];
        setSyncStatus(cloudChatResult.error ? "Çevrimdışı çalışma" : "Hazır");
      }

      if (cancelled) return;
      prevChatIdsRef.current = new Set(loadedChats.map((c) => c.id));
      setChats(loadedChats);
      setActiveId(loadedChats[0]?.id || "");
      try {
        localStorage.setItem(`${CHAT_KEY}_${id}`, JSON.stringify(loadedChats));
      } catch {
        /* ignore */
      }

      let savedPrefs: any = {};
      try {
        savedPrefs = JSON.parse(
          localStorage.getItem(`${PREF_KEY}_${id}`) ||
            localStorage.getItem(`${LEGACY_PREF_KEY}_${id}`) ||
            "{}"
        );
      } catch {
        savedPrefs = {};
      }

      const cloudPrefsResult = await supabase
        .from("nexus_user_settings")
        .select("prefs")
        .eq("user_id", id)
        .maybeSingle();
      if (cancelled) return;

      const source =
        cloudPrefsResult.data?.prefs && typeof cloudPrefsResult.data.prefs === "object"
          ? cloudPrefsResult.data.prefs
          : savedPrefs;

      const hydrated: Prefs = {
        ...DEFAULT_PREFS,
        ...source,
        memoryItems: Array.isArray(source.memoryItems)
          ? source.memoryItems.filter((m: any) => m && typeof m.text === "string").slice(0, 100)
          : [],
        gems: Array.isArray(source.gems)
          ? source.gems.filter((g: any) => g && typeof g.name === "string").slice(0, 30)
          : [],
        memoryMode: ["hybrid", "manual", "off"].includes(source.memoryMode)
          ? source.memoryMode
          : "hybrid",
        theme: source.theme === "light" ? "light" : "dark",
      };
      setPrefs(hydrated);
      setPrefsLoaded(true);

      const [statusResponse, modelResponse] = await Promise.all([
        fetch("/api/status", { cache: "no-store" }).catch(() => null),
        fetch("/api/models", { cache: "no-store" }).catch(() => null),
      ]);
      if (cancelled) return;

      if (statusResponse?.ok) {
        const s = await statusResponse.json();
        setProvider(String(s.provider || "AI"));
        setConfigured(Boolean(s.configured));
        if (!hydrated.model && s.model) setPrefs((p) => ({ ...p, model: String(s.model) }));
      }
      if (modelResponse?.ok) {
        const m = await modelResponse.json();
        setModels(Array.isArray(m.models) ? m.models : []);
        setModelsError(m.note || "");
      } else if (modelResponse) {
        const m = await modelResponse.json().catch(() => ({}));
        setModelsError(m.error || "Model listesi alınamadı.");
      }
      setLoading(false);
    }

    init().catch((error) => {
      console.error("NEXUS INIT ERROR", error);
      setNotice("Uygulama başlatılırken bir hata oluştu.");
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  // Persist chats to localStorage
  useEffect(() => {
    if (!userId || loading) return;
    try {
      localStorage.setItem(`${CHAT_KEY}_${userId}`, JSON.stringify(chats));
    } catch {
      setSyncStatus("Yerel kayıt alanı dolu olabilir");
    }
  }, [chats, userId, loading]);

  // Persist prefs to Supabase
  useEffect(() => {
    if (!userId || loading || !prefsLoaded) return;
    try {
      localStorage.setItem(`${PREF_KEY}_${userId}`, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
    const timer = window.setTimeout(async () => {
      const { error } = await supabase
        .from("nexus_user_settings")
        .upsert(
          { user_id: userId, prefs, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      if (error) {
        console.error("NEXUS PREFS SAVE", error);
        setSyncStatus("Hafıza yerel olarak kaydedildi");
      } else {
        setSyncStatus("Hafıza ve ayarlar kaydedildi");
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [prefs, prefsLoaded, userId, loading, supabase]);

  // Incremental Supabase chat sync (only dirty chats + deletions)
  useEffect(() => {
    if (!userId || loading || chats.length === 0 || busy) return;
    const timer = window.setTimeout(async () => {
      const currentIds = new Set(chats.map((c) => c.id));
      const deletedIds = Array.from(prevChatIdsRef.current).filter((id) => !currentIds.has(id));
      if (deletedIds.length > 0) {
        await supabase.from("nexus_chats").delete().in("id", deletedIds).eq("user_id", userId);
      }
      prevChatIdsRef.current = currentIds;

      const dirtyIds = Array.from(dirtyChatIdsRef.current);
      if (dirtyIds.length === 0) return;

      const rows = chats
        .filter((c) => dirtyIds.includes(c.id))
        .map((c) => ({
          id: c.id,
          user_id: userId,
          title: c.title.slice(0, 100),
          messages: c.messages,
          pinned: Boolean(c.pinned),
          archived: Boolean(c.archived),
          updated_at: new Date(c.updatedAt || Date.now()).toISOString(),
        }));

      dirtyChatIdsRef.current.clear();
      if (!rows.length) return;

      const { error } = await supabase.from("nexus_chats").upsert(rows, { onConflict: "id" });
      if (error) {
        console.error("NEXUS CHAT SYNC", error);
        setSyncStatus("Sohbet yerel olarak kaydedildi");
      } else {
        setSyncStatus("Tüm değişiklikler eşitlendi");
      }
    }, 850);
    return () => window.clearTimeout(timer);
  }, [chats, userId, loading, busy, supabase]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeChat?.messages.length, busy, streamingMessageId]);

  const markDirty = useCallback((id: string) => {
    dirtyChatIdsRef.current.add(id);
  }, []);

  const createChat = useCallback(
    (gemId?: string) => {
      const c = newChat(gemId);
      markDirty(c.id);
      setChats((prev) => [c, ...prev]);
      setActiveId(c.id);
      setInput("");
      setFiles([]);
      setEditingMessageId(null);
      setArchiveView(false);
      if (window.innerWidth < 820) {
        setSidebarOpen(false);
        setMobileMenu(false);
      }
    },
    [markDirty]
  );

  const submitComposerRef = useRef<() => void>(() => {});

  // Fixed keyboard shortcuts (including .sidebar-search input)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typingInField = target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        createChat();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setSidebarOpen(true);
        window.setTimeout(
          () => document.querySelector<HTMLInputElement>(".sidebar-search input")?.focus(),
          50
        );
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        submitComposerRef.current();
      }
      if (e.key === "Escape") {
        setShowSettings(false);
        setMobileMenu(false);
        setGemModalState({ open: false });
      }
      if (!typingInField && e.key === "n" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        createChat();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [createChat]);

  function updateChat(id: string, updater: (chat: Chat) => Chat) {
    markDirty(id);
    setChats((prev) => prev.map((c) => (c.id === id ? updater(c) : c)));
  }

  function patchMessages(id: string, messages: Message[]) {
    updateChat(id, (c) => ({ ...c, messages, updatedAt: Date.now() }));
  }

  function toggleChat(id: string, key: "pinned" | "archived") {
    updateChat(id, (c) => ({ ...c, [key]: !c[key], updatedAt: Date.now() }));
    if (key === "archived" && activeId === id && !chats.find((c) => c.id === id)?.archived) {
      const next = chats.find((c) => c.id !== id && !c.archived);
      if (next) setActiveId(next.id);
      else createChat();
    }
  }

  function renameChat(chat: Chat) {
    const name = window.prompt("Sohbet adını yaz:", chat.title);
    if (name?.trim()) {
      updateChat(chat.id, (c) => ({
        ...c,
        title: name.trim().slice(0, 100),
        updatedAt: Date.now(),
      }));
    }
  }

  function deleteChat(id: string) {
    if (!window.confirm("Bu sohbeti kalıcı olarak silmek istiyor musun?")) return;
    const left = chats.filter((c) => c.id !== id);
    const next = left.length ? left : [newChat()];
    if (!left.length) markDirty(next[0].id);
    setChats(next);
    if (activeId === id) setActiveId(next[0].id);
    void supabase.from("nexus_chats").delete().eq("id", id).eq("user_id", userId);
  }

  function addMemory(text: string, category: MemoryCategory, approved = true) {
    const clean = text.trim().replace(/\s+/g, " ").slice(0, 240);
    if (!clean) return;
    setPrefs((p) => {
      if (
        p.memoryItems.some((m) => m.text.toLocaleLowerCase("tr-TR") === clean.toLocaleLowerCase("tr-TR"))
      ) {
        return p;
      }
      return {
        ...p,
        memoryItems: [
          { id: uid(), text: clean, category, createdAt: Date.now(), approved },
          ...p.memoryItems,
        ].slice(0, 100),
      };
    });
  }

  async function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    const chosen = Array.from(list);
    if (files.length + chosen.length > MAX_FILES) {
      setNotice(`Bir mesajda en fazla ${MAX_FILES} dosya ekleyebilirsin.`);
      return;
    }
    const added: UploadAttachment[] = [];
    for (const file of chosen) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setNotice(`${file.name}: Bu dosya türü desteklenmiyor.`);
        continue;
      }
      const image = file.type.startsWith("image/");
      const limit = image ? 5 : file.type === "application/pdf" ? 8 : 2;
      if (file.size > limit * 1024 * 1024) {
        setNotice(`${file.name}: En fazla ${limit} MB olabilir.`);
        continue;
      }
      try {
        added.push({
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: await fileToDataUrl(file),
        });
      } catch {
        setNotice(`${file.name}: Dosya okunamadı.`);
      }
    }
    if (added.length) {
      setFiles((prev) => [...prev, ...added]);
      setNotice("");
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function stopGeneration() {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setBusy(false);
    setStreamingMessageId(null);
  }

  async function send(text?: string, opts?: { regenerateFrom?: Message[]; editIndex?: number }) {
    const content = (text ?? input).trim();
    if ((!content && !files.length && !opts?.regenerateFrom) || busy || !activeChat) return;

    const targetChatId = activeChat.id;
    const selectedFiles = [...files];
    const meta = selectedFiles.map(({ name, type, size }) => ({ name, type, size }));
    const baseMessages = opts?.regenerateFrom || activeChat.messages;

    let outgoing: Message[];
    if (opts?.regenerateFrom) {
      outgoing = baseMessages;
    } else if (opts?.editIndex !== undefined) {
      outgoing = [
        ...baseMessages.slice(0, opts.editIndex),
        { id: uid(), role: "user", content, createdAt: Date.now(), attachments: meta },
      ];
    } else {
      outgoing = [
        ...baseMessages,
        {
          id: uid(),
          role: "user",
          content: content || "Eklediğim dosyaları incele ve açıkla.",
          createdAt: Date.now(),
          attachments: meta,
        },
      ];
    }

    const userText = content || "Eklediğim dosyaları incele ve açıkla.";

    if (prefs.codeExecution && !isGroqProvider) {
      setNotice("Kod çalıştırma aracı yalnızca Groq sağlayıcısında (GPT-OSS 20B/120B) desteklenir.");
      return;
    }
    if (isGroqProvider && (prefs.webSearch || prefs.codeExecution)) {
      const toolsModel = effectiveModelId || "openai/gpt-oss-20b";
      if (!/^openai\/gpt-oss-(20b|120b)$/.test(toolsModel)) {
        setNotice(
          "Groq Web Arama ve Kod Çalıştırma araçları openai/gpt-oss-20b veya openai/gpt-oss-120b modellerini gerektirir."
        );
        return;
      }
    }

    if (!opts?.regenerateFrom && prefs.memoryMode === "hybrid") {
      const candidate = detectMemoryCandidate(userText);
      if (candidate) addMemory(candidate.text, candidate.category, false);
    }

    const assistantId = uid();
    const initialAssistant: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      reasoning: "",
      createdAt: Date.now(),
    };

    patchMessages(targetChatId, [...outgoing, initialAssistant]);
    setInput("");
    setFiles([]);
    setEditingMessageId(null);
    setBusy(true);
    setStreamingMessageId(assistantId);
    setNotice("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const supportsTemp =
        !selectedModel?.supportedParameters?.length ||
        selectedModel.supportedParameters.includes("temperature");

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          stream: true,
          messages: outgoing.map((m) => ({ role: m.role, content: m.content })),
          memory: approvedMemory.map((m) => `• [${m.category}] ${m.text}`).join("\n"),
          model: effectiveModelId || undefined,
          modelSupportsVision:
            selectedModel?.vision === true || VISION_ID_RE.test(effectiveModelId),
          modelSupportsTemperature: supportsTemp,
          preferences: {
            style: prefs.style,
            tone: prefs.tone,
            temperature: prefs.temperature,
            memoryMode: prefs.memoryMode,
            systemPrompt: prefs.systemPrompt,
            gemInstruction: activeGem?.instruction || "",
            webSearch: prefs.webSearch,
            codeExecution: prefs.codeExecution,
          },
          attachments: selectedFiles,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "İstek başarısız oldu.");
      }

      const contentType = res.headers.get("content-type") || "";
      let accumulatedContent = "";
      let accumulatedReasoning = "";

      if (contentType.includes("text/event-stream") && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() || "";

          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line.startsWith("data:")) continue;
            const payloadStr = line.slice(5).trim();
            if (payloadStr === "[DONE]") continue;

            try {
              const evt = JSON.parse(payloadStr);
              if (evt.type === "reasoning" && evt.text) {
                accumulatedReasoning += evt.text;
              } else if (evt.type === "content" && evt.text) {
                accumulatedContent += evt.text;
              }

              setChats((prev) =>
                prev.map((c) => {
                  if (c.id !== targetChatId) return c;
                  return {
                    ...c,
                    updatedAt: Date.now(),
                    messages: c.messages.map((m) =>
                      m.id === assistantId
                        ? {
                            ...m,
                            content: accumulatedContent,
                            reasoning: accumulatedReasoning,
                          }
                        : m
                    ),
                  };
                })
              );
            } catch {
              /* ignore malformed frame */
            }
          }
        }
      } else {
        const data = await res.json().catch(() => ({}));
        accumulatedContent = String(data.reply || "Yanıt alınamadı.");
        accumulatedReasoning = String(data.reasoning || "");
      }

      if (!accumulatedContent.trim()) {
        accumulatedContent = "Yanıt alınamadı. Modeli değiştirip tekrar dene.";
      }

      updateChat(targetChatId, (c) => ({
        ...c,
        title: c.title === "Yeni sohbet" ? titleFrom(userText) : c.title,
        updatedAt: Date.now(),
        messages: c.messages.map((m) =>
          m.id === assistantId
            ? { ...m, content: accumulatedContent, reasoning: accumulatedReasoning }
            : m
        ),
      }));

      if (prefs.voiceResponses && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(accumulatedContent);
        utterance.lang = "tr-TR";
        window.speechSynthesis.speak(utterance);
      }
    } catch (error: any) {
      if (error?.name === "AbortError") {
        setNotice("Yanıt oluşturma durduruldu.");
      } else {
        const message = error instanceof Error ? error.message : "Bilinmeyen hata";
        updateChat(targetChatId, (c) => ({
          ...c,
          updatedAt: Date.now(),
          messages: c.messages.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: `**Bağlantı hatası**\n${message}\n\nAPI anahtarını, modelini ve sağlayıcı limitlerini kontrol et.`,
                }
              : m
          ),
        }));
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
      setStreamingMessageId(null);
      markDirty(targetChatId);
    }
  }

  function regenerate() {
    if (!activeChat || busy) return;
    const lastUserIndex = activeChat.messages.map((m) => m.role).lastIndexOf("user");
    if (lastUserIndex < 0) return;
    void send(undefined, { regenerateFrom: activeChat.messages.slice(0, lastUserIndex + 1) });
  }

  function editMessage(message: Message) {
    if (!activeChat) return;
    const index = activeChat.messages.findIndex((m) => m.id === message.id);
    if (index < 0) return;
    setInput(message.content);
    setEditingMessageId(message.id);
    setNotice("Mesajı düzenliyorsun. Gönderdiğinde bu mesajdan sonraki yanıtlar yenilenir.");
    textareaRef.current?.focus();
  }

  function submitComposer() {
    if (editingMessageId && activeChat) {
      const idx = activeChat.messages.findIndex((m) => m.id === editingMessageId);
      if (idx >= 0) {
        void send(undefined, { editIndex: idx });
        return;
      }
    }
    void send();
  }
  submitComposerRef.current = submitComposer;

  // Fixed toggleable voice dictation
  function toggleDictate() {
    const w = window as any;
    const Speech = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Speech) {
      setNotice("Bu tarayıcı sesle yazmayı desteklemiyor.");
      return;
    }
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }
    const rec = new Speech();
    rec.lang = "tr-TR";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    recognitionRef.current = rec;
    setIsRecording(true);
    rec.onresult = (event: any) =>
      setInput((prev) => `${prev}${prev ? " " : ""}${event.results?.[0]?.[0]?.transcript || ""}`);
    rec.onerror = () => {
      setIsRecording(false);
      setNotice("Ses tanıma tamamlanamadı.");
    };
    rec.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };
    rec.start();
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Panoya kopyalandı.");
    } catch {
      setNotice("Kopyalama izni alınamadı.");
    }
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window)) {
      setNotice("Sesli okuma bu tarayıcıda desteklenmiyor.");
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "tr-TR";
    window.speechSynthesis.speak(u);
  }

  function exportActive() {
    if (!activeChat) return;
    const content = activeChat.messages
      .map(
        (m) =>
          `${m.role === "user" ? "## Sen" : "## NEXUS"}\n\n${m.content}${
            m.attachments?.length
              ? `\n\nDosyalar: ${m.attachments.map((a) => a.name).join(", ")}`
              : ""
          }`
      )
      .join("\n\n---\n\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    downloadBlob(
      blob,
      `nexus-${activeChat.title.replace(/[^a-z0-9-_ğüşöçıİĞÜŞÖÇ]+/gi, "-").slice(0, 45)}.md`
    );
  }

  function exportAll() {
    const backup = {
      app: "NEXUS AI",
      version: "3.1.0",
      exportedAt: new Date().toISOString(),
      chats,
      prefs,
    };
    downloadBlob(
      new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }),
      `nexus-yedek-${new Date().toISOString().slice(0, 10)}.json`
    );
  }

  function downloadBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importBackup(file?: File) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const incoming = Array.isArray(parsed) ? parsed : parsed.chats;
      if (!Array.isArray(incoming)) throw new Error("Yedek dosyasında sohbet listesi bulunamadı.");
      const imported: Chat[] = incoming
        .slice(0, 500)
        .filter((c: any) => c && Array.isArray(c.messages))
        .map((c: any) => {
          const newId = uid();
          markDirty(newId);
          return {
            id: newId,
            title: String(c.title || "İçe aktarılan sohbet").slice(0, 100),
            messages: safeMessageList(c.messages),
            updatedAt: Date.now(),
            pinned: Boolean(c.pinned),
            archived: Boolean(c.archived),
          };
        });
      if (!imported.length) throw new Error("İçe aktarılabilecek sohbet bulunamadı.");
      setChats((prev) => [...imported, ...prev]);
      setActiveId(imported[0].id);
      setNotice(`${imported.length} sohbet içe aktarıldı.`);
      if (parsed.prefs && typeof parsed.prefs === "object") {
        setPrefs((p) => ({
          ...p,
          ...parsed.prefs,
          memoryItems: Array.isArray(parsed.prefs.memoryItems)
            ? parsed.prefs.memoryItems.slice(0, 100)
            : p.memoryItems,
        }));
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Yedek dosyası okunamadı.");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  }

  async function logout() {
    stopGeneration();
    await supabase.auth.signOut();
    setChats([]);
    setPrefs(DEFAULT_PREFS);
    setUserId("");
    setEmail("");
    router.replace("/login");
    router.refresh();
  }

  async function clearAllChats() {
    if (
      !window.confirm(
        "Tüm sohbetlerin bu hesaptan silinecek. Bu işlem geri alınamaz. Devam edilsin mi?"
      )
    )
      return;
    await supabase.from("nexus_chats").delete().eq("user_id", userId);
    const fresh = newChat();
    prevChatIdsRef.current = new Set([fresh.id]);
    markDirty(fresh.id);
    setChats([fresh]);
    setActiveId(fresh.id);
    setNotice("Sohbet geçmişi temizlendi.");
  }

  function handleSaveGem(gem: Gem) {
    setPrefs((p) => {
      const exists = p.gems.some((g) => g.id === gem.id);
      return {
        ...p,
        gems: exists ? p.gems.map((g) => (g.id === gem.id ? gem : g)) : [gem, ...p.gems],
      };
    });
    createChat(gem.id);
  }

  function handleDeleteGem(id: string) {
    setPrefs((p) => ({ ...p, gems: p.gems.filter((g) => g.id !== id) }));
  }

  if (loading || !userId) {
    return (
      <main className="loading-screen">
        <div className="loading-mark">
          <div className="brand-symbol">
            <Sparkles size={24} />
          </div>
          <strong>
            NEXUS<span>3.1</span>
          </strong>
          <small>ÇALIŞMA ALANI HAZIRLANIYOR</small>
          <i />
        </div>
      </main>
    );
  }

  return (
    <main
      className={`nexus-app ${sidebarOpen ? "sidebar-visible" : "sidebar-hidden"} ${
        canvasDoc ? "canvas-active" : ""
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setIsDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        void handleFiles(e.dataTransfer.files);
      }}
    >
      {isDragging && (
        <div className="drag-overlay">
          <div className="drag-overlay-card">
            <Upload size={28} />
            <b>Dosyaları buraya bırak</b>
            <span>PDF, TXT, PNG, JPG veya WEBP ekleyebilirsin</span>
          </div>
        </div>
      )}

      <Sidebar
        mobileMenu={mobileMenu}
        onCloseMobile={() => setMobileMenu(false)}
        onCollapseSidebar={() => {
          setSidebarOpen(false);
          setMobileMenu(false);
        }}
        onCreateChat={createChat}
        search={search}
        onSearchChange={setSearch}
        archiveView={archiveView}
        onToggleArchiveView={() => setArchiveView((v) => !v)}
        visibleChats={visibleChats}
        activeId={activeId}
        onSelectChat={(id) => {
          setActiveId(id);
          if (window.innerWidth <= 820) setMobileMenu(false);
        }}
        onRenameChat={renameChat}
        onToggleChatFlag={toggleChat}
        onDeleteChat={deleteChat}
        gems={allGems}
        activeGemId={activeChat?.gemId}
        onOpenGemModal={(gem) => setGemModalState({ open: true, gem })}
        syncStatus={syncStatus}
        approvedMemoryCount={approvedMemory.length}
        onOpenSettings={(t) => {
          setSettingsTab(t);
          setShowSettings(true);
          setMobileMenu(false);
        }}
        email={email}
        onLogout={logout}
      />

      <div className="workspace-split">
        <section className="main-area">
          <TopBar
            chatTitle={activeChat?.title || "NEXUS"}
            activeGem={activeGem}
            provider={provider}
            selectedModelId={effectiveModelId}
            models={models}
            onSelectModel={(modelId) => setPrefs((p) => ({ ...p, model: modelId }))}
            theme={prefs.theme}
            onToggleTheme={() =>
              setPrefs((p) => ({ ...p, theme: p.theme === "dark" ? "light" : "dark" }))
            }
            canvasOpen={Boolean(canvasDoc)}
            onToggleCanvas={() =>
              setCanvasDoc((prev) =>
                prev
                  ? null
                  : {
                      title: "taslak.md",
                      language: "markdown",
                      content: "# NEXUS Canvas\n\nBurada kod veya metin düzenleyebilirsin.",
                    }
              )
            }
            onExportChat={exportActive}
            onOpenSettings={() => {
              setSettingsTab("general");
              setShowSettings(true);
            }}
            onMenuToggle={() => {
              if (window.innerWidth <= 820) setMobileMenu((v) => !v);
              else setSidebarOpen((v) => !v);
            }}
          />

          <MessageList
            activeChat={activeChat}
            activeGem={activeGem}
            email={email}
            busy={busy}
            streamingMessageId={streamingMessageId}
            endRef={endRef}
            onSelectStarterPrompt={(p) => setInput(p)}
            onTriggerFileUpload={() => fileRef.current?.click()}
            onCopyText={(t) => void copyText(t)}
            onEditMessage={editMessage}
            onSpeakText={speak}
            onRegenerate={regenerate}
            onQuickRefine={(inst) => void send(inst)}
            onOpenCanvas={(doc) => setCanvasDoc(doc)}
          />

          <Composer
            input={input}
            onInputChange={setInput}
            onSubmit={submitComposer}
            onStop={stopGeneration}
            busy={busy}
            notice={notice}
            onClearNotice={() => setNotice("")}
            editingMessageId={editingMessageId}
            onCancelEdit={() => {
              setEditingMessageId(null);
              setInput("");
              setNotice("");
            }}
            files={files}
            onRemoveFile={(idx) => setFiles((prev) => prev.filter((_, j) => j !== idx))}
            onFilesSelected={(list) => void handleFiles(list)}
            fileRef={fileRef}
            textareaRef={textareaRef}
            isRecording={isRecording}
            onToggleDictate={toggleDictate}
            webSearch={prefs.webSearch}
            onToggleWebSearch={() => setPrefs((p) => ({ ...p, webSearch: !p.webSearch }))}
            codeExecution={prefs.codeExecution}
            onToggleCodeExecution={() =>
              setPrefs((p) => ({ ...p, codeExecution: !p.codeExecution }))
            }
            isGroqProvider={isGroqProvider}
            onEnhancePrompt={() => setInput(buildEnhancedPrompt(input))}
            modelLabel={effectiveModelId}
          />
        </section>

        {canvasDoc && (
          <CanvasPanel
            doc={canvasDoc}
            onChange={setCanvasDoc}
            onClose={() => setCanvasDoc(null)}
            onAskNexusRefine={(prompt) => void send(prompt)}
          />
        )}
      </div>

      {gemModalState.open && (
        <GemModal
          gem={gemModalState.gem}
          models={models}
          onSave={handleSaveGem}
          onDelete={handleDeleteGem}
          onClose={() => setGemModalState({ open: false })}
        />
      )}

      {showSettings && (
        <SettingsModal
          tab={settingsTab}
          onChangeTab={setSettingsTab}
          onClose={() => setShowSettings(false)}
          prefs={prefs}
          onUpdatePrefs={setPrefs}
          models={models}
          modelsError={modelsError}
          onRefreshModels={() => {
            fetch("/api/models", { cache: "no-store" })
              .then(async (r) => {
                const d = await r.json();
                if (!r.ok) throw new Error(d.error);
                setModels(d.models || []);
                setModelsError("");
              })
              .catch((e) => setModelsError(e.message));
          }}
          provider={provider}
          configured={configured}
          isGroqProvider={isGroqProvider}
          chatsCount={chats.length}
          email={email}
          importRef={importRef}
          onExportAll={exportAll}
          onImportBackup={(f) => void importBackup(f)}
          onClearAllChats={() => void clearAllChats()}
          onLogout={() => void logout()}
          onAddMemory={addMemory}
        />
      )}
    </main>
  );
}