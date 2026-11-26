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
  EMPTY_USAGE_STATS,
  Gem,
  MemoryCategory,
  Message,
  ModelInfo,
  Prefs,
  RagSource,
  UploadAttachment,
} from "../types/nexus";
import {
  ALLOWED_TYPES,
  MAX_FILES,
  VISION_ID_RE,
  buildEnhancedPrompt,
  detectMemoryCandidates,
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
import { LiveVoiceModal } from "../components/LiveVoiceModal";

const CHAT_KEY = "nexus_chats_v3";
const PREF_KEY = "nexus_prefs_v3";

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
    "general" | "gems" | "memory" | "analytics" | "account" | "system"
  >("general");

  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelsError, setModelsError] = useState("");
  const [provider, setProvider] = useState("AI SAĞLAYICISI");
  const [configured, setConfigured] = useState(false);
  const [adminAccountId, setAdminAccountId] = useState("");
  const [projects, setProjects] = useState<{id:string;name:string}[]>([]);
  const [projectFilter, setProjectFilter] = useState("");

  const [files, setFiles] = useState<UploadAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [notice, setNotice] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const [liveVoiceOpen, setLiveVoiceOpen] = useState(false);

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
            Boolean(c.archived) === archiveView && (!projectFilter || c.projectId === projectFilter) &&
            c.title.toLocaleLowerCase("tr-TR").includes(search.toLocaleLowerCase("tr-TR"))
        )
        .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.updatedAt - a.updatedAt),
    [chats, archiveView, search, projectFilter]
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
        .select("id,title,messages,updated_at,pinned,archived,project_id")
        .eq("user_id", id)
        .order("updated_at", { ascending: false });
      if (cancelled) return;

      let localChats: Chat[] = [];
      try {
        const saved = localStorage.getItem(`${CHAT_KEY}_${id}`);
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
            projectId: typeof c.projectId === "string" ? c.projectId : undefined,
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
          projectId: typeof r.project_id==="string"?r.project_id:undefined,
        }));
        setSyncStatus("Buluttan yüklendi");
      } else if (localChats.length) {
        loadedChats = localChats;
        setSyncStatus("Yerel yedekten yüklendi");
      } else {
        loadedChats = [newChat()];
        setSyncStatus("Hazır");
      }

      if (cancelled) return;
      prevChatIdsRef.current = new Set(loadedChats.map((c) => c.id));
      setChats(loadedChats);
      setActiveId(loadedChats[0]?.id || "");

      let savedPrefs: any = {};
      try {
        savedPrefs = JSON.parse(localStorage.getItem(`${PREF_KEY}_${id}`) || "{}");
      } catch {
        savedPrefs = {};
      }

      const projectResult = await supabase.from("nexus_projects").select("id,name").eq("user_id",id).order("created_at",{ascending:false}).limit(100);
      if(cancelled)return;
      if(!projectResult.error)setProjects(projectResult.data||[]);
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
        memoryItems: Array.isArray(source.memoryItems) ? source.memoryItems.slice(0, 100) : [],
        gems: Array.isArray(source.gems) ? source.gems.slice(0, 30) : [],
        usageStats: source.usageStats ? { ...EMPTY_USAGE_STATS, ...source.usageStats } : EMPTY_USAGE_STATS,
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
        setAdminAccountId(s.isAdmin === true ? String(s.accountId || "") : "");
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

    init().catch(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  useEffect(() => {
    if (!userId || loading) return;
    try {
      localStorage.setItem(`${CHAT_KEY}_${userId}`, JSON.stringify(chats));
    } catch {
      /* ignore */
    }
  }, [chats, userId, loading]);

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
      setSyncStatus(error ? "Hafıza yerel olarak kaydedildi" : "Hafıza ve ayarlar kaydedildi");
    }, 650);
    return () => window.clearTimeout(timer);
  }, [prefs, prefsLoaded, userId, loading, supabase]);

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
      if (!dirtyIds.length) return;

      const rows = chats
        .filter((c) => dirtyIds.includes(c.id))
        .map((c) => ({
          id: c.id,
          user_id: userId,
          title: c.title.slice(0, 100),
          messages: c.messages,
          pinned: Boolean(c.pinned),
          archived: Boolean(c.archived),
          project_id: c.projectId || null,
          updated_at: new Date(c.updatedAt || Date.now()).toISOString(),
        }));

      dirtyChatIdsRef.current.clear();
      if (!rows.length) return;

      const { error } = await supabase.from("nexus_chats").upsert(rows, { onConflict: "id" });
      setSyncStatus(error ? "Sohbet yerel olarak kaydedildi" : "Tüm değişiklikler eşitlendi");
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

  function updateChat(id: string, updater: (chat: Chat) => Chat) {
    markDirty(id);
    setChats((prev) => prev.map((c) => (c.id === id ? updater(c) : c)));
  }

  function patchMessages(id: string, messages: Message[]) {
    updateChat(id, (c) => ({ ...c, messages, updatedAt: Date.now() }));
  }

  function addMemory(text: string, category: MemoryCategory, approved = true) {
    const clean = text.trim().replace(/\s+/g, " ").slice(0, 240);
    if (!clean) return;
    setPrefs((p) => {
      if (
        p.memoryItems.some(
          (m) => m.text.toLocaleLowerCase("tr-TR") === clean.toLocaleLowerCase("tr-TR")
        )
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

  function recordUsage(model: string, promptTokens: number, completionTokens: number, isImage = false) {
    const today = new Date().toISOString().slice(0, 10);
    setPrefs((p) => {
      const prev = p.usageStats || EMPTY_USAGE_STATS;
      const modelPrev = prev.byModel?.[model] || { messages: 0, tokens: 0 };
      return {
        ...p,
        usageStats: {
          totalMessages: prev.totalMessages + 1,
          totalPromptTokens: prev.totalPromptTokens + promptTokens,
          totalCompletionTokens: prev.totalCompletionTokens + completionTokens,
          totalImages: prev.totalImages + (isImage ? 1 : 0),
          byModel: {
            ...prev.byModel,
            [model]: {
              messages: modelPrev.messages + 1,
              tokens: modelPrev.tokens + promptTokens + completionTokens,
            },
          },
          daily: {
            ...prev.daily,
            [today]: (prev.daily?.[today] || 0) + 1,
          },
        },
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

  async function send(
    text?: string,
    opts?: { regenerateFrom?: Message[]; editIndex?: number; liveVoice?: boolean }
  ): Promise<string> {
    const rawContent = (text ?? input).trim();
    if ((!rawContent && !files.length && !opts?.regenerateFrom) || busy || !activeChat) return "";

    const targetChatId = activeChat.id;
    const isImageRequest =
      imageMode || /^\/(?:ciz|çiz|imagine|image)\s+/i.test(rawContent);
    const cleanPrompt = rawContent.replace(/^\/(?:ciz|çiz|imagine|image)\s+/i, "").trim();

    // Image Generation Branch
    if (isImageRequest && cleanPrompt) {
      const userMsg: Message = {
        id: uid(),
        role: "user",
        content: `🎨 Görsel isteği: ${cleanPrompt}`,
        createdAt: Date.now(),
      };
      const updated = [...activeChat.messages, userMsg];
      patchMessages(targetChatId, updated);
      setInput("");
      setImageMode(false);
      setBusy(true);

      try {
        const res = await fetch("/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: cleanPrompt }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Görsel oluşturulamadı.");

        const imgMsg: Message = {
          id: uid(),
          role: "assistant",
          content: cleanPrompt,
          imageUrl: data.imageUrl,
          createdAt: Date.now(),
        };
        patchMessages(targetChatId, [...updated, imgMsg]);
        updateChat(targetChatId, (c) => ({
          ...c,
          title: c.title === "Yeni sohbet" ? titleFrom(cleanPrompt) : c.title,
        }));
        recordUsage(data.model || "flux", Math.ceil(cleanPrompt.length / 4), 1000, true);
        return "Görsel oluşturuldu.";
      } catch (err: any) {
        patchMessages(targetChatId, [
          ...updated,
          {
            id: uid(),
            role: "assistant",
            content: `**Görsel üretim hatası:** ${err?.message || "Bilinmeyen hata"}`,
            createdAt: Date.now(),
          },
        ]);
        return "";
      } finally {
        setBusy(false);
      }
    }

    const selectedFiles = [...files];
    const meta = selectedFiles.map(({ name, type, size }) => ({ name, type, size }));
    const baseMessages = opts?.regenerateFrom || activeChat.messages;

    let outgoing: Message[];
    if (opts?.regenerateFrom) {
      outgoing = baseMessages;
    } else if (opts?.editIndex !== undefined) {
      outgoing = [
        ...baseMessages.slice(0, opts.editIndex),
        { id: uid(), role: "user", content: rawContent, createdAt: Date.now(), attachments: meta },
      ];
    } else {
      outgoing = [
        ...baseMessages,
        {
          id: uid(),
          role: "user",
          content: rawContent || "Eklediğim dosyaları incele ve açıkla.",
          createdAt: Date.now(),
          attachments: meta,
        },
      ];
    }

    const userText = rawContent || "Eklediğim dosyaları incele ve açıkla.";

    if (!opts?.regenerateFrom && prefs.memoryMode === "hybrid" && !activeChat.projectId) {
      const candidates = detectMemoryCandidates(userText, prefs.autoMemoryExtract);
      for (const c of candidates) {
        addMemory(c.text, c.category, false);
      }
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

    let accumulatedContent = "";
    let accumulatedReasoning = "";
    let receivedSources: RagSource[] = [];

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
          projectId: activeChat.projectId,
          chatId: activeChat.id,
          model: effectiveModelId || undefined,
          modelSupportsVision:
            selectedModel?.vision === true || VISION_ID_RE.test(effectiveModelId),
          modelSupportsTemperature: supportsTemp,
          preferences: {
            style: prefs.style,
            tone: prefs.tone,
            temperature: prefs.temperature,
            memoryMode: prefs.memoryMode,
            historyRecall: prefs.historyRecall === true,
            systemPrompt: prefs.systemPrompt,
            gemId: activeGem?.id || "",
            gemInstruction: activeGem?.instruction || "",
            webSearch: prefs.webSearch,
            codeExecution: prefs.codeExecution,
            liveVoice: opts?.liveVoice === true,
          },
          attachments: selectedFiles,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "İstek başarısız oldu.");
      }

      const contentType = res.headers.get("content-type") || "";
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
              if (evt.type === "sources" && Array.isArray(evt.sources)) {
                receivedSources = evt.sources;
              } else if (evt.type === "reasoning" && evt.text) {
                accumulatedReasoning += evt.text;
              } else if (evt.type === "content" && evt.text) {
                accumulatedContent += evt.text;
              } else if (evt.type === "usage" && evt.usage) {
                recordUsage(
                  evt.usage.model || effectiveModelId || "default",
                  Number(evt.usage.promptTokens) || 0,
                  Number(evt.usage.completionTokens) || 0
                );
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
                            ragSources: receivedSources.length ? receivedSources : undefined,
                          }
                        : m
                    ),
                  };
                })
              );
            } catch {
              /* ignore */
            }
          }
        }
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
            ? {
                ...m,
                content: accumulatedContent,
                reasoning: accumulatedReasoning,
                ragSources: receivedSources.length ? receivedSources : undefined,
              }
            : m
        ),
      }));

      if (prefs.voiceResponses && !opts?.liveVoice && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(accumulatedContent);
        utterance.lang = "tr-TR";
        window.speechSynthesis.speak(utterance);
      }

      return accumulatedContent;
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
                  content: `**Bağlantı hatası**\n${message}`,
                }
              : m
          ),
        }));
      }
      return "";
    } finally {
      abortRef.current = null;
      setBusy(false);
      setStreamingMessageId(null);
      markDirty(targetChatId);
    }
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
    recognitionRef.current = rec;
    setIsRecording(true);
    rec.onresult = (event: any) =>
      setInput((prev) => `${prev}${prev ? " " : ""}${event.results?.[0]?.[0]?.transcript || ""}`);
    rec.onerror = () => setIsRecording(false);
    rec.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };
    rec.start();
  }

  if (loading || !userId) {
    return (
      <main className="loading-screen">
        <div className="loading-mark">
          <div className="brand-symbol">
            <Sparkles size={24} />
          </div>
          <strong>
            NEXUS<span>3.2</span>
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
        onRenameChat={(chat) => {
          const name = window.prompt("Sohbet adını yaz:", chat.title);
          if (name?.trim()) updateChat(chat.id, (c) => ({ ...c, title: name.trim().slice(0, 100) }));
        }}
        onToggleChatFlag={(id, key) =>
          updateChat(id, (c) => ({ ...c, [key]: !c[key], updatedAt: Date.now() }))
        }
        onDeleteChat={(id) => {
          if (!window.confirm("Bu sohbet silinsin mi?")) return;
          const left = chats.filter((c) => c.id !== id);
          const next = left.length ? left : [newChat()];
          if (!left.length) markDirty(next[0].id);
          setChats(next);
          if (activeId === id) setActiveId(next[0].id);
          void supabase.from("nexus_chats").delete().eq("id", id).eq("user_id", userId);
        }}
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
        onLogout={async () => {
          stopGeneration();
          await supabase.auth.signOut();
          router.replace("/login");
          router.refresh();
        }}
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
                      title: "App.jsx",
                      language: "jsx",
                      content:
                        "export default function App() {\n  const [count, setCount] = useState(0);\n  return (\n    <div className=\"p-8 text-center\">\n      <h1 className=\"text-2xl font-bold mb-4\">NEXUS Canvas 2.0</h1>\n      <button onClick={() => setCount(c => c + 1)} className=\"px-4 py-2 bg-blue-600 text-white rounded-lg\">\n        Tıklandı: {count}\n      </button>\n    </div>\n  );\n}",
                    }
              )
            }
            onExportChat={() => {
              if (!activeChat) return;
              const md = activeChat.messages
                .map((m) => `## ${m.role === "user" ? "Sen" : "NEXUS"}\n\n${m.content}`)
                .join("\n\n---\n\n");
              const blob = new Blob([md], { type: "text/plain;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "nexus-sohbet.md";
              a.click();
              URL.revokeObjectURL(url);
            }}
            onOpenSettings={() => {
              setSettingsTab("general");
              setShowSettings(true);
            }}
            onMenuToggle={() => {
              if (window.innerWidth <= 820) setMobileMenu((v) => !v);
              else setSidebarOpen((v) => !v);
            }}
          />

          <div style={{display:"flex",gap:8,alignItems:"center",padding:"5px 12px",flexWrap:"wrap",fontSize:11}}>
            <button type="button" onClick={()=>router.push("/workspace")}>▣ Çalışma alanı</button>
            <select aria-label="Sohbet proje filtresi" value={projectFilter} onChange={e=>setProjectFilter(e.target.value)}><option value="">Tüm sohbetler</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
            {activeChat&&<select aria-label="Aktif sohbetin projesi" disabled={busy} value={activeChat.projectId||""} onChange={e=>{const projectId=e.target.value;updateChat(activeChat.id,c=>({...c,projectId:projectId||undefined,updatedAt:Date.now()}))}}><option value="">Projeye bağla</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>}
          </div>
          <MessageList
            activeChat={activeChat}
            activeGem={activeGem}
            email={email}
            busy={busy}
            streamingMessageId={streamingMessageId}
            endRef={endRef}
            onSelectStarterPrompt={(p) => setInput(p)}
            onTriggerFileUpload={() => fileRef.current?.click()}
            onCopyText={(t) => {
              void navigator.clipboard.writeText(t);
              setNotice("Panoya kopyalandı.");
            }}
            onEditMessage={(m) => {
              if (!activeChat) return;
              setInput(m.content);
              setEditingMessageId(m.id);
              textareaRef.current?.focus();
            }}
            onSpeakText={(t) => {
              if (!("speechSynthesis" in window)) return;
              window.speechSynthesis.cancel();
              const u = new SpeechSynthesisUtterance(t);
              u.lang = "tr-TR";
              window.speechSynthesis.speak(u);
            }}
            onRegenerate={() => {
              if (!activeChat || busy) return;
              const idx = activeChat.messages.map((m) => m.role).lastIndexOf("user");
              if (idx >= 0) void send(undefined, { regenerateFrom: activeChat.messages.slice(0, idx + 1) });
            }}
            onQuickRefine={(inst) => void send(inst)}
            onOpenCanvas={(doc) =>
              setCanvasDoc({
                ...doc,
                versions: [{ id: uid(), label: "v1", content: doc.content, createdAt: Date.now() }],
                activeVersionIndex: 0,
              })
            }
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
            imageMode={imageMode}
            onToggleImageMode={() => setImageMode((v) => !v)}
            onOpenLiveVoice={() => setLiveVoiceOpen(true)}
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
            onNotify={(msg) => setNotice(msg)}
          />
        )}
      </div>

      <LiveVoiceModal
        open={liveVoiceOpen}
        onClose={() => setLiveVoiceOpen(false)}
        onSendVoiceMessage={(transcript) => send(transcript, { liveVoice: true })}
      />

      {gemModalState.open && (
        <GemModal
          gem={gemModalState.gem}
          models={models}
          onSave={(gem) => {
            setPrefs((p) => {
              const exists = p.gems.some((g) => g.id === gem.id);
              return {
                ...p,
                gems: exists ? p.gems.map((g) => (g.id === gem.id ? gem : g)) : [gem, ...p.gems],
              };
            });
            createChat(gem.id);
          }}
          onDelete={(id) => {
            void fetch(`/api/gems/docs?gemId=${encodeURIComponent(id)}`, { method: "DELETE" });
            setPrefs((p) => ({ ...p, gems: p.gems.filter((g) => g.id !== id) }));
          }}
          onClose={() => setGemModalState({ open: false })}
        />
      )}

      {showSettings && (
        <SettingsModal
          isAdmin={Boolean(userId && adminAccountId === userId)}
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
                if (r.ok) setModels(d.models || []);
              })
              .catch(() => {});
          }}
          provider={provider}
          configured={configured}
          isGroqProvider={isGroqProvider}
          chatsCount={chats.length}
          email={email}
          importRef={importRef}
          onExportAll={() => {
            const backup = { app: "NEXUS AI", version: "3.2.0", chats, prefs };
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "nexus-3.2-yedek.json";
            a.click();
            URL.revokeObjectURL(url);
          }}
          onImportBackup={async (file) => {
            if (!file) return;
            const parsed = JSON.parse(await file.text());
            if (Array.isArray(parsed?.chats)) {
              setChats((prev) => [...parsed.chats, ...prev]);
              setNotice("Yedek içe aktarıldı.");
            }
          }}
          onClearAllChats={async () => {
            if (!window.confirm("Tüm sohbetler silinsin mi?")) return;
            await supabase.from("nexus_chats").delete().eq("user_id", userId);
            const fresh = newChat();
            markDirty(fresh.id);
            setChats([fresh]);
            setActiveId(fresh.id);
          }}
          onLogout={async () => {
            await supabase.auth.signOut();
            router.replace("/login");
          }}
          onAddMemory={addMemory}
        />
      )}
    </main>
  );
}