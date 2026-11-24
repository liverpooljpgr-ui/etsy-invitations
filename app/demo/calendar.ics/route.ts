import { buildIcs } from "@/lib/calendar";
import { demoContent } from "@/lib/demo";
import { isPartyTemplate, TEMPLATES, type TemplateSlug } from "@/lib/templates";

/** "Add to calendar" in a demo: the sample event as an .ics file (the Christmas party designs get a party event). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const t = url.searchParams.get("t") ?? "";
  const template = ((TEMPLATES as readonly string[]).includes(t) ? t : undefined) as TemplateSlug | undefined;
  const party = isPartyTemplate(template);
  const ics = buildIcs(demoContent(), `demo-${template ?? "wedding"}@demo`, `${url.origin}/demo/${template ?? ""}`, party);
  if (!ics) return new Response("No date.", { status: 404 });
  return new Response(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `inline; filename="demo.ics"`, "Cache-Control": "no-store" },
  });
}
