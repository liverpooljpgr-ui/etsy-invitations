import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { CopyLink } from "./CopyLink";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Invitation demos", description: "Open a live demo of every design. Nothing is saved or sent.", robots: { index: false, follow: false } };

/** All designs with a link to a live demo of each: for showing customers what they get, without logging in and without any editing. */
export default async function DemoGallery() {
  const { data } = await createAdminClient().from("templates").select("slug, name, description").eq("is_active", true).order("created_at");
  const list = data ?? [];
  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <h1 className="mb-2 text-center font-serif text-3xl">Invitation demos</h1>
      <p className="mx-auto mb-10 max-w-xl text-center text-sm text-stone-600">Tap a design to open its live demo, exactly as your guests would see it. Nothing here is saved or sent.</p>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((t) => (
          <li key={t.slug} className="flex flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 font-serif text-xl">{t.name}</h2>
            <p className="mb-4 flex-1 text-sm text-stone-600">{t.description}</p>
            <div className="flex flex-wrap gap-2">
              <Link href={`/demo/${t.slug}`} className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700">Open demo</Link>
              <CopyLink path={`/demo/${t.slug}`} />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
