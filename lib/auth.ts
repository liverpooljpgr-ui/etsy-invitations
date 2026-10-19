import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Only allow same-site relative redirects. */
export function safeNext(next: unknown, fallback = "/dashboard"): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\")
    ? next
    : fallback;
}

export async function requireUser(next = "/dashboard") {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return { supabase, user: data.user };
}

export async function requireAdmin() {
  const { supabase, user } = await requireUser("/admin");
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (data?.role !== "admin") redirect("/dashboard");
  return { supabase, user };
}

/** If someone is already signed in, send them where they belong (their invitation, the list, or admin). */
export async function redirectIfSignedIn(next?: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  const { data: me } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (me?.role === "admin") redirect(safeNext(next, "/admin") === "/dashboard" ? "/admin" : safeNext(next, "/admin"));
  if (next && next !== "/dashboard") redirect(safeNext(next));
  const { data: invs } = await supabase.from("invitations").select("id").eq("owner_id", data.user.id);
  redirect(invs && invs.length === 1 ? `/editor/${invs[0].id}` : "/dashboard");
}
