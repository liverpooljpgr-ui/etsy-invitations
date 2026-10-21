import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signOut } from "@/app/login/actions";
import { claimStatus, claimTarget } from "./actions";
import { ClaimForm } from "./ClaimForm";

export default async function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const status = await claimStatus(token);
  if (status === "ok") {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const { data: me } = await createAdminClient().from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      if (me?.role !== "admin") redirect(`/claim/${token}/go`); // signed-in customer: attach it straight away

      async function leaveAdmin() {
        "use server";
        await signOut();
        redirect(`/claim/${token}`);
      }
      return (
        <div className="ui ui-center">
          <main className="ui-auth">
            <h1 className="ui-large-title" style={{ margin: "0 0 8px" }}>You are signed in as admin</h1>
            <p className="ui-lede">This is a customer&apos;s personal link, so it was not used. To see what the customer sees, sign out here (or open the link in a private window).</p>
            <div className="ui-card ui-auth-stack">
              <form action={leaveAdmin}><button className="ui-btn ui-btn-primary" style={{ width: "100%" }}>Sign out and view as customer</button></form>
              <Link className="ui-btn ui-btn-gray" href="/admin" style={{ width: "100%" }}>Back to admin</Link>
            </div>
          </main>
        </div>
      );
    }
  }
  if (status === "used") {
    // already signed in as the owner (e.g. came back from checking a map): straight back into the editor
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const target = data.user ? await claimTarget(token) : null;
    if (data.user && target && target.ownerId === data.user.id) redirect(`/editor/${target.invitationId}`);
  }
  return (
    <div className="ui ui-center">
      <main className="ui-auth">
        <h1 className="ui-large-title" style={{ margin: "0 0 8px", textAlign: "center" }}>{status === "used" ? "Welcome back" : "Invitation is waiting"}</h1>
        {status === "ok" && (
          <>
            <p className="ui-lede ui-accent" style={{ textAlign: "center" }}>Enter your email to personalise it.</p>
            <div className="ui-card"><ClaimForm token={token} /></div>
          </>
        )}
        {status === "used" && (
          <>
            <p className="ui-lede ui-accent" style={{ textAlign: "center" }}>Sign in with email you used the very first time.</p>
            <div className="ui-card"><ClaimForm token={token} label="Sign in" /></div>
          </>
        )}
        {status === "invalid" && <p className="ui-lede" style={{ textAlign: "center" }}>This link is invalid or has expired. Contact support for a new one.</p>}
        {status === "ok" && <p className="ui-help" style={{ textAlign: "center", marginTop: 20 }}><Link href="/login" className="ui-link">Already have an invitation? Sign in</Link></p>}
      </main>
    </div>
  );
}
