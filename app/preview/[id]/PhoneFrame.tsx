"use client";

import { useEffect, useState } from "react";

const W = 390, H = 844; // a modern phone (iPhone 14 / 15): the page inside is a real 390 x 844 screen, so every media query and screen-height rule behaves as on a phone

/**
 * "Preview animation" on a computer: the saved draft is shown in a real phone-sized screen (an iframe of the same page), scaled down to fit the window.
 * On a phone itself the preview simply opens full screen.
 */
export function PhoneFrame({ src, embeddedSrc, backHref }: { src: string; embeddedSrc: string; backHref: string }) {
  const [scale, setScale] = useState<number | null>(null);
  useEffect(() => {
    if (window.matchMedia("(max-width: 640px)").matches) { window.location.replace(src); return; } // a phone: no frame, the real screen
    const fit = () => setScale(Math.min(1, (window.innerHeight - 150) / (H + 28)));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [src]);
  if (scale === null) return <p className="mt-10 text-center text-sm">Opening the preview…</p>;
  const bez = 14;
  return (
    <main className="px-4 py-5">
      <p className="mb-4 text-center text-sm"><a className="underline" href={backHref}>← Back to editor</a> · private preview of your saved draft, shown on a phone screen ({W} × {H}). Tap the envelope to test the animation.</p>
      <div style={{ width: (W + 2 * bez) * scale, height: (H + 2 * bez) * scale, margin: "0 auto" }}>
        <div style={{ width: W + 2 * bez, height: H + 2 * bez, transform: `scale(${scale})`, transformOrigin: "0 0", background: "#0b0b0c", borderRadius: 58, padding: bez, boxShadow: "0 24px 60px rgba(40,30,40,.35), inset 0 0 0 2px #3a3a3d" }}>
          <iframe title="Phone preview" src={embeddedSrc} width={W} height={H} style={{ display: "block", border: 0, borderRadius: 44, background: "#fff" }} allow="autoplay" />
        </div>
      </div>
    </main>
  );
}
