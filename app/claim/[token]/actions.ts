"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowAttempt, findReturningCustomer, sendConfirmationLink, signInWithoutLink } from "@/lib/email-login";

export type ClaimState = { ok: boolean; message: string } | null;

const WRONG_EMAIL = "This is not the right email. This link was already opened with a different email address — enter the email you used the first time.";

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
  if (status === "used") {
    // The link was opened before: only the email it was opened with may come back in through it.
    const hash = "\\x" + createHash("sha256").update(token).digest("hex");
    const db = createAdminClient();
    const { data: c } = await db.from("edit_claims").select("invitation_id").eq("token_hash", hash).maybeSingle();
    const { data: inv } = c ? await db.from("invitations").select("id, owner_id").eq("id", c.invitation_id).maybeSingle() : { data: null };
    const { data: owner } = inv?.owner_id ? await db.from("profiles").select("email, role").eq("id", inv.owner_id).maybeSingle() : { data: null };
    if (!inv || !owner || owner.email !== email.data || owner.role !== "customer" || !(await allowAttempt("claim", email.data))) {
      return { ok: false, message: WRONG_EMAIL };
    }
    if (!(await signInWithoutLink(email.data))) return { ok: false, message: "Could not sign you in. Please try again." };
    redirect(`/editor/${inv.id}`);
  }
  if (status !== "ok") return { ok: false, message: "This link is invalid or expired. Contact support for a new one." };
  if (!(await allowAttempt("claim", email.data))) return { ok: false, message: "Too many attempts. Please wait a few minutes and try again." };

  const customer = await findReturningCustomer(email.data);
  if (customer) {
    if (!(await signInWithoutLink(email.data))) return { ok: false, message: "Could not sign you in. Please try again." };
    redirect(`/claim/${token}/go`);
  }

  const h = await headers();
  const origin = h.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  if (!(await sendConfirmationLink(email.data, `/claim/${token}/go`, origin))) return { ok: false, message: "Could not send the link. Please wait a minute and try again." };
  return { ok: true, message: "Check your inbox: we sent you a confirmation link (once only). Open it on any device and your invitation opens right away. Next time you only enter your email." };
}
