"use client";

import { RefObject } from "react";
import {
  Code2,
  FileText,
  Globe,
  Image as ImageIcon,
  LockKeyhole,
  Mic,
  Paperclip,
  Pencil,
  Radio,
  Send,
  Wand2,
  X,
} from "lucide-react";
import { UploadAttachment } from "../types/nexus";
import { bytesLabel } from "../lib/nexus-utils";

type ComposerProps = {
  input: string;
  onInputChange: (val: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  busy: boolean;
  notice: string;
  onClearNotice: () => void;
  editingMessageId: string | null;
  onCancelEdit: () => void;
  files: UploadAttachment[];
  onRemoveFile: (index: number) => void;
  onFilesSelected: (list: FileList | null) => void;
  fileRef: RefObject<HTMLInputElement | null>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  isRecording: boolean;
  onToggleDictate: () => void;
  webSearch: boolean;
  onToggleWebSearch: () => void;
  codeExecution: boolean;
  onToggleCodeExecution: () => void;
  onOpenLiveVoice: () => void;
  isGroqProvider: boolean;
  onEnhancePrompt: () => void;
  modelLabel: string;
};

export function Composer({
  input,
  onInputChange,
  onSubmit,
  onStop,
  busy,
  notice,
  onClearNotice,
  editingMessageId,
  onCancelEdit,
  files,
  onRemoveFile,
  onFilesSelected,
  fileRef,
  textareaRef,
  isRecording,
  onToggleDictate,
  webSearch,
  onToggleWebSearch,
  codeExecution,
  onToggleCodeExecution,
  onOpenLiveVoice,
  isGroqProvider,
  onEnhancePrompt,
  modelLabel,
}: ComposerProps) {
  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file") {
        const f = items[i].getAsFile();
        if (f) pastedFiles.push(f);
      }
    }
    if (pastedFiles.length > 0) {
      e.preventDefault();
      const dt = new DataTransfer();
      pastedFiles.forEach((f) => dt.items.add(f));
      onFilesSelected(dt.files);
    }
  }

  return (
    <div className="composer-zone">
      {notice && (
        <div className="notice-bar">
          <span>{notice}</span>
          <button type="button" onClick={onClearNotice}>
            <X size={14} />
          </button>
        </div>
      )}

      {editingMessageId && (
        <div className="edit-indicator">
          <Pencil size={13} /> Önceki mesaj düzenleniyor
          <button type="button" onClick={onCancelEdit}>
            <X size={13} />
          </button>
        </div>
      )}

      {files.length > 0 && (
        <div className="attachment-tray">
          {files.map((f, i) => (
            <div className="attachment-chip" key={`${f.name}-${i}`}>
              {f.type.startsWith("image/") ? <ImageIcon size={14} /> : <FileText size={14} />}
              <span>
                {f.name}
                <small>{bytesLabel(f.size)}</small>
              </span>
              <button type="button" onClick={() => onRemoveFile(i)}>
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="composer-box">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              onSubmit();
            }
          }}
          aria-label="NEXUS’a mesaj yaz"
          placeholder="NEXUS’a bir şey sor…"
          rows={1}
          disabled={busy}
        />

        <div className="composer-controls">
          <div className="composer-tools">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".pdf,.txt,image/png,image/jpeg,image/webp"
              hidden
              onChange={(e) => onFilesSelected(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              title="Dosya ekle (PDF, TXT, PNG, JPG, WEBP)"
            >
              <Paperclip size={17} />
            </button>

            <button
              type="button"
              onClick={onToggleDictate}
              className={isRecording ? "recording" : ""}
              title={isRecording ? "Kaydı durdur" : "Sesle yaz"}
            >
              <Mic size={17} />
            </button>

            <button
              type="button"
              onClick={onOpenLiveVoice}
              title="NEXUS Live — Tam ekran eller serbest sesli sohbet"
            >
              <Radio size={17} />
            </button>

            <button
              type="button"
              className={`composer-tool-toggle ${webSearch ? "active" : ""}`}
              onClick={onToggleWebSearch}
              title="Ücretsiz araştırma çalışma alanını aç"
            >
              <Globe size={15} />
              <span>Araştırma</span>
            </button>

            {isGroqProvider && (
              <button
                type="button"
                className={`composer-tool-toggle ${codeExecution ? "active" : ""}`}
                onClick={onToggleCodeExecution}
                title="Groq kod çalıştırmayı aç/kapat"
              >
                <Code2 size={15} />
                <span>Kod</span>
              </button>
            )}

            {input.trim().length >= 6 && !busy && (
              <button
                type="button"
                className="composer-tool-toggle"
                onClick={onEnhancePrompt}
                title="İstemi daha detaylı ve etkili hale getir"
              >
                <Wand2 size={14} />
                <span>Geliştir</span>
              </button>
            )}

            <span className="composer-model">{modelLabel || "Varsayılan model"}</span>
          </div>

          <div className="composer-send">
            <span>Enter ile gönder · Shift+Enter yeni satır</span>
            {busy ? (
              <button
                type="button"
                onClick={onStop}
                title="Durdur"
                className="stop-button"
              >
                <X size={17} />
              </button>
            ) : (
              <button
                type="button"
                onClick={onSubmit}
                disabled={!input.trim() && !files.length}
                title="Gönder"
              >
                <Send size={17} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="composer-disclaimer">
        <span>
          <LockKeyhole size={12} /> Hesabına özel çalışma alanı
        </span>
        <span>Yanıtlar yapay zekâ tarafından oluşturulur; önemli bilgileri doğrula.</span>
      </div>
    </div>
  );
}