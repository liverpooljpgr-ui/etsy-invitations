"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyPlan, contentSchema, publishMissing } from "@/lib/content/schema";

const UUID = /^[0-9a-f-]{36}$/i;

export type SaveResult = { ok: true; version: number } | { ok: false; error: string };
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
  if (!data?.length) return { ok: false, error: "This invitation changed in another tab, or is no longer editable. Reload the page." };
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
    a.supabase.from("invitation_content").select("draft").eq("invitation_id", id).maybeSingle(),
    a.supabase.from("plans").select("features").eq("code", a.inv.plan_code).single(),
  ]);
  const parsed = contentSchema.safeParse(row?.draft);
  if (!parsed.success || !plan) return { ok: false, error: "Some fields are invalid. Fix them and try again." };
  const missing = publishMissing(parsed.data);
  if (missing.length) return { ok: false, error: "Please complete the required fields first.", missing };

  const snapshot = applyPlan(parsed.data, plan.features);
  const { error } = await createAdminClient().rpc("publish_invitation", { p_actor: a.user.id, p_invitation: id, p_snapshot: snapshot });
  if (error) return { ok: false, error: "Could not publish. Your hosting may be inactive — contact support." };
  revalidatePath(`/${a.inv.slug}`);
  return { ok: true, slug: a.inv.slug };
}

export async function unpublishInvitation(id: string): Promise<{ ok: boolean; error?: string }> {
  const a = await authorize(id);
  if (!a) return { ok: false, error: "Please sign in again." };
  const { error } = await createAdminClient().rpc("unpublish_invitation", { p_actor: a.user.id, p_invitation: id });
  if (error) return { ok: false, error: "Could not unpublish." };
  revalidatePath(`/${a.inv.slug}`);
  return { ok: true };
}
