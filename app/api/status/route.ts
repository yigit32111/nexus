import { NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  const base = (process.env.AI_BASE_URL || "https://openrouter.ai/api/v1").toLowerCase();
  const provider = base.includes("groq")
    ? "GROQ"
    : base.includes("generativelanguage")
    ? "GEMINI"
    : base.includes("openrouter")
    ? "OPENROUTER"
    : base.includes("openai")
    ? "OPENAI"
    : "CUSTOM AI";

  return NextResponse.json({
    model: process.env.AI_MODEL || "qwen/qwen3-vl-30b-a3b-instruct",
    provider,
    configured: Boolean(process.env.AI_API_KEY || process.env.GROQ_API_KEY),
  });
}
