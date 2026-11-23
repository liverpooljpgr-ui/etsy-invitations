import "server-only";
import sharp, { type OverlayOptions } from "sharp";
import { ImageResponse } from "next/og";
import type { Content } from "@/lib/content/schema";
import { pwText } from "@/lib/website-texts";
import { websiteTheme } from "@/lib/website-themes";

const W = 1200, H = 630;
const fontCache = new Map<string, ArrayBuffer>();

async function loadFont(origin: string, file: string): Promise<ArrayBuffer> {
  let f = fontCache.get(file);
  if (!f) {
    const r = await fetch(`${origin}/fonts/${file}`);
    if (!r.ok) throw new Error("font missing: " + file);
    f = await r.arrayBuffer();
    fontCache.set(file, f);
  }
  return f;
}
async function loadPic(origin: string, dir: string, file: string): Promise<Buffer> {
  const r = await fetch(`${origin}/templates/${dir}/v1/${file}.webp`);
  if (!r.ok) throw new Error("picture missing: " + file);
  return Buffer.from(await r.arrayBuffer());
}

/**
 * The link-preview picture of the wedding website designs: the closed envelope with its wax seal (the cover of the website) on the website's own
 * pink paper, and the couple's names with the "please join us" line next to it.
 */
export async function peachShareCard(origin: string, c: Content, slug?: string): Promise<Buffer> {
  const T = websiteTheme(slug), SH = T.share;
  const first = c.couple.first.trim(), second = c.couple.second.trim();
  const [script, caps, body, flap, seal] = await Promise.all([
    loadFont(origin, "ImperialScript-Regular.ttf"), loadFont(origin, "CormorantSC-SemiBold.ttf"),
    loadPic(origin, T.dir, "env-body"), loadPic(origin, T.dir, "env-flap-closed"), loadPic(origin, T.dir, "seal"),
  ]);

  // the envelope: the same layers and proportions as on the cover page of the website
  const ew = 560, eh = Math.round(ew * 1197 / 1600);
  const ex = 56, ey = Math.round((H - eh) / 2);
  const flapW = Math.round(ew * 1.006), flapB = await sharp(flap).resize({ width: flapW }).toBuffer();
  const sealW = Math.round(ew * SH.sealW), sealB = await sharp(seal).resize({ width: sealW }).toBuffer();
  const sealH = (await sharp(sealB).metadata()).height ?? 0;
  const bodyB = await sharp(body).resize({ width: ew }).toBuffer();
  const shadow = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${ew + 120}" height="${eh + 120}"><defs><filter id="b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="16"/></filter></defs><rect x="60" y="78" width="${ew}" height="${eh - 14}" rx="4" fill="#50231f" opacity=".32" filter="url(#b)"/></svg>`);
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${SH.bg[0]}"/><stop offset="1" stop-color="${SH.bg[1]}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/></svg>`);

  // the words: the names in the website's script, the line above in small capitals; the longer the names, the smaller the letters
  const lead = pwText(c.texts, "coverTop").toUpperCase();
  const lines = first && second ? [`${first} &`, second] : [first || second || "You are invited"];
  const longest = Math.max(...lines.map((l) => l.length), 1);
  const size = Math.max(60, Math.min(112, Math.floor(470 / (longest * 0.4))));
  const el = (style: Record<string, string | number>, children: unknown) => ({ type: "div", props: { style: { display: "flex", ...style }, children } });
  const words = new ImageResponse(
    el({ width: W, height: H, alignItems: "center", justifyContent: "flex-end" }, [
      el({ width: 540, marginRight: 56, flexDirection: "column", alignItems: "center", textAlign: "center" }, [
        el({ fontFamily: "Caps", fontSize: 25, letterSpacing: 5, lineHeight: 1.55, color: SH.caps, justifyContent: "center", textAlign: "center", marginBottom: 18 }, lead),
        ...lines.map((l) => el({ fontFamily: "Script", fontSize: size, lineHeight: 1.12, color: SH.ink, justifyContent: "center" }, l)),
      ]),
    ]) as never,
    { width: W, height: H, fonts: [{ name: "Script", data: script, weight: 400, style: "normal" }, { name: "Caps", data: caps, weight: 600, style: "normal" }] },
  );
  const wordsPng = Buffer.from(await words.arrayBuffer());

  const layers: OverlayOptions[] = [
    { input: shadow, left: ex - 60, top: ey - 50 },
    { input: bodyB, left: ex, top: ey },
    { input: flapB, left: ex - Math.round(ew * 0.003), top: ey - Math.round(eh * 0.004) },
    { input: sealB, left: ex + Math.round(ew / 2 - sealW / 2), top: ey + Math.round(eh * SH.sealY - sealH / 2) },
    { input: wordsPng, left: 0, top: 0 },
  ];
  return sharp(bg).composite(layers).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
}
