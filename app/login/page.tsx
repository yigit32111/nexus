
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";
import { Sparkles, Mail, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.replace("/");
        router.refresh();
      } else {
        if (password.length < 6) {
          throw new Error("Şifre en az 6 karakter olmalı.");
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          },
        });

        if (error) throw error;

        if (data.session) {
          router.replace("/");
          router.refresh();
        } else {
          setMessage("Kayıt başarılı! E-posta adresine gelen doğrulama bağlantısına tıkla.");
        }
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Bir hata oluştu."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-grid" />

      <section className="auth-card">
        <div className="auth-brand">
          <div className="auth-orb">
            <Sparkles size={25} />
          </div>
          <h1>NEXUS<span>AI</span></h1>
          <p>PERSONAL INTELLIGENCE SYSTEM</p>
        </div>

        <div className="auth-heading">
          <div className="auth-kicker">GÜVENLİ KULLANICI ERİŞİMİ</div>
          <h2>{mode === "login" ? "Tekrar hoş geldin." : "Hesabını oluştur."}</h2>
          <p>
            {mode === "login"
              ? "NEXUS çalışma alanına devam etmek için giriş yap."
              : "Kişisel NEXUS çalışma alanını oluştur."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>E-POSTA ADRESİ</label>
          <div className="auth-input">
            <Mail size={17} />
            <input
              type="email"
              placeholder="ornek@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <label>ŞİFRE</label>
          <div className="auth-input">
            <Lock size={17} />
            <input
              type="password"
              placeholder="En az 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          {message && (
            <div className="auth-message">{message}</div>
          )}

          <button className="auth-submit" disabled={busy}>
            {busy
              ? "İŞLEM YAPILIYOR..."
              : mode === "login"
              ? "GİRİŞ YAP"
              : "HESAP OLUŞTUR"}
            <ArrowRight size={17} />
          </button>
        </form>

        <div className="auth-switch">
          {mode === "login" ? "Henüz hesabın yok mu?" : "Zaten hesabın var mı?"}
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setMessage("");
            }}
          >
            {mode === "login" ? "Kayıt ol" : "Giriş yap"}
          </button>
        </div>

        <div className="auth-footer">
          <span /> SECURE AUTHENTICATION
        </div>
      </section>
    </main>
  );
}
