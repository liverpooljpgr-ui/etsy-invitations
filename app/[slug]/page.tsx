import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadPublicInvitation as load } from "@/lib/public-invitation";
import { parseContent } from "@/lib/content/schema";
import { Experience } from "@/components/invitation/Experience";

/** Link preview (WhatsApp, iMessage…): deliberately generic, so no names or event details show up before the guest opens the invitation. */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const inv = await load(slug);
  const title = inv?.status === "published" ? "You are invited" : "Invitation";
  const description = "Tap to open your invitation.";
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: "website", siteName: "You are invited" },
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
