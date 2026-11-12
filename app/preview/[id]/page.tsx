import { templateOf } from "@/lib/template-of";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { applyPlan, parseContent } from "@/lib/content/schema";
import { Experience } from "@/components/invitation/Experience";
import { PhoneFrame } from "./PhoneFrame";
import { FrameControls } from "./FrameControls";

/** Private preview of the SAVED draft (what Publish would produce). */
export default async function PreviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string; frame?: string; embedded?: string }> }) {
  const { id } = await params;
  const { from, frame, embedded } = await searchParams;
  const back = `/editor/${id}${/^[1-8]$/.test(from ?? "") ? `?step=${from}` : ""}`;
  const { supabase } = await requireUser(`/preview/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: inv } = await supabase.from("invitations").select("plan_code").eq("id", id).maybeSingle();
  if (!inv) notFound();
  const [{ data: row }, { data: plan }] = await Promise.all([
    supabase.from("invitation_content").select("draft").eq("invitation_id", id).single(),
    supabase.from("plans").select("features").eq("code", inv.plan_code).single(),
  ]);
  if (!row || !plan) notFound();
  const content = applyPlan(parseContent(row.draft), plan.features);
  if (frame !== "1") {
    // on a computer: the draft inside a real phone-sized screen (the same page, framed); on a phone this opens the framed version full screen
    const base = `/preview/${id}?frame=1${from ? `&from=${from}` : ""}`;
    return <PhoneFrame src={base} embeddedSrc={`${base}&embedded=1`} backHref={back} />;
  }
  return (
    <main className="px-4 py-6" style={{ padding: 0 }}>
      {embedded === "1" && <><style>{`html{scrollbar-width:none}html::-webkit-scrollbar{display:none}`}</style><FrameControls /></>}
      {embedded !== "1" && <Link href={back} className="fixed left-3 z-40 flex min-h-11 items-center rounded-full bg-white/95 px-4 text-sm font-medium shadow-lg md:hidden" style={{ top: "calc(env(safe-area-inset-top, 0px) + 84px)" }}>← Back to editor</Link>}
      <Experience content={content} mode="preview" calendarHref={`/preview/${id}/calendar.ics`} template={await templateOf(id)} />
    </main>
  );
}
