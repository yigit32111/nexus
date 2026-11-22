"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../utils/supabase/client";
import {
  Activity, AudioLines, Brain, Check, ChevronDown, CirclePlus, Command,
  Download, Gauge, Menu, Mic, MoreHorizontal, PanelLeftClose, Plus,
  Send, Settings, ShieldCheck, Sparkles, Trash2, Volume2, X, Zap,
  MessageSquare, SlidersHorizontal, Database, RotateCcw, Search, LogOut
} from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };
type Chat = { id: string; title: string; messages: Message[]; updatedAt: number };
type Prefs = { memory: string; style: "balanced" | "concise" | "detailed"; tone: "natural" | "professional" | "friendly"; temperature: number };
const STORE = "nexus_chats_v2";
const PREFS = "nexus_prefs_v2";
const intro: Message = { role: "assistant", content: "Merhaba. Ben NEXUS. Hazırım. Bugün ne üzerinde çalışalım?" };
const defaults: Prefs = { memory: "", style: "balanced", tone: "natural", temperature: 70 };
function newChat(): Chat {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    title: "Yeni sohbet",
    messages: [intro],
    updatedAt: Date.now()
  };
}
function titleFrom(text: string) { return text.trim().slice(0, 34) || "Yeni sohbet"; }

export default function Home() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [active, setActive] = useState("");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sidebar, setSidebar] = useState(true);
  const [settings, setSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"general" | "personal" | "system">("general");
  const [prefs, setPrefs] = useState<Prefs>(defaults);
  const [voice, setVoice] = useState(false);
  const [ready, setReady] = useState(false);
  const [booting, setBooting] = useState(true);
  const [status, setStatus] = useState("");
  const [modelInfo, setModelInfo] = useState({ model: "Yükleniyor…", provider: "AI sağlayıcısı", configured: false });
  const [search, setSearch] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const activeChat = chats.find(c => c.id === active);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    async function initialize() {
      const { data, error } = await supabase.auth.getUser();
      if (cancelled) return;

      if (error || !data.user) {
        setAuthLoading(false);
        router.replace("/login");
        return;
      }

      const id = data.user.id;
      setUserId(id);
      setUserEmail(data.user.email ?? "");

      try {
        const stored = localStorage.getItem(`${STORE}_${id}`);
        if (stored) {
          const parsed: Chat[] = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length) {
            setChats(parsed);
            setActive(parsed[0].id);
          } else {
            const c = newChat();
            setChats([c]);
            setActive(c.id);
          }
        } else {
          const c = newChat();
          setChats([c]);
          setActive(c.id);
        }
        setPrefs({ ...defaults, ...JSON.parse(localStorage.getItem(`${PREFS}_${id}`) || "{}") });
      } catch {
        const c = newChat();
        setChats([c]);
        setActive(c.id);
        setPrefs(defaults);
      }

      setReady(true);
      setAuthLoading(false);
      timer = window.setTimeout(() => setBooting(false), 1450);
      fetch("/api/status")
        .then(r => r.json())
        .then(setModelInfo)
        .catch(() => setModelInfo({
          model: "Bilinmiyor",
          provider: "Bağlantı kontrol edilemedi",
          configured: false
        }));
    }

    initialize();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [router, supabase]);

  useEffect(() => {
    if (ready && userId) localStorage.setItem(`${STORE}_${userId}`, JSON.stringify(chats));
  }, [chats, ready, userId]);
  useEffect(() => {
    if (ready && userId) localStorage.setItem(`${PREFS}_${userId}`, JSON.stringify(prefs));
  }, [prefs, ready, userId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeChat?.messages, busy]);

  const sortedChats = useMemo(() => [...chats].sort((a,b)=>b.updatedAt-a.updatedAt).filter(c => c.title.toLowerCase().includes(search.toLowerCase())), [chats, search]);
  function createChat() { const c = newChat(); setChats(prev=>[c,...prev]); setActive(c.id); setInput(""); if (window.innerWidth < 760) setSidebar(false); }
  function patchMessages(id: string, messages: Message[]) { setChats(prev=>prev.map(c=>c.id===id?{...c,messages,updatedAt:Date.now()}:c)); }
  function deleteChat(id: string) { const next=chats.filter(c=>c.id!==id); if(next.length){setChats(next); if(active===id)setActive(next[0].id);} else {const c=newChat();setChats([c]);setActive(c.id);} }
  async function send(text?: string) {
    const value=(text ?? input).trim(); if(!value || busy) return;
    let chat=activeChat; if(!chat){chat=newChat();setChats([chat]);setActive(chat.id);}
    const id=chat.id; const prior=chat.messages; const messages=[...prior,{role:"user" as const,content:value}];
    patchMessages(id,messages); setInput(""); setBusy(true); setStatus("");
    try {
      const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:messages.slice(-24),memory:prefs.memory,preferences:{style:prefs.style,tone:prefs.tone,temperature:prefs.temperature/100}})});
      const data=await res.json(); if(!res.ok) throw new Error(data.error||"İstek başarısız.");
      const answer=String(data.reply||"Yanıt alınamadı."); patchMessages(id,[...messages,{role:"assistant",content:answer}]);
      setChats(prev=>prev.map(c=>c.id===id&&c.title==="Yeni sohbet"?{...c,title:titleFrom(value)}:c));
      if(voice && "speechSynthesis" in window) { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(answer)); }
    } catch(e:unknown) { const message=e instanceof Error?e.message:"Bilinmeyen hata"; patchMessages(id,[...messages,{role:"assistant",content:`Bağlantı hatası: ${message}\n\nAPI ayarlarını (.env.local) ve sağlayıcı limitlerini kontrol et.`}]); }
    finally {setBusy(false);}
  }
  async function signOut() {
    await supabase.auth.signOut();
    setReady(false);
    setUserId("");
    router.replace("/login");
    router.refresh();
  }

  function dictate() {
    const w=window as Window & { SpeechRecognition?: new()=>any; webkitSpeechRecognition?: new()=>any }; const Speech=w.SpeechRecognition||w.webkitSpeechRecognition;
    if(!Speech){setStatus("Bu tarayıcı sesli yazmayı desteklemiyor.");return;}
    const rec=new Speech(); rec.lang="tr-TR"; rec.interimResults=false;
    rec.onresult=(e:any)=>setInput(prev=>prev+(prev?" ":"")+e.results[0][0].transcript); rec.onerror=()=>setStatus("Ses tanıma tamamlanamadı."); rec.start();
  }
  function exportChat() {
    if(!activeChat)return; const blob=new Blob([activeChat.messages.map(m=>`${m.role==="user"?"Sen":"NEXUS"}:\n${m.content}`).join("\n\n")],{type:"text/plain;charset=utf-8"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a");a.href=url;a.download=`nexus-${activeChat.title.replace(/\W+/g,"-")}.txt`;a.click();URL.revokeObjectURL(url);
  }

  if (authLoading || !ready || !userId) {
    return <main className="app-shell"><div className="boot-screen">
      <div className="boot-brand">
        <div className="boot-word">NEXUS<span>AI</span></div>
        <div className="boot-loading">OTURUM KONTROL EDİLİYOR <span>●</span></div>
      </div>
    </div></main>;
  }

  return <main className="app-shell">
    {booting && <div className="boot-screen"><div className="boot-grid"/><div className="boot-brand"><div className="boot-orb"><div/><div/><Sparkles size={29}/></div><div className="boot-word">NEXUS<span>AI</span></div><div className="boot-sub">PERSONAL INTELLIGENCE SYSTEM</div><div className="boot-progress"><i/></div><div className="boot-loading">SİSTEM BAŞLATILIYOR <span>●</span></div></div></div>}
    <aside className={`sidebar ${sidebar?"open":"closed"}`}>
      <div className="brand"><div className="brand-orb"><Sparkles size={18}/></div><div><b>NEXUS</b><small>PERSONAL AI</small></div><button className="icon-btn hide-mobile" onClick={()=>setSidebar(false)} aria-label="Paneli kapat"><PanelLeftClose size={17}/></button></div>
      <button className="new-chat" onClick={createChat}><Plus size={17}/> Yeni sohbet <span>⌘ K</span></button>
      <div className="history-heading"><div className="history-label">ÇALIŞMA ALANI</div><button className="icon-btn compact" onClick={createChat}><CirclePlus size={15}/></button></div>
      <div className="search-box"><Search size={14}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Sohbetlerde ara"/></div>
      <div className="history-label history-title">SON SOHBETLER</div>
      <div className="history-list">{sortedChats.map(c=><div key={c.id} className={`history-item ${active===c.id?"selected":""}`}><button className="history-select" onClick={()=>{setActive(c.id);if(window.innerWidth<760)setSidebar(false);}}><MessageSquare size={14}/><span>{c.title}</span></button><button className="tiny-btn" onClick={()=>deleteChat(c.id)} title="Sohbeti sil"><Trash2 size={13}/></button></div>)}</div>
      <div className="sidebar-bottom"><div className="provider-card"><div className="provider-icon"><Zap size={15}/></div><div className="provider-copy"><b>{modelInfo.provider}</b><small>{modelInfo.model}</small></div><span className={`provider-dot ${modelInfo.configured?"":"off"}`}/></div><div className="user-card"><div className="avatar">N</div><div className="user-copy"><b>{userEmail || "NEXUS kullanıcısı"}</b><small>Hesabın</small></div><button className="icon-btn" onClick={()=>setSettings(true)} title="Ayarlar"><Settings size={17}/></button><button className="icon-btn" onClick={signOut} title="Çıkış yap"><LogOut size={17}/></button></div></div>
    </aside>
    <section className="main">
      <header className="topbar"><button className="icon-btn" onClick={()=>setSidebar(!sidebar)} aria-label="Menü"><Menu size={19}/></button><div className="top-title"><span className="status-dot"/><b>NEXUS AI</b><span className="model-pill">{modelInfo.model}</span></div><div className="top-actions"><div className="secure-label"><ShieldCheck size={13}/> GÜVENLİ OTURUM</div><button className="icon-btn" onClick={exportChat} title="Sohbeti dışa aktar"><Download size={17}/></button><button className="icon-btn" onClick={()=>setSettings(true)} title="Ayarlar"><SlidersHorizontal size={18}/></button></div></header>
      <div className="conversation">
        {!activeChat || activeChat.messages.length<=1 ? <div className="welcome"><div className="welcome-kicker"><span className="status-dot"/> SİSTEM ÇEVRİMİÇİ <span className="kicker-line"/></div><div className="hero-orb"><div className="orb-halo"/><div className="orb-ring ring-one"/><div className="orb-ring ring-two"/><div className="orb-core"><Sparkles size={31}/></div><span className="orb-node node-a"/><span className="orb-node node-b"/></div><div className="welcome-eyebrow">YOUR PERSONAL INTELLIGENCE</div><h1>Merhaba, ben <em>NEXUS.</em></h1><p>Fikirlerini gerçeğe dönüştürmek, karmaşık konuları çözmek<br className="desktop-break"/> ve üretkenliğini artırmak için buradayım.</p><div className="suggestions">{[{icon:<Brain size={17}/>,title:"Bir konuyu keşfet",desc:"Merak ettiğin konuyu derinlemesine incele"},{icon:<Command size={17}/>,title:"Bir proje tasarla",desc:"Fikrini adım adım plana dönüştür"},{icon:<Activity size={17}/>,title:"Kendini organize et",desc:"Hedeflerini ve gününü planla"},{icon:<AudioLines size={17}/>,title:"Yaratıcı düşün",desc:"Yeni fikirler ve alternatifler üret"}].map((s)=><button key={s.title} onClick={()=>send(s.title)}><span className="suggestion-icon">{s.icon}</span><span className="suggestion-copy"><b>{s.title}</b><small>{s.desc}</small></span><span className="suggestion-arrow">↗</span></button>)}</div></div> : <div className="messages">{activeChat.messages.filter((m,i)=>!(i===0&&m.role==="assistant"&&m.content===intro.content)).map((m,i)=><article key={i} className={`message ${m.role}`}><div className="message-avatar">{m.role==="assistant"?<Sparkles size={15}/>:"Y"}</div><div className="message-body"><div className="message-name">{m.role==="assistant"?"NEXUS":"SEN"}</div><div className="message-text">{m.content}</div></div></article>)}{busy&&<article className="message assistant"><div className="message-avatar"><Sparkles size={15}/></div><div className="message-body"><div className="message-name">NEXUS ÜRETİYOR</div><div className="typing"><i/><i/><i/></div></div></article>}</div>}
        <div ref={endRef}/>
      </div>
      <div className="composer-wrap"><div className="composer"><textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Bir şey sor veya bir fikir anlat..." rows={1}/><div className="composer-tools"><div className="composer-left"><button className={`tool-btn ${voice?"active":""}`} onClick={()=>setVoice(!voice)} title="Yanıtları seslendir"><Volume2 size={16}/></button><button className="tool-btn" onClick={dictate} title="Sesle yaz"><Mic size={16}/></button><span className="voice-state">{voice?"SES AKTİF":"NEXUS HAZIR"}</span></div><span className="composer-hint">Enter gönder · Shift+Enter satır</span><button className="send-btn" disabled={!input.trim()||busy} onClick={()=>send()}><Send size={16}/></button></div></div><div className="composer-footer"><span><ShieldCheck size={12}/> Mesajların bu tarayıcıdaki sohbet geçmişinde saklanır.</span><span>POWERED BY {modelInfo.provider.toUpperCase()}</span></div>{status&&<div className="status-msg">{status}</div>}</div>
    </section>
    {settings&&<div className="modal-backdrop" onClick={()=>setSettings(false)}><div className="settings-modal" onClick={e=>e.stopPropagation()}><div className="settings-top"><div><div className="settings-kicker">CONTROL CENTER</div><h2>NEXUS ayarları</h2><p>Deneyimini kendi çalışma tarzına göre düzenle.</p></div><button className="icon-btn close-settings" onClick={()=>setSettings(false)}><X size={18}/></button></div><div className="settings-layout"><nav className="settings-nav"><button className={settingsTab==="general"?"active":""} onClick={()=>setSettingsTab("general")}><SlidersHorizontal size={16}/> Genel</button><button className={settingsTab==="personal"?"active":""} onClick={()=>setSettingsTab("personal")}><Brain size={16}/> Kişiselleştirme</button><button className={settingsTab==="system"?"active":""} onClick={()=>setSettingsTab("system")}><Activity size={16}/> Sistem</button></nav><div className="settings-content">
      {settingsTab==="general"&&<><div className="section-title">YANIT TERCİHLERİ</div><label className="setting-label">Cevap uzunluğu</label><div className="choice-row"><button className={prefs.style==="concise"?"chosen":""} onClick={()=>setPrefs(p=>({...p,style:"concise"}))}>Kısa</button><button className={prefs.style==="balanced"?"chosen":""} onClick={()=>setPrefs(p=>({...p,style:"balanced"}))}>Dengeli</button><button className={prefs.style==="detailed"?"chosen":""} onClick={()=>setPrefs(p=>({...p,style:"detailed"}))}>Detaylı</button></div><div className="setting-divider"/><div className="setting-label-row"><label className="setting-label">Yaratıcılık seviyesi</label><b>{prefs.temperature}%</b></div><input className="range" type="range" min="0" max="100" value={prefs.temperature} onChange={e=>setPrefs(p=>({...p,temperature:Number(e.target.value)}))}/><div className="range-labels"><span>Daha tutarlı</span><span>Daha yaratıcı</span></div><div className="setting-divider"/><div className="setting-label">Sesli yanıt</div><button className={`toggle-row ${voice?"enabled":""}`} onClick={()=>setVoice(!voice)}><span><Volume2 size={17}/> NEXUS yanıtlarını sesli okusun</span><i/></button></>}
      {settingsTab==="personal"&&<><div className="section-title">NEXUS HAFIZASI</div><label className="setting-label">Kişisel bağlam</label><textarea className="memory-input" value={prefs.memory} onChange={e=>setPrefs(p=>({...p,memory:e.target.value}))} placeholder="NEXUS'un bilmesini istediğin tercihleri, hedeflerini veya çalışma şeklini yaz..."/><p className="modal-note"><Database size={13}/> Bu bilgiler bu tarayıcıda saklanır ve yanıt oluşturulurken bağlam olarak kullanılır. Farklı cihazlarla otomatik senkronize edilmez.</p><div className="setting-divider"/><label className="setting-label">İletişim tarzı</label><div className="choice-row tone-row"><button className={prefs.tone==="natural"?"chosen":""} onClick={()=>setPrefs(p=>({...p,tone:"natural"}))}>Doğal</button><button className={prefs.tone==="friendly"?"chosen":""} onClick={()=>setPrefs(p=>({...p,tone:"friendly"}))}>Samimi</button><button className={prefs.tone==="professional"?"chosen":""} onClick={()=>setPrefs(p=>({...p,tone:"professional"}))}>Profesyonel</button></div></>}
      {settingsTab==="system"&&<><div className="section-title">SİSTEM DURUMU</div><div className="system-card"><div className="system-icon"><Zap size={18}/></div><div><b>{modelInfo.provider}</b><small>Aktif yapay zekâ sağlayıcısı</small></div><span className={`system-status ${modelInfo.configured?"":"inactive"}`}>{modelInfo.configured?"YAPILANDI":"KONTROL ET"}</span></div><div className="system-row"><span>Model</span><b>{modelInfo.model}</b></div><div className="system-row"><span>API anahtarı</span><b>{modelInfo.configured?"Sunucuda tanımlı":"Eksik"}</b></div><div className="system-row"><span>Sohbet depolama</span><b>Bu tarayıcı</b></div><div className="system-row"><span>Uygulama</span><b>NEXUS AI 2.0</b></div><p className="modal-note">API anahtarın tarayıcıya gönderilmez. Sağlayıcı ve model bilgileri sunucu ortam değişkenlerinden okunur.</p><button className="reset-button" onClick={()=>{if(confirm("Tüm sohbetleri silmek istediğine emin misin?")){localStorage.removeItem(`${STORE}_${userId}`);const c=newChat();setChats([c]);setActive(c.id);}}}><RotateCcw size={14}/> Sohbet geçmişini temizle</button></>}
      </div></div><div className="settings-footer"><span><Check size={13}/> Değişiklikler otomatik kaydedilir</span><button className="primary" onClick={()=>setSettings(false)}>Tamam</button></div></div></div>}
  </main>;
}
