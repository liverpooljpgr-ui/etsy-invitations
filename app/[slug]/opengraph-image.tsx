import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseContent } from "@/lib/content/schema";
import { loadPublicInvitation, prettyDate } from "@/lib/public-invitation";

export const alt = "Wedding invitation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The picture guests see when the link is shared in WhatsApp, iMessage, Telegram, Facebook… */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const inv = await loadPublicInvitation(slug);
  const c = inv?.status === "published" ? parseContent(inv.content) : null;
  const [bg, script, serif] = await Promise.all([
    readFile(join(process.cwd(), "assets/og/bg.png")),
    readFile(join(process.cwd(), "assets/og/pinyon.ttf")),
    readFile(join(process.cwd(), "assets/og/oranienbaum.ttf")),
  ]);
  const names = c ? [c.couple.first, c.couple.second].filter(Boolean).join(" & ") : "";
  const date = c ? prettyDate(c.event.date) : "";
  const venue = c?.event.venue ?? "";
  const nameSize = names.length > 26 ? 62 : names.length > 20 ? 76 : names.length > 14 ? 92 : 108;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", background: "#f6f2ea", color: "#6d6358" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/png;base64,${bg.toString("base64")}`} width={1200} height={630} alt="" style={{ position: "absolute", left: 0, top: 0 }} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 900, height: 430, borderRadius: 40, background: "rgba(251,249,243,.96)", border: "2px solid #b99a55", position: "relative" }}>
          <div style={{ display: "flex", padding: "10px 34px", border: "2px solid #b99a55", borderRadius: 999, background: "rgba(251,249,243,.92)", fontFamily: "Serif", fontSize: 26, letterSpacing: 8, color: "#b99a55", textTransform: "uppercase" }}>
            You are invited
          </div>
          <div style={{ display: "flex", fontFamily: "Script", fontSize: nameSize, lineHeight: 1.1, color: "#b99a55", marginTop: 26, textAlign: "center", padding: "0 60px", whiteSpace: "nowrap" }}>
            {names || "Wedding invitation"}
          </div>
          {date && (
            <div style={{ display: "flex", fontFamily: "Serif", fontSize: 34, letterSpacing: 7, textTransform: "uppercase", marginTop: 22 }}>{date}</div>
          )}
          {venue && (
            <div style={{ display: "flex", fontFamily: "Serif", fontSize: 26, letterSpacing: 3, marginTop: 16, color: "#8b8176" }}>{venue}</div>
          )}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Script", data: script, style: "normal", weight: 400 },
        { name: "Serif", data: serif, style: "normal", weight: 400 },
      ],
    },
  );
}
