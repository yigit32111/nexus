"use client";

import { useState } from "react";
import { Check, Code2, Copy, Download, Eye, Sparkles, X } from "lucide-react";
import { CanvasDoc } from "../types/nexus";

type CanvasPanelProps = {
  doc: CanvasDoc;
  onChange: (updated: CanvasDoc) => void;
  onClose: () => void;
  onAskNexusRefine: (instruction: string) => void;
};

export function CanvasPanel({ doc, onChange, onClose, onAskNexusRefine }: CanvasPanelProps) {
  const isHtmlLike =
    ["html", "svg", "xml"].includes(doc.language.toLowerCase()) ||
    /<(html|div|svg|body|style|script)\b/i.test(doc.content);

  const [tab, setTab] = useState<"edit" | "preview">(isHtmlLike ? "preview" : "edit");
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(doc.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  function handleDownload() {
    const extMap: Record<string, string> = {
      javascript: "js",
      typescript: "ts",
      python: "py",
      markdown: "md",
      html: "html",
      css: "css",
      json: "json",
      sql: "sql",
    };
    const ext = extMap[doc.language.toLowerCase()] || doc.language || "txt";
    const filename = doc.title.includes(".") ? doc.title : `nexus-canvas.${ext}`;
    const blob = new Blob([doc.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <aside className="canvas-panel">
      <header className="canvas-header">
        <div className="canvas-title-group">
          <Code2 size={16} />
          <input
            className="canvas-title-input"
            value={doc.title}
            onChange={(e) => onChange({ ...doc, title: e.target.value })}
          />
          <span className="canvas-lang-badge">{doc.language || "metin"}</span>
        </div>

        <div className="canvas-actions">
          {isHtmlLike && (
            <div className="canvas-tabs">
              <button
                type="button"
                className={tab === "edit" ? "active" : ""}
                onClick={() => setTab("edit")}
              >
                Kod
              </button>
              <button
                type="button"
                className={tab === "preview" ? "active" : ""}
                onClick={() => setTab("preview")}
              >
                <Eye size={13} /> Önizleme
              </button>
            </div>
          )}

          <button type="button" className="icon-button" onClick={handleCopy} title="Kopyala">
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
          <button type="button" className="icon-button" onClick={handleDownload} title="İndir">
            <Download size={15} />
          </button>
          <button type="button" className="icon-button" onClick={onClose} title="Canvas'ı kapat">
            <X size={16} />
          </button>
        </div>
      </header>

      <div className="canvas-body">
        {tab === "preview" && isHtmlLike ? (
          <iframe
            className="canvas-preview-frame"
            sandbox="allow-scripts"
            srcDoc={doc.content}
            title="Canvas Canlı Önizleme"
          />
        ) : (
          <textarea
            className="canvas-editor"
            value={doc.content}
            onChange={(e) => onChange({ ...doc, content: e.target.value })}
            spellCheck={false}
          />
        )}
      </div>

      <footer className="canvas-footer">
        <button
          type="button"
          className="canvas-ai-btn"
          onClick={() =>
            onAskNexusRefine(
              `Canvas üzerindeki şu içeriği incele, varsa hatalarını düzelt ve daha temiz hale getir:\n\n\`\`\`${doc.language}\n${doc.content}\n\`\`\``
            )
          }
        >
          <Sparkles size={14} /> NEXUS ile İyileştir
        </button>
        <span>{doc.content.length} karakter</span>
      </footer>
    </aside>
  );
}