import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAnonClient } from "@/lib/supabase/admin";
import { parseContent } from "@/lib/content/schema";
import { Experience } from "@/components/invitation/Experience";

type Pub = { status: string; title?: string; content?: unknown; hosting_grace?: boolean } | null;

async function load(slug: string): Promise<Pub> {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 40) return null;
  const { data } = await createAnonClient().rpc("get_public_invitation", { p_slug: slug });
  return (data as Pub) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const inv = await load(slug);
  return {
    title: inv?.status === "published" && inv.title ? `${inv.title} — Invitation` : "Invitation",
    robots: { index: false, follow: false },
  };
}

export default async function PublicInvitation({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const inv = await load(slug);
  if (!inv) notFound();
  if (inv.status !== "published") {
    return (
      <main className="mx-auto max-w-sm px-5 py-24 text-center">
        <h1 className="font-serif text-2xl mb-2">This invitation is not available</h1>
        <p className="text-sm text-stone-600">The link may have expired or been withdrawn by the host.</p>
      </main>
    );
  }
  return (
    <main className="px-4 py-6">
      <Experience content={parseContent(inv.content)} mode="public" />
    </main>
  );
}
