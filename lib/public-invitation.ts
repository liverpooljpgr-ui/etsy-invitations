import { createAnonClient } from "@/lib/supabase/admin";

export type PublicInvitation = { status: string; title?: string; content?: unknown; hosting_grace?: boolean } | null;

export async function loadPublicInvitation(slug: string): Promise<PublicInvitation> {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 40) return null;
  const { data } = await createAnonClient().rpc("get_public_invitation", { p_slug: slug });
  return (data as PublicInvitation) ?? null;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/** "August 24, 2027" from an ISO date (YYYY-MM-DD), or "". */
export function prettyDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${MONTHS[+m[2] - 1]} ${+m[3]}, ${m[1]}` : "";
}
