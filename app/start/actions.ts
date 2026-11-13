"use server";

import { createHash, randomBytes, randomInt } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { defaultContentFor } from "@/lib/content/schema";
import { findReturningCustomer, sendConfirmationLink, signInWithoutLink } from "@/lib/email-login";
import { startKeyOk } from "@/lib/start-key";

export type StartState = { ok: boolean; message: string; needsOrder?: boolean } | null;

const PLAN = "signature"; // same full plan as every Etsy purchase made in /admin
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const randomSlug = () => Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
const MAX_UNVERIFIED_PER_EMAIL = 5;

const input = z.object({
  key: z.string().trim().max(40),
  template: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{1,60}$/, "Choose a design."),
  order: z.string().trim().max(40).transform((v) => v.replace(/[\s#]/g, "")).pipe(z.union([z.literal(""), z.string().regex(/^\d{8,14}$/, "Enter your Etsy order number: digits only, for example 3912345678.")])),
  email: z.string().trim().toLowerCase().pipe(z.email("Please enter a valid email address.")),
});

/** Throttle: per IP, per email and per order number (10 minutes window), so order numbers cannot be guessed. */
async function allowStart(email: string, order: string): Promise<boolean> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const db = createAdminClient();
  const hits = await Promise.all([
    db.rpc("hit_rate_limit", { p_key: `start:ip:${ip}`, p_window_seconds: 600, p_max: 12 }),
    db.rpc("hit_rate_limit", { p_key: `start:em:${email}`, p_window_seconds: 600, p_max: 6 }),
    order ? db.rpc("hit_rate_limit", { p_key: `start:ord:${order}`, p_window_seconds: 600, p_max: 5 }) : Promise.resolve({ data: true }),
  ]);
  return hits.every((r) => r.data !== false);
}

/** New personal link (valid 30 days) for an invitation; the raw token is never stored. */
async function issueClaim(invitationId: string): Promise<string | null> {
  const db = createAdminClient();
  const token = randomBytes(32).toString("base64url");
  const { error } = await db.from("edit_claims").insert({
    invitation_id: invitationId,
    token_hash: "\\x" + createHash("sha256").update(token).digest("hex"),
    expires_at: new Date(Date.now() + 30 * 864e5).toISOString(),
    created_by: null,
  });
  return error ? null : token;
}

/**
 * A customer comes back through the same personal link and types only the email (the order number is for the first time).
 * Only an email that belongs to an invitation of THIS design gets in, directly and without any emailed link.
 */
async function comeBackWithEmail(templateId: string, templateSlug: string, email: string, origin: string): Promise<StartState> {
  const db = createAdminClient();
  const customer = await findReturningCustomer(email);
  if (customer) {
    const { data: mine } = await db.from("invitations").select("id").eq("owner_id", customer.id).eq("template_id", templateId).order("created_at", { ascending: false });
    if (mine?.length) {
      if (!(await signInWithoutLink(email))) return { ok: false, message: "Could not sign you in. Please try again." };
      await rememberStarted(templateSlug);
      redirect(mine.length === 1 ? `/editor/${mine[0].id}` : "/dashboard");
    }
  }
  // started, but the first confirmation email was never opened: send a fresh one
  const { data: log } = await db.from("audit_log").select("entity_id").eq("action", "order.self_start").contains("metadata", { email }).order("created_at", { ascending: false }).limit(10);
  for (const row of log ?? []) {
    const { data: inv } = await db.from("invitations").select("id, owner_id, template_id").eq("id", row.entity_id).maybeSingle();
    if (inv && !inv.owner_id && inv.template_id === templateId) {
      await db.from("edit_claims").update({ revoked_at: new Date().toISOString() }).eq("invitation_id", inv.id).is("redeemed_at", null).is("revoked_at", null);
      const token = await issueClaim(inv.id);
      if (!token || !(await sendConfirmationLink(email, `/claim/${token}/go`, origin))) return { ok: false, message: "Could not send the email. Please wait a minute and try again." };
      return { ok: true, message: sentTo(email) };
    }
  }
  return { ok: false, needsOrder: true, message: "First time here? Enter your Etsy order number to start your invitation." };
}

/** Remember on this device which designs were started, so the link opens with only the email field next time (no personal data in it). */
async function rememberStarted(slug: string) {
  const jar = await cookies();
  const have = (jar.get("pi_started")?.value ?? "").split(",").filter(Boolean);
  if (!have.includes(slug)) have.push(slug);
  jar.set("pi_started", have.slice(-8).join(","), { sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 400 * 864e3 });
}

const sentTo = (to: string) => `We sent a confirmation link to ${to}. This link can be used only once.`;
const USED = "This order number has already been used. If it is your order and you need help, please contact Tamara from PIXELINVITE on Etsy.";

/** The buyer activates their purchase themselves with the Etsy order number; it works once per order number. */
export async function redeemOrder(_prev: StartState, fd: FormData): Promise<StartState> {
  if (String(fd.get("website") ?? "").trim() !== "") return { ok: true, message: sentTo("your email") }; // honeypot: bots fill every field
  const p = input.safeParse({ key: fd.get("key") ?? "", template: fd.get("template"), order: fd.get("order") ?? "", email: fd.get("email") });
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const { template, order: ref, email, key } = p.data;
  if (!startKeyOk(template, key)) return { ok: false, message: "This link is not valid. Please open the link from your Etsy download again." };
  if (!(await allowStart(email, ref))) return { ok: false, message: "Too many attempts. Please wait a few minutes and try again." };

  const db = createAdminClient();
  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data: tpl } = await db.from("templates").select("id, current_version, name, slug").eq("slug", template).eq("is_active", true).maybeSingle();
  if (!tpl) return { ok: false, message: "Choose a design." };
  if (!ref) return comeBackWithEmail(tpl.id, template, email, origin);

  // This order number was already used. Only the same person who started it, and only until they open the email link, may ask for a fresh email.
  const { data: existing } = await db.from("orders").select("id").eq("etsy_order_ref", ref).maybeSingle();
  if (existing) {
    const { data: inv } = await db.from("invitations").select("id, owner_id").eq("order_id", existing.id).maybeSingle();
    if (inv?.owner_id) {
      // the owner comes back with the order number and the same email: straight in, no email link
      const { data: owner } = await db.from("profiles").select("email, role").eq("id", inv.owner_id).maybeSingle();
      if (owner?.role === "customer" && owner.email === email) {
        if (!(await signInWithoutLink(email))) return { ok: false, message: "Could not sign you in. Please try again." };
        await rememberStarted(template);
        redirect(`/editor/${inv.id}`);
      }
      return { ok: false, message: USED };
    }
    if (!inv) return { ok: false, message: USED };
    const { data: log } = await db.from("audit_log").select("id").eq("action", "order.self_start").eq("entity_id", inv.id).contains("metadata", { email }).limit(1);
    if (!log?.length) return { ok: false, message: USED };
    await db.from("edit_claims").update({ revoked_at: new Date().toISOString() }).eq("invitation_id", inv.id).is("redeemed_at", null).is("revoked_at", null);
    const token = await issueClaim(inv.id);
    if (!token || !(await sendConfirmationLink(email, `/claim/${token}/go`, origin))) return { ok: false, message: "Could not send the email. Please wait a minute and try again." };
    return { ok: true, message: sentTo(email) };
  }

  // a single email address cannot start unlimited unverified orders
  const { count } = await db.from("audit_log").select("id", { count: "exact", head: true }).eq("action", "order.self_start").contains("metadata", { email });
  if ((count ?? 0) >= MAX_UNVERIFIED_PER_EMAIL) return { ok: false, message: "Please contact Tamara from PIXELINVITE on Etsy and she will set it up for you." };

  const { data: order, error: oErr } = await db.from("orders").insert({
    plan_code: PLAN, etsy_order_ref: ref, payment_status: "pending_verification", purchased_at: new Date().toISOString(),
  }).select("id").single();
  if (oErr) return { ok: false, message: oErr.code === "23505" ? USED : "Could not start your invitation. Please try again." };

  let inv: { id: string } | null = null;
  for (let i = 0; i < 5 && !inv; i++) {
    const { data, error } = await db.from("invitations").insert({
      order_id: order.id, template_id: tpl.id, template_version: tpl.current_version, plan_code: PLAN,
      slug: randomSlug(), display_title: `${tpl.name} · ${ref}`, owner_id: null,
    }).select("id").single();
    if (!error) inv = data;
    else if (error.code !== "23505" && error.code !== "23514") break;
  }
  const rollback = async () => { if (inv) await db.from("invitations").delete().eq("id", inv.id); await db.from("orders").delete().eq("id", order.id); };
  if (!inv) { await rollback(); return { ok: false, message: "Could not start your invitation. Please try again." }; }
  const c1 = await db.from("invitation_content").insert({ invitation_id: inv.id, draft: defaultContentFor(tpl.slug) });
  const c2 = await db.from("hosting_entitlements").insert({ invitation_id: inv.id, order_id: order.id, state: "pending" });
  if (c1.error || c2.error) { await rollback(); return { ok: false, message: "Could not start your invitation. Please try again." }; }
  await db.from("audit_log").insert({ actor_id: null, action: "order.self_start", entity_type: "invitation", entity_id: inv.id, metadata: { template: tpl.name, etsy: ref, email } });

  const token = await issueClaim(inv.id);
  if (!token) { await rollback(); return { ok: false, message: "Could not start your invitation. Please try again." }; }
  // Always confirm by email, even for a returning customer: an order number alone must never sign anyone in to an existing account.
  if (!(await sendConfirmationLink(email, `/claim/${token}/go`, origin))) {
    return { ok: false, message: "Your order was saved, but the email could not be sent. Please wait a minute and enter the same order number and email again." };
  }
  return { ok: true, message: sentTo(email) };
}
