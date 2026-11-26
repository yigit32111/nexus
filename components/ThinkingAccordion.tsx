"use client";

import { useState } from "react";
import { Brain, ChevronDown, ChevronRight } from "lucide-react";

type ThinkingAccordionProps = {
  thinking: string;
  isStreaming?: boolean;
};

export function ThinkingAccordion({ thinking, isStreaming = false }: ThinkingAccordionProps) {
  const [open, setOpen] = useState(isStreaming);

  if (!thinking.trim()) return null;

  return (
    <div className={`thinking-accordion ${open ? "open" : ""}`}>
      <button
        type="button"
        className="thinking-accordion-trigger"
        onClick={() => setOpen((v) => !v)}
      >
        <Brain className={isStreaming ? "pulse-icon" : ""} size={14} />
        <span>{isStreaming ? "Düşünce süreci akıyor…" : "Düşünce sürecini göster"}</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && <div className="thinking-accordion-body">{thinking}</div>}
    </div>
  );
}