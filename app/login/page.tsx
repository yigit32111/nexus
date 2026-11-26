"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../utils/supabase/client";
import { Sparkles, Mail, Lock, ArrowRight } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const rawNext = searchParams.get("next");
  const nextPath = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  const callbackError = searchParams.get("auth") === "callback_error";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    callbackError ? "Doğrulama bağlantısı geçersiz veya süresi dolmuş. Lütfen tekrar dene." : ""
  );

  async function handleReset() {
    if (!email.trim()) {
      setMessage("Şifre sıfırlama bağlantısı için e-posta adresini yaz.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) throw error;
      setMessage("Şifre sıfırlama bağlantısı e-posta adresine gönderildiyse gelen kutunu kontrol et.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "İşlem tamamlanamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        router.replace(nextPath);
        router.refresh();
      } else {
        if (password.length < 8) {
          throw new Error("Şifre en az 8 karakter olmalı.");
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;

        if (data.session) {
          router.replace(nextPath);
          router.refresh();
        } else {
          setMessage("Kayıt başarılı! E-posta adresine gelen doğrulama bağlantısına tıkla.");
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bir hata oluştu.");
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
          <h1>
            NEXUS<span>AI</span>
          </h1>
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
              autoComplete="email"
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
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="En az 8 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>

          {message && <div className="auth-message">{message}</div>}

          {mode === "login" && (
            <button type="button" className="auth-forgot" onClick={handleReset} disabled={busy}>
              Şifremi unuttum
            </button>
          )}
          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? "İŞLEM YAPILIYOR..." : mode === "login" ? "GİRİŞ YAP" : "HESAP OLUŞTUR"}
            <ArrowRight size={17} />
          </button>
        </form>

        <div className="auth-switch">
          {mode === "login" ? "Henüz hesabın yok mu?" : "Zaten hesabın var mı?"}
          <button
            type="button"
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

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="auth-shell" />}>
      <LoginForm />
    </Suspense>
  );
}
