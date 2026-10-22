"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseContent } from "@/lib/content/schema";

export type RsvpResult = { ok: boolean; message: string };

const input = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(40),
  key: z.uuid(), // made by the form, so a double tap or a retry never records two replies
  name: z.string().trim().min(1, "Please write your name.").max(120, "That name is a bit long."),
  attendance: z.enum(["attending", "declined", "maybe"]),
  count: z.number().int().min(0).max(20),
  dietary: z.string().trim().max(300, "Please keep the food note shorter."),
  message: z.string().trim().max(1000, "Please keep the message shorter."),
  website: z.string().max(200).optional(), // hidden trap field: people leave it empty, bots fill it
});

/** Replies stay open all through the "reply by" day, wherever the guest is in the world. */
function closesAt(deadline: string): number {
  return Date.parse(`${deadline}T12:00:00Z`) + 24 * 3600 * 1000; // the end of that day in the last time zone to reach it
}

/** A guest's reply from inside the invitation. Public (no sign-in), so it checks everything itself. */
export async function submitRsvp(raw: unknown): Promise<RsvpResult> {
  const p = input.safeParse(raw);
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const v = p.data;
  if (v.website) return { ok: true, message: "Thank you!" }; // a bot: look happy, store nothing

  const db = createAdminClient();
  const ip = ((await headers()).get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const [a, b] = await Promise.all([
    db.rpc("hit_rate_limit", { p_key: `rsvp:ip:${ip}`, p_window_seconds: 600, p_max: 20 }),
    db.rpc("hit_rate_limit", { p_key: `rsvp:slug:${v.slug}`, p_window_seconds: 3600, p_max: 300 }),
  ]);
  if (a.data === false || b.data === false) return { ok: false, message: "Too many replies just now. Please try again in a few minutes." };

  const { data: inv } = await db.from("invitations").select("id, status").eq("slug", v.slug).maybeSingle();
  if (!inv || inv.status !== "published") return { ok: false, message: "This invitation is not available." };
  const [{ data: host }, { data: row }] = await Promise.all([
    db.from("hosting_entitlements").select("state").eq("invitation_id", inv.id).in("state", ["active", "grace"]).maybeSingle(),
    db.from("invitation_content").select("published").eq("invitation_id", inv.id).maybeSingle(),
  ]);
  if (!host || !row?.published) return { ok: false, message: "This invitation is not available." };

  const c = parseContent(row.published);
  if (!c.rsvp.online || c.hidden.includes(6)) return { ok: false, message: "Replies are not collected here. Please use the contact details on the invitation." };
  if (c.rsvp.deadline && Date.now() > closesAt(c.rsvp.deadline)) return { ok: false, message: "The reply date has passed, so replies are closed." };

  const count = v.attendance === "declined" ? 0 : Math.max(1, v.count);
  if (count > c.rsvp.maxParty) return { ok: false, message: `Please reply for up to ${c.rsvp.maxParty} guests at a time.` };

  const { error } = await db.from("rsvp_responses").insert({
    invitation_id: inv.id,
    idempotency_key: v.key,
    guest_name: v.name,
    attendance: v.attendance,
    attendee_count: count,
    dietary: v.dietary || null,
    message: v.message || null,
  });
  if (error && error.code !== "23505") return { ok: false, message: "Sorry, your reply could not be saved. Please try again." }; // 23505 = the same reply sent twice
  return { ok: true, message: "Thank you! Your reply has been sent to the couple." };
}
