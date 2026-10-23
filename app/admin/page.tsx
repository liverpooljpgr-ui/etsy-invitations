import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminTabs } from "./AdminTabs";
import { CreateForm } from "./CreateForm";
import { OrdersGrid, type OrderRow } from "./OrdersGrid";
import { PasswordForm } from "./PasswordForm";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { user } = await requireAdmin();
  const { tab } = await searchParams;
  const db = createAdminClient();

  const [{ data: invs }, { data: templates }] = await Promise.all([
    db.from("invitations").select("id, status, owner_id, order_id, template_id, created_at").order("created_at", { ascending: false }).limit(1000),
    db.from("templates").select("id, name").eq("is_active", true).order("name"),
  ]);
  const ownerIds = [...new Set((invs ?? []).map((i) => i.owner_id).filter((x): x is string => !!x))];
  const orderIds = (invs ?? []).map((i) => i.order_id).filter((x): x is string => !!x);
  const invIds = (invs ?? []).map((i) => i.id);
  const [{ data: owners }, { data: orders }, { data: hosting }] = await Promise.all([
    ownerIds.length ? db.from("profiles").select("id, email").in("id", ownerIds) : Promise.resolve({ data: [] as { id: string; email: string }[] }),
    orderIds.length ? db.from("orders").select("id, etsy_order_ref, buyer_note, purchased_at, created_at").in("id", orderIds) : Promise.resolve({ data: [] as { id: string; etsy_order_ref: string | null; buyer_note: string | null; purchased_at: string | null; created_at: string }[] }),
    invIds.length ? db.from("hosting_entitlements").select("invitation_id, ends_at").in("invitation_id", invIds) : Promise.resolve({ data: [] as { invitation_id: string; ends_at: string | null }[] }),
  ]);
  const email = new Map((owners ?? []).map((o) => [o.id, o.email]));
  const order = new Map((orders ?? []).map((o) => [o.id, o]));
  const ends = new Map((hosting ?? []).map((h) => [h.invitation_id, h.ends_at]));
  const tplName = new Map((templates ?? []).map((t) => [t.id, t.name]));

  const rows: OrderRow[] = (invs ?? []).map((i) => {
    const o = i.order_id ? order.get(i.order_id) : undefined;
    return {
      id: i.id,
      orderId: i.order_id ?? "",
      purchased: o?.purchased_at ?? o?.created_at ?? i.created_at,
      template: tplName.get(i.template_id) ?? "Template",
      etsy: o?.etsy_order_ref ?? "—",
      email: i.owner_id ? email.get(i.owner_id) ?? "(unknown)" : null,
      status: i.status,
      expires: ends.get(i.id) ?? null,
      note: o?.buyer_note ?? "",
    };
  }).filter((r) => r.orderId);

  async function leave() {
    "use server";
    await signOut();
    redirect("/login");
  }

  const initial = tab === "orders" || tab === "settings" ? tab : "new";

  return (
    <div className="ui">
      <header className="ui-top">
        <div className="ui-bar" style={{ paddingLeft: 18 }}>
          <div className="ui-bar-title"><h1>Admin</h1></div>
          <Link className="ui-btn ui-btn-gray ui-btn-sm" href="/dashboard">My invitations</Link>
        </div>
      </header>

      <main className="ui-wrap" style={{ maxWidth: "76rem", paddingTop: 16, paddingBottom: 56 }}>
        <AdminTabs
          initial={initial}
          counts={{ orders: rows.length }}
          panels={{
            new: (
              <div style={{ maxWidth: "34rem" }}>
                <CreateForm templates={(templates ?? []).map((t) => ({ id: t.id, name: t.name }))} />
                <p className="ui-help" style={{ marginTop: 14 }}>Send the personal link to your customer through Etsy messages. It can be used once; the customer enters their email and starts personalising. You can find the order later in the Orders tab.</p>
              </div>
            ),
            orders: <OrdersGrid rows={rows} />,
            settings: (
              <div style={{ maxWidth: "34rem", display: "flex", flexDirection: "column", gap: 22 }}>
                <section>
                  <h3 className="ui-sec-head" style={{ marginLeft: 16 }}>Account</h3>
                  <div className="ui-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <p className="ui-label" style={{ margin: 0 }}>Signed in as</p>
                      <p style={{ margin: "2px 0 0", fontWeight: 600 }}>{user.email}</p>
                    </div>
                    <form action={leave}><button className="ui-btn ui-btn-gray" style={{ width: "100%" }}>Sign out</button></form>
                  </div>
                </section>
                <section>
                  <h3 className="ui-sec-head" style={{ marginLeft: 16 }}>Your sign-in password</h3>
                  <PasswordForm />
                </section>
                <section>
                  <h3 className="ui-sec-head" style={{ marginLeft: 16 }}>Hosting rules</h3>
                  <div className="ui-card">
                    <ul className="ui-help" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
                      <li>Each purchase is hosted for <b>6 months</b>, counted from the day the customer first publishes.</li>
                      <li>After that there is a 14-day grace period, then the page is archived.</li>
                      <li>Music uploads are limited to 4 MB per invitation.</li>
                    </ul>
                  </div>
                </section>
              </div>
            ),
          }}
        />
      </main>
    </div>
  );
}
