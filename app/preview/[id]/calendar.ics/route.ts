import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseContent } from "@/lib/content/schema";
import { buildIcs } from "@/lib/calendar";

/** "Add to calendar" inside the private preview: built from the saved draft (the published link has its own at /<slug>/calendar.ics). */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { origin } = request.nextUrl;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.redirect(`${origin}/login`);
  const { data: inv } = await supabase.from("invitations").select("slug").eq("id", id).maybeSingle(); // RLS: owner or admin only
  if (!inv) return new Response("Not found", { status: 404 });
  const { data: row } = await supabase.from("invitation_content").select("draft").eq("invitation_id", id).maybeSingle();
  const ics = buildIcs(parseContent(row?.draft), `${inv.slug}@wedding-invitation`, `${origin}/${inv.slug}`);
  if (!ics) return new Response("Add the event date first.", { status: 404 });
  return new Response(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="wedding.ics"', "Cache-Control": "private, no-store" },
  });
}
