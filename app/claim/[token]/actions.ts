"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function claimInvitation(token: string) {
  const { user } = await requireUser(`/claim/${token}`);
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) redirect(`/claim/${encodeURIComponent(token)}?error=1`);
  const hash = "\\x" + createHash("sha256").update(token).digest("hex");
  const { data, error } = await createAdminClient().rpc("redeem_claim", { p_user: user.id, p_token_hash: hash });
  if (error || !data) redirect(`/claim/${token}?error=1`);
  redirect(`/editor/${data}`);
}
