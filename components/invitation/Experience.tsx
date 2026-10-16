"use client";

import { useEffect, useRef, useState } from "react";
import type { Content } from "@/lib/content/schema";
import { CoverInner } from "./Cover";
import { Invitation } from "./Invitation";

type Phase = "closed" | "opening" | "open";
const OPEN_MS = 2500; // keep in sync with the transitions in globals.css

/**
 * Animated guest experience: tap the envelope, its two halves slide apart,
 * the next card rises into place, and the remaining cards reveal as you scroll.
 * Without JS (see <noscript>) or with reduced motion, everything is shown immediately.
 */
export function Experience({ content, mode = "public" }: { content: Content; mode?: "public" | "preview" }) {
  const [phase, setPhase] = useState<Phase>("closed");
  const root = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [music, setMusic] = useState<"none" | "on" | "off">("none");

  function startMusic() {
    // Browsers only allow sound after a tap, so the music starts with the tap on the envelope.
    if (!content.music) return; // no music chosen by the host
    const a = new Audio(content.music.url);
    a.loop = true;
    a.volume = 0.6;
    a.addEventListener("error", () => { audio.current = null; setMusic("none"); });
    audio.current = a;
    a.play().then(() => setMusic("on")).catch(() => { if (audio.current === a) setMusic("off"); });
  }
  function toggleMusic() {
    const a = audio.current;
    if (!a) return;
    if (a.paused) { a.play().then(() => setMusic("on")).catch(() => setMusic("off")); } else { a.pause(); setMusic("off"); }
  }
  useEffect(() => () => { audio.current?.pause(); audio.current = null; }, []);

  function open() {
    if (phase !== "closed") return;
    startMusic();
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

  // Phones show the cards as full-screen slides: scale the fixed-px sizes of the 340×567 design to the screen.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const fit = () => {
      const phone = window.matchMedia("(max-width: 640px)").matches;
      el.style.setProperty("--k", phone ? String(Math.max(0.8, Math.min(window.innerWidth / 340, window.innerHeight / 567, 1.9))) : "1");
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

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
      { threshold: window.matchMedia("(max-width: 640px)").matches ? 0.6 : 0.15 },
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
      <button type="button" className="cover env-btn" onClick={open} disabled={phase !== "closed"} aria-label="Open the invitation">
        <CoverInner content={content} mode={mode} hint />
      </button>
    );

  return (
    <div ref={root}>
      <noscript>
        <style>{`.inv[data-phase] .card{display:flex!important;opacity:1!important;transform:none!important}.env-btn{display:none!important}.inv .stage{margin-top:0!important}`}</style>
      </noscript>
      <Invitation content={content} mode={mode} phase={phase} envelope={overlay} />
      {music !== "none" && (
        <button type="button" className="music-btn" onClick={toggleMusic} aria-pressed={music === "on"} aria-label={music === "on" ? "Turn the music off" : "Turn the music on"}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 18V6l10-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" />
            {music === "off" && <path d="M3 3l18 18" />}
          </svg>
        </button>
      )}
    </div>
  );
}
