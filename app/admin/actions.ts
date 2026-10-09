"use server";

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { defaultContent } from "@/lib/content/schema";

export type CreateState = { ok: boolean; message: string; claimUrl?: string; editorUrl?: string } | null;

const input = z.object({
  plan: z.enum(["essential", "signature", "signature_rsvp", "personalized_setup"]),
  title: z.string().trim().min(1).max(80),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug: lowercase letters, numbers and dashes").min(3).max(40),
  etsyRef: z.string().trim().max(60).optional(),
  owner: z.enum(["claim", "me"]),
});

export async function createInvitation(_prev: CreateState, fd: FormData): Promise<CreateState> {
  const { user } = await requireAdmin();
  const p = input.safeParse({
    plan: fd.get("plan"), title: fd.get("title"), slug: fd.get("slug"),
    etsyRef: String(fd.get("etsyRef") ?? "") || undefined, owner: fd.get("owner"),
  });
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const v = p.data;
  const db = createAdminClient();

  const { data: tpl } = await db.from("templates").select("id,current_version").eq("slug", "sage-story").single();
  if (!tpl) return { ok: false, message: "Template 'sage-story' not found. Run the seed migration." };

  const { data: order, error: oErr } = await db.from("orders").insert({
    plan_code: v.plan, etsy_order_ref: v.etsyRef ?? null, payment_status: "verified",
    verified_by: user.id, verified_at: new Date().toISOString(), purchased_at: new Date().toISOString(),
  }).select("id").single();
  if (oErr) return { ok: false, message: oErr.code === "23505" ? "That Etsy order reference already exists." : "Could not create the order." };

  const { data: inv, error: iErr } = await db.from("invitations").insert({
    order_id: order.id, template_id: tpl.id, template_version: tpl.current_version, plan_code: v.plan,
    slug: v.slug, display_title: v.title, owner_id: v.owner === "me" ? user.id : null,
  }).select("id").single();
  if (iErr) {
    await db.from("orders").delete().eq("id", order.id);
    return { ok: false, message: iErr.code === "23505" ? "That slug is taken." : iErr.code === "23514" ? "That slug is reserved or invalid." : "Could not create the invitation." };
  }

  const rollback = async () => { await db.from("invitations").delete().eq("id", inv.id); await db.from("orders").delete().eq("id", order.id); };
  const c1 = await db.from("invitation_content").insert({ invitation_id: inv.id, draft: defaultContent });
  const c2 = await db.from("hosting_entitlements").insert({ invitation_id: inv.id, order_id: order.id, state: "pending" });
  if (c1.error || c2.error) { await rollback(); return { ok: false, message: "Could not initialise the invitation." }; }

  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  await db.from("audit_log").insert({ actor_id: user.id, action: "invitation.create", entity_type: "invitation", entity_id: inv.id, metadata: { plan: v.plan, slug: v.slug } });

  if (v.owner === "me") return { ok: true, message: "Created. You own it — open the editor.", editorUrl: `/editor/${inv.id}` };

  const token = randomBytes(32).toString("base64url");
  const { error: tErr } = await db.from("edit_claims").insert({
    invitation_id: inv.id, token_hash: "\\x" + createHash("sha256").update(token).digest("hex"),
    expires_at: new Date(Date.now() + 14 * 864e5).toISOString(), created_by: user.id,
  });
  if (tErr) { await rollback(); return { ok: false, message: "Could not create the claim link." }; }
  await db.from("audit_log").insert({ actor_id: user.id, action: "claim.issue", entity_type: "invitation", entity_id: inv.id });
  return { ok: true, message: "Created. Send this link to the customer — it is shown only once.", claimUrl: `${origin}/claim/${token}` };
}
