"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Radio, Volume2 } from "lucide-react";

type LiveVoiceModalProps = {
  open: boolean;
  onClose: () => void;
  onSendVoiceMessage: (transcript: string) => Promise<string>;
};

export function LiveVoiceModal({ open, onClose, onSendVoiceMessage }: LiveVoiceModalProps) {
  const [status, setStatus] = useState<"listening" | "thinking" | "speaking" | "muted">(
    "listening"
  );
  const [userTranscript, setUserTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("Seni dinliyorum, konuşmaya başlayabilirsin…");
  const [muted, setMuted] = useState(false);

  const recognitionRef = useRef<any>(null);
  const activeRef = useRef(open);
  activeRef.current = open;

  const stopAllAudio = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    }
  }, []);

  const startListening = useCallback(() => {
    if (!activeRef.current || muted) return;
    const w = window as any;
    const Speech = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Speech) {
      setAiResponse("Bu tarayıcı canlı ses tanımayı desteklemiyor (Chrome/Edge önerilir).");
      return;
    }

    stopAllAudio();
    const rec = new Speech();
    rec.lang = "tr-TR";
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    recognitionRef.current = rec;
    setStatus("listening");

    let finalSpeech = "";

    rec.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) {
          finalSpeech += piece + " ";
        } else {
          interim += piece;
        }
      }
      setUserTranscript((finalSpeech + interim).trim());
    };

    rec.onend = async () => {
      recognitionRef.current = null;
      const clean = finalSpeech.trim();
      if (!activeRef.current || muted) return;

      if (!clean) {
        // Restart listening loop seamlessly if silence occurred
        window.setTimeout(() => {
          if (activeRef.current && !muted) startListening();
        }, 300);
        return;
      }

      setStatus("thinking");
      setUserTranscript(clean);

      try {
        const reply = await onSendVoiceMessage(clean);
        if (!activeRef.current) return;
        const plainReply = reply.replace(/[*#`>_]/g, "").trim();
        setAiResponse(plainReply);
        setStatus("speaking");

        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(plainReply);
          utterance.lang = "tr-TR";
          utterance.rate = 1.04;
          utterance.onend = () => {
            if (activeRef.current && !muted) {
              setUserTranscript("");
              startListening();
            }
          };
          utterance.onerror = () => {
            if (activeRef.current && !muted) startListening();
          };
          window.speechSynthesis.speak(utterance);
        } else {
          startListening();
        }
      } catch {
        setAiResponse("Bağlantı sırasında bir sorun oluştu, tekrar dinliyorum.");
        if (activeRef.current && !muted) startListening();
      }
    };

    rec.onerror = () => {
      recognitionRef.current = null;
    };

    try {
      rec.start();
    } catch {
      /* ignore */
    }
  }, [muted, onSendVoiceMessage, stopAllAudio]);

  useEffect(() => {
    if (open && !muted) {
      startListening();
    } else {
      stopAllAudio();
    }
    return () => stopAllAudio();
  }, [open, muted, startListening, stopAllAudio]);

  if (!open) return null;

  return (
    <div className="live-voice-overlay">
      <div className="live-voice-header">
        <span className="live-badge">
          <Radio size={14} /> NEXUS LIVE
        </span>
      </div>

      <div className="live-voice-center">
        <div className={`live-orb ${status}`}>
          <div className="live-orb-ring" />
          <div className="live-orb-core">
            {status === "speaking" ? <Volume2 size={32} /> : <Mic size={32} />}
          </div>
        </div>

        <div className="live-status-text">
          {status === "listening" && "Dinliyor…"}
          {status === "thinking" && "NEXUS düşünüyor…"}
          {status === "speaking" && "NEXUS konuşuyor…"}
          {status === "muted" && "Mikrofon sessize alındı"}
        </div>

        {userTranscript && <p className="live-user-caption">“{userTranscript}”</p>}
        <p className="live-ai-caption">{aiResponse}</p>
      </div>

      <div className="live-voice-controls">
        <button
          type="button"
          className={`live-ctrl-btn ${muted ? "muted" : ""}`}
          onClick={() => {
            setMuted((m) => {
              const next = !m;
              if (next) {
                stopAllAudio();
                setStatus("muted");
              }
              return next;
            });
          }}
          title={muted ? "Sesi aç" : "Sessize al"}
        >
          {muted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <button
          type="button"
          className="live-end-btn"
          onClick={() => {
            stopAllAudio();
            onClose();
          }}
          title="Canlı sohbeti bitir"
        >
          <PhoneOff size={20} />
          <span>Bitir</span>
        </button>
      </div>
    </div>
  );
}