import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import { chunkText, uid } from "../../../../lib/nexus-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.gemId !== "string" || typeof body.fileName !== "string") {
      return NextResponse.json({ error: "Geçersiz dosya isteği." }, { status: 400 });
    }

    const gemId = body.gemId.trim().slice(0, 100);
    const fileName = body.fileName.trim().slice(0, 180);
    const fileType = String(body.fileType || "text/plain");
    const dataUrl = String(body.dataUrl || "");

    const match = dataUrl.match(/^data:([^;]+);base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!match) {
      return NextResponse.json({ error: "Dosya içeriği okunamadı." }, { status: 400 });
    }

    const buffer = Buffer.from(match[2], "base64");
    if (buffer.length > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Dosya boyutu en fazla 8 MB olabilir." }, { status: 413 });
    }

    let fullText = "";
    if (fileType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")) {
      const pdfModule = await import("pdf-parse");
      const parse = (pdfModule as any).default ?? pdfModule;
      const parsed = await parse(buffer);
      fullText = String(parsed?.text || "");
    } else {
      fullText = buffer.toString("utf8");
    }

    const chunks = chunkText(fullText, 1000, 180);
    if (!chunks.length) {
      return NextResponse.json({ error: "Dosyadan okunabilir metin çıkarılamadı." }, { status: 422 });
    }

    const docGroupId = uid();
    const rows = chunks.map((content, idx) => ({
      id: `${docGroupId}_${idx}`,
      user_id: user.id,
      gem_id: gemId,
      file_name: fileName,
      chunk_index: idx,
      content,
    }));

    const { error: dbError } = await supabase.from("nexus_gem_docs").insert(rows);
    if (dbError) {
      console.error("NEXUS GEM DOC INSERT ERROR", dbError);
      return NextResponse.json(
        { error: "Veritabanı tablosu (nexus_gem_docs) bulunamadı. SQL migration dosyasını çalıştır." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: docGroupId,
      name: fileName,
      size: buffer.length,
      chunkCount: chunks.length,
    });
  } catch (error) {
    console.error("NEXUS GEM DOC ERROR", error);
    return NextResponse.json({ error: "Doküman işlenirken hata oluştu." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const docId = searchParams.get("docId");
    const gemId = searchParams.get("gemId");

    if (docId) {
      await supabase
        .from("nexus_gem_docs")
        .delete()
        .eq("user_id", user.id)
        .like("id", `${docId}_%`);
    } else if (gemId) {
      await supabase
        .from("nexus_gem_docs")
        .delete()
        .eq("user_id", user.id)
        .eq("gem_id", gemId);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Silme işlemi başarısız." }, { status: 500 });
  }
}