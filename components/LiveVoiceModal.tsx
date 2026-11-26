"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Radio, Volume2 } from "lucide-react";

import {speechError, speechText} from "../lib/core/speech";

type LiveVoiceModalProps = {
  open: boolean;
  onClose: () => void;
  onSendVoiceMessage: (transcript: string) => Promise<string>;
};

export function LiveVoiceModal({ open, onClose, onSendVoiceMessage }: LiveVoiceModalProps) {
  const [status, setStatus] = useState<"listening" | "thinking" | "speaking" | "muted">(
    "muted"
  );
  const [userTranscript, setUserTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("Başlamak için mikrofonu aç.");
  const muted = status === "muted";

  const recognitionRef = useRef<any>(null);
  const [language,setLanguage]=useState("tr-TR");
  const [rate,setRate]=useState(1);
  const generation=useRef(0);
  const sendRef=useRef(onSendVoiceMessage);sendRef.current=onSendVoiceMessage;
  const [lastReply,setLastReply]=useState("");
  const activeRef = useRef(open);
  activeRef.current = open;

  const stopAllAudio = useCallback(() => {
    generation.current++;
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
    if (!activeRef.current) return;
    const w = window as any;
    const Speech = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Speech) {
      setStatus("muted");
      setAiResponse("Bu tarayıcı canlı ses tanımayı desteklemiyor (Chrome/Edge önerilir).");
      return;
    }

    stopAllAudio();
    let rec;
    try { rec = new Speech(); } catch { setStatus("muted"); setAiResponse(speechError("")); return; }
    const turn=generation.current;
    rec.lang = language;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    recognitionRef.current = rec;
    setStatus("listening");
    setAiResponse("");
    setUserTranscript("");

    let transcript = "";
    rec.onresult = (event: any) => {
      if (turn !== generation.current) return;
      transcript = speechText(event.results);
      setUserTranscript(transcript);
    };

    rec.onend = async () => {
      if (turn !== generation.current || !activeRef.current) return;
      recognitionRef.current = null;
      const clean = transcript.trim();
      if (!clean) {
        setAiResponse(speechError("no-speech"));
        setStatus("muted");
        return;
      }
      setStatus("thinking");
      setUserTranscript(clean);

      try {
        const reply = await sendRef.current(clean);
        if (!activeRef.current || turn!==generation.current) return;
        if (!reply.trim()) { setStatus("muted"); setAiResponse("Yanıt alınamadı. Tekrar konuşmak için mikrofonu aç."); return; }
        const plainReply = reply.replace(/[*#`>_]/g, "").trim();
        setLastReply(plainReply);
        setAiResponse(plainReply);
        setStatus("speaking");

        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(plainReply);
          utterance.lang = language;
          utterance.rate = rate;
          utterance.onend = () => {
            if (turn===generation.current && activeRef.current) {
              setUserTranscript("");
              startListening();
            }
          };
          utterance.onerror = () => {
            if (turn===generation.current && activeRef.current) setStatus("muted");
          };
          window.speechSynthesis.speak(utterance);
        } else {
          startListening();
        }
      } catch {
        setAiResponse("Bağlantı sırasında bir sorun oluştu, tekrar dinliyorum.");
        if (turn===generation.current && activeRef.current) startListening();
      }
    };

    rec.onerror = (event: any) => {
      if (turn !== generation.current) return;
      stopAllAudio();
      setStatus("muted");
      setAiResponse(speechError(event.error));
    };
    try { rec.start(); } catch (err) {
      stopAllAudio();
      setStatus("muted");
      setAiResponse(speechError(err instanceof Error ? err.name : ""));
    }
  }, [language, rate, stopAllAudio]);

  useEffect(() => {
    if (open) {
      setStatus("muted");
      setUserTranscript("");
      setLastReply("");
      setAiResponse("Başlamak için mikrofonu aç.");
    }
    return stopAllAudio;
  }, [open, stopAllAudio]);

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

        <div className="live-status-text" role="status">
          {status === "listening" && "Dinliyor…"}
          {status === "thinking" && "NEXUS düşünüyor…"}
          {status === "speaking" && "NEXUS konuşuyor…"}
          {status === "muted" && "Mikrofon sessize alındı"}
        </div>

        {userTranscript && <p className="live-user-caption">“{userTranscript}”</p>}
        <p className="live-ai-caption">{aiResponse}</p>
        {lastReply && "speechSynthesis" in window && <button type="button" onClick={()=>{
          stopAllAudio();
          const turn=generation.current;
          const voice=new SpeechSynthesisUtterance(lastReply);
          voice.lang=language;
          voice.rate=rate;
          voice.onend=voice.onerror=()=>{if(turn===generation.current)setStatus("muted")};
          setStatus("speaking");
          window.speechSynthesis.speak(voice);
        }}>Yanıtı seslendir</button>}
      </div>

      <div style={{display:"flex",justifyContent:"center",gap:10,flexWrap:"wrap"}}><button type="button" disabled={status!=="listening"||muted} onClick={()=>{try{recognitionRef.current?.stop()}catch{/* ignore */}}}>Konuşmayı gönder</button><select aria-label="Konuşma dili" value={language} onChange={e=>setLanguage(e.target.value)}><option value="tr-TR">Türkçe</option><option value="en-US">English</option><option value="de-DE">Deutsch</option></select><label>Hız <input type="range" min=".7" max="1.4" step=".1" value={rate} onChange={e=>setRate(Number(e.target.value))}/></label><button type="button" onClick={()=>{stopAllAudio();if(!muted)startListening()}}>Yanıtı kes</button></div>
      <div className="live-voice-controls">
        <button
          type="button"
          className={`live-ctrl-btn ${muted ? "muted" : ""}`}
          onClick={() => {
            if (muted) startListening();
            else { stopAllAudio(); setStatus("muted"); }
          }}
          title={muted ? "Mikrofonu aç" : "Sessize al"}
        >
          {muted ? <Mic size={20} /> : <MicOff size={20} />}
          <span>{muted ? "Mikrofonu aç" : "Sessize al"}</span>
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