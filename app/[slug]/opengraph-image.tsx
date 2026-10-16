import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Invitation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The picture guests see when the link is shared in WhatsApp, iMessage, Telegram, Facebook…: just "Invitation" in elegant script. */
export default async function Image() {
  const script = await readFile(join(process.cwd(), "assets/og/pinyon.ttf"));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f6f2ea", color: "#b99a55", fontFamily: "Script", fontSize: 230, lineHeight: 1 }}>
        Invitation
      </div>
    ),
    { ...size, fonts: [{ name: "Script", data: script, style: "normal", weight: 400 }] },
  );
}
