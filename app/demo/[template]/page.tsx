import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Experience } from "@/components/invitation/Experience";
import { demoContent, designOfDemo, newerDemoAddress } from "@/lib/demo";
import { TEMPLATES, type TemplateSlug } from "@/lib/templates";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic"; // the sample date is always in the future

async function nameOf(slug: string): Promise<string | null> {
  const { data } = await createAdminClient().from("templates").select("name, is_active").eq("slug", slug).maybeSingle();
  return data?.is_active ? data.name : null;
}

export async function generateMetadata({ params }: { params: Promise<{ template: string }> }): Promise<Metadata> {
  const { template: address } = await params;
  const template = designOfDemo(address);
  const name = (TEMPLATES as readonly string[]).includes(template) ? await nameOf(template) : null;
  return { title: name ? `${name} · demo` : "Demo", description: "A live demo of the invitation. Nothing is saved or sent.", robots: { index: false, follow: false } };
}

/** A demo of one design for anyone with the link: the real invitation with sample names, no login, nothing to edit, nothing sent. */
export default async function DemoPage({ params, searchParams }: { params: Promise<{ template: string }>; searchParams: Promise<{ bare?: string }> }) {
  const { template: address } = await params;
  const { bare } = await searchParams;
  const newer = newerDemoAddress(address); // an old demo address goes to the new one
  if (newer) redirect(`/demo/${newer}${bare ? `?bare=${encodeURIComponent(bare)}` : ""}`);
  const template = designOfDemo(address);
  if (!(TEMPLATES as readonly string[]).includes(template) || !(await nameOf(template))) notFound();
  return (
    <main className="px-4 py-6">
      {!bare && (
        <Link
          href="/demo"
          style={{ position: "fixed", top: 10, left: 10, zIndex: 60, padding: "7px 14px", borderRadius: 999, background: "rgba(255,255,255,.88)", color: "#333", font: "600 12px/1 system-ui, sans-serif", letterSpacing: ".04em", boxShadow: "0 2px 10px rgba(0,0,0,.18)", textDecoration: "none", backdropFilter: "blur(6px)" }}
        >
          ← All demos
        </Link>
      )}
      <Experience content={demoContent()} mode="public" calendarHref={`/demo/calendar.ics?t=${template}`} template={template as TemplateSlug} />
    </main>
  );
}
