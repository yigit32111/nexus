"use client";

import { RefObject, useState } from "react";
import {
  Activity,
  BarChart3,
  Brain,
  Check,
  CheckCheck,
  CircleHelp,
  Code2,
  Download,
  Globe,
  LogOut,
  Moon,
  Pencil,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Trash2,
  Upload,
  Volume2,
  X,
} from "lucide-react";
import { EMPTY_USAGE_STATS, MemoryCategory, ModelInfo, Prefs } from "../types/nexus";

type SettingsModalProps = {
  tab: "general" | "gems" | "memory" | "analytics" | "account" | "system";
  onChangeTab: (tab: "general" | "gems" | "memory" | "analytics" | "account" | "system") => void;
  onClose: () => void;
  prefs: Prefs;
  onUpdatePrefs: (updater: (prev: Prefs) => Prefs) => void;
  models: ModelInfo[];
  modelsError: string;
  onRefreshModels: () => void;
  provider: string;
  configured: boolean;
  isGroqProvider: boolean;
  chatsCount: number;
  email: string;
  importRef: RefObject<HTMLInputElement | null>;
  onExportAll: () => void;
  onImportBackup: (file?: File) => void;
  onClearAllChats: () => void;
  onLogout: () => void;
  onAddMemory: (text: string, category: MemoryCategory, approved?: boolean) => void;
};

