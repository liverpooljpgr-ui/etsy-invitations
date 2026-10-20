"use server";

import { createHash, randomBytes, randomInt } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { defaultContent } from "@/lib/content/schema";

export type CreateState = { ok: boolean; message: string; claimUrl?: string } | null;

const PLAN = "signature"; // every Etsy purchase gets the full template (schedule, dress code, registry QR codes)

const input = z.object({
  templateId: z.uuid(),
  etsyRef: z.string().trim().min(1, "Enter the Etsy order reference.").max(60),
  // optional custom guest-link address; left empty = a random code
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(40, "The address can be at most 40 characters.")
    .refine((v) => v === "" || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v), "Use only letters, numbers and single dashes (for example anna-and-john).")
    .refine((v) => v === "" || v.length >= 3, "The address needs at least 3 characters."),
});

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
/** Short random guest-link code, e.g. "k7m2xq9p": says nothing about the couple and can't be guessed. */
const randomSlug = () => Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

async function siteOrigin() {
  return (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/** New personal link (valid 30 days) for an invitation; the raw token is returned once and never stored. */
async function issueClaim(invitationId: string, adminId: string) {
  const db = createAdminClient();
  const token = randomBytes(32).toString("base64url");
  const { error } = await db.from("edit_claims").insert({
    invitation_id: invitationId,
    token_hash: "\\x" + createHash("sha256").update(token).digest("hex"),
    expires_at: new Date(Date.now() + 30 * 864e5).toISOString(),
    created_by: adminId,
  });
  if (error) return null;
  await db.from("audit_log").insert({ actor_id: adminId, action: "claim.issue", entity_type: "invitation", entity_id: invitationId });
  return `${await siteOrigin()}/claim/${token}`;
}

/** One purchase = one template for one customer = one personal link. */
export async function createPurchase(_prev: CreateState, fd: FormData): Promise<CreateState> {
  const { user } = await requireAdmin();
  const p = input.safeParse({ templateId: fd.get("templateId"), etsyRef: fd.get("etsyRef"), slug: fd.get("slug") ?? "" });
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const v = p.data;
  const db = createAdminClient();

  const { data: tpl } = await db.from("templates").select("id, current_version, name").eq("id", v.templateId).eq("is_active", true).maybeSingle();
  if (!tpl) return { ok: false, message: "Choose a template." };

  // a custom address must be free and not reserved (checked up front so nothing half-created is left behind)
  const custom = v.slug || "";
  if (custom) {
    const [{ data: taken }, { data: reserved }] = await Promise.all([
      db.from("invitations").select("id").eq("slug", custom).maybeSingle(),
      db.from("reserved_slugs").select("slug").eq("slug", custom).maybeSingle(),
    ]);
    if (taken) return { ok: false, message: `"${custom}" is already used by another invitation. Choose a different address.` };
    if (reserved) return { ok: false, message: `"${custom}" is reserved. Choose a different address.` };
  }

  const { data: order, error: oErr } = await db.from("orders").insert({
    plan_code: PLAN, etsy_order_ref: v.etsyRef, payment_status: "verified",
    verified_by: user.id, verified_at: new Date().toISOString(), purchased_at: new Date().toISOString(),
  }).select("id").single();
  if (oErr) return { ok: false, message: oErr.code === "23505" ? "That Etsy order reference already exists." : "Could not create the order." };

  let inv: { id: string } | null = null;
  for (let i = 0; i < (custom ? 1 : 5) && !inv; i++) {
    const { data, error } = await db.from("invitations").insert({
      order_id: order.id, template_id: tpl.id, template_version: tpl.current_version, plan_code: PLAN,
      slug: custom || randomSlug(), display_title: `${tpl.name} · ${v.etsyRef}`, owner_id: null,
    }).select("id").single();
    if (!error) inv = data;
    else if (error.code !== "23505" && error.code !== "23514") break; // only retry on a slug clash
  }
  const rollback = async () => { if (inv) await db.from("invitations").delete().eq("id", inv.id); await db.from("orders").delete().eq("id", order.id); };
  if (!inv) { await rollback(); return { ok: false, message: custom ? `"${custom}" is not available. Choose a different address.` : "Could not create the invitation." }; }

  const c1 = await db.from("invitation_content").insert({ invitation_id: inv.id, draft: defaultContent });
  const c2 = await db.from("hosting_entitlements").insert({ invitation_id: inv.id, order_id: order.id, state: "pending" });
  if (c1.error || c2.error) { await rollback(); return { ok: false, message: "Could not initialise the invitation." }; }
  await db.from("audit_log").insert({ actor_id: user.id, action: "invitation.create", entity_type: "invitation", entity_id: inv.id, metadata: { template: tpl.name, etsy: v.etsyRef } });

  const claimUrl = await issueClaim(inv.id, user.id);
  if (!claimUrl) { await rollback(); return { ok: false, message: "Could not create the personal link." }; }
  return { ok: true, message: "Created. Send this link to the customer — it is shown only once (you can make a new one later).", claimUrl };
}

/** Permanently delete a purchase: the invitation, its content, its links, uploaded photo/music and its order. */
export async function deleteInvitation(invitationId: string): Promise<{ ok: boolean; message: string }> {
  const { user } = await requireAdmin();
  if (!z.uuid().safeParse(invitationId).success) return { ok: false, message: "Invalid invitation." };
  const db = createAdminClient();
  const { data: inv } = await db.from("invitations").select("id, slug, order_id").eq("id", invitationId).maybeSingle();
  if (!inv) return { ok: false, message: "Invitation not found." };

  const files = await db.storage.from("invitation-media").list(inv.id, { limit: 1000 });
  if (files.data?.length) await db.storage.from("invitation-media").remove(files.data.map((f) => `${inv.id}/${f.name}`));

  const { error } = await db.from("invitations").delete().eq("id", inv.id); // content, claims, hosting, RSVPs cascade
  if (error) return { ok: false, message: "Could not delete the invitation." };
  if (inv.order_id) await db.from("orders").delete().eq("id", inv.order_id);
  await db.from("audit_log").insert({ actor_id: user.id, action: "invitation.delete", entity_type: "invitation", entity_id: null, metadata: { slug: inv.slug } });
  revalidatePath("/admin");
  revalidatePath(`/${inv.slug}`);
  return { ok: true, message: "Deleted." };
}

/** Replace the personal link of a purchase that has not been used yet (e.g. the customer lost it). */
export async function reissueClaim(invitationId: string): Promise<CreateState> {
  const { user } = await requireAdmin();
  if (!z.uuid().safeParse(invitationId).success) return { ok: false, message: "Invalid invitation." };
  const db = createAdminClient();
  const { data: inv } = await db.from("invitations").select("id, owner_id").eq("id", invitationId).maybeSingle();
  if (!inv) return { ok: false, message: "Invitation not found." };
  if (inv.owner_id) return { ok: false, message: "The customer already opened this one — they sign in with their email." };
  await db.from("edit_claims").update({ revoked_at: new Date().toISOString() }).eq("invitation_id", invitationId).is("redeemed_at", null).is("revoked_at", null);
  const claimUrl = await issueClaim(invitationId, user.id);
  return claimUrl ? { ok: true, message: "New link created (the old one no longer works).", claimUrl } : { ok: false, message: "Could not create the link." };
}

/** The signed-in admin chooses their own password (so it never passes through anyone else). */
export async function setAdminPassword(_prev: CreateState, fd: FormData): Promise<CreateState> {
  const { user } = await requireAdmin();
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (password.length < 10) return { ok: false, message: "Use at least 10 characters." };
  if (password !== confirm) return { ok: false, message: "The two passwords do not match." };
  const { error } = await createAdminClient().auth.admin.updateUserById(user.id, { password });
  if (error) return { ok: false, message: "Could not save the password. Try a longer or less common one." };
  await createAdminClient().from("audit_log").insert({ actor_id: user.id, action: "admin.password_set", entity_type: "profile", entity_id: user.id });
  return { ok: true, message: "Password saved. From now on sign in at /login with your email and this password." };
}

/** A few words of private admin notes about an order (stored in orders.buyer_note, never shown to customers). */
export async function saveOrderNote(orderId: string, note: string): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  if (!z.uuid().safeParse(orderId).success) return { ok: false, message: "Invalid order." };
  const clean = note.trim().slice(0, 80);
  const { error } = await createAdminClient().from("orders").update({ buyer_note: clean || null }).eq("id", orderId);
  return error ? { ok: false, message: "Could not save." } : { ok: true };
}
