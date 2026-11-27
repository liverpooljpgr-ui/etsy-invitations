"use client";

import { useEffect, useState } from "react";

// a modern phone (iPhone 14 / 15) and a tablet (iPad): the page inside is a real screen of that size, so every media query and screen-height rule behaves as on the device
const DEVICES = {
  phone: { label: "Phone", W: 390, H: 844, bez: 14, outer: 58, inner: 44 },
  tablet: { label: "Tablet", W: 768, H: 1024, bez: 22, outer: 42, inner: 22 },
} as const;
type Device = keyof typeof DEVICES;

/**
 * "Preview animation" on a computer: the saved draft is shown in a real phone-sized screen (an iframe of the same page), scaled down to fit the window.
 * On a phone itself the preview simply opens full screen.
 */
export function PhoneFrame({ src, embeddedSrc, backHref }: { src: string; embeddedSrc: string; backHref: string }) {
  const [scale, setScale] = useState<number | null>(null);
  const [device, setDevice] = useState<Device>("phone");
  const { W, H, bez, outer, inner } = DEVICES[device];
  useEffect(() => {
    if (window.matchMedia("(max-width: 640px)").matches) { window.location.replace(src); return; } // a phone: no frame, the real screen
    const fit = () => setScale(Math.min(1, (window.innerHeight - 190) / (H + 2 * bez), (window.innerWidth - 40) / (W + 2 * bez)));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [src, W, H, bez]);
  if (scale === null) return <p className="mt-10 text-center text-sm">Opening the preview…</p>;
  return (
    <main className="px-4 py-5">
      <p className="mb-4 text-center text-sm"><a className="underline" href={backHref}>← Back to editor</a> · private preview of your saved draft, shown on a {device} screen ({W} × {H}). Tap the cover to test the animation.</p>
      <div role="tablist" aria-label="Screen" style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 16 }}>
        {(Object.keys(DEVICES) as Device[]).map((d) => (
          <button key={d} type="button" role="tab" aria-selected={device === d} onClick={() => setDevice(d)}
            style={{ padding: "7px 18px", borderRadius: 999, fontSize: 14, fontWeight: 600, border: "1px solid #d6d3db", background: device === d ? "#2b2233" : "#fff", color: device === d ? "#fff" : "#2b2233", cursor: "pointer" }}>
            {DEVICES[d].label}
          </button>
        ))}
      </div>
      <div style={{ width: (W + 2 * bez) * scale, height: (H + 2 * bez) * scale, margin: "0 auto" }}>
        <div style={{ width: W + 2 * bez, height: H + 2 * bez, transform: `scale(${scale})`, transformOrigin: "0 0", background: "#0b0b0c", borderRadius: outer, padding: bez, boxShadow: "0 24px 60px rgba(40,30,40,.35), inset 0 0 0 2px #3a3a3d" }}>
          <iframe key={device} title={`${DEVICES[device].label} preview`} src={embeddedSrc} width={W} height={H} style={{ display: "block", border: 0, borderRadius: inner, background: "#fff" }} allow="autoplay" />
        </div>
      </div>
    </main>
  );
}
