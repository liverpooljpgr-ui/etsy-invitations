import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { CreateForm } from "./CreateForm";

export default async function AdminPage() {
  const { user } = await requireAdmin();
  const { data: invs } = await createAdminClient()
    .from("invitations")
    .select("id, slug, display_title, status, plan_code, owner_id, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl">Admin</h1>
        <Link className="text-sm underline" href="/dashboard">My invitations</Link>
      </div>
      <CreateForm />
      <section>
        <h2 className="font-medium mb-3">Invitations</h2>
        <ul className="space-y-2">
          {invs?.map((i) => (
            <li key={i.id} className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-3 text-sm">
              <div>
                <p className="font-medium">{i.display_title}</p>
                <p className="text-xs text-stone-500">{i.plan_code} · {i.status} · {i.owner_id ? (i.owner_id === user.id ? "owner: you" : "claimed") : "awaiting claim"}</p>
              </div>
              <div className="flex gap-3">
                {i.status === "published" && <Link className="underline" href={`/${i.slug}`} target="_blank">/{i.slug}</Link>}
                {i.owner_id === user.id && <Link className="underline" href={`/editor/${i.id}`}>Edit</Link>}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
