import { parsePrice } from "../../../lib/core/model-policy";
import { NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RawModel = {
  id?: string;
  name?: string;
  context_window?: number;
  context_length?: number;
  active?: boolean;
  owned_by?: string;
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
  };
  supported_parameters?: string[];
  pricing?: { prompt?: string; completion?: string; request?: string; image?: string };
};

const VISION_ID_RE =
  /(?:vision|vl\b|-vl-|qwen3|gpt-4o|gpt-4\.1|claude-3|claude-sonnet-4|gemini|pixtral|llava)/i;

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Model listesini görmek için giriş yapmalısın." }, { status: 401 });
    }

    const base = (process.env.AI_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/+$/, "");
    const key = process.env.AI_API_KEY || process.env.GROQ_API_KEY;
    if (!key) {
      return NextResponse.json({
        models: [],
        total: 0,
        configured: false,
        provider: providerName(base),
        note: "AI_API_KEY sunucuda ayarlanmamış.",
      });
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    };
    if (base.includes("openrouter.ai")) {
      headers["HTTP-Referer"] = process.env.NEXT_PUBLIC_APP_URL || "https://nexus-ifn5.onrender.com";
      headers["X-Title"] = "NEXUS AI 3.0";
    }

    const response = await fetch(`${base}/models`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      console.error("NEXUS MODEL CATALOG ERROR", response.status, data?.error);
      return NextResponse.json(
        { error: "Model kataloğu sağlayıcıdan alınamadı. API anahtarını ve sağlayıcı adresini kontrol et." },
        { status: 502 }
      );
    }

    const payload = await response.json();
    const models = (Array.isArray(payload?.data) ? payload.data : [])
      .filter((m: RawModel) => {
        if (typeof m.id !== "string" || !m.id || m.active === false) return false;
        const out = m.architecture?.output_modalities;
        if (Array.isArray(out) && out.length > 0 && !out.includes("text")) return false;
        return true;
      })
      .map((m: RawModel) => {
        const id = m.id!;
        const modalities = m.architecture?.input_modalities || [];
        const vision = modalities.includes("image");
        const isFree = !id.startsWith("openrouter/") &&
          [m.pricing?.prompt,m.pricing?.completion,m.pricing?.request??"0",m.pricing?.image??"0"].every(p=>parsePrice(p)===0);

        return {
          id,
          name: m.name || id,
          description: `${m.owned_by ? `Sağlayıcı: ${m.owned_by}` : "Aktif model"}${
            isFree ? " · Ücretsiz" : ""
          }`,
          contextLength: Number(m.context_window || m.context_length || 0),
          free: isFree,
          vision,
          supportedParameters: Array.isArray(m.supported_parameters) ? m.supported_parameters : [],
        };
      })
      .filter(m=>m.free)
      .sort(
        (a: any, b: any) =>
          Number(b.free) - Number(a.free) ||
          Number(b.vision) - Number(a.vision) ||
          a.name.localeCompare(b.name)
      );

    return NextResponse.json(
      {
        models,
        total: models.length,
        configured: true,
        provider: providerName(base),
        updatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "private, max-age=120" } }
    );
  } catch (error) {
    console.error("NEXUS MODELS ERROR", error);
    return NextResponse.json({ error: "Model kataloğu alınırken bağlantı hatası oluştu." }, { status: 500 });
  }
}

function providerName(base: string) {
  if (base.includes("groq")) return "GROQ";
  if (base.includes("openrouter")) return "OPENROUTER";
  if (base.includes("generativelanguage")) return "GEMINI";
  if (base.includes("openai")) return "OPENAI";
  return "CUSTOM AI";
}
