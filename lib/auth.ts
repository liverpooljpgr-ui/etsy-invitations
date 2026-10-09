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
