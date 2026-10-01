import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEMO_EMAIL = "demo.practitioner@solution.test";

// Signs straight into the demo practitioner account. The key in the link is that account's password,
// so the link only works for whoever has it.
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key") ?? "";
  const origin = request.nextUrl.origin;
  if (!key) return NextResponse.redirect(`${origin}/pro`);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: key });
  return NextResponse.redirect(`${origin}${error ? "/pro" : "/pro/dashboard"}`);
}
