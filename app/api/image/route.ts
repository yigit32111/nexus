import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

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
      return NextResponse.json({ error: "Görsel üretmek için giriş yap." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim().slice(0, 1200) : "";
    if (!prompt) {
      return NextResponse.json({ error: "Görsel açıklaması (prompt) gerekli." }, { status: 400 });
    }

    const base = (process.env.AI_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/+$/, "");
    const key = process.env.AI_API_KEY || process.env.GROQ_API_KEY;
    const configuredImageModel = process.env.AI_IMAGE_MODEL || "";

    let imageUrl = "";
    let usedModel = configuredImageModel || "flux";

    // 1) If OpenRouter or custom image model is configured, try provider image generation
    if (key && (base.includes("openrouter.ai") || configuredImageModel)) {
      const targetModel = configuredImageModel || "google/gemini-2.5-flash-image-preview";
      usedModel = targetModel;

      const response = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          ...(base.includes("openrouter.ai")
            ? {
                "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://nexus-ifn5.onrender.com",
                "X-Title": "NEXUS AI 3.2",
              }
            : {}),
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        const msg = data?.choices?.[0]?.message;
        if (Array.isArray(msg?.images) && msg.images[0]?.image_url?.url) {
          imageUrl = msg.images[0].image_url.url;
        } else if (Array.isArray(msg?.content)) {
          const imgPart = msg.content.find((p: any) => p?.type === "image_url" && p?.image_url?.url);
          if (imgPart) imageUrl = imgPart.image_url.url;
        }
      }
    }

    // 2) Reliable fallback via Flux image endpoint if provider does not support image modality
    if (!imageUrl) {
      const seed = Math.floor(Math.random() * 1_000_000);
      imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
        prompt
      )}?width=1024&height=1024&seed=${seed}&nologo=true`;
      usedModel = "flux-schnell";
    }

    // Log image generation usage
    void supabase.from("nexus_usage_logs").insert({
      user_id: user.id,
      model: usedModel,
      provider: "IMAGE",
      feature: "image",
      prompt_tokens: Math.ceil(prompt.length / 4),
      completion_tokens: 1000,
    });

    return NextResponse.json({
      imageUrl,
      model: usedModel,
      prompt,
    });
  } catch (error) {
    console.error("NEXUS IMAGE GEN ERROR", error);
    return NextResponse.json({ error: "Görsel oluşturulurken hata oluştu." }, { status: 500 });
  }
}