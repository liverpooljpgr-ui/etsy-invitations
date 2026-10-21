import type { CSSProperties } from "react";

/** The arch frame is 3 wide by 4 high. A photo is cropped by zooming it and choosing which part of it sits in the frame. */
export const FRAME_RATIO = 3 / 4;

export type Crop = { cx: number; cy: number; zoom: number };
export type CroppablePhoto = { ar?: number; cx?: number; cy?: number; zoom?: number };

/** How big the photo is drawn relative to the frame (1 = exactly as wide / high as the frame), for photo ratio ar (width / height). */
export function imageSize(ar: number, zoom: number) {
  return { w: Math.max(1, ar / FRAME_RATIO) * zoom, h: Math.max(1, FRAME_RATIO / ar) * zoom };
}

/** Keeps the zoom in range and the frame inside the photo (no empty edges). cx / cy are the photo's point shown in the middle. */
export function clampCrop(ar: number, c: Crop): Crop {
  const zoom = Math.min(4, Math.max(1, c.zoom));
  const { w, h } = imageSize(ar, zoom);
  const halfW = 0.5 / w, halfH = 0.5 / h;
  return { zoom, cx: Math.min(1 - halfW, Math.max(halfW, c.cx)), cy: Math.min(1 - halfH, Math.max(halfH, c.cy)) };
}

/** Inline style that places the photo inside the (overflow hidden) frame. Photos saved before cropping existed just cover it. */
export function photoImgStyle(p: CroppablePhoto): CSSProperties {
  if (!p.ar) return { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" };
  const c = clampCrop(p.ar, { cx: p.cx ?? 0.5, cy: p.cy ?? 0.5, zoom: p.zoom ?? 1 });
  const { w, h } = imageSize(p.ar, c.zoom);
  return { position: "absolute", width: `${w * 100}%`, height: `${h * 100}%`, left: `${(0.5 - c.cx * w) * 100}%`, top: `${(0.5 - c.cy * h) * 100}%`, maxWidth: "none" };
}
