"use client";

import { useState } from "react";
import { runMiniCode } from "../lib/workspace/intelligence";

const example = "a = 15\nb = 25\nprint(a + b)";

function downloadText(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function CodeLab({ active, exportText }: { active: boolean; exportText: (text: string) => void }) {
  const [code, setCode] = useState(example);
  const [result, setResult] = useState<{ text: string; error: boolean } | null>(null);
  const [prompt, setPrompt] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draftStatus, setDraftStatus] = useState("");
  const output = result && !result.error ? result.text : "";

  function updateCode(value: string) {
    setCode(value);
    setResult(null);
  }

  function run() {
    try {
      setResult({ text: runMiniCode(code), error: false });
    } catch (error) {
      setResult({ text: error instanceof Error ? error.message : "Geçersiz kod.", error: true });
    }
  }

  async function draftCode() {
    if (drafting || prompt.trim().length < 3) return;
    setDrafting(true);
    setDraftStatus("Kod taslağı hazırlanıyor…");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(40000),
        body: JSON.stringify({
          stream: false, model: "auto", preferences: { memoryMode: "off", historyRecall: false },
          messages: [{
            role: "user",
            content: "Code Lab için en fazla 60 satırlık sayısal kod yaz. Yalnızca kod döndür. Sayılar, değişkenler, + - * / %, print() ve girintili for i in range(n): kullanabilirsin. Metin, import, dosya veya ağ işlemleri kullanma. Görev: " + prompt.trim(),
          }],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Taslak oluşturulamadı.");
      const candidate = typeof data.reply === "string"
        ? data.reply.trim().replace(/^\x60{3}(?:python|py|text)?\s*\n([\s\S]*?)\n\x60{3}$/i, "$1").trim() : "";
      if (!candidate || candidate.length > 4000) throw new Error("Model geçerli uzunlukta bir taslak döndürmedi.");
      updateCode(candidate);
      setDraftStatus("Taslak editöre eklendi. İnceledikten sonra Çalıştır’a bas.");
    } catch (error) {
      setDraftStatus(error instanceof Error && !["TimeoutError", "TypeError"].includes(error.name)
        ? error.message : "Kod taslağı alınamadı. Tekrar deneyebilirsin.");
    } finally {
      setDrafting(false);
    }
  }

  return <section className="nx-tool-card nx-code-lab" hidden={!active}>
    <h2 className="nx-no-print">Code Lab</h2>
    <p className="nx-no-print">Tarayıcıda sayısal kod yaz. Değişkenler, print() ve range() döngüleri desteklenir.</p>
    <details className="nx-no-print">
      <summary>Yapay zekâya kod yazdır</summary>
      <form onSubmit={(event) => { event.preventDefault(); void draftCode(); }}>
        <label htmlFor="workspace-code-prompt">Yazılacak kodu tarif et</label>
        <input id="workspace-code-prompt" value={prompt} maxLength={600} disabled={drafting}
          onChange={(event) => setPrompt(event.target.value)} />
        <button type="submit" disabled={drafting || prompt.trim().length < 3}>Kod taslağı yaz</button>
      </form>
      <p role="status">{draftStatus}</p>
    </details>
    <div className="nx-code-grid nx-no-print">
      <div>
        <label htmlFor="workspace-code">Sayısal kod</label>
        <textarea id="workspace-code" spellCheck={false} autoCapitalize="off" autoComplete="off"
          value={code} onChange={(event) => updateCode(event.target.value)} maxLength={4000} disabled={drafting}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && code.trim()) {
              event.preventDefault();
              run();
            }
          }} />
        <div className="nx-tool-row">
          <button type="button" disabled={drafting || !code.trim()} onClick={run}>Çalıştır</button>
          <button type="button" disabled={drafting} onClick={() => updateCode(example)}>Örnek kod</button>
          <button type="button" disabled={!code.trim()} onClick={() => downloadText(code, "nexus-kod.txt")}>Kodu indir</button>
        </div>
      </div>
      <div>
        <h3>Kod çıktısı</h3>
        <pre aria-live="polite">{result ? (result.error ? `Hata: ${result.text}` : result.text || "(çıktı yok)") : "Kodu çalıştırınca çıktı burada görünür."}</pre>
        <div className="nx-tool-row">
          <button type="button" disabled={!output} onClick={() => downloadText(output, "nexus-kod-ciktisi.txt")}>Çıktıyı indir</button>
          <button type="button" disabled={!output} onClick={() => exportText(output)}>Dosyaya aktar</button>
          <button type="button" disabled={!output} onClick={() => window.print()}>Çıktıyı yazdır</button>
        </div>
      </div>
    </div>
    {active && output && <pre className="nx-print-only">{output}</pre>}
  </section>;
}
