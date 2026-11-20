import { parseContent } from "@/lib/content/schema";
import { buildIcs } from "@/lib/calendar";
import { loadPublicInvitation } from "@/lib/public-invitation";
import { templateOfSlug } from "@/lib/template-of";
import { isPartyTemplate, isWebsiteTemplate } from "@/lib/templates";

/** "Add to calendar": the published invitation's event as an .ics file. */
export async function GET(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const inv = await loadPublicInvitation(slug);
  if (inv?.status !== "published") return new Response("Not found", { status: 404 });
  const origin = new URL(request.url).origin;
  const content = parseContent(inv.content);
  const template = await templateOfSlug(slug);
  if (!content.showCalendar && !isWebsiteTemplate(template)) return new Response("Not found", { status: 404 }); // the host switched the link off (a website always has the button)
  const party = isPartyTemplate(template);
  const ics = buildIcs(content, `${slug}@${party ? "party" : "wedding"}-invitation`, `${origin}/${slug}`, party);
  if (!ics) return new Response("This invitation has no date yet.", { status: 404 });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${party ? "christmas-party" : "wedding"}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
