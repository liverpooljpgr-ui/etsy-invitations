import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Throttle sign-in attempts: per IP and per email address (10 minutes window). */
export async function allowAttempt(scope: string, email: string): Promise<boolean> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const db = createAdminClient();
  const [a, b] = await Promise.all([
    db.rpc("hit_rate_limit", { p_key: `${scope}:ip:${ip}`, p_window_seconds: 600, p_max: 30 }),
    db.rpc("hit_rate_limit", { p_key: `${scope}:em:${email}`, p_window_seconds: 600, p_max: 10 }),
  ]);
  return a.data !== false && b.data !== false;
}

/**
 * A customer who has already confirmed their email once owns at least one invitation (ownership is only
 * ever granted to a signed-in, email-verified user). Admins are never trusted this way.
 */
export async function findReturningCustomer(email: string): Promise<{ id: string; invitations: string[] } | null> {
  const db = createAdminClient();
  const { data: p } = await db.from("profiles").select("id, role").eq("email", email).maybeSingle();
  if (!p || p.role !== "customer") return null;
  const { data: invs } = await db.from("invitations").select("id").eq("owner_id", p.id).order("created_at", { ascending: false });
  return invs?.length ? { id: p.id, invitations: invs.map((i) => i.id) } : null;
}

/** Start a session for this email without sending a link (only call for a returning customer). */
export async function signInWithoutLink(email: string): Promise<boolean> {
  const { data, error } = await createAdminClient().auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) return false;
  const supabase = await createClient();
  const { error: vErr } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
  return !vErr;
}
