import sharp from "sharp";
import { parseContent } from "@/lib/content/schema";
import { loadPublicInvitation } from "@/lib/public-invitation";
import { clampCrop, FRAME_RATIO, imageSize } from "@/lib/photo-crop";

export const runtime = "nodejs";

const W = 1200, H = 630;
const ARCH_H = 410, ARCH_W = Math.round(ARCH_H * FRAME_RATIO); // the arch from the invitation: 3 wide, 4 high

/** The watercolour flowers of the invitation as a wide frame (the closing page's border, turned on its side). Made once, then kept. */
let flowers: Promise<Buffer | null> | null = null;
function flowerFrame(origin: string): Promise<Buffer | null> {
  flowers ??= (async () => {
    try {
      const r = await fetch(new URL("/templates/sage-story/v1/page-bg-closing.webp", origin), { signal: AbortSignal.timeout(8000) });
      if (!r.ok) return null;
      return await sharp(Buffer.from(await r.arrayBuffer())).rotate(90).resize(W, H, { fit: "fill" }).jpeg({ quality: 88 }).toBuffer();
    } catch { return null; }
  })().then((b) => { if (!b) flowers = null; return b; });
  return flowers;
}

/** Link-preview picture: the couple's photo in the same arch (and with the same crop) as on the invitation. */
export async function GET(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const inv = await loadPublicInvitation(slug);
  if (inv?.status !== "published") return new Response("Not found", { status: 404 });
  const c = parseContent(inv.content);

  const generic = async () => {
    const r = await fetch(new URL("/share-card.jpg", request.url));
    return new Response(r.body, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=300, s-maxage=300" } });
  };
  if (!c.photo) return generic();

  try {
    const res = await fetch(c.photo.url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return generic();
    const src = sharp(Buffer.from(await res.arrayBuffer())).rotate();
    const { width: w = 0, height: h = 0 } = await src.metadata();
    if (!w || !h) return generic();

    // the part of the photo that sits in the arch (same maths as the editor's crop tool)
    const ar = w / h;
    const k = clampCrop(ar, { cx: c.photo.cx ?? 0.5, cy: c.photo.cy ?? 0.5, zoom: c.photo.zoom ?? 1 });
    const size = imageSize(ar, k.zoom);
    const vw = 1 / size.w, vh = 1 / size.h;
    const left = Math.max(0, Math.round((k.cx - vw / 2) * w)), top = Math.max(0, Math.round((k.cy - vh / 2) * h));
    const cropW = Math.min(w - left, Math.round(vw * w)), cropH = Math.min(h - top, Math.round(vh * h));
    const photo = await src.extract({ left, top, width: cropW, height: cropH }).resize(ARCH_W, ARCH_H, { fit: "cover" }).toBuffer();

    const r = ARCH_W / 2;
    const archPath = `M0 ${r} A${r} ${r} 0 0 1 ${ARCH_W} ${r} L${ARCH_W} ${ARCH_H - 8} Q${ARCH_W} ${ARCH_H} ${ARCH_W - 8} ${ARCH_H} L8 ${ARCH_H} Q0 ${ARCH_H} 0 ${ARCH_H - 8} Z`;
    const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${ARCH_W}" height="${ARCH_H}"><path d="${archPath}" fill="#fff"/></svg>`);
    const rounded = await sharp(photo).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();

    const x = Math.round((W - ARCH_W) / 2), y = Math.round((H - ARCH_H) / 2);
    const border = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><g transform="translate(${x} ${y})"><path d="${archPath}" fill="none" stroke="#b99646" stroke-width="4"/></g></svg>`,
    );
    const bg = await flowerFrame(request.url);
    const out = await (bg ? sharp(bg) : sharp({ create: { width: W, height: H, channels: 3, background: "#f6f2ea" } }))
      .composite([{ input: rounded, left: x, top: y }, { input: border }])
      .jpeg({ quality: 84, mozjpeg: true })
      .toBuffer();
    return new Response(new Uint8Array(out), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch {
    return generic();
  }
}
