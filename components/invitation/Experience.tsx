"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Content } from "@/lib/content/schema";
import type { TemplateSlug } from "@/lib/templates";
import { CoverInner } from "./Cover";
import { Invitation } from "./Invitation";

type Phase = "closed" | "opening" | "open";
const OPEN_MS = 2500; // keep in sync with the transitions in globals.css
// a design with a slower envelope (its own transitions in its stylesheet) says how long the opening takes
const OPEN_MS_BY_TEMPLATE: Partial<Record<TemplateSlug, number>> = { "mono-script": 5600, "cupid-script": 5600, "lilac-script": 5600, "sage-forest": 5600, "christmas-party": 4400 };

/**
 * Animated guest experience: tap the envelope, its two halves slide apart,
 * the next card rises into place, and the remaining cards reveal as you scroll.
 * Without JS (see <noscript>) or with reduced motion, everything is shown immediately.
 */
export function Experience({ content, mode = "public", calendarHref, rsvpSlug, template }: { content: Content; mode?: "public" | "preview"; calendarHref?: string; rsvpSlug?: string; template?: TemplateSlug }) {
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

  // The photo that slides out of the envelope must land exactly on the photo of the next screen: measure both (the next screen without its
  // "waiting" offset) and hand the distance and the size change to the stylesheet.
  function flyPhotoTo() {
    const r = root.current;
    const fly = r?.querySelector<HTMLElement>(".env-photo");
    const card = r?.querySelector<HTMLElement>('.card[data-card="2"]');
    const target = card?.querySelector<HTMLElement>(".arch") ?? (fly?.classList.contains("env-card") ? card : null);
    if (!fly || !card || !target) return;
    // the next screen waits slightly lower and smaller until the envelope opens: undo that (scale about its centre, then a shift)
    const m = new DOMMatrix(getComputedStyle(card).transform);
    const k = m.a || 1;
    const a = fly.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    const cx = c.left + c.width / 2 - m.e;
    const cy = c.top + c.height / 2 - m.f; // the screen's own centre
    const tw = t.width / k;
    const tx = cx + (t.left + t.width / 2 - (c.left + c.width / 2)) / k;
    const ty = cy + (t.top + t.height / 2 - (c.top + c.height / 2)) / k;
    if (!a.width || !tw) return;
    fly.style.setProperty("--fly-x", `${tx - (a.left + a.width / 2)}px`);
    fly.style.setProperty("--fly-y", `${ty - (a.top + a.height / 2)}px`);
    fly.style.setProperty("--fly-s", String(tw / a.width));
  }

  function open() {
    if (phase !== "closed") return;
    startMusic();
    flyPhotoTo();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPhase(reduce ? "open" : "opening");
  }

  useEffect(() => {
    if (phase === "opening") {
      const t = setTimeout(() => setPhase("open"), (template && OPEN_MS_BY_TEMPLATE[template]) || OPEN_MS);
      return () => clearTimeout(t);
    }
    if (phase === "open") root.current?.querySelector<HTMLElement>('[data-card="2"]')?.focus({ preventScroll: true });
  }, [phase, template]);

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
      const st = el.querySelector<HTMLElement>(".stage");
      if (st && st.offsetWidth && st.offsetHeight) el.style.setProperty("--card-wh", String(st.offsetWidth / st.offsetHeight)); // shape of a screen (the card that leaves the envelope has the same one)
      // the Christmas party screens were designed for a taller card (722 px at 340 wide) than the other designs (567 px): shorter phones scale it down by height
      const designH = template === "christmas-party" ? 722 : 567;
      el.style.setProperty("--k", phone ? String(Math.max(0.8, Math.min(w / 340, tallest / designH, 1.9))) : "1");
    };
    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("orientationchange", fit);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("orientationchange", fit);
    };
  }, [template]);

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
        <CoverInner content={content} mode={mode} hint template={template} />
      </button>
    );

  return (
    <div ref={root}>
      <noscript>
        <style>{`.inv[data-phase] .card{display:flex!important;opacity:1!important;transform:none!important}.env-btn{display:none!important}.inv .stage{margin-top:0!important}`}</style>
      </noscript>
      <Invitation content={content} mode={mode} phase={phase} envelope={overlay} calendarHref={calendarHref} rsvpSlug={rsvpSlug} template={template} />
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
