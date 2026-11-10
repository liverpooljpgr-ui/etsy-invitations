import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { startKeyOk } from "@/lib/start-key";
import { StartForm } from "./StartForm";
import { cookies } from "next/headers";
import Link from "next/link";
import { ReturnForm } from "./ReturnForm";

export const metadata: Metadata = { title: "Start your invitation", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function StartPage({ searchParams }: { searchParams: Promise<{ t?: string; k?: string; new?: string }> }) {
  const { t, k, new: fresh } = await searchParams;
  const slug = typeof t === "string" ? t.toLowerCase() : "";
  const key = typeof k === "string" ? k : "";
  // the design and its own key must match, so the design cannot be changed by editing the address
  const tpl = slug && startKeyOk(slug, key)
    ? (await createAdminClient().from("templates").select("slug, name").eq("slug", slug).eq("is_active", true).maybeSingle()).data
    : null;
  // second visit on this device for this design: only the email is asked (a new order number is still possible through the small link)
  const started = ((await cookies()).get("pi_started")?.value ?? "").split(",");
  const returning = !!tpl && started.includes(tpl.slug) && fresh !== "1";
  return (
    <div className="ui ui-center">
      <main className="ui-auth">
        <p className="ui-accent" style={{ margin: "0 0 2px", fontSize: 64, lineHeight: 1.1, textAlign: "center", color: "var(--ui-label)" }}>Welcome</p>
        <h1 className="ui-large-title" style={{ margin: "0 0 12px", textAlign: "center", fontSize: 30, fontWeight: 400 }}>{!tpl ? "Link not valid" : returning ? "Welcome back" : "Start your invitation"}</h1>
        {returning && tpl ? (
          <>
            <p className="ui-lede" style={{ textAlign: "center" }}>Enter the email you used the first time and your invitation opens.</p>
            <div className="ui-card"><ReturnForm /></div>
            <p className="ui-help" style={{ textAlign: "center", marginTop: 20 }}><Link href={`/start?t=${tpl.slug}&k=${key}&new=1`} className="ui-link">Have a new order number? Start another invitation</Link></p>
          </>
        ) : tpl ? (
          <>
            <p className="ui-lede" style={{ textAlign: "center" }}>Enter your Etsy order number and your email. We send you a confirmation link, and then you can personalise your invitation.</p>
            <div className="ui-card"><StartForm template={tpl.slug} templateName={tpl.name} keyValue={key} /></div>
            <p className="ui-help" style={{ textAlign: "center", marginTop: 20 }}>You find the order number in your Etsy purchases, or in the confirmation email from Etsy.</p>
          </>
        ) : (
          <p className="ui-lede" style={{ textAlign: "center" }}>This link is not valid. Please open the link in the PDF you downloaded from Etsy.</p>
        )}
      </main>
    </div>
  );
}
