import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { writeUsageLog } from "../../../utils/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HF_IMAGE_MODELS = [
  "black-forest-labs/FLUX.1-schnell",
  "stabilityai/stable-diffusion-xl-base-1.0",
];

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

    const hfToken = (
      process.env.HF_TOKEN ||
      process.env.HUGGINGFACE_TOKEN ||
      process.env.HG_TOKEN ||
      ""
    ).trim();

    if (!hfToken) {
      return NextResponse.json(
        {
          error:
            "Sunucuda HF_TOKEN bulunamadı. Render -> Environment sekmesine 'HF_TOKEN' anahtarıyla Hugging Face token'ını ekleyip 'Save Changes' butonuna bas.",
        },
        { status: 400 }
      );
    }

    let imageUrl = "";
    let usedModel = "";
    let lastError = "";

    for (const modelId of HF_IMAGE_MODELS) {
      const hfRes = await fetch(
        `https://router.huggingface.co/hf-inference/models/${modelId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${hfToken}`,
            "Content-Type": "application/json",
            "x-wait-for-model": "true",
          },
          body: JSON.stringify({ inputs: prompt }),
          signal: AbortSignal.timeout(60000),
        }
      );

      if (hfRes.ok) {
        const contentType = hfRes.headers.get("content-type") || "image/png";
        if (contentType.startsWith("image/")) {
          const arrBuf = await hfRes.arrayBuffer();
          imageUrl = `data:${contentType};base64,${Buffer.from(arrBuf).toString("base64")}`;
          usedModel = modelId;
          break;
        }
      } else {
        const errText = await hfRes.text().catch(() => "");
        try {
          const parsed = JSON.parse(errText);
          lastError = String(parsed?.error || `Hugging Face hatası (${hfRes.status})`);
        } catch {
          lastError = errText.slice(0, 220) || `Hugging Face hatası (${hfRes.status})`;
        }

        // Token geçersiz veya yetkisiz ise diğer modelleri denemeye gerek yok
        if (hfRes.status === 401 || hfRes.status === 403) {
          lastError =
            "Hugging Face token geçersiz veya 'Inference' yetkisi yok. Token ayarlarını kontrol et.";
          break;
        }
      }
    }

    if (!imageUrl) {
      return NextResponse.json(
        {
          error: `Hugging Face görsel üretemedi: ${lastError || "Bilinmeyen hata"}`,
        },
        { status: 502 }
      );
    }

    await writeUsageLog({
      user_id: user.id,
      model: usedModel,
      provider: "HUGGINGFACE",
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
    return NextResponse.json({ error: "Görsel oluşturulurken sunucu hatası oluştu." }, { status: 500 });
  }
}