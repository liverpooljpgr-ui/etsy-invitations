import type { Metadata } from "next";
import { AuthLogo } from "@/components/AuthLogo";
import { createAdminClient } from "@/lib/supabase/admin";
import { startKeyOk } from "@/lib/start-key";
import { StartForm } from "./StartForm";
import { cookies } from "next/headers";

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
  // a device that has started this design before is greeted with "Welcome back" (the form itself is the same on every device)
  const started = ((await cookies()).get("pi_started")?.value ?? "").split(",");
  const returning = !!tpl && started.includes(tpl.slug);
  return (
    <div className="ui ui-center">
      <main className="ui-auth">
        <AuthLogo />
        {tpl && <p className="ui-accent" style={{ margin: "0 0 2px", fontSize: 64, lineHeight: 1.1, textAlign: "center", color: "var(--ui-label)" }}>{returning ? "Welcome back" : "Welcome"}</p>}
        {!returning && !tpl && <h1 className="ui-large-title" style={{ margin: "0 0 12px", textAlign: "center", fontSize: 30, fontWeight: 400 }}>Link not valid</h1>}
        {tpl ? (
          <>
            {returning && <p className="ui-lede" style={{ textAlign: "center" }}>Enter the email you used the first time and your invitation opens.</p>}
            <StartForm template={tpl.slug} templateName={tpl.name} keyValue={key} />
          </>
        ) : (
          <p className="ui-lede" style={{ textAlign: "center" }}>This link is not valid. Please open the link in the PDF you downloaded from Etsy, or contact Tamara from PIXELINVITE on Etsy.</p>
        )}
      </main>
    </div>
  );
}
