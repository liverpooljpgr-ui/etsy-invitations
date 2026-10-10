"use client";

import { useEffect, useRef, useState } from "react";
import type { Content } from "@/lib/content/schema";
import { Invitation } from "./Invitation";

type Phase = "closed" | "opening" | "open";
const OPEN_MS = 1500; // keep in sync with the transitions in globals.css

const ART = "/templates/sage-story/v1";

/**
 * Animated guest experience: tap the envelope, its two halves slide apart,
 * the next card rises into place, and the remaining cards reveal as you scroll.
 * Without JS (see <noscript>) or with reduced motion, everything is shown immediately.
 */
export function Experience({ content, mode = "public" }: { content: Content; mode?: "public" | "preview" }) {
  const [phase, setPhase] = useState<Phase>("closed");
  const root = useRef<HTMLDivElement>(null);

  function open() {
    if (phase !== "closed") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPhase(reduce ? "open" : "opening");
  }

  useEffect(() => {
    if (phase === "opening") {
      const t = setTimeout(() => setPhase("open"), OPEN_MS);
      return () => clearTimeout(t);
    }
    if (phase === "open") root.current?.querySelector<HTMLElement>('[data-card="2"]')?.focus({ preventScroll: true });
  }, [phase]);

  // Reveal later cards as they scroll into view.
  useEffect(() => {
    if (phase === "closed") return;
    const cards = Array.from(root.current?.querySelectorAll<HTMLElement>('.card[data-card]:not([data-card="2"])') ?? []);
    if (!("IntersectionObserver" in window)) {
      cards.forEach((c) => c.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.15 },
    );
    cards.forEach((c) => io.observe(c));
    const safety = setTimeout(() => cards.forEach((c) => c.classList.add("in")), 8000);
    return () => {
      io.disconnect();
      clearTimeout(safety);
    };
  }, [phase]);

  const overlay =
    phase === "open" ? null : (
      <button type="button" className="env-btn" onClick={open} disabled={phase !== "closed"} aria-label="Open the invitation">
        <span className="env-art" aria-hidden="true">
          {/* eslint-disable @next/next/no-img-element */}
          <img className="env-l" src={`${ART}/envelope-left.svg`} alt="" width={496} height={680} decoding="async" draggable={false} />
          <img className="env-r" src={`${ART}/envelope-right.svg`} alt="" width={345} height={710} decoding="async" draggable={false} />
          {/* eslint-enable @next/next/no-img-element */}
        </span>
        <span className="env-hint" aria-hidden="true">Tap to open</span>
      </button>
    );

  return (
    <div ref={root}>
      <noscript>
        <style>{`.inv[data-phase] .card{display:flex!important;opacity:1!important;transform:none!important}.env-btn{display:none!important}.inv .stage{margin-top:0!important}`}</style>
      </noscript>
      <Invitation content={content} mode={mode} phase={phase} envelope={overlay} />
    </div>
  );
}
