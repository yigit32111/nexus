"use client";

import { useState } from "react";
import { Check, Copy, PanelRightOpen } from "lucide-react";
import { CanvasDoc } from "../types/nexus";

type RichTextProps = {
  text: string;
  onOpenCanvas?: (doc: CanvasDoc) => void;
};

function renderInline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)]+\))/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={`${keyPrefix}-b-${idx}`}>{part.slice(2, -2)}</strong>;
    }
    if (
      part.startsWith("*") &&
      part.endsWith("*") &&
      !part.startsWith("**") &&
      part.length > 2
    ) {
      return <em key={`${keyPrefix}-i-${idx}`}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code className="inline-code" key={`${keyPrefix}-c-${idx}`}>
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={`${keyPrefix}-a-${idx}`}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="rich-link"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return part;
  });
}

function CodeBlock({
  lang,
  code,
  onOpenCanvas,
}: {
  lang: string;
  code: string;
  onOpenCanvas?: (doc: CanvasDoc) => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="code-block-wrap">
      <div className="code-block-header">
        <span>{lang || "kod"}</span>
        <div className="code-block-actions">
          {onOpenCanvas && (
            <button
              type="button"
              onClick={() =>
                onOpenCanvas({
                  title: `kod.${lang || "txt"}`,
                  language: lang || "text",
                  content: code,
                })
              }
              title="Canvas çalışma alanında aç"
            >
              <PanelRightOpen size={12}/> Canvas
            </button>
          )}
          <button type="button" onClick={handleCopy} title="Kodu kopyala">
            {copied ? (
              <>
                <Check size={12}/> Kopyalandı
              </>
            ) : (
              <>
                <Copy size={12}/> Kopyala
              </>
            )}
          </button>
        </div>
      </div>
      <pre className="code-block">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderTextSegment(segment: string, baseKey: string) {
  const lines = segment.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      elements.push(<div className="text-gap" key={`${baseKey}-gap-${i}`} />);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      elements.push(<hr className="rich-hr" key={`${baseKey}-hr-${i}`} />);
      i++;
      continue;
    }

    // Markdown Table block
    if (
      trimmed.startsWith("|") &&
      i + 1 < lines.length &&
      /^\|?[\s:-]+\|[\s|:-]*$/.test(lines[i + 1].trim())
    ) {
      const parseRow = (row: string) =>
        row
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((cell) => cell.trim());

      const headers = parseRow(lines[i]);
      i += 2; // Skip header & separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(parseRow(lines[i]));
        i++;
      }

      elements.push(
        <div className="rich-table-wrap" key={`${baseKey}-tbl-${i}`}>
          <table className="rich-table">
            <thead>
              <tr>
                {headers.map((h, hi) => (
                  <th key={hi}>{renderInline(h, `${baseKey}-th-${hi}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {headers.map((_, ci) => (
                    <td key={ci}>{renderInline(r[ci] || "", `${baseKey}-td-${ri}-${ci}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      elements.push(
        <blockquote className="rich-quote" key={`${baseKey}-q-${i}`}>
          {renderInline(trimmed.slice(2), `${baseKey}-q-${i}`)}
        </blockquote>
      );
      i++;
      continue;
    }

    // Headings
    const heading = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      elements.push(
        <div className={`rich-heading h${heading[1].length}`} key={`${baseKey}-h-${i}`}>
          {renderInline(heading[2], `${baseKey}-h-${i}`)}
        </div>
      );
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(trimmed)) {
      elements.push(
        <div className="rich-list" key={`${baseKey}-ul-${i}`}>
          <span>•</span>
          <div>{renderInline(trimmed.replace(/^[-*]\s+/, ""), `${baseKey}-ul-${i}`)}</div>
        </div>
      );
      i++;
      continue;
    }

    // Ordered list
    if (/^\d+[.)]\s+/.test(trimmed)) {
      elements.push(
        <div className="rich-list" key={`${baseKey}-ol-${i}`}>
          <span>{trimmed.match(/^\d+/)?.[0]}.</span>
          <div>{renderInline(trimmed.replace(/^\d+[.)]\s+/, ""), `${baseKey}-ol-${i}`)}</div>
        </div>
      );
      i++;
      continue;
    }

    elements.push(<p key={`${baseKey}-p-${i}`}>{renderInline(line, `${baseKey}-p-${i}`)}</p>);
    i++;
  }

  return elements;
}

export function RichText({ text, onOpenCanvas }: RichTextProps) {
  // Handle unclosed trailing code blocks smoothly during live SSE streaming
  const fenceCount = (text.match(/```/g) || []).length;
  const normalized = fenceCount % 2 === 1 ? `${text}\n\`\`\`` : text;

  const blocks = normalized.split(/```([\w.+-]*)\n?([\s\S]*?)```/g);
  return (
    <div className="rich-text">
      {blocks.map((part, i) => {
        if (i % 3 === 2) {
          const lang = blocks[i - 1] || "";
          return <CodeBlock key={i} lang={lang} code={part} onOpenCanvas={onOpenCanvas} />;
        }
        if (i % 3 === 1) return null;
        return renderTextSegment(part, `seg-${i}`);
      })}
    </div>
  );
}