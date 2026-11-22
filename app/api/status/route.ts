import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET() {
  const base = (process.env.AI_BASE_URL || "https://api.openai.com/v1").toLowerCase();
  const provider = base.includes("groq") ? "GROQ" : base.includes("generativelanguage") ? "GEMINI" : base.includes("openrouter") ? "OPENROUTER" : base.includes("openai") ? "OPENAI" : "CUSTOM AI";
  return NextResponse.json({ model: process.env.AI_MODEL || "Model ayarlanmamış", provider, configured: Boolean(process.env.AI_API_KEY) });
}
