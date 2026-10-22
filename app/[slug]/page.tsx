import { createHash } from "node:crypto";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadPublicInvitation as load } from "@/lib/public-invitation";
import { parseContent } from "@/lib/content/schema";
import { Experience } from "@/components/invitation/Experience";

/** Link preview (WhatsApp, iMessage…): deliberately generic, so no names or event details show up before the guest opens the invitation. */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const inv = await load(slug);
  const live = inv?.status === "published";
  const c = live ? parseContent(inv.content) : null;
  const first = c?.couple.first.trim(), second = c?.couple.second.trim();
  const named = !!(first && second);
  const title = named ? `${first} & ${second}` : live ? "You are invited" : "Invitation";
  const description = named ? `Hi, it's ${first} and ${second}. We are kindly inviting you to our event.` : "Tap to open your invitation.";
  // the couple's photo in the arch; a version number in the address makes chat apps fetch it again after the photo changes
  const ph = c?.photo;
  const v = ph ? createHash("sha1").update(`${ph.url}|${ph.cx}|${ph.cy}|${ph.zoom}`).digest("hex").slice(0, 8) : "";
  const images = [{ url: ph ? `/${slug}/og?v=${v}` : "/share-card.jpg", width: 1200, height: 630, alt: title }];
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: "website", siteName: "You are invited", images },
    twitter: { card: "summary_large_image", title, description, images: images.map((i) => i.url) },
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
      <Experience content={parseContent(inv.content)} mode="public" calendarHref={`/${slug}/calendar.ics`} rsvpSlug={slug} />
    </main>
  );
}
