import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { parseContent } from "@/lib/content/schema";
import { EditorForm } from "./EditorForm";

const MONTH_FIRST = new Set(["US", "CA", "PH"]);

export default async function EditorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ step?: string }> }) {
  const { id } = await params;
  const { step } = await searchParams;
  const { supabase } = await requireUser(`/editor/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: inv } = await supabase.from("invitations").select("id, slug, status, plan_code, display_title").eq("id", id).maybeSingle();
  if (!inv) notFound();
  const [{ data: row }, { data: plan }] = await Promise.all([
    supabase.from("invitation_content").select("draft, draft_version").eq("invitation_id", id).single(),
    supabase.from("plans").select("features").eq("code", inv.plan_code).single(),
  ]);
  if (!row || !plan) notFound();

  // visitors from the USA, Canada and the Philippines type dates month first
  const dateOrder = MONTH_FIRST.has((await headers()).get("x-vercel-ip-country") ?? "") ? "mdy" : "dmy";

  return (
    <EditorForm
      id={inv.id}
      title={inv.display_title}
      slug={inv.slug}
      status={inv.status}
      features={plan.features}
      initialDraft={parseContent(row.draft)}
      initialVersion={row.draft_version}
      dateOrder={dateOrder}
      initialStep={Number(step) >= 1 ? Math.floor(Number(step)) : undefined}
    />
  );
}
