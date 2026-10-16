import { createAnonClient } from "@/lib/supabase/admin";

export type PublicInvitation = { status: string; title?: string; content?: unknown; hosting_grace?: boolean } | null;

export async function loadPublicInvitation(slug: string): Promise<PublicInvitation> {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 40) return null;
  const { data } = await createAnonClient().rpc("get_public_invitation", { p_slug: slug });
  return (data as PublicInvitation) ?? null;
}
