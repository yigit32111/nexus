"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";
import { Lock, Sparkles, ArrowRight } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const ok = Boolean(data.session);
      setHasSession(ok);
      if (!ok) {
        setMessage("Şifre sıfırlama oturumu bulunamadı veya süresi doldu. Lütfen giriş ekranından yeni bağlantı iste.");
      }
    });
  }, [supabase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    if (!hasSession) {
      setMessage("Geçerli bir sıfırlama oturumu yok. Lütfen yeni sıfırlama bağlantısı iste.");
      return;
    }
    if (password.length < 8) {
      setMessage("Yeni şifre en az 8 karakter olmalı.");
      return;
    }
    if (password !== confirm) {
      setMessage("Şifreler eşleşmiyor.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage("Şifren güncellendi. Çalışma alanına yönlendiriliyorsun.");
      window.setTimeout(() => {
        router.replace("/");
        router.refresh();
      }, 900);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Şifre güncellenemedi.");
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
          <div className="auth-kicker">HESAP GÜVENLİĞİ</div>
          <h2>Yeni şifreni belirle.</h2>
          <p>Hesabın için yeni bir şifre oluştur.</p>
        </div>
        <form onSubmit={submit} className="auth-form">
          <label>YENİ ŞİFRE</label>
          <div className="auth-input">
            <Lock size={17} />
            <input
              type="password"
              minLength={8}
              autoComplete="new-password"
              placeholder="En az 8 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <label>YENİ ŞİFRE TEKRAR</label>
          <div className="auth-input">
            <Lock size={17} />
            <input
              type="password"
              minLength={8}
              autoComplete="new-password"
              placeholder="Şifreni tekrar yaz"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          {message && <div className="auth-message">{message}</div>}
          <button type="submit" className="auth-submit" disabled={busy || hasSession === false}>
            {busy ? "GÜNCELLENİYOR…" : "ŞİFREYİ GÜNCELLE"}
            <ArrowRight size={17} />
          </button>
        </form>
        <div className="auth-switch">
          <button type="button" onClick={() => router.replace("/login")}>
            Giriş ekranına dön
          </button>
        </div>
        <div className="auth-footer">
          <span /> SECURE AUTHENTICATION
        </div>
      </section>
    </main>
  );
}
