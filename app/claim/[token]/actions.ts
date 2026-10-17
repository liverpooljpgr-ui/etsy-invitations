"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowAttempt, findReturningCustomer, signInWithoutLink } from "@/lib/email-login";

export type ClaimState = { ok: boolean; message: string } | null;

/** Is this purchase link still usable? (exists, not used, not revoked, not expired) */
export async function claimStatus(token: string): Promise<"ok" | "used" | "invalid"> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return "invalid";
  const hash = "\\x" + createHash("sha256").update(token).digest("hex");
  const { data } = await createAdminClient().from("edit_claims").select("redeemed_at, revoked_at, expires_at").eq("token_hash", hash).maybeSingle();
  if (!data || data.revoked_at || new Date(data.expires_at) < new Date()) return "invalid";
  return data.redeemed_at ? "used" : "ok";
}

/**
 * First visit with this purchase link: the customer enters their email.
 *  - new email  → we email a confirmation link ONCE; opening it attaches the invitation to them;
 *  - email that already confirmed before (earlier purchase) → straight in, no email needed.
 */
export async function startClaim(token: string, _prev: ClaimState, formData: FormData): Promise<ClaimState> {
  const email = z.email().safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { ok: false, message: "Please enter a valid email address." };
  const status = await claimStatus(token);
  if (status === "used") return { ok: false, message: "This link has already been used. Use “Already have an invitation? Sign in” and enter your email." };
  if (status !== "ok") return { ok: false, message: "This link is invalid or expired. Contact support for a new one." };
  if (!(await allowAttempt("claim", email.data))) return { ok: false, message: "Too many attempts. Please wait a few minutes and try again." };

  const customer = await findReturningCustomer(email.data);
  if (customer) {
    if (!(await signInWithoutLink(email.data))) return { ok: false, message: "Could not sign you in. Please try again." };
    redirect(`/claim/${token}/go`);
  }

  const h = await headers();
  const origin = h.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(`/claim/${token}/go`)}` },
  });
  if (error) return { ok: false, message: "Could not send the link. Please wait a minute and try again." };
  return { ok: true, message: "Check your inbox: we sent you a confirmation link (once only). Open it in this same browser and your invitation opens right away. Next time you only enter your email." };
}
