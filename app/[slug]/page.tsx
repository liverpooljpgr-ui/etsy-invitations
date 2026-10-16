import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadPublicInvitation as load, prettyDate } from "@/lib/public-invitation";
import { parseContent } from "@/lib/content/schema";
import { Experience } from "@/components/invitation/Experience";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const inv = await load(slug);
  if (inv?.status !== "published") return { title: "Invitation", robots: { index: false, follow: false } };
  const c = parseContent(inv.content);
  const names = [c.couple.first, c.couple.second].filter(Boolean).join(" & ");
  const when = prettyDate(c.event.date);
  const title = names ? `${names} — You are invited` : "You are invited";
  const description = [when && `Join us on ${when}`, c.event.venue && `at ${c.event.venue}`].filter(Boolean).join(" ") + (when || c.event.venue ? ". " : "") + "Tap to open your invitation.";
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: "website", siteName: "Wedding invitation" },
    twitter: { card: "summary_large_image", title, description },
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
