import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth (Google) and password-reset links return here with ?code=… —
 * exchange it for a session cookie, then go to ?next= (same-site path only).
 * Sign-ups are disabled, so an unknown Google account comes back with ?error=…
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  // Same-site paths only: "//evil.com" and "/\evil.com" would leave the site.
  const target = next && /^\/(?![/\\])[^\\]*$/.test(next) ? next : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${target}`);
  }
  return NextResponse.redirect(`${origin}/login?error=${target === "/account" ? "reset" : "oauth"}`);
}
