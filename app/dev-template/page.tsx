import Link from "next/link";
import { notFound } from "next/navigation";
import { Experience } from "@/components/invitation/Experience";
import { Invitation } from "@/components/invitation/Invitation";
import { defaultContent, type Content } from "@/lib/content/schema";

/**
 * DEV ONLY (returns 404 in production): lets you edit the template files and see them update live,
 * with sample data and no login.   http://localhost:3000/dev-template   (add ?view=static for the editor-style preview)
 *
 *   components/invitation/Cover.tsx       first screen (names + envelope)
 *   components/invitation/Invitation.tsx  all other cards (markup + text)
 *   components/invitation/EnvelopeArt.tsx envelope image layers
 *   app/globals.css                       all styling + animation timing
 */
const sample: Content = {
  ...defaultContent,
  couple: { first: "Adele", second: "Oliver" },
  event: { date: "2027-08-24", time: "2:00 PM", venue: "The White Plains Hotel", address: "90 Pine Street, Grand Ballroom\nMiami, FL 33101\nUnited States", mapUrl: "https://maps.google.com" },
  timeline: [
    { label: "Seating begins", time: "1:00" },
    { label: "Ceremony", time: "2:00" },
    { label: "Reception", time: "3:00" },
    { label: "Party time", time: "6:30" },
    { label: "Fireworks", time: "10:30" },
  ],
  registry: [
    { label: "Target", url: "https://target.com" },
    { label: "Amazon", url: "https://amazon.com" },
  ],
  dressCode: { label: "Formal attire", colors: ["#7b7f6a", "#b8964f", "#efe3c9"] },
  hotel: { name: "The White Plains Hotel", address: "90 Pine Street, Miami, FL" },
  rsvp: { deadline: "2027-07-16", email: "adele@mail.com", note: "Please include the names of all guests attending in your RSVP." },
};

export default async function DevTemplate({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { view } = await searchParams;
  return (
    <main className="px-4 py-6">
      <p className="mb-4 text-center text-xs text-stone-500">
        Dev template playground ·{" "}
        {view === "static" ? <Link className="underline" href="/dev-template">animated view</Link> : <Link className="underline" href="/dev-template?view=static">static (editor) view</Link>}
        {" "}· reload to replay the animation
      </p>
      {view === "static" ? <Invitation content={sample} mode="preview" /> : <Experience content={sample} mode="public" />}
    </main>
  );
}
