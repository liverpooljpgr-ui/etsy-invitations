import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const { supabase, user } = await requireUser("/dashboard");
  const { data: invs } = await supabase
    .from("invitations")
    .select("id, slug, display_title, status, plan_code")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();

  async function logout() {
    "use server";
    await signOut();
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl">Your invitations</h1>
        <div className="flex gap-3 text-sm">
          {me?.role === "admin" && <Link className="underline" href="/admin">Admin</Link>}
          <form action={logout}><button className="underline">Sign out</button></form>
        </div>
      </div>
      {!invs?.length && <p className="text-stone-600">No invitations yet. Open the link you received after your purchase to claim yours.</p>}
      <ul className="space-y-3">
        {invs?.map((i) => (
          <li key={i.id} className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4">
            <div>
              <p className="font-medium">{i.display_title || i.slug}</p>
              <p className="text-xs text-stone-500">{i.status} · /{i.slug}</p>
            </div>
            <Link className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm text-white" href={`/editor/${i.id}`}>Edit</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
