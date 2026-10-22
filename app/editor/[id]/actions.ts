"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyPlan, contentSchema, publishMissing } from "@/lib/content/schema";
import { pickNameSlug, RANDOM_SLUG } from "@/lib/slug-names";

const UUID = /^[0-9a-f-]{36}$/i;

export type SaveResult =
  | { ok: true; version: number }
  // `conflict` = someone/something else changed the stored draft since this tab last saved; it carries the stored copy
  | { ok: false; error: string; conflict?: { version: number; draft: unknown } };
export type PublishResult = { ok: true; slug: string } | { ok: false; error: string; missing?: string[] };

/** Autosave: runs as the signed-in user, so RLS + column grants + the content trigger apply. */
export async function saveDraft(id: string, draft: unknown, expectedVersion: number): Promise<SaveResult> {
  if (!UUID.test(id)) return { ok: false, error: "Invalid invitation." };
  const parsed = contentSchema.safeParse(draft);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, error: `${i.path.join(" › ")}: ${i.message}` };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invitation_content")
    .update({ draft: parsed.data })
    .eq("invitation_id", id)
    .eq("draft_version", expectedVersion)
    .select("draft_version");
  if (error) return { ok: false, error: "Could not save. Check your connection and try again." };
  if (!data?.length) {
    // Version mismatch (or the row is no longer visible/editable). Hand the stored copy back so the editor can recover.
    const { data: cur } = await supabase.from("invitation_content").select("draft, draft_version").eq("invitation_id", id).maybeSingle();
    if (cur) return { ok: false, error: "This invitation was changed elsewhere.", conflict: { version: cur.draft_version, draft: cur.draft } };
    return { ok: false, error: "This invitation is no longer editable." };
  }
  return { ok: true, version: data[0].draft_version };
}

async function authorize(id: string) {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: inv } = await supabase.from("invitations").select("id, slug, plan_code").eq("id", id).maybeSingle(); // RLS: owner or admin
  return inv ? { supabase, user: auth.user, inv } : null;
}

export async function publishInvitation(id: string): Promise<PublishResult> {
  const a = await authorize(id);
  if (!a) return { ok: false, error: "Please sign in again." };

  const [{ data: row }, { data: plan }] = await Promise.all([
    a.supabase.from("invitation_content").select("draft, published").eq("invitation_id", id).maybeSingle(),
    a.supabase.from("plans").select("features").eq("code", a.inv.plan_code).single(),
  ]);
  const parsed = contentSchema.safeParse(row?.draft);
  if (!parsed.success || !plan) return { ok: false, error: "Some fields are invalid. Fix them and try again." };
  const missing = publishMissing(parsed.data);
  if (missing.length) return { ok: false, error: "Please complete the required fields first.", missing };

  const snapshot = applyPlan(parsed.data, plan.features);
  const { error } = await createAdminClient().rpc("publish_invitation", { p_actor: a.user.id, p_invitation: id, p_snapshot: snapshot });
  if (error) return { ok: false, error: "Could not publish. Your hosting may be inactive — contact support." };

  // First publish, before the link has gone to anyone: swap the random code for the couple's names ("anna-and-richard").
  // Addresses chosen by hand are left alone, and so is every later publish (the link must keep working).
  let slug = a.inv.slug;
  if (!row?.published && RANDOM_SLUG.test(slug)) {
    const db = createAdminClient();
    const named = await pickNameSlug(db, parsed.data.couple.first, parsed.data.couple.second);
    if (named) {
      const { error: e } = await db.from("invitations").update({ slug: named }).eq("id", id).eq("slug", slug);
      if (!e) { revalidatePath(`/${slug}`); slug = named; }
    }
  }
  revalidatePath(`/${slug}`);
  return { ok: true, slug };
}

export async function unpublishInvitation(id: string): Promise<{ ok: boolean; error?: string }> {
  const a = await authorize(id);
  if (!a) return { ok: false, error: "Please sign in again." };
  const { error } = await createAdminClient().rpc("unpublish_invitation", { p_actor: a.user.id, p_invitation: id });
  if (error) return { ok: false, error: "Could not unpublish." };
  revalidatePath(`/${a.inv.slug}`);
  return { ok: true };
}
