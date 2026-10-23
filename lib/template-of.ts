import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { templateSlug, type TemplateSlug } from "@/lib/templates";

/** Which design each invitation was bought with (by invitation id). Unknown or missing means the original design. */
export async function templatesOf(invitationIds: string[]): Promise<Map<string, TemplateSlug>> {
  const out = new Map<string, TemplateSlug>();
  if (!invitationIds.length) return out;
  const db = createAdminClient();
  const { data: invs } = await db.from("invitations").select("id, template_id").in("id", invitationIds);
  const tids = [...new Set((invs ?? []).map((i) => i.template_id).filter(Boolean))];
  const { data: tpls } = tids.length ? await db.from("templates").select("id, slug").in("id", tids) : { data: [] as { id: string; slug: string }[] };
  const slugOf = new Map((tpls ?? []).map((t) => [t.id, t.slug]));
  for (const i of invs ?? []) out.set(i.id, templateSlug(slugOf.get(i.template_id)));
  return out;
}

export async function templateOf(invitationId: string): Promise<TemplateSlug> {
  return (await templatesOf([invitationId])).get(invitationId) ?? templateSlug(undefined);
}

/** Same, for a public guest page that only knows the address (slug) of the invitation. */
export async function templateOfSlug(slug: string): Promise<TemplateSlug> {
  const { data } = await createAdminClient().from("invitations").select("id").eq("slug", slug).maybeSingle();
  return data ? templateOf(data.id) : templateSlug(undefined);
}
