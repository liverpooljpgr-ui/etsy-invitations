import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { CreateForm } from "./CreateForm";
import { NewLinkButton } from "./NewLinkButton";
import { DeleteButton } from "./DeleteButton";

type Purchase = {
  id: string; slug: string; status: string; owner_id: string | null; created_at: string;
  etsy: string; template: string;
};

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function AdminPage() {
  await requireAdmin();
  const db = createAdminClient();
  const [{ data: invs }, { data: templates }] = await Promise.all([
    db.from("invitations").select("id, slug, status, owner_id, order_id, template_id, created_at").order("created_at", { ascending: false }).limit(500),
    db.from("templates").select("id, name").eq("is_active", true).order("name"),
  ]);
  const ownerIds = [...new Set((invs ?? []).map((i) => i.owner_id).filter((x): x is string => !!x))];
  const orderIds = (invs ?? []).map((i) => i.order_id);
  const [{ data: owners }, { data: orders }] = await Promise.all([
    ownerIds.length ? db.from("profiles").select("id, email").in("id", ownerIds) : Promise.resolve({ data: [] as { id: string; email: string }[] }),
    orderIds.length ? db.from("orders").select("id, etsy_order_ref").in("id", orderIds) : Promise.resolve({ data: [] as { id: string; etsy_order_ref: string | null }[] }),
  ]);
  const email = new Map((owners ?? []).map((o) => [o.id, o.email]));
  const etsy = new Map((orders ?? []).map((o) => [o.id, o.etsy_order_ref ?? "—"]));
  const tplName = new Map((templates ?? []).map((t) => [t.id, t.name]));

  const rows: (Purchase & { email: string | null })[] = (invs ?? []).map((i) => ({
    id: i.id, slug: i.slug, status: i.status, owner_id: i.owner_id, created_at: i.created_at,
    etsy: etsy.get(i.order_id) ?? "—", template: tplName.get(i.template_id) ?? "Template",
    email: i.owner_id ? email.get(i.owner_id) ?? "(unknown)" : null,
  }));

  const waiting = rows.filter((r) => !r.email);
  const byEmail = new Map<string, typeof rows>();
  for (const r of rows) if (r.email) byEmail.set(r.email, [...(byEmail.get(r.email) ?? []), r]);
  const customers = [...byEmail.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl">Admin</h1>
        <Link className="text-sm underline" href="/dashboard">My invitations</Link>
      </div>

      <CreateForm templates={(templates ?? []).map((t) => ({ id: t.id, name: t.name }))} />

      {waiting.length > 0 && (
        <section>
          <h2 className="font-medium mb-3">Waiting for the customer to open their link ({waiting.length})</h2>
          <ul className="space-y-2">
            {waiting.map((r) => (
              <li key={r.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                <p className="font-medium">{r.template} · Etsy {r.etsy}</p>
                <p className="mb-1 text-xs text-stone-600">Created {day(r.created_at)}</p>
                <div className="flex items-start justify-between gap-3">
                  <NewLinkButton invitationId={r.id} />
                  <DeleteButton invitationId={r.id} label={`${r.template} · Etsy ${r.etsy}`} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-medium mb-3">Customers ({customers.length})</h2>
        {customers.length === 0 && <p className="text-sm text-stone-600">No customer has opened a link yet.</p>}
        <ul className="space-y-3">
          {customers.map(([addr, list]) => (
            <li key={addr} className="rounded-lg border border-stone-200 bg-white p-3 text-sm">
              <p className="font-medium">{addr} <span className="text-xs font-normal text-stone-500">· {list.length} {list.length === 1 ? "purchase" : "purchases"}</span></p>
              <ul className="mt-2 divide-y divide-stone-100">
                {list.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-1.5">
                    <div>
                      <p>{r.template} · Etsy {r.etsy}</p>
                      <p className="text-xs text-stone-500">{r.status} · bought {day(r.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {r.status === "published" && <Link className="text-xs underline" href={`/${r.slug}`} target="_blank">/{r.slug}</Link>}
                      <DeleteButton invitationId={r.id} label={`${r.template} · Etsy ${r.etsy} (${addr})`} />
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
