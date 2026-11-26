import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkles } from "lucide-react";
import { createAdminClient } from "../../../utils/supabase/admin";
import { RichText } from "../../../components/RichText";

export const dynamic = "force-dynamic";

export default async function SharedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^(?:[a-f0-9]{14}|[a-f0-9]{32})$/i.test(id)) notFound();
  const supabase = createAdminClient();

  const { data: share, error } = await supabase
    .from("nexus_shares")
    .select("title,share_type,language,content,messages,created_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !share) {
    notFound();
  }

  const isHtmlLike =
    ["html", "svg", "jsx", "tsx", "react"].includes(String(share.language).toLowerCase()) ||
    /<(html|div|svg|body)\b/i.test(String(share.content));

  return (
    <main className="share-page-shell">
      <header className="share-topbar">
        <div className="share-brand">
          <Sparkles size={18} />
          <b>NEXUS AI 4.0 Önizleme</b>
          <span>· Paylaşılan Çalışma</span>
        </div>
        <Link href="/" className="done-button" style={{ textDecoration: "none" }}>
          NEXUS'ta Aç
        </Link>
      </header>

      <section className="share-container">
        <div className="share-meta">
          <h1>{share.title}</h1>
          <small>
            {new Date(share.created_at).toLocaleDateString("tr-TR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            · {String(share.language || "metin").toUpperCase()}
          </small>
        </div>

        {share.share_type === "canvas" ? (
          <div className="share-canvas-card">
            {isHtmlLike && (
              <iframe
                className="share-iframe"
                sandbox=""
                referrerPolicy="no-referrer"
                loading="lazy"
                srcDoc={'<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; base-uri \'none\'; form-action \'none\'">'+String(share.content)}
                title={share.title}
              />
            )}
            <pre className="code-block" style={{ margin: 0 }}>
              <code>{share.content}</code>
            </pre>
          </div>
        ) : (
          <div className="share-chat-list">
            {(Array.isArray(share.messages) ? share.messages : []).map((m: any, i: number) => (
              <div key={i} className={`share-msg ${m.role}`}>
                <b>{m.role === "user" ? "Kullanıcı" : "NEXUS AI"}</b>
                <RichText text={String(m.content || "")} />
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}