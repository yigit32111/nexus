import "server-only";
import { createClient } from "@supabase/supabase-js";
import { reportTechnicalEvent } from "../../lib/core/technical-monitor";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server credentials are missing");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

// Only call from authenticated server routes with verified user IDs.
// Usage analytics are not a financial ledger.
export async function writeUsageLog(row: {
  user_id: string; model: string; provider: string; feature: string;
  prompt_tokens: number; completion_tokens: number; cost_microusd?:number;
}) {
  try {
    const { error } = await createAdminClient().from("nexus_usage_logs").insert(row);
    if (error) { console.error("NEXUS USAGE LOG ERROR"); await reportTechnicalEvent("USAGE_LOG_FAILURE"); }
  } catch {
    console.error("NEXUS USAGE LOG ERROR: server credentials or connection unavailable");
    await reportTechnicalEvent("USAGE_LOG_FAILURE");
  }
}
