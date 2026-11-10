import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderInvitationPdf } from "@/lib/invitation-pdf";

export const runtime = "nodejs";
export const maxDuration = 120; // starting the browser and taking the pictures takes a few seconds

const UUID = /^[0-9a-f-]{36}$/i;
const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/** A keepsake copy of the PUBLISHED invitation as a PDF (one page per screen). Only its owner (or an admin) can ask for it. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return fail(400, "Invalid invitation.");

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail(401, "Please sign in again.");
  const { data: inv } = await supabase.from("invitations").select("id, slug, status").eq("id", id).maybeSingle(); // RLS: owner or admin
  if (!inv) return fail(404, "Invitation not found.");
  if (inv.status !== "published") return fail(409, "Publish your invitation first. The PDF is a copy of the published invitation.");

  const ok = await createAdminClient().rpc("hit_rate_limit", { p_key: `pdf:${id}`, p_window_seconds: 600, p_max: 4 });
  if (ok.data === false) return fail(429, "You have just downloaded it a few times. Please wait a few minutes and try again.");

  try {
    const { data: c } = await createAdminClient().from("invitation_content").select("published").eq("invitation_id", id).maybeSingle();
    const couple = (c?.published as { couple?: { first?: string; second?: string } } | null)?.couple;
    const names = [couple?.first, couple?.second].map((s) => (s ?? "").trim()).filter(Boolean).join(" & ");
    const pdf = await renderInvitationPdf(`${req.nextUrl.origin}/${inv.slug}`, names ? `${names} - invitation` : "Invitation");
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${inv.slug}-invitation.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("pdf export failed", e);
    return fail(500, "Could not create the PDF. Please try again in a minute.");
  }
}
