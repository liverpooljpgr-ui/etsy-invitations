import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { startKeyOk } from "@/lib/start-key";
import { StartForm } from "./StartForm";

export const metadata: Metadata = { title: "Start your invitation", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function StartPage({ searchParams }: { searchParams: Promise<{ t?: string; k?: string }> }) {
  const { t, k } = await searchParams;
  const slug = typeof t === "string" ? t.toLowerCase() : "";
  const key = typeof k === "string" ? k : "";
  // the design and its own key must match, so the design cannot be changed by editing the address
  const tpl = slug && startKeyOk(slug, key)
    ? (await createAdminClient().from("templates").select("slug, name").eq("slug", slug).eq("is_active", true).maybeSingle()).data
    : null;
  return (
    <div className="ui ui-center">
      <main className="ui-auth">
        <p className="ui-accent" style={{ margin: "0 0 2px", fontSize: 64, lineHeight: 1.1, textAlign: "center", color: "var(--ui-label)" }}>Welcome</p>
        <h1 className="ui-large-title" style={{ margin: "0 0 12px", textAlign: "center", fontSize: 30, fontWeight: 400 }}>{tpl ? "Start your invitation" : "Link not valid"}</h1>
        {tpl ? (
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
