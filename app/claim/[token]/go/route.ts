import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Signed-in customer arrives here (after the email link, or after an email-only sign-in): attach the invitation and open the editor. */
export async function GET(request: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const { origin } = request.nextUrl;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.redirect(`${origin}/claim/${encodeURIComponent(token)}`);
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return NextResponse.redirect(`${origin}/claim/${encodeURIComponent(token)}`);
  // never attach a customer's purchase to a staff account that happens to be signed in in this browser
  const { data: me } = await createAdminClient().from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (me?.role === "admin") return NextResponse.redirect(`${origin}/claim/${encodeURIComponent(token)}`);
  const hash = "\\x" + createHash("sha256").update(token).digest("hex");
  const { data: invId, error } = await createAdminClient().rpc("redeem_claim", { p_user: data.user.id, p_token_hash: hash });
  if (error || !invId) return NextResponse.redirect(`${origin}/dashboard`);
  return NextResponse.redirect(`${origin}/editor/${invId}`);
}
