"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Download,
  Eye,
  Menu,
  Moon,
  PanelRight,
  Search,
  SlidersHorizontal,
  Sun,
  Zap,
} from "lucide-react";
import { Gem, ModelInfo } from "../types/nexus";
import { renderGemIcon } from "./Sidebar";

type TopBarProps = {
  chatTitle: string;
  activeGem?: Gem;
  provider: string;
  selectedModelId: string;
  models: ModelInfo[];
  onSelectModel: (modelId: string) => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  canvasOpen: boolean;
  onToggleCanvas: () => void;
  onExportChat: () => void;
  onOpenSettings: () => void;
  onMenuToggle: () => void;
};

export function TopBar({
  chatTitle,
  activeGem,
  provider,
  selectedModelId,
  models,
  onSelectModel,
  theme,
  onToggleTheme,
  canvasOpen,
  onToggleCanvas,
  onExportChat,
  onOpenSettings,
  onMenuToggle,
}: TopBarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "free" | "vision">("all");
  const [query, setQuery] = useState("");
  const popRef = useRef<HTMLDivElement>(null);
  const modelButtonRef=useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onClickOutside(e: PointerEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("pointerdown", onClickOutside);
    }
    return () => document.removeEventListener("pointerdown", onClickOutside);
  }, [dropdownOpen]);

  const currentModel = models.find((m) => m.id === selectedModelId);
  const displayModelName = selectedModelId==="auto"?"NEXUS Auto":currentModel?.name || selectedModelId || `${provider} Varsayılan`;

  const filteredModels = models.filter((m) => {
    if (filter === "free" && !m.free) return false;
    if (filter === "vision" && !m.vision) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      return m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <header className="topbar">
      <button type="button" className="icon-button" onClick={onMenuToggle} title="Menü">
        <Menu size={18} />
      </button>

      <div className="topbar-context">
        <span className="topbar-dot" />
        <span>{chatTitle || "NEXUS"}</span>
        {activeGem && (
          <span className="topbar-gem-pill">
            {renderGemIcon(activeGem.icon, 12)} {activeGem.name}
          </span>
        )}
      </div>

      <div className="topbar-right">
        {/* Searchable Model Switcher Popover */}
        <div className="model-switcher-wrap" ref={popRef} onKeyDown={e=>{if(e.key==="Escape"&&dropdownOpen){e.preventDefault();setDropdownOpen(false);modelButtonRef.current?.focus();}}}>
          <button
            type="button"
            className="model-switcher-btn"
            onClick={() => setDropdownOpen((v) => !v)}
            ref={modelButtonRef}
            aria-expanded={dropdownOpen}
            aria-controls={dropdownOpen?"nx52-model-options":undefined}
            title="Model seç"
          >
            <Zap size={13} />
            <span>{displayModelName}</span>
            <ChevronDown size={13} />
          </button>

          {dropdownOpen && (
            <div className="model-popover" id="nx52-model-options" role="region" aria-label="Model seçimi">
              <div className="model-popover-search">
                <Search size={14} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Model ara"
                  placeholder="Model ara (ör. gemini, qwen, llama)…"
                  autoFocus
                />
              </div>

              <div className="model-popover-filters">
                <button
                  type="button"
                  className={filter === "all" ? "active" : ""}
                  onClick={() => setFilter("all")}
                >
                  Tümü ({models.length})
                </button>
                <button
                  type="button"
                  className={filter === "free" ? "active" : ""}
                  onClick={() => setFilter("free")}
                >
                  Ücretsiz
                </button>
                <button
                  type="button"
                  className={filter === "vision" ? "active" : ""}
                  onClick={() => setFilter("vision")}
                >
                  Görsel
                </button>
              </div>

              <div className="model-popover-list">
                <button type="button" className={`model-option ${!selectedModelId||selectedModelId==="auto"?"selected":""}`} aria-pressed={!selectedModelId||selectedModelId==="auto"} onClick={()=>{onSelectModel("auto");setDropdownOpen(false);modelButtonRef.current?.focus();}}>
                  <div><b>NEXUS Auto</b><small>Uygun ücretsiz modeli sunucu seçer</small></div>{(!selectedModelId||selectedModelId==="auto")&&<Check size={14}/>}
                </button>
                {filteredModels.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={selectedModelId===m.id}
                    className={`model-option ${selectedModelId === m.id ? "selected" : ""}`}
                    onClick={() => {
                      onSelectModel(m.id);
                      setDropdownOpen(false);
                      modelButtonRef.current?.focus();
                    }}
                  >
                    <div>
                      <b>{m.name}</b>
                      <small>
                        {m.contextLength ? `${Math.round(m.contextLength / 1024)}K bağlam` : m.id}
                        {m.free ? " · Ücretsiz" : ""}
                      </small>
                    </div>
                    <div className="model-option-badges">
                      {m.vision && (
                        <span title="Görsel analizi destekler">
                          <Eye size={13} />
                        </span>
                      )}
                      {selectedModelId === m.id && <Check size={14} />}
                    </div>
                  </button>
                ))}

                {filteredModels.length === 0 && (
                  <div className="model-popover-empty">Eşleşen model bulunamadı.</div>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          className={`icon-button ${canvasOpen ? "active-icon-btn" : ""}`}
          onClick={onToggleCanvas}
          title="NEXUS Canvas çalışma alanı"
        >
          <PanelRight size={17} />
        </button>

        <button
          type="button"
          className="icon-button"
          onClick={onToggleTheme}
          title="Temayı değiştir"
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button
          type="button"
          className="icon-button"
          onClick={onExportChat}
          title="Sohbeti dışa aktar"
        >
          <Download size={17} />
        </button>

        <button
          type="button"
          className="icon-button"
          onClick={onOpenSettings}
          title="Ayarlar"
        >
          <SlidersHorizontal size={17} />
        </button>
      </div>
    </header>
  );
}