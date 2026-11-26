"use client";

import { useState } from "react";
import { Sparkles, Trash2, X } from "lucide-react";
import { Gem, ModelInfo } from "../types/nexus";
import { uid } from "../lib/nexus-utils";
import { renderGemIcon } from "./Sidebar";

type GemModalProps = {
  gem?: Gem;
  models: ModelInfo[];
  onSave: (gem: Gem) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
};

const ICONS: Gem["icon"][] = ["sparkles", "code", "search", "pen", "graduation"];

export function GemModal({ gem, models, onSave, onDelete, onClose }: GemModalProps) {
  const [name, setName] = useState(gem?.name || "");
  const [description, setDescription] = useState(gem?.description || "");
  const [instruction, setInstruction] = useState(gem?.instruction || "");
  const [icon, setIcon] = useState<Gem["icon"]>(gem?.icon || "sparkles");
  const [model, setModel] = useState(gem?.model || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !instruction.trim()) return;
    onSave({
      id: gem?.id || uid(),
      name: name.trim().slice(0, 48),
      description: description.trim().slice(0, 120) || "Özel NEXUS asistanı",
      instruction: instruction.trim().slice(0, 2000),
      icon,
      model: model || undefined,
    });
    onClose();
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section className="gem-dialog">
        <header className="settings-header">
          <div>
            <div className="settings-eyebrow">NEXUS GEMS</div>
            <h2>{gem ? "Gem'i Düzenle" : "Yeni Gem Oluştur"}</h2>
            <p>Belirli bir görev veya uzmanlık alanı için özel yapay zekâ personası tanımla.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="gem-form">
          <label className="setting-label">İkon ve Ad</label>
          <div className="gem-name-row">
            <div className="gem-icon-picker">
              {ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  className={icon === ic ? "active" : ""}
                  onClick={() => setIcon(ic)}
                >
                  {renderGemIcon(ic, 15)}
                </button>
              ))}
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: React Uzmanı, İngilizce Koçu…"
              required
            />
          </div>

          <label className="setting-label">Kısa Açıklama</label>
          <input
            className="gem-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Bu asistan ne yapar?"
          />

          <label className="setting-label">Sistem Talimatları (Persona)</label>
          <textarea
            className="memory-textarea"
            rows={5}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Asistanın rolünü, yanıt formatını ve kurallarını yaz…"
            required
          />

          <label className="setting-label">Varsayılan Model (İsteğe bağlı)</label>
          <select
            className="settings-select"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            <option value="">Aktif genel modeli kullan</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <footer className="gem-form-footer">
            {gem && !gem.builtIn && onDelete ? (
              <button
                type="button"
                className="clear-memory-button"
                style={{ marginTop: 0 }}
                onClick={() => {
                  onDelete(gem.id);
                  onClose();
                }}
              >
                <Trash2 size={14} /> Gem'i Sil
              </button>
            ) : (
              <span />
            )}

            <button type="submit" className="done-button">
              <Sparkles size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
              Kaydet
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}