"use client";

import { useRef, useState } from "react";
import { Globe } from "lucide-react";
import { RESEARCH_TRANSFER_KEY, RESEARCH_TRANSFER_LIMIT } from "../lib/workspace/research-transfer";

type Source = { title: string; text: string; url: string };

export function ChatResearch({ draft, disabled, accountId }: { draft: string; disabled: boolean; accountId: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const [transferError, setTransferError] = useState("");

  function openInWorkspace() {
    setTransferError("");
    const text = [query.trim(), status, ...sources.map((source, index) =>
      `[${index + 1}] ${source.title}\n${source.url}\n${source.text}`)].join("\n\n");
    try {
      if (!accountId || text.length > RESEARCH_TRANSFER_LIMIT) throw new Error();
      sessionStorage.setItem(RESEARCH_TRANSFER_KEY, JSON.stringify({ accountId, text }));
    } catch {
      setTransferError("Kaynaklar çalışma alanına aktarılamadı.");
      return;
    }
    window.location.assign("/workspace");
  }

  async function search() {
    if (pending || query.trim().length < 3) return;
    setPending(true);
    setSources([]);
    setStatus("Kaynaklar aranıyor…");
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Araştırma başarısız.");
      setSources(data.sources);
      setStatus([data.coverage, ...(data.unavailable || []).map((name: string) => `${name} erişilemedi.`)].join(" "));
    } catch (error) {
      setStatus(error instanceof Error && !["TimeoutError", "TypeError"].includes(error.name)
        ? error.message : "Araştırmaya ulaşılamadı. Tekrar deneyebilirsin.");
    } finally {
      setPending(false);
    }
  }

  return <>
    <button type="button" className="composer-tool-toggle" disabled={disabled} aria-haspopup="dialog"
      onClick={() => {
        if (!query && !pending) setQuery(draft.trim().slice(0, 200));
        dialog.current?.showModal();
      }}>
      <Globe size={15} aria-hidden="true" /> Araştırma
    </button>
    <dialog ref={dialog} className="chat-research-dialog" aria-labelledby="chat-research-heading">
      <div className="chat-research-heading">
        <h2 id="chat-research-heading">Sohbette kaynak ara</h2>
        <button type="button" onClick={() => dialog.current?.close()}>Kapat</button>
      </div>
      <p>Arama konusu Vikipedi ve Crossref’e gönderilir. Kişisel bilgi ekleme.</p>
      <form onSubmit={(event) => { event.preventDefault(); void search(); }}>
        <label htmlFor="chat-research-query">Araştırma konusu</label>
        <input id="chat-research-query" value={query} maxLength={200} disabled={pending}
          onChange={(event) => {
            setQuery(event.target.value);
            setSources([]);
            setStatus("");
            setTransferError("");
          }} />
        <button type="submit" disabled={pending || query.trim().length < 3}>Kaynakları ara</button>
      </form>
      <p role="status">{status}</p>
      {transferError && <p role="alert">{transferError}</p>}
      {sources.length > 0 && <button type="button" onClick={openInWorkspace}>Workspace’te aç</button>}
      {sources.length > 0 && <ol>
        {sources.map((source) => <li key={source.url}>
          <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
          <p>{source.text}</p>
        </li>)}
      </ol>}
    </dialog>
  </>;
}
