import { NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next");
  const next = requestedNext === "/reset-password" ? requestedNext : "/";

  // Use the explicitly configured origin in production, not a caller-provided forwarding header.
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  let appUrl: string;
  try { appUrl = new URL(configured || (process.env.NODE_ENV === "production" ? "https://nexus-ifn5.onrender.com" : origin)).origin; }
  catch { return new NextResponse("Invalid application configuration", { status: 500 }); }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${appUrl}${next}`);
    }
  }

  return NextResponse.redirect(`${appUrl}/login?auth=callback_error`);
}