export function SettingsModal({
  tab,
  onChangeTab,
  onClose,
  prefs,
  onUpdatePrefs,
  models,
  modelsError,
  onRefreshModels,
  provider,
  configured,
  isGroqProvider,
  chatsCount,
  email,
  importRef,
  onExportAll,
  onImportBackup,
  onClearAllChats,
  onLogout,
  onAddMemory,
}: SettingsModalProps) {
  const [memoryDraft, setMemoryDraft] = useState("");
  const [memoryCategory, setMemoryCategory] = useState<MemoryCategory>("Diğer");
  const [editingMemory, setEditingMemory] = useState<string | null>(null);
  const [editingMemoryText, setEditingMemoryText] = useState("");

  const approvedMemory = prefs.memoryItems.filter((m) => m.approved);
  const stats = prefs.usageStats || EMPTY_USAGE_STATS;
  const totalTokens = stats.totalPromptTokens + stats.totalCompletionTokens;
  const modelEntries = Object.entries(stats.byModel || {}).sort(
    (a, b) => b[1].tokens - a[1].tokens
  );

  function saveMemoryEdit(id: string) {
    const value = editingMemoryText.trim().replace(/\s+/g, " ");
    if (value) {
      onUpdatePrefs((p) => ({
        ...p,
        memoryItems: p.memoryItems.map((m) =>
          m.id === id ? { ...m, text: value.slice(0, 240) } : m
        ),
      }));
    }
    setEditingMemory(null);
    setEditingMemoryText("");
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section className="settings-dialog">
        <header className="settings-header">
          <div>
            <div className="settings-eyebrow">NEXUS 3.2 CONTROL CENTER</div>
            <h2>Ayarlar</h2>
            <p>Çalışma alanını, hafızanı ve kullanım istatistiklerini yönet.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="settings-body">
          <nav className="settings-nav">
            <button
              type="button"
              className={tab === "general" ? "selected" : ""}
              onClick={() => onChangeTab("general")}
            >
              <SlidersHorizontal size={16} /> Genel
            </button>
            <button
              type="button"
              className={tab === "memory" ? "selected" : ""}
              onClick={() => onChangeTab("memory")}
            >
              <Brain size={16} /> Hafıza <span>{approvedMemory.length}</span>
            </button>
            <button
              type="button"
              className={tab === "analytics" ? "selected" : ""}
              onClick={() => onChangeTab("analytics")}
            >
              <BarChart3 size={16} /> Analitik
            </button>
            <button
              type="button"
              className={tab === "account" ? "selected" : ""}
              onClick={() => onChangeTab("account")}
            >
              <ShieldCheck size={16} /> Hesap ve veri
            </button>
            <button
              type="button"
              className={tab === "system" ? "selected" : ""}
              onClick={() => onChangeTab("system")}
            >
              <Activity size={16} /> Sistem
            </button>
          </nav>

          <div className="settings-content">
            {tab === "general" && (
              <>
                <div className="settings-section-title">GÖRÜNÜM</div>
                <label className="setting-label">Tema</label>
                <div className="segmented">
                  <button
                    type="button"
                    className={prefs.theme === "dark" ? "active" : ""}
                    onClick={() => onUpdatePrefs((p) => ({ ...p, theme: "dark" }))}
                  >
                    <Moon size={15} /> Koyu
                  </button>
                  <button
                    type="button"
                    className={prefs.theme === "light" ? "active" : ""}
                    onClick={() => onUpdatePrefs((p) => ({ ...p, theme: "light" }))}
                  >
                    <Sun size={15} /> Açık
                  </button>
                </div>

                <div className="setting-divider" />
                <div className="settings-section-title">YANIT TERCİHLERİ</div>
                <label className="setting-label">Yanıt uzunluğu</label>
                <div className="segmented three">
                  <button
                    type="button"
                    className={prefs.style === "concise" ? "active" : ""}
                    onClick={() => onUpdatePrefs((p) => ({ ...p, style: "concise" }))}
                  >
                    Kısa
                  </button>
                  <button
                    type="button"
                    className={prefs.style === "balanced" ? "active" : ""}
                    onClick={() => onUpdatePrefs((p) => ({ ...p, style: "balanced" }))}
                  >
                    Dengeli
                  </button>
                  <button
                    type="button"
                    className={prefs.style === "detailed" ? "active" : ""}
                    onClick={() => onUpdatePrefs((p) => ({ ...p, style: "detailed" }))}
                  >
                    Detaylı
                  </button>
                </div>

                <label className="setting-label spaced">Konuşma tonu</label>
                <div className="segmented three">
                  <button
                    type="button"
                    className={prefs.tone === "natural" ? "active" : ""}
                    onClick={() => onUpdatePrefs((p) => ({ ...p, tone: "natural" }))}
                  >
                    Doğal
                  </button>
                  <button
                    type="button"
                    className={prefs.tone === "friendly" ? "active" : ""}
                    onClick={() => onUpdatePrefs((p) => ({ ...p, tone: "friendly" }))}
                  >
                    Samimi
                  </button>
                  <button
                    type="button"
                    className={prefs.tone === "professional" ? "active" : ""}
                    onClick={() => onUpdatePrefs((p) => ({ ...p, tone: "professional" }))}
                  >
                    Profesyonel
                  </button>
                </div>

                <div className="setting-divider" />
                <div className="settings-section-title">MODEL SEÇİMİ</div>
                <label className="setting-label">Aktif model</label>
                <select
                  className="settings-select"
                  value={prefs.model}
                  onChange={(e) => onUpdatePrefs((p) => ({ ...p, model: e.target.value }))}
                >
                  <option value="">Sunucu varsayılanı</option>
                  <option value="auto">NEXUS Auto (ücretsiz)</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.vision ? " · Görsel" : ""}
                      {m.free ? " · Ücretsiz" : ""}
                    </option>
                  ))}
                </select>
                <div className="model-health">
                  <span className={`health-dot ${configured ? "" : "offline"}`} />
                  <div>
                    <b>{provider}</b>
                    <small>
                      {models.length
                        ? `${models.length} model bulundu`
                        : modelsError || "Model kataloğu bekleniyor"}
                    </small>
                  </div>
                  <button type="button" onClick={onRefreshModels}>
                    Yenile
                  </button>
                </div>

                <label className="setting-label spaced">
                  Yaratıcılık seviyesi{" "}
                  <b className="value-label">{Math.round(prefs.temperature * 100)}%</b>
                </label>
                <input
                  className="range-input"
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(prefs.temperature * 100)}
                  onChange={(e) =>
                    onUpdatePrefs((p) => ({ ...p, temperature: Number(e.target.value) / 100 }))
                  }
                />

                <div className="setting-divider" />
                <div className="settings-section-title">GELİŞMİŞ ARAÇLAR</div>
                <label className="toggle-setting">
                  <span>
                    <Globe size={16} /> Web araması varsayılanı
                  </span>
                  <input
                    type="checkbox"
                    checked={prefs.webSearch}
                    onChange={(e) =>
                      onUpdatePrefs((p) => ({ ...p, webSearch: e.target.checked }))
                    }
                  />
                </label>
                {isGroqProvider && (
                  <label className="toggle-setting">
                    <span>
                      <Code2 size={16} /> Kod çalıştırma varsayılanı
                    </span>
                    <input
                      type="checkbox"
                      checked={prefs.codeExecution}
                      onChange={(e) =>
                        onUpdatePrefs((p) => ({ ...p, codeExecution: e.target.checked }))
                      }
                    />
                  </label>
                )}
                <label className="toggle-setting">
                  <span>
                    <Volume2 size={16} /> Yanıtları otomatik seslendir
                  </span>
                  <input
                    type="checkbox"
                    checked={prefs.voiceResponses}
                    onChange={(e) =>
                      onUpdatePrefs((p) => ({ ...p, voiceResponses: e.target.checked }))
                    }
                  />
                </label>

                <label className="setting-label spaced">Kişisel sistem talimatı</label>
                <textarea
                  className="memory-textarea"
                  value={prefs.systemPrompt}
                  onChange={(e) =>
                    onUpdatePrefs((p) => ({ ...p, systemPrompt: e.target.value.slice(0, 1800) }))
                  }
                  placeholder="NEXUS'un yanıtlarında uymasını istediğin ek tercihleri yaz…"
                />
              </>
            )}

            {tab === "memory" && (
              <>
                <div className="settings-section-title">KİŞİSEL HAFIZA</div>
                <p className="settings-description">
                  NEXUS yalnızca onayladığın kayıtları yanıtlarında kullanır. Otonom çıkarım açık
                  olduğunda sohbet içindeki meslek, proje ve tercih bilgilerini otomatik önerir.
                </p>

                <label className="toggle-setting">
                  <span>
                    <Brain size={16} /> Otonom hafıza çıkarımı (sohbetten otomatik algıla)
                  </span>
                  <input
                    type="checkbox"
                    checked={prefs.autoMemoryExtract}
                    onChange={(e) =>
                      onUpdatePrefs((p) => ({ ...p, autoMemoryExtract: e.target.checked }))
                    }
                  />
                </label>

                <label className="setting-label">Hafıza modu</label>
                <div className="segmented three memory-modes">
                  <button
                    type="button"
                    className={prefs.memoryMode === "hybrid" ? "active" : ""}
                    onClick={() => onUpdatePrefs((p) => ({ ...p, memoryMode: "hybrid" }))}
                  >
                    Akıllı
                  </button>
                  <button
                    type="button"
                    className={prefs.memoryMode === "manual" ? "active" : ""}
                    onClick={() => onUpdatePrefs((p) => ({ ...p, memoryMode: "manual" }))}
                  >
                    Manuel
                  </button>
                  <button
                    type="button"
                    className={prefs.memoryMode === "off" ? "active" : ""}
                    onClick={() => onUpdatePrefs((p) => ({ ...p, memoryMode: "off" }))}
                  >
                    Kapalı
                  </button>
                </div>

                <div className="memory-stats">
                  <div>
                    <b>{approvedMemory.length}</b>
                    <span>Onaylı kayıt</span>
                  </div>
                  <div>
                    <b>{prefs.memoryItems.filter((m) => !m.approved).length}</b>
                    <span>Bekleyen öneri</span>
                  </div>
                  <div>
                    <b>{prefs.memoryItems.length}</b>
                    <span>Toplam kayıt</span>
                  </div>
                </div>

                <div className="memory-add">
                  <input
                    value={memoryDraft}
                    onChange={(e) => setMemoryDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        onAddMemory(memoryDraft, memoryCategory, true);
                        setMemoryDraft("");
                      }
                    }}
                    placeholder="Hatırlanmasını istediğin bilgiyi yaz…"
                  />
                  <select
                    value={memoryCategory}
                    onChange={(e) => setMemoryCategory(e.target.value as MemoryCategory)}
                  >
                    <option>Profil</option>
                    <option>Tercih</option>
                    <option>Hedef</option>
                    <option>Proje</option>
                    <option>Diğer</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      onAddMemory(memoryDraft, memoryCategory, true);
                      setMemoryDraft("");
                    }}
                    disabled={!memoryDraft.trim()}
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div className="memory-list">
                  {prefs.memoryItems
                    .slice()
                    .sort((a, b) => Number(a.approved) - Number(b.approved) || b.createdAt - a.createdAt)
                    .map((item) => (
                      <div
                        className={`memory-entry ${item.approved ? "" : "pending"}`}
                        key={item.id}
                      >
                        <div className="memory-entry-main">
                          <div>
                            <span className="memory-category">{item.category}</span>
                            <span className="memory-date">
                              {new Date(item.createdAt).toLocaleDateString("tr-TR")}
                            </span>
                          </div>
                          {editingMemory === item.id ? (
                            <input
                              className="memory-edit"
                              value={editingMemoryText}
                              onChange={(e) => setEditingMemoryText(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && saveMemoryEdit(item.id)}
                            />
                          ) : (
                            <p>{item.text}</p>
                          )}
                        </div>
                        <div className="memory-entry-actions">
                          {editingMemory === item.id ? (
                            <>
                              <button type="button" onClick={() => saveMemoryEdit(item.id)}>
                                <Check size={14} />
                              </button>
                              <button type="button" onClick={() => setEditingMemory(null)}>
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMemory(item.id);
                                  setEditingMemoryText(item.text);
                                }}
                              >
                                <Pencil size={14} />
                              </button>
                              {!item.approved && (
                                <button
                                  type="button"
                                  className="approve"
                                  onClick={() =>
                                    onUpdatePrefs((p) => ({
                                      ...p,
                                      memoryItems: p.memoryItems.map((m) =>
                                        m.id === item.id ? { ...m, approved: true } : m
                                      ),
                                    }))
                                  }
                                >
                                  <Check size={14} />
                                </button>
                              )}
                              <button
                                type="button"
                                className="delete"
                                onClick={() =>
                                  onUpdatePrefs((p) => ({
                                    ...p,
                                    memoryItems: p.memoryItems.filter((m) => m.id !== item.id),
                                  }))
                                }
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                </div>

                <button
                  type="button"
                  className="clear-memory-button"
                  onClick={() => {
                    if (window.confirm("Tüm hafıza kayıtları silinsin mi?")) {
                      onUpdatePrefs((p) => ({ ...p, memoryItems: [] }));
                    }
                  }}
                >
                  <Trash2 size={13} /> Tüm hafızayı temizle
                </button>
              </>
            )}

            {tab === "analytics" && (
              <>
                <div className="settings-section-title">KULLANIM VE TOKEN ANALİTİĞİ</div>
                <p className="settings-description">
                  Model bazlı mesaj ve tahmini token tüketimi özeti.
                </p>

                <div className="memory-stats">
                  <div>
                    <b>{stats.totalMessages}</b>
                    <span>Toplam Yanıt</span>
                  </div>
                  <div>
                    <b>{totalTokens.toLocaleString("tr-TR")}</b>
                    <span>Tahmini Token</span>
                  </div>
                  <div>
                    <b>{stats.totalImages}</b>
                    <span>Üretilen Görsel</span>
                  </div>
                </div>

                <label className="setting-label spaced">Model Bazlı Dağılım</label>
                <div className="analytics-model-list">
                  {modelEntries.length > 0 ? (
                    modelEntries.map(([modelName, info]) => {
                      const pct =
                        totalTokens > 0 ? Math.min(100, Math.round((info.tokens / totalTokens) * 100)) : 0;
                      return (
                        <div key={modelName} className="analytics-row">
                          <div className="analytics-row-head">
                            <b>{modelName}</b>
                            <span>
                              {info.messages} yanıt · {info.tokens.toLocaleString("tr-TR")} token
                            </span>
                          </div>
                          <div className="analytics-bar-track">
                            <div className="analytics-bar-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="empty-history">Henüz kullanım verisi kaydedilmedi.</div>
                  )}
                </div>

                <button
                  type="button"
                  className="clear-memory-button"
                  onClick={() =>
                    onUpdatePrefs((p) => ({ ...p, usageStats: EMPTY_USAGE_STATS }))
                  }
                >
                  <Trash2 size={13} /> Sayaçları sıfırla
                </button>
              </>
            )}

            {tab === "account" && (
              <>
                <div className="settings-section-title">HESAP GÜVENLİĞİ</div>
                <div className="account-card">
                  <div className="account-avatar">{email.charAt(0).toUpperCase() || "N"}</div>
                  <div>
                    <b>{email.split("@")[0]}</b>
                    <span>{email}</span>
                    <small>
                      <ShieldCheck size={12} /> Supabase oturumu aktif
                    </small>
                  </div>
                </div>

                <div className="account-actions">
                  <button type="button" onClick={onExportAll}>
                    <Download size={15} /> Tüm verilerimi yedekle (.json)
                  </button>
                  <button type="button" onClick={() => importRef.current?.click()}>
                    <Upload size={15} /> Yedek dosyasını içe aktar
                  </button>
                  <input
                    hidden
                    ref={importRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={(e) => onImportBackup(e.target.files?.[0])}
                  />
                  <button type="button" onClick={onClearAllChats}>
                    <Trash2 size={15} /> Tüm sohbetleri sil
                  </button>
                  <button type="button" className="logout-action" onClick={onLogout}>
                    <LogOut size={15} /> Hesaptan çıkış yap
                  </button>
                </div>
              </>
            )}

            {tab === "system" && (
              <>
                <div className="settings-section-title">SİSTEM DURUMU</div>
                <div className="system-status-card">
                  <span className={`health-dot ${configured ? "" : "offline"}`} />
                  <div>
                    <b>
                      {configured
                        ? "AI bağlantısı yapılandırılmış"
                        : "AI bağlantısı yapılandırılmamış"}
                    </b>
                    <small>
                      {provider} · {prefs.model || "Sunucu varsayılanı"}
                    </small>
                  </div>
                </div>

                {[
                  ["Uygulama sürümü", "NEXUS AI 3.2 (RAG + Canvas 2.0 + Image + Live)"],
                  ["Hesap oturumu", "Aktif"],
                  ["Hafıza kayıtları", String(prefs.memoryItems.length)],
                  ["Özel Gem sayısı", String(prefs.gems.length)],
                  ["Sohbet sayısı", String(chatsCount)],
                  ["Model kataloğu", `${models.length} model`],
                ].map(([k, v]) => (
                  <div className="system-info-row" key={k}>
                    <span>{k}</span>
                    <b>{v}</b>
                  </div>
                ))}

                {modelsError && <p className="inline-warning">{modelsError}</p>}
                <div className="system-note">
                  <CircleHelp size={15} /> Gem Bilgi Bankası için Supabase SQL Editor üzerinde
                  20261126200000_nexus_32_features.sql betiğinin çalıştırıldığından emin ol.
                </div>
              </>
            )}
          </div>
        </div>

        <footer className="settings-footer">
          <span>
            <CheckCheck size={14} /> Değişiklikler otomatik kaydedilir
          </span>
          <button type="button" className="done-button" onClick={onClose}>
            Tamam
          </button>
        </footer>
      </section>
    </div>
  );
}