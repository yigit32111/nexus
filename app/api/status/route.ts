import { NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { accountPlan, PRO_OFFER } from "../../../lib/core/plans";
import { isCoreAdminId } from "../../../lib/core/permissions";

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
    model: "auto",
    plan: accountPlan(user.app_metadata),
    premiumEnabled: false,
    plannedProOffer: PRO_OFFER,
    provider,
    isAdmin: isCoreAdminId(user.id),
    accountId: user.id,
    configured: Boolean(process.env.AI_API_KEY || process.env.GROQ_API_KEY),
  }, { headers: { "Cache-Control": "private, no-store" } });
}
