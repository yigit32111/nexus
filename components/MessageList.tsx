"use client";

import { RefObject } from "react";
import {
  BookOpen,
  Code2,
  Copy,
  FileText,
  Image as ImageIcon,
  PanelRightOpen,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Volume2,
} from "lucide-react";
import { CanvasDoc, Chat, Gem, INTRO_MESSAGE, Message } from "../types/nexus";
import { extractThinkingTags } from "../lib/nexus-utils";
import { RichText } from "./RichText";
import { ThinkingAccordion } from "./ThinkingAccordion";
import { renderGemIcon } from "./Sidebar";

type MessageListProps = {
  activeChat: Chat | null;
  activeGem?: Gem;
  email: string;
  busy: boolean;
  streamingMessageId: string | null;
  endRef: RefObject<HTMLDivElement | null>;
  onSelectStarterPrompt: (prompt: string) => void;
  onTriggerFileUpload: () => void;
  onCopyText: (text: string) => void;
  onEditMessage: (message: Message) => void;
  onSpeakText: (text: string) => void;
  onRegenerate: () => void;
  onQuickRefine: (instruction: string) => void;
  onOpenCanvas: (doc: CanvasDoc) => void;
};

export function MessageList({
  activeChat,
  activeGem,
  email,
  busy,
  streamingMessageId,
  endRef,
  onSelectStarterPrompt,
  onTriggerFileUpload,
  onCopyText,
  onEditMessage,
  onSpeakText,
  onRegenerate,
  onQuickRefine,
  onOpenCanvas,
}: MessageListProps) {
  const visibleMessages =
    activeChat?.messages.filter(
      (m, i) => !(i === 0 && m.role === "assistant" && m.content === INTRO_MESSAGE.content)
    ) || [];

  return (
    <div className="conversation-scroll">
      {activeChat && visibleMessages.length === 0 && (
        <section className="welcome-panel">
          {activeGem ? (
            <div className="active-gem-banner">
              <div className="active-gem-icon">{renderGemIcon(activeGem.icon, 22)}</div>
              <div>
                <span className="gem-tag">AKTİF GEM ASİSTANI</span>
                <h2>{activeGem.name}</h2>
                <p>{activeGem.description}</p>
              </div>
            </div>
          ) : (
            <>
              <h1>
                Merhaba, <em>nasıl yardımcı olayım?</em>
              </h1>
              <p>
                Sorularını sor, dosya ekle, bir Gem seç veya Canvas ile canlı kod ve metin
                geliştir.
              </p>
            </>
          )}

          <div className="prompt-grid">
            <button
              type="button"
              onClick={() =>
                onSelectStarterPrompt("Bugün çalışmam gereken konular için adım adım bir plan hazırla.")
              }
            >
              <BookOpen size={17} />
              <span>
                <b>Çalışma planı</b>
                <small>Konuları planla ve takip et</small>
              </span>
            </button>
            <button
              type="button"
              onClick={() =>
                onSelectStarterPrompt(
                  "Bu fikri birlikte geliştirelim. Bana önce doğru soruları sor."
                )
              }
            >
              <Sparkles size={17} />
              <span>
                <b>Fikir geliştir</b>
                <small>Bir düşünceyi projeye dönüştür</small>
              </span>
            </button>
            <button
              type="button"
              onClick={() =>
                onSelectStarterPrompt("Bu kodu incele, hataları bul ve daha iyi hâle getir.")
              }
            >
              <Code2 size={17} />
              <span>
                <b>Kod desteği</b>
                <small>Hata ayıkla ve Canvas'ta önizle</small>
              </span>
            </button>
            <button type="button" onClick={onTriggerFileUpload}>
              <FileText size={17} />
              <span>
                <b>Dosya incele</b>
                <small>PDF, metin veya görsel ekle</small>
              </span>
            </button>
          </div>
          <div className="welcome-foot">
            <ShieldCheck size={14} /> Sohbetlerin ve hafızan hesabına özel saklanır.
          </div>
        </section>
      )}

      <div className="messages-area">
        {visibleMessages.map((message, index, arr) => {
          const isLastAssistant = message.role === "assistant" && index === arr.length - 1;
          const isStreaming = streamingMessageId === message.id;

          const { thinking, cleanContent, isThinkingOpen } =
            message.role === "assistant"
              ? extractThinkingTags(message.content, message.reasoning || "")
              : { thinking: "", cleanContent: message.content, isThinkingOpen: false };

          return (
            <article className={`message-row ${message.role}`} key={message.id}>
              <div
                className={`message-avatar ${
                  message.role === "assistant" ? "nexus-avatar" : "user-avatar-small"
                }`}
              >
                {message.role === "assistant" ? (
                  <Sparkles size={16} />
                ) : (
                  email.charAt(0).toUpperCase() || "Y"
                )}
              </div>

              <div
                className={`message-main ${
                  message.role === "user" ? "user-message-main" : "assistant-message-main"
                }`}
              >
                {message.role === "user" ? (
                  <>
                    <div
                      className={`message-bubble ${
                        message.content.trim().length <= 24 ? "compact" : "expanded"
                      }`}
                    >
                      <div className="message-content">
                        <RichText text={cleanContent} />
                      </div>
                      {message.attachments?.length ? (
                        <div className="message-files">
                          {message.attachments.map((a, i) => (
                            <span key={`${a.name}-${i}`}>
                              {a.type.startsWith("image/") ? (
                                <ImageIcon size={13} />
                              ) : (
                                <FileText size={13} />
                              )}{" "}
                              {a.name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
<div className="message-toolbar user-message-toolbar">
                      <button
                        type="button"
                        onClick={() => onCopyText(message.content)}
                        title="Kopyala"
                        aria-label="Kopyala"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditMessage(message)}
                        title="Düzenle"
                        aria-label="Düzenle"
                      >
                        <Pencil size={14} />
                      </button>
                    </div></>
                ) : (
                  <>
                    <div className="message-heading">
                      <b>{activeGem ? activeGem.name : "NEXUS"}</b>
                      <time>
                        {new Date(message.createdAt).toLocaleTimeString("tr-TR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>

                    {thinking && (
                      <ThinkingAccordion
                        thinking={thinking}
                        isStreaming={isStreaming && isThinkingOpen}
                      />
                    )}

                    <div className="message-content">
                      <RichText text={cleanContent} onOpenCanvas={onOpenCanvas} />
                      {isStreaming && !isThinkingOpen && <span className="typing-caret" />}
                    </div>

                    {!isStreaming && cleanContent && (
                      <>
                        <div className="message-toolbar">
                          <button type="button" onClick={() => onCopyText(cleanContent)}>
                            <Copy size={13} /> Kopyala
                          </button>
                          <button type="button" onClick={() => onSpeakText(cleanContent)}>
                            <Volume2 size={13} /> Sesli oku
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onOpenCanvas({
                                title: activeChat?.title || "NEXUS Taslağı",
                                language: "markdown",
                                content: cleanContent,
                              })
                            }
                          >
                            <PanelRightOpen size={13} /> Canvas'ta aç
                          </button>
                          {isLastAssistant && (
                            <button type="button" onClick={onRegenerate}>
                              <RefreshCw size={13} /> Yeniden üret
                            </button>
                          )}
                        </div>

                        {/* Gemini-inspired Response Modifier Pills */}
                        {isLastAssistant && !busy && (
                          <div className="refine-pills">
                            <span>Yanıtı ayarla:</span>
                            <button
                              type="button"
                              onClick={() =>
                                onQuickRefine("Son yanıtını daha kısa ve maddeler halinde özetle.")
                              }
                            >
                              Daha kısa
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onQuickRefine(
                                  "Son yanıtını daha detaylı, örneklerle ve adım adım genişlet."
                                )
                              }
                            >
                              Daha detaylı
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onQuickRefine(
                                  "Son yanıtını hiç teknik terim bilmeyen birine anlatır gibi sadeleştir."
                                )
                              }
                            >
                              Daha basit
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </article>
          );
        })}

        {busy && !streamingMessageId && (
          <div className="thinking-row">
            <div className="message-avatar nexus-avatar">
              <Sparkles size={16} />
            </div>
            <div>
              <b>NEXUS yanıt hazırlıyor</b>
              <div className="thinking-dots">
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}