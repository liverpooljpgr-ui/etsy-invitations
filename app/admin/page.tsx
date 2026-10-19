import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { CreateForm } from "./CreateForm";
import { NewLinkButton } from "./NewLinkButton";
import { DeleteButton } from "./DeleteButton";
import { PasswordForm } from "./PasswordForm";

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
    <div className="ui">
      <header className="ui-top">
        <div className="ui-bar" style={{ paddingLeft: 18 }}>
          <div className="ui-bar-title"><h1>Admin</h1></div>
          <Link className="ui-btn ui-btn-gray ui-btn-sm" href="/dashboard">My invitations</Link>
        </div>
      </header>

      <main className="ui-wrap" style={{ maxWidth: "48rem", paddingTop: 12, paddingBottom: 56 }}>
        <h2 className="ui-large-title">Orders</h2>

        <CreateForm templates={(templates ?? []).map((t) => ({ id: t.id, name: t.name }))} />

        {waiting.length > 0 && (
          <section style={{ marginTop: 28 }}>
            <h3 className="ui-sec-head" style={{ marginLeft: 16 }}>Waiting for the customer to open their link · {waiting.length}</h3>
            <ul className="dash-list">
              {waiting.map((r) => (
                <li key={r.id} className="ui-card">
                  <p style={{ margin: 0, fontWeight: 600 }}>{r.template} · Etsy {r.etsy}</p>
                  <p className="ui-help" style={{ margin: "2px 0 10px" }}>Created {day(r.created_at)}</p>
                  <div className="ui-actions" style={{ marginTop: 0, justifyContent: "space-between", alignItems: "flex-start" }}>
                    <NewLinkButton invitationId={r.id} />
                    <DeleteButton invitationId={r.id} label={`${r.template} · Etsy ${r.etsy}`} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section style={{ marginTop: 28 }}>
          <h3 className="ui-sec-head" style={{ marginLeft: 16 }}>Customers · {customers.length}</h3>
          {customers.length === 0 && <div className="ui-card"><p className="ui-help" style={{ margin: 0 }}>No customer has opened a link yet.</p></div>}
          <ul className="dash-list">
            {customers.map(([addr, list]) => (
              <li key={addr} className="ui-card">
                <p style={{ margin: 0, fontWeight: 600 }}>{addr} <span className="ui-help" style={{ fontWeight: 400 }}>· {list.length} {list.length === 1 ? "purchase" : "purchases"}</span></p>
                <ul className="adm-rows">
                  {list.map((r) => (
                    <li key={r.id} className="adm-row">
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0 }}>{r.template} · Etsy {r.etsy}</p>
                        <p className="ui-help" style={{ margin: 0 }}>{r.status} · bought {day(r.created_at)}</p>
                      </div>
                      <div className="ui-row-line" style={{ flex: "none" }}>
                        {r.status === "published" && <Link className="ui-link" style={{ fontSize: 14 }} href={`/${r.slug}`} target="_blank">/{r.slug}</Link>}
                        <DeleteButton invitationId={r.id} label={`${r.template} · Etsy ${r.etsy} (${addr})`} />
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>

        <section style={{ marginTop: 28 }}>
          <h3 className="ui-sec-head" style={{ marginLeft: 16 }}>Your sign-in password</h3>
          <PasswordForm />
        </section>
      </main>
    </div>
  );
}
