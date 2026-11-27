"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A little silver bell ringing with every shake of the box (5 shakes, 0.22 s apart), made in the browser: each ring is a few bell partials
 * (inharmonic, as a real bell) that sound at once and die away; a soft second bell answers each one, a little higher, as on a jingle string.
 */
function ringBells() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ac = new AC();
    const out = ac.createGain();
    out.gain.value = 0.32;
    out.connect(ac.destination);
    const ring = (at: number, f0: number, vol: number) => {
      [[1, 1], [2.76, 0.5], [5.4, 0.28], [8.93, 0.14]].forEach(([ratio, amp]) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = "sine";
        o.frequency.value = f0 * ratio;
        const len = 1.4 / Math.sqrt(ratio); // the high partials fade first, as in a bell
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(vol * amp, at + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, at + len);
        o.connect(g).connect(out);
        o.start(at);
        o.stop(at + len + 0.05);
      });
    };
    const t0 = ac.currentTime + 0.02;
    for (let i = 0; i < 5; i++) {
      const at = t0 + i * 0.22;
      ring(at, 2093 * (1 + (i % 2 ? 0.012 : -0.008)), 0.5);
      ring(at + 0.045, 2637 * (1 + (i % 3) * 0.006), 0.28);
    }
    setTimeout(() => ac.close().catch(() => {}), 3500);
  } catch { /* no sound on this browser: the box still opens */ }
}

/**
 * The cover of the Christmas gift invitation: a wrapped present lies on the page and gives a little wobble every two seconds,
 * while a magic shine rises above it like smoke and fades away; its shadow lies under it.
 * Tapped, it wobbles faster, then whirls round while growing until it fills the screen, and vanishes: `onOpen` is called then.
 */
export function GiftCover({ img, bell, onOpen, top = "You have received", title = "a Christmas invitation", hint = "Tap the box" }: { img: string; bell?: string; onOpen?: () => void; top?: string; title?: string; hint?: string }) {
  const [phase, setPhase] = useState<"idle" | "shake" | "whirl" | "gone">("idle");
  const done = useRef(false);
  useEffect(() => {
    if (phase === "shake") { const t = setTimeout(() => setPhase("whirl"), 1100); return () => clearTimeout(t); }
    if (phase === "whirl") { const t = setTimeout(() => { setPhase("gone"); if (!done.current) { done.current = true; onOpen?.(); } }, 1500); return () => clearTimeout(t); }
  }, [phase, onOpen]);
  const open = () => { if (phase === "idle") { ringBells(); setPhase("shake"); } };
  // the shine: small golden sparks, each rising on its own time higher and higher, getting smaller, until it fades
  const sparks = Array.from({ length: 96 }, (_, i) => ({ x: ((i * 37) % 150) - 75, d: 4 + ((i * 7) % 5) * 0.6, delay: i * 0.065, s: 0.6 + ((i * 5) % 4) * 0.25, h: 220 + ((i * 11) % 6) * 36, tw: 0.5 + ((i * 3) % 5) * 0.15 }));
  return (
    <div className="gc" data-phase={phase}>
      {top && <p className="gc-top">{top}</p>}
      {title && <p className="gc-title">{title}</p>}
      <button type="button" className="gc-box" onClick={open} aria-label={hint} disabled={phase !== "idle"}>
        <span className="gc-shadow" aria-hidden="true" />
        <span className="gc-shine" aria-hidden="true">
          {sparks.map((p, i) => <b key={i} className="gc-spark" style={{ ["--tw" as string]: `${p.tw}s`, ["--h" as string]: `${p.h}px`, ["--x" as string]: `${p.x}%`, ["--d" as string]: `${p.d}s`, ["--dl" as string]: `${p.delay}s`, ["--s" as string]: p.s }} />)}
        </span>
        <span className="gc-spin">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="gc-img" src={img} alt="" width={1000} height={949} draggable={false} />
          {/* the golden bell is a picture of its own, hanging on the bow: it swings a little with every wobble and jingles while the box shakes */}
          {bell && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="gc-bell" src={bell} alt="" width={113} height={119} draggable={false} />
          )}
        </span>
      </button>
      {hint && <p className="gc-hint">{hint}</p>}
      <span className="gc-flash" aria-hidden="true" />
    </div>
  );
}
