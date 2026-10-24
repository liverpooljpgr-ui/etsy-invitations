"use client";

import { useEffect, useRef } from "react";
import { clampCrop, FRAME_RATIO, imageSize, photoImgStyle, type Crop } from "@/lib/photo-crop";
import type { PhotoShape } from "@/lib/templates";

const radius = (shape: PhotoShape | undefined, archRadius: string) => (shape === "oval" ? "50%" : shape === "rect" ? "2px" : archRadius);

type Photo = { url: string; ar?: number; cx?: number; cy?: number; zoom?: number };

/**
 * Crop and zoom for the photo in the arch: drag the photo to move it, pinch or use the slider to zoom. What you see in
 * this frame is exactly what the invitation shows (both use the same placement maths).
 */
export function PhotoCrop({ photo, onChange, shape }: { photo: Photo; onChange: (patch: Partial<Photo>) => void; shape?: PhotoShape }) {
  const frame = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const img = useRef<HTMLImageElement>(null);
  const ar = photo.ar;
  const cur: Crop = { cx: photo.cx ?? 0.5, cy: photo.cy ?? 0.5, zoom: photo.zoom ?? 1 };

  // the photo's shape (width / height) is needed to place it; read it once it has loaded (it may already be loaded before this runs)
  const report = (el: HTMLImageElement) => { const r = el.naturalWidth / el.naturalHeight; if (r && (!ar || Math.abs(ar - r) > 0.001)) onChange({ ar: r }); };
  useEffect(() => { const el = img.current; if (el?.complete && el.naturalWidth) report(el); });

  const apply = (c: Crop) => { if (ar) onChange(clampCrop(ar, c)); };

  const down = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const move = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    const box = frame.current;
    if (!prev || !box || !ar) return;
    const others = [...pointers.current.entries()].filter(([id]) => id !== e.pointerId).map(([, p]) => p);
    const next = { x: e.clientX, y: e.clientY };
    if (others.length) { // two fingers: the change in distance between them is the zoom
      const o = others[0];
      const before = Math.hypot(prev.x - o.x, prev.y - o.y), after = Math.hypot(next.x - o.x, next.y - o.y);
      if (before > 0) apply({ ...cur, zoom: cur.zoom * (after / before) });
    } else { // one finger or the mouse: move the photo with it
      const { w, h } = imageSize(ar, cur.zoom);
      const r = box.getBoundingClientRect();
      apply({ ...cur, cx: cur.cx - (next.x - prev.x) / r.width / w, cy: cur.cy - (next.y - prev.y) / r.height / h });
    }
    pointers.current.set(e.pointerId, next);
  };
  const up = (e: React.PointerEvent) => { pointers.current.delete(e.pointerId); };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div
        ref={frame}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        role="img" aria-label={`Your photo in the ${shape === "oval" ? "oval" : shape === "rect" ? "frame" : "arch"}. Drag to move it, pinch or use the zoom bar to zoom.`}
        style={{ position: "relative", width: "min(240px, 70%)", aspectRatio: String(FRAME_RATIO), overflow: "hidden", borderRadius: radius(shape, "999px 999px 8px 8px"), background: "var(--ui-fill)", boxShadow: "0 0 0 1px #c9a45a, 0 8px 22px -10px rgba(72,37,82,.35)", cursor: "grab", touchAction: "none", userSelect: "none" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={img} src={photo.url} alt="" draggable={false} style={photoImgStyle(photo)} onLoad={(e) => report(e.currentTarget)} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, width: "min(320px, 100%)" }}>
        <button type="button" className="ui-btn ui-btn-gray ui-btn-sm" aria-label="Zoom out" onClick={() => apply({ ...cur, zoom: cur.zoom - 0.2 })} style={{ minWidth: 40, padding: 0 }}>−</button>
        <input type="range" min={1} max={3} step={0.01} value={Math.min(3, cur.zoom)} aria-label="Zoom" onChange={(e) => apply({ ...cur, zoom: Number(e.target.value) })} style={{ flex: 1, accentColor: "var(--ui-tint)" }} />
        <button type="button" className="ui-btn ui-btn-gray ui-btn-sm" aria-label="Zoom in" onClick={() => apply({ ...cur, zoom: cur.zoom + 0.2 })} style={{ minWidth: 40, padding: 0 }}>+</button>
        <button type="button" className="ui-btn ui-btn-plain ui-btn-sm" onClick={() => apply({ cx: 0.5, cy: 0.5, zoom: 1 })}>Reset</button>
      </div>
      <p className="ui-help" style={{ margin: 0, textAlign: "center" }}>Drag the photo to move it. Pinch or use the slider to zoom.</p>
    </div>
  );
}

/** The saved photo as it sits in the arch (small, not editable). */
export function PhotoArchThumb({ photo, shape }: { photo: Photo; shape?: PhotoShape }) {
  return (
    <div
      role="img" aria-label={`Your photo in the ${shape === "oval" ? "oval" : shape === "rect" ? "frame" : "arch"}`}
      style={{ position: "relative", width: 55, aspectRatio: String(FRAME_RATIO), overflow: "hidden", borderRadius: radius(shape, "999px 999px 6px 6px"), background: "var(--ui-fill)", boxShadow: "0 0 0 1px #c9a45a", flex: "none" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.url} alt="" draggable={false} style={photoImgStyle(photo)} />
    </div>
  );
}
