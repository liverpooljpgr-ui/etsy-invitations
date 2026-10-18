"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  const [farewell, setFarewell] = useState<{ days: number | null } | null>(null);

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

  /** "Exit": the music fades away and a farewell screen tells the guest the magic is still to come. */
  function leave() {
    const when = /^d{4}-d{2}-d{2}$/.test(content.event.date) ? Date.parse(`${content.event.date}T00:00:00`) : NaN;
    const days = Number.isNaN(when) ? null : Math.ceil((when - Date.now()) / 864e5);
    setFarewell({ days: days !== null && days > 0 ? days : null });
    const a = audio.current;
    if (a) { a.pause(); setMusic("off"); }
  }

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
  // Set before the first paint (no flash of unscaled text). The height used is the tallest seen for this width, so the
  // browser bars sliding in and out while scrolling (which change innerHeight) never make the layout jump.
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    let tallest = 0;
    let lastW = 0;
    const fit = () => {
      const w = document.documentElement.clientWidth || window.innerWidth;
      if (w !== lastW) { tallest = 0; lastW = w; }
      tallest = Math.max(tallest, window.innerHeight);
      const phone = window.matchMedia("(max-width: 640px)").matches;
      el.style.setProperty("--k", phone ? String(Math.max(0.8, Math.min(w / 340, tallest / 567, 1.9))) : "1");
    };
    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("orientationchange", fit);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("orientationchange", fit);
    };
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
    return () => {
      io.disconnect();
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
      <Invitation content={content} mode={mode} phase={phase} envelope={overlay} onFarewell={leave} />
      {music !== "none" && (
        <button type="button" className="music-btn" onClick={toggleMusic} aria-pressed={music === "on"} aria-label={music === "on" ? "Turn the music off" : "Turn the music on"}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 18V6l10-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" />
            {music === "off" && <path d="M3 3l18 18" />}
          </svg>
        </button>
      )}
      {farewell && (
        <div className="inv farewell" data-theme={content.theme} role="dialog" aria-label="See you soon">
          <div className="farewell-in">
            <p className="farewell-names">{[content.couple.first, content.couple.second].filter(Boolean).join(" & ")}</p>
            <p className="farewell-script">See you soon</p>
            <span className="farewell-rule" aria-hidden="true" />
            <p className="farewell-text">The magic of our wedding is waiting for you.</p>
            {farewell.days !== null && (
              <p className="farewell-count"><b>{farewell.days}</b> {farewell.days === 1 ? "day" : "days"} to go</p>
            )}
            <button type="button" className="farewell-again" onClick={() => setFarewell(null)}>Open the invitation again</button>
          </div>
        </div>
      )}
    </div>
  );
}
