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
  const [language,setLanguage]=useState("tr-TR");
  const [rate,setRate]=useState(1);
  const generation=useRef(0);
  const sendRef=useRef(onSendVoiceMessage);sendRef.current=onSendVoiceMessage;
  const timer=useRef<number|null>(null);
  const activeRef = useRef(open);
  activeRef.current = open;

  const stopAllAudio = useCallback(() => {
    generation.current++;
    if(timer.current!==null){window.clearTimeout(timer.current);timer.current=null;}
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend=null;
        recognitionRef.current.onerror=null;
        recognitionRef.current.onresult=null;
        recognitionRef.current.abort();
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
      setStatus("muted");
      setAiResponse("Bu tarayıcı canlı ses tanımayı desteklemiyor (Chrome/Edge önerilir).");
      return;
    }

    stopAllAudio();
    const rec = new Speech();
    const turn=generation.current;
    rec.lang = language;
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
      if(turn!==generation.current)return;
      recognitionRef.current = null;
      const clean = finalSpeech.trim();
      if (!activeRef.current || muted) return;

      if (!clean) {
        // Restart listening loop seamlessly if silence occurred
        timer.current=window.setTimeout(() => {
          if (turn===generation.current && activeRef.current && !muted) startListening();
        }, 300);
        return;
      }

      setStatus("thinking");
      setUserTranscript(clean);

      try {
        const reply = await sendRef.current(clean);
        if (!activeRef.current || turn!==generation.current) return;
        const plainReply = reply.replace(/[*#`>_]/g, "").trim();
        setAiResponse(plainReply);
        setStatus("speaking");

        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(plainReply);
          utterance.lang = language;
          utterance.rate = rate;
          utterance.onend = () => {
            if (turn===generation.current && activeRef.current && !muted) {
              setUserTranscript("");
              startListening();
            }
          };
          utterance.onerror = () => {
            if (turn===generation.current && activeRef.current && !muted) startListening();
          };
          window.speechSynthesis.speak(utterance);
        } else {
          startListening();
        }
      } catch {
        setAiResponse("Bağlantı sırasında bir sorun oluştu, tekrar dinliyorum.");
        if (turn===generation.current && activeRef.current && !muted) startListening();
      }
    };

    rec.onerror = () => {
      if(turn!==generation.current)return;
      rec.onend=null; recognitionRef.current=null; setMuted(true);setStatus("muted");setAiResponse("Mikrofon veya konuşma tanıma kullanılamadı. İzinleri kontrol edip yeniden aç.");
    };

    try {
      rec.start();
    } catch {
      /* ignore */
    }
  }, [muted, language, rate, stopAllAudio]);

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
          <Radio size={14} /> NEXUS LIVE 2.0
        </span>
      </div>

      <div className="live-voice-center">
        <p>Konuşma tanıma tarayıcının ses servisini kullanabilir.</p>
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

      <div style={{display:"flex",justifyContent:"center",gap:10,flexWrap:"wrap"}}><button type="button" disabled={status!=="listening"||muted} onClick={()=>{try{recognitionRef.current?.stop()}catch{/* ignore */}}}>Konuşmayı gönder</button><select aria-label="Konuşma dili" value={language} onChange={e=>setLanguage(e.target.value)}><option value="tr-TR">Türkçe</option><option value="en-US">English</option><option value="de-DE">Deutsch</option></select><label>Hız <input type="range" min=".7" max="1.4" step=".1" value={rate} onChange={e=>setRate(Number(e.target.value))}/></label><button type="button" onClick={()=>{stopAllAudio();if(!muted)startListening()}}>Yanıtı kes</button></div>
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