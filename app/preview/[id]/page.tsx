import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { applyPlan, parseContent } from "@/lib/content/schema";
import { Invitation } from "@/components/invitation/Invitation";

/** Private preview of the SAVED draft (what Publish would produce). */
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser(`/preview/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: inv } = await supabase.from("invitations").select("plan_code").eq("id", id).maybeSingle();
  if (!inv) notFound();
  const [{ data: row }, { data: plan }] = await Promise.all([
    supabase.from("invitation_content").select("draft").eq("invitation_id", id).single(),
    supabase.from("plans").select("features").eq("code", inv.plan_code).single(),
  ]);
  if (!row || !plan) notFound();
  return (
    <main className="px-4 py-6">
      <p className="mb-4 text-center text-sm"><Link className="underline" href={`/editor/${id}`}>← Back to editor</Link> · private preview of your saved draft</p>
      <Invitation content={applyPlan(parseContent(row.draft), plan.features)} mode="preview" />
    </main>
  );
}
