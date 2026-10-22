import sharp from "sharp";
import { parseContent } from "@/lib/content/schema";
import { loadPublicInvitation } from "@/lib/public-invitation";

export const runtime = "nodejs";

const W = 1200, H = 630;

/** Link-preview picture: the couple's photo filling the whole card, with a thin light frame. */
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

    // Fill the whole card. If the couple moved or zoomed the photo in the editor, keep the spot they chose in the middle;
    // otherwise let sharp pick the busiest part (usually the faces) so a tall photo is not cut through the heads.
    const chosen = c.photo.cx !== undefined || c.photo.cy !== undefined || (c.photo.zoom ?? 1) > 1;
    let base: ReturnType<typeof sharp>;
    if (chosen) {
      const R = W / H;
      let rw = w, rh = w / R; // the biggest card-shaped window that fits in the photo
      if (rh > h) { rh = h; rw = h * R; }
      const z = Math.min(4, Math.max(1, c.photo.zoom ?? 1));
      rw /= z; rh /= z;
      const left = Math.max(0, Math.min(w - rw, (c.photo.cx ?? 0.5) * w - rw / 2));
      const top = Math.max(0, Math.min(h - rh, (c.photo.cy ?? 0.5) * h - rh / 2));
      base = src.extract({ left: Math.round(left), top: Math.round(top), width: Math.round(rw), height: Math.round(rh) }).resize(W, H, { fit: "cover" });
    } else {
      base = src.resize(W, H, { fit: "cover", position: sharp.strategy.attention });
    }

    const frame = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect x="20" y="20" width="${W - 40}" height="${H - 40}" fill="none" stroke="#ffffff" stroke-opacity=".75" stroke-width="2"/></svg>`,
    );
    const out = await base.composite([{ input: frame }]).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
    return new Response(new Uint8Array(out), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch {
    return generic();
  }
}
