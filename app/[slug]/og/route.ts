import sharp, { type OverlayOptions } from "sharp";
import { parseContent } from "@/lib/content/schema";
import { loadPublicInvitation } from "@/lib/public-invitation";
import { templateOfSlug } from "@/lib/template-of";
import { PHOTO_FRAME, PHOTO_SHAPE, isWebsiteTemplate, type TemplateSlug } from "@/lib/templates";
import { peachShareCard } from "@/lib/peach-share-card";
import { clampCrop, imageSize } from "@/lib/photo-crop";

export const runtime = "nodejs";

const W = 1200, H = 630;

/** The cover picture of each design: its flowers sit in the corners, so the preview takes the top and the bottom strip of it. */
const COVER: Partial<Record<TemplateSlug, string>> = {
  "sage-forest": "/templates/forest/v1/cover.webp",
  "cupid-script": "/templates/cupid/v1/cover.webp",
  "lilac-script": "/templates/lilac/v1/cover.webp",
  "mono-script": "/templates/script/v1/cover-white-roses.webp",
  "sage-story": "/templates/aquarelle/v1/page-bg.webp",
  "white-roses": "/templates/jasmin/v1/bg-photo.webp",
};
const coverCache = new Map<string, Buffer>();

/** Mask in the shape the invitation shows the photo in: a frame, an arch (round top) or an oval. */
function shapeSvg(shape: string, w: number, h: number, fill: string, extra = "") {
  const body =
    shape === "oval" ? `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${fill}"/>`
    : shape === "arch" ? `<path d="M0 ${h} V${w / 2} A${w / 2} ${w / 2} 0 0 1 ${w} ${w / 2} V${h} Z" fill="${fill}"/>`
    : `<rect width="${w}" height="${h}" rx="4" fill="${fill}"/>`;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${extra}${body}</svg>`);
}

/**
 * Link-preview picture (Messenger, WhatsApp, iMessage…): the photo in the same frame and with the same crop the couple chose for the invitation
 * (so the faces stay in it), on the design's own paper with the flowers of its cover in the corners.
 */
export async function GET(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const inv = await loadPublicInvitation(slug);
  if (inv?.status !== "published") return new Response("Not found", { status: 404 });
  const c = parseContent(inv.content);

  const generic = async () => {
    const r = await fetch(new URL("/share-card.jpg", request.url));
    return new Response(r.body, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=300, s-maxage=300" } });
  };
  // a wedding website: its closed envelope and the names of the couple (not the photo, which the guests find inside)
  const template = await templateOfSlug(slug);
  if (isWebsiteTemplate(template)) {
    try {
      const jpg = await peachShareCard(new URL(request.url).origin, c, template);
      return new Response(new Uint8Array(jpg), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } });
    } catch { return generic(); }
  }
  if (!c.photo) return generic();

  try {
    const res = await fetch(c.photo.url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return generic();
    const src = sharp(Buffer.from(await res.arrayBuffer())).rotate();
    const { width: w = 0, height: h = 0 } = await src.metadata();
    if (!w || !h) return generic();

    // the frame: same shape and proportions as in the invitation
    const shape = PHOTO_SHAPE[template];
    const ratio = PHOTO_FRAME[template];
    const fh = 480, fw = Math.round(fh * ratio);

    // the photo cropped exactly like the invitation shows it (the couple's zoom and position); an old photo without crop data gets the sharpest part
    const chosen = c.photo.cx !== undefined || c.photo.cy !== undefined || (c.photo.zoom ?? 1) > 1;
    let photo: Buffer;
    if (chosen) {
      const ar = w / h;
      const k = clampCrop(ar, { cx: c.photo.cx ?? 0.5, cy: c.photo.cy ?? 0.5, zoom: c.photo.zoom ?? 1 }, ratio);
      const size = imageSize(ar, k.zoom, ratio);
      const ww = w / size.w, wh = h / size.h; // the part of the photo that is visible in the frame
      const left = Math.max(0, Math.min(w - ww, k.cx * w - ww / 2));
      const top = Math.max(0, Math.min(h - wh, k.cy * h - wh / 2));
      photo = await src.extract({ left: Math.round(left), top: Math.round(top), width: Math.max(1, Math.round(ww)), height: Math.max(1, Math.round(wh)) }).resize(fw, fh, { fit: "cover" }).png().toBuffer();
    } else {
      photo = await src.resize(fw, fh, { fit: "cover", position: sharp.strategy.attention }).png().toBuffer();
    }
    const shaped = await sharp(photo).composite([{ input: shapeSvg(shape, fw, fh, "#000"), blend: "dest-in" }]).png().toBuffer();

    // paper + the flowers of the cover: the top strip and the bottom strip of the cover picture fill the top and the bottom of the card;
    // each strip fades out towards the middle into the paper colour of the cover, so there is no seam
    let paper = { r: 247, g: 244, b: 239 };
    const layers: OverlayOptions[] = [];
    const coverPath = COVER[template];
    if (coverPath) {
      let cov = coverCache.get(coverPath);
      if (!cov) {
        const r = await fetch(new URL(coverPath, request.url));
        if (r.ok) { cov = Buffer.from(await r.arrayBuffer()); coverCache.set(coverPath, cov); }
      }
      if (cov) {
        const big = await sharp(cov).resize({ width: W }).removeAlpha().toBuffer({ resolveWithObject: true });
        const ch = big.info.height, band = 400;
        const mid = await sharp(big.data).extract({ left: Math.round(W * 0.3), top: Math.round(ch / 2) - 60, width: Math.round(W * 0.4), height: 120 }).resize(1, 1).raw().toBuffer();
        paper = { r: mid[0], g: mid[1], b: mid[2] };
        const fade = (down: boolean) => Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${band}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="${down ? 1 : 0}"/><stop offset=".5" stop-color="#fff" stop-opacity="${down ? 1 : 0}"/><stop offset="1" stop-color="#fff" stop-opacity="${down ? 0 : 1}"/></linearGradient></defs><rect width="${W}" height="${band}" fill="url(#g)"/></svg>`,
        );
        const top = await sharp(big.data).extract({ left: 0, top: 0, width: W, height: band }).ensureAlpha().composite([{ input: fade(true), blend: "dest-in" }]).png().toBuffer();
        const bottom = await sharp(big.data).extract({ left: 0, top: ch - band, width: W, height: band }).ensureAlpha().composite([{ input: fade(false), blend: "dest-in" }]).png().toBuffer();
        layers.push({ input: top, left: 0, top: 0 }, { input: bottom, left: 0, top: H - band });
      }
    }
    const base = sharp({ create: { width: W, height: H, channels: 3, background: paper } });

    // the photo: a soft shadow, a white edge, then the photo
    const px = Math.round((W - fw) / 2), py = Math.round((H - fh) / 2), edge = 9;
    const blur = `<defs><filter id="b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter></defs><g filter="url(#b)" opacity=".35">`;
    const shadow = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${fw + 80}" height="${fh + 80}">${blur}${(shapeSvg(shape, fw, fh, "#3d3328").toString().replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")).replace(/^/, `<g transform="translate(40 52)">`)}</g></g></svg>`);
    const whiteFrame = shapeSvg(shape, fw + edge * 2, fh + edge * 2, "#ffffff");
    layers.push(
      { input: shadow, left: px - 40, top: py - 40 },
      { input: whiteFrame, left: px - edge, top: py - edge },
      { input: shaped, left: px, top: py },
    );

    const out = await base.composite(layers).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
    return new Response(new Uint8Array(out), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch {
    return generic();
  }
}
