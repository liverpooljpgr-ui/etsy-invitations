import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import { parseContent } from "@/lib/content/schema";
import { CoverInner } from "@/components/invitation/Cover";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDate = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${MONTHS[+m[2] - 1]} ${+m[3]}, ${m[1]}` : "";
};

export default async function Dashboard() {
  const { supabase, user } = await requireUser("/dashboard");
  const { data: invs } = await supabase
    .from("invitations")
    .select("id, slug, display_title, status")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  const ids = (invs ?? []).map((i) => i.id);
  const [{ data: me }, { data: contents }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    ids.length ? supabase.from("invitation_content").select("invitation_id, draft").in("invitation_id", ids) : Promise.resolve({ data: [] as { invitation_id: string; draft: unknown }[] }),
  ]);
  const draftOf = new Map((contents ?? []).map((c) => [c.invitation_id, parseContent(c.draft)]));

  async function logout() {
    "use server";
    await signOut();
    redirect("/login");
  }

  return (
    <div className="ui">
      <header className="ui-top">
        <div className="ui-bar" style={{ paddingLeft: 18 }}>
          <div className="ui-bar-title"><h1>My invitations</h1></div>
          {me?.role === "admin" && <Link className="ui-btn ui-btn-gray ui-btn-sm" href="/admin">Admin</Link>}
          <form action={logout}><button className="ui-btn ui-btn-plain ui-btn-sm">Sign out</button></form>
        </div>
      </header>

      <main className="ui-wrap" style={{ maxWidth: "44rem", paddingTop: 12, paddingBottom: 48 }}>
        <h2 className="ui-large-title">Your invitations</h2>
        {!invs?.length && (
          <div className="ui-card" style={{ textAlign: "center", padding: "36px 20px" }}>
            <h3>Nothing here yet</h3>
            <p className="ui-help" style={{ marginTop: 8 }}>Open the personal link you received after your purchase to add your invitation.</p>
          </div>
        )}
        <ul className="dash-list">
          {invs?.map((i) => {
            const c = draftOf.get(i.id);
            const names = c ? [c.couple.first, c.couple.second].filter(Boolean).join(" & ") : "";
            const when = c ? shortDate(c.event.date) : "";
            return (
              <li key={i.id}>
                <Link href={`/editor/${i.id}`} className="dash-card">
                  <span className="dash-thumb" aria-hidden="true">
                    {c && (
                      <span className="inv dash-thumb-inner">
                        <span className="card cover cover-static"><CoverInner content={c} mode="preview" /></span>
                      </span>
                    )}
                  </span>
                  <span className="dash-body">
                    <span className="dash-title">{names || i.display_title?.split(" · ")[0] || "Your invitation"}</span>
                    {when && <span className="dash-sub">{when}</span>}
                    <span className="dash-sub">{i.display_title.split(" · ")[0]}</span>
                    <span className={`dash-pill ${i.status === "published" ? "dash-live" : ""}`}>{i.status === "published" ? "Published" : i.status === "draft" ? "Draft" : i.status}</span>
                  </span>
                  <svg className="dash-chev" width="10" height="17" viewBox="0 0 10 17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1.5 1.5l7 7-7 7" /></svg>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
