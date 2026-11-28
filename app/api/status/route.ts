import { NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { validProviderBase,OPENROUTER_BASE } from "../../../lib/core/free-catalog";
import {balance,configured} from "../../../lib/billing/server";
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

  const wallet=await balance(user.id);
  return NextResponse.json({
    model: "auto",
    plan:wallet.pro?"pro":"free",
    wallet,
    premiumEnabled:configured() && process.env.NEXUS_BILLING_MODE==="live",
    paymentsEnabled:configured(),
    provider,
    isAdmin: isCoreAdminId(user.id),
    accountId: user.id,
    configured: Boolean((process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY)
      && validProviderBase(process.env.AI_BASE_URL||OPENROUTER_BASE)),
  }, { headers: { "Cache-Control": "private, no-store" } });
}

