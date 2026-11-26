"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Code2,
  Copy,
  Download,
  Eye,
  History,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import { CanvasDoc } from "../types/nexus";
import { uid } from "../lib/nexus-utils";

type CanvasPanelProps = {
  doc: CanvasDoc;
  onChange: (updated: CanvasDoc) => void;
  onClose: () => void;
  onAskNexusRefine: (instruction: string) => void;
  onNotify: (msg: string) => void;
};

function buildSandboxDocument(content: string, language: string): string {
  const lang = language.toLowerCase();
  const isReact =
    ["jsx", "tsx", "react"].includes(lang) ||
    /export\s+default\s+function|React\.useState|useState\s*\(|import\s+.*from\s+['"]react['"]/.test(
      content
    );

  if (!isReact) {
    return content;
  }

  // Clean ES module imports so Babel Standalone UMD runs smoothly
  const cleanedCode = content
    .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?\n?/g, "")
    .replace(/export\s+default\s+function\s+([A-Za-z0-9_]+)/g, "function $1")
    .replace(/export\s+default\s+/g, "const __DefaultExport = ")
    .replace(/<\/script>/gi, "<\\/script>");

  const componentMatch = cleanedCode.match(/function\s+([A-Z][A-Za-z0-9_]*)\s*\(/);
  const rootComponent = componentMatch ? componentMatch[1] : "__DefaultExport";

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>body { margin: 0; font-family: system-ui, sans-serif; background: #ffffff; color: #111827; }</style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useMemo, useRef, useCallback } = React;
    ${cleanedCode}
    const root = ReactDOM.createRoot(document.getElementById('root'));
    if (typeof ${rootComponent} !== 'undefined') {
      root.render(React.createElement(${rootComponent}));
    } else {
      root.render(<div className="p-6 text-sm text-red-600">Bileşen render edilemedi.</div>);
    }
  </script>
</body>
</html>`;
}

export function CanvasPanel({
  doc,
  onChange,
  onClose,
  onAskNexusRefine,
  onNotify,
}: CanvasPanelProps) {
  const isPreviewable = useMemo(() => {
    const lang = doc.language.toLowerCase();
    return (
      ["html", "svg", "xml", "jsx", "tsx", "react"].includes(lang) ||
      /<(html|div|svg|body|style|script)\b/i.test(doc.content) ||
      /export\s+default\s+function|useState\s*\(/.test(doc.content)
    );
  }, [doc.language, doc.content]);

  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const versions = doc.versions || [
    { id: "v1", label: "v1", content: doc.content, createdAt: Date.now() },
  ];
  const activeIdx =
    typeof doc.activeVersionIndex === "number" ? doc.activeVersionIndex : versions.length - 1;

  const sandboxHtml = useMemo(
    () => (isPreviewable ? buildSandboxDocument(doc.content, doc.language) : ""),
    [isPreviewable, doc.content, doc.language]
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(doc.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  function handleSaveVersion() {
    const nextNum = versions.length + 1;
    const nextVersions = [
      ...versions,
      { id: uid(), label: `v${nextNum}`, content: doc.content, createdAt: Date.now() },
    ];
    onChange({
      ...doc,
      versions: nextVersions,
      activeVersionIndex: nextVersions.length - 1,
    });
    onNotify(`Canvas sürümü kaydedildi (v${nextNum}).`);
  }

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareType: "canvas",
          title: doc.title,
          language: doc.language,
          content: isPreviewable ? sandboxHtml : doc.content,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Paylaşım oluşturulamadı.");
      await navigator.clipboard.writeText(data.url);
      onChange({ ...doc, shareId: data.shareId });
      onNotify(`Herkese açık bağlantı kopyalandı: ${data.url}`);
    } catch (err: any) {
      onNotify(err?.message || "Paylaşım linki oluşturulamadı.");
    } finally {
      setSharing(false);
    }
  }

  function handleDownload() {
    const extMap: Record<string, string> = {
      javascript: "js",
      typescript: "ts",
      jsx: "jsx",
      tsx: "tsx",
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
          {isPreviewable && (
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
                <Eye size={13} /> Canlı
              </button>
            </div>
          )}

          <button
            type="button"
            className="icon-button"
            onClick={handleSaveVersion}
            title="Yeni sürüm kaydet"
          >
            <History size={15} />
          </button>

          <button
            type="button"
            className="icon-button"
            onClick={handleShare}
            disabled={sharing}
            title="Herkese açık link oluştur ve kopyala"
          >
            <Share2 size={15} />
          </button>

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

      {/* Version switcher bar */}
      {versions.length > 1 && (
        <div className="canvas-version-bar">
          <span>Sürümler:</span>
          {versions.map((v, idx) => (
            <button
              key={v.id}
              type="button"
              className={idx === activeIdx ? "active" : ""}
              onClick={() =>
                onChange({
                  ...doc,
                  content: v.content,
                  activeVersionIndex: idx,
                })
              }
            >
              {v.label}
            </button>
          ))}
        </div>
      )}

      <div className="canvas-body">
        {tab === "preview" && isPreviewable ? (
          <iframe
            className="canvas-preview-frame"
            sandbox="allow-scripts"
            srcDoc={sandboxHtml}
            title="Canvas 2.0 Canlı Önizleme"
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
              `Canvas üzerindeki şu içeriği incele, varsa hatalarını düzelt ve daha modern/temiz hale getir:\n\n\`\`\`${doc.language}\n${doc.content}\n\`\`\``
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