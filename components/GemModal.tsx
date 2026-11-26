"use client";

import { useRef, useState } from "react";
import { FileText, FileUp, Sparkles, Trash2, X } from "lucide-react";
import { Gem, GemDocMeta, ModelInfo } from "../types/nexus";
import { bytesLabel, fileToDataUrl, uid } from "../lib/nexus-utils";
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
  const [gemId] = useState(() => gem?.id || uid());
  const [name, setName] = useState(gem?.name || "");
  const [description, setDescription] = useState(gem?.description || "");
  const [instruction, setInstruction] = useState(gem?.instruction || "");
  const [icon, setIcon] = useState<Gem["icon"]>(gem?.icon || "sparkles");
  const [model, setModel] = useState(gem?.model || "");
  const [documents, setDocuments] = useState<GemDocMeta[]>(gem?.documents || []);
  const [uploading, setUploading] = useState(false);
  const [docError, setDocError] = useState("");
  const docInputRef = useRef<HTMLInputElement>(null);

  async function handleDocUpload(list: FileList | null) {
    if (!list?.length) return;
    setUploading(true);
    setDocError("");

    try {
      for (const file of Array.from(list).slice(0, 4)) {
        const dataUrl = await fileToDataUrl(file);
        const res = await fetch("/api/gems/docs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gemId,
            fileName: file.name,
            fileType: file.type || "text/plain",
            dataUrl,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Doküman yüklenemedi.");
        setDocuments((prev) => [
          ...prev,
          { id: data.id, name: data.name, size: data.size, chunkCount: data.chunkCount },
        ]);
      }
    } catch (err: any) {
      setDocError(err?.message || "Dosya eklenemedi.");
    } finally {
      setUploading(false);
      if (docInputRef.current) docInputRef.current.value = "";
    }
  }

  async function handleRemoveDoc(docId: string) {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    await fetch(`/api/gems/docs?docId=${encodeURIComponent(docId)}`, {
      method: "DELETE",
    }).catch(() => {});
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !instruction.trim()) return;
    onSave({
      id: gemId,
      name: name.trim().slice(0, 48),
      description: description.trim().slice(0, 120) || "Özel NEXUS asistanı",
      instruction: instruction.trim().slice(0, 2000),
      icon,
      model: model || undefined,
      documents,
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
            <div className="settings-eyebrow">NEXUS GEMS · BİLGİ BANKASI</div>
            <h2>{gem ? "Gem'i Düzenle" : "Yeni Gem Oluştur"}</h2>
            <p>Özel sistem talimatı ve kalıcı referans dosyaları (RAG) tanımla.</p>
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
              placeholder="Örn: Hukuk Danışmanı, Proje Mimarı…"
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
            rows={4}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Asistanın rolünü, yanıt formatını ve kurallarını yaz…"
            required
          />

          {/* Knowledge Base RAG Files */}
          <label className="setting-label">Bilgi Bankası Dosyaları (PDF / TXT / MD)</label>
          <div className="gem-kb-box">
            <input
              ref={docInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.md"
              hidden
              onChange={(e) => void handleDocUpload(e.target.files)}
            />
            <button
              type="button"
              className="gem-kb-upload-btn"
              onClick={() => docInputRef.current?.click()}
              disabled={uploading}
            >
              <FileUp size={15} />
              <span>{uploading ? "Parçalanıp indeksleniyor…" : "Referans Dosya Ekle"}</span>
            </button>

            {docError && <p className="inline-warning" style={{ margin: "6px 0 0" }}>{docError}</p>}

            {documents.length > 0 && (
              <div className="gem-kb-list">
                {documents.map((d) => (
                  <div key={d.id} className="gem-kb-item">
                    <FileText size={13} />
                    <span>{d.name}</span>
                    <small>
                      {bytesLabel(d.size)} · {d.chunkCount} parça
                    </small>
                    <button
                      type="button"
                      onClick={() => void handleRemoveDoc(d.id)}
                      title="Dosyayı kaldır"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

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