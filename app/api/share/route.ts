import {readJsonLimited} from "../../../lib/core/request-guard";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { randomBytes } from "node:crypto";

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
      return NextResponse.json({ error: "Paylaşım oluşturmak için giriş yap." }, { status: 401 });
    }

    const parsedBody=await readJsonLimited(req,3145728);
    if(!parsedBody.ok)return NextResponse.json({error:parsedBody.error},{status:parsedBody.status});
    const body=parsedBody.value;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Geçersiz paylaşım verisi." }, { status: 400 });
    }

    const shareId = randomBytes(16).toString("hex");
    const shareType = body.shareType === "chat" ? "chat" : "canvas";
    const title = String(body.title || "NEXUS Paylaşımı").slice(0, 120);
    const language = String(body.language || "markdown").slice(0, 40);
    const content = String(body.content || "").slice(0, 100000);
    const messages = Array.isArray(body.messages)
      ? body.messages.slice(0, 100).filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string").map((m: any) => ({ role: m.role, content: m.content.slice(0, 24000) }))
      : [];

    const { error } = await supabase.from("nexus_shares").insert({
      id: shareId,
      user_id: user.id,
      title,
      share_type: shareType,
      language,
      content,
      messages,
    });

    if (error) {
      console.error("NEXUS SHARE ERROR", error.code);
      return NextResponse.json(
        { error: "Paylaşım kaydedilemedi. nexus_shares tablosunun oluşturulduğundan emin ol." },
        { status: 500 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") || new URL(req.url).origin;

    return NextResponse.json({
      shareId,
      url: `${baseUrl}/share/${shareId}`,
    });
  } catch {
    return NextResponse.json({ error: "Paylaşım oluşturulurken hata oluştu." }, { status: 500 });
  }
}
