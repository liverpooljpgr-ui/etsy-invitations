"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Content } from "@/lib/content/schema";
import { RsvpForm } from "@/components/invitation/RsvpForm";
import { Qr } from "@/components/invitation/Qr";
import { photoImgStyle } from "@/lib/photo-crop";
import { PW_DEFAULTS, pwStored, pwText } from "@/lib/website-texts";

/**
 * "Peach Website": a one-page wedding website.
 *   1. the envelope (click to open),
 *   2. the page: a collage of cards (names, date and place, "click for the details", RSVP, photos) and a live countdown,
 *   3. the details page (place, timeline, hotel, dress code, registry) with a Back button.
 * The RSVP card opens the reply form as a modal window. (In the editor the preview starts on the page itself, not on the envelope.)
 * The layout is always vertical, from top to bottom, on every device: a phone fills its screen with it, a computer shows the same column in the
 * middle and the page scrolls. Every size follows the width of the page (not of the window), so the small preview in the editor is the same page.
 * All the pictures are in public/templates/peach-website/v1 (the peach envelope, papers, flowers, butterflies, dove, key, bow and the floral plate).
 */

type View = "envelope" | "home" | "details";
type Box = { x: number; y: number; w: number; h: number; r?: number };

const PHOTO_RATIO = 3 / 4; // the frame of the photo (the crop tool of the editor uses the same one)
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const IMG = "/templates/peach-website/v1";

/** Where each piece lies in the vertical column. The units are those of the reference picture (800 wide) and are scaled to the real width of the screen
 *  (at most MAXW pixels, centred on a computer). */
const MAXW = 800;
const POS: Record<string, Box> = {
  env: { x: 197, y: 280, w: 350, h: 266 },
  green: { x: 96, y: 486, w: 281, h: 356 },
  ornate: { x: 380, y: 394, w: 322, h: 413 },
  rsvp: { x: 397, y: 767, w: 292, h: 223 },
  peach: { x: 60, y: 796, w: 332, h: 305, r: -8 },
  photo: { x: 123, y: 1086, w: 256, h: 335, r: -3 },
  bq: { x: 62, y: 330, w: 215, h: 202 },
  lavender: { x: 520, y: 243, w: 128, h: 205 },
  small: { x: 296, y: 458, w: 98, h: 59 },
  rose: { x: 360, y: 722, w: 92, h: 125, r: 5 },
  key: { x: 604, y: 672, w: 108, h: 140, r: -10 },
  lilac: { x: 648, y: 766, w: 72, h: 53 },
  spray: { x: 322, y: 1206, w: 190, h: 248 },
  mirror: { x: 360, y: 950, w: 366, h: 438 }, dragon: { x: 80, y: 880, w: 128, h: 142 },
};
const STAGE = { w: 800, h: 1550, x0: 34, cw: 708 }; // x0 and cw: the part of the 800-wide picture that holds the pieces; it is stretched over the whole width of the screen // the page is always one vertical column, also on a laptop

/** "2:00 PM" / "14:30" / "" -> hours and minutes */
function clock(time: string): { h: number; m: number } {
  const m = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i.exec(time || "");
  if (!m) return { h: 0, m: 0 };
  let h = +m[1];
  const ap = (m[3] || "").toLowerCase();
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  return { h: Math.min(23, h), m: +(m[2] || 0) };
}
function target(date: string, time: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const t = clock(time);
  return new Date(+m[1], +m[2] - 1, +m[3], t.h, t.m, 0);
}
const two = (n: number) => String(n).padStart(2, "0");

/** Keeps the text of a card inside the empty space of the card: when it does not fit, the whole text is scaled down (never up). */
function Fit({ className, children }: { className: string; children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const o = outer.current, i = inner.current;
    if (!o || !i) return;
    const run = () => {
      if (!o.clientHeight || !o.clientWidth) return; // hidden for now
      const cs = getComputedStyle(o);
      const ah = o.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      // the text may need the full size or less: look for the biggest zoom (at most 1) at which it fits (the text re-wraps as the zoom changes)
      const fits = (z: number) => { i.style.zoom = String(z); return i.offsetHeight * z <= ah + 0.5 && i.scrollWidth <= i.clientWidth + 1; }; // the width of the text block follows the card (it is 100%), so only a word that is too wide counts as too wide
      if (fits(1)) return;
      let lo = 0.3, hi = 1;
      for (let n = 0; n < 9; n++) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; }
      i.style.zoom = String(lo);
    };
    run();
    let alive = true;
    document.fonts?.ready.then(() => { if (alive) run(); }); // measure again when the real fonts are in
    const again = () => { if (alive) run(); };
    document.fonts?.addEventListener?.("loadingdone", again); // the script fonts load late: measure again when they arrive
    const ro = new ResizeObserver(run);
    ro.observe(o);
    ro.observe(i);
    return () => { alive = false; ro.disconnect(); document.fonts?.removeEventListener?.("loadingdone", again); };
  });
  return <div ref={outer} className={className}><div ref={inner} className="pw-fit">{children}</div></div>;
}

/** The fountain video as a background: it keeps playing in a loop (it is started again whenever the page is shown and when the browser stops it, and it jumps back a moment before the end so the loop has no stop). */
function LoopVideo({ className, src, poster, active, still }: { className: string; src: string; poster: string; active: boolean; still?: boolean }) {
  const v = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = v.current;
    if (!el || still) return;
    el.muted = true;
    const play = () => { if (active) void el.play().catch(() => {}); };
    const wrap = () => { if (el.duration && el.currentTime > el.duration - 0.12) { el.currentTime = 0.01; play(); } };
    const onPause = () => { if (active && !el.ended) setTimeout(play, 150); };
    el.addEventListener("timeupdate", wrap);
    el.addEventListener("ended", play);
    el.addEventListener("pause", onPause);
    el.addEventListener("canplay", play);
    if (active) play(); else el.pause();
    return () => { el.removeEventListener("timeupdate", wrap); el.removeEventListener("ended", play); el.removeEventListener("pause", onPause); el.removeEventListener("canplay", play); };
  }, [active, src, still]);
  // the small preview on a phone shows the first picture of the video: the video itself is 6 MB
  // eslint-disable-next-line @next/next/no-img-element
  if (still) return <img className={className} src={poster} alt="" aria-hidden="true" draggable={false} />;
  return <video ref={v} className={className} src={src} poster={poster} autoPlay muted loop playsInline preload="auto" aria-hidden="true" />;
}

function Countdown({ to }: { to: Date | null }) {
  const [now, setNow] = useState<number | null>(null); // empty until mounted, so the server and the browser agree
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = to && now !== null ? Math.max(0, to.getTime() - now) : 0;
  const s = Math.floor(left / 1000);
  const cells: [string, string][] = [
    [String(Math.floor(s / 86400)), "Days"],
    [two(Math.floor((s % 86400) / 3600)), "Hours"],
    [two(Math.floor((s % 3600) / 60)), "Minutes"],
    [two(s % 60), "Seconds"],
  ];
  return (
    <div className="pw-count" role="timer" aria-label="Countdown to the wedding">
      {cells.map(([v, l], i) => (
        <div className="pw-count-cell" key={l}>
          <b>{v}</b>
          <span>{l}</span>
          {i < 3 && <i aria-hidden="true">:</i>}
        </div>
      ))}
    </div>
  );
}

/** The peach envelope: the body, the closed flap (hinged at its top edge) and the open flap with the painted lining (standing on the body). */
function PeachEnvelope({ open, still }: { open: boolean; still?: boolean }) {
  /* eslint-disable @next/next/no-img-element */
  return (
    <span className={`pw-penv${open ? " is-open" : ""}${still ? " is-still" : ""}`} aria-hidden="true">
      <img className="pw-pe-open" src={`${IMG}/env-flap-open.webp`} alt="" draggable={false} />
      <img className="pw-pe-body" src={`${IMG}/env-body.webp`} alt="" draggable={false} />
      <img className="pw-pe-closed" src={`${IMG}/env-flap-closed.webp`} alt="" draggable={false} />
      {!still && <img className="pw-pe-seal" src={`${IMG}/seal.webp`} alt="" draggable={false} />}
    </span>
  );
  /* eslint-enable @next/next/no-img-element */
}

/** The mirror: its glass is misted (the picture of the glass is drawn on a canvas); wiping it with a finger, or moving the mouse over it, clears the mist and shows the couple's photo behind. */
function Mirror({ photo, placeholder, style }: { photo: Content["photo"]; placeholder: boolean; style: CSSProperties }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const wiped = useRef<{ x: number; y: number }[]>([]); // everything that was wiped (as parts of the glass width): painted again whenever the glass is redrawn, so a revealed photo stays revealed
  const [touched, setTouched] = useState(false); // until the glass is touched, soft waves pulse on it to show that it can be wiped
  const clear = (g: CanvasRenderingContext2D, px: number, py: number, rad: number) => {
    g.globalCompositeOperation = "destination-out";
    const gr = g.createRadialGradient(px, py, rad * 0.25, px, py, rad);
    gr.addColorStop(0, "rgba(0,0,0,1)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr;
    g.beginPath();
    g.arc(px, py, rad, 0, Math.PI * 2);
    g.fill();
  };
  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const img = new Image();
    img.src = `${IMG}/mirror.webp`;
    const paint = () => {
      const w = c.clientWidth, h = c.clientHeight, d = Math.min(window.devicePixelRatio || 1, 2);
      if (!w || !h) return;
      c.width = Math.round(w * d);
      c.height = Math.round(h * d);
      const g = c.getContext("2d");
      if (!g || !img.complete || !img.naturalWidth) return;
      g.globalCompositeOperation = "source-over";
      g.drawImage(img, 0, 0, c.width, c.height);
      g.fillStyle = "rgba(255,255,255,.32)"; // the mist
      g.fillRect(0, 0, c.width, c.height);
      for (const p of wiped.current) clear(g, p.x * c.width, p.y * c.width, c.width * 0.085);
    };
    img.onload = paint;
    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const hold = (e: TouchEvent) => { if (e.cancelable) e.preventDefault(); }; // the touch belongs to the glass: the page must not scroll under the finger
    c.addEventListener("touchstart", hold, { passive: false });
    c.addEventListener("touchmove", hold, { passive: false });
    return () => { c.removeEventListener("touchstart", hold); c.removeEventListener("touchmove", hold); };
  }, []);
  function wipe(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.type === "pointerdown") { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* the wiping still works without it */ } } // keep wiping when the finger slips off the glass
    if (e.pointerType !== "mouse" && e.buttons === 0 && e.type !== "pointerdown") return;
    setTouched(true);
    const c = cv.current, g = c?.getContext("2d");
    if (!c || !g) return;
    const r = c.getBoundingClientRect(), k = c.width / r.width;
    const x = (e.clientX - r.left) * k, y = (e.clientY - r.top) * k, rad = c.width * 0.085;
    g.globalCompositeOperation = "destination-out";
    const from = last.current && e.type !== "pointerdown" ? last.current : { x, y };
    const n = Math.max(1, Math.ceil(Math.hypot(x - from.x, y - from.y) / (rad * 0.4)));
    for (let i = 1; i <= n; i++) {
      const px = from.x + ((x - from.x) * i) / n, py = from.y + ((y - from.y) * i) / n;
      clear(g, px, py, rad);
      if (wiped.current.length < 6000) wiped.current.push({ x: px / c.width, y: py / c.width });
    }
    last.current = { x, y };
  }
  /* eslint-disable @next/next/no-img-element */
  return (
    <div className="pw-el pw-mirror" data-pv="mirror" style={style}>
      <div className="pw-glass">
        <div className="pw-glass-photo">
          {photo ? <img src={photo.url} alt={photo.alt || ""} draggable={false} style={photoImgStyle(photo, 0.69)} /> : placeholder ? <span className="pw-ph">Your photo</span> : null}
        </div>
        <canvas ref={cv} className="pw-mist" aria-label="Wipe the mirror to see the photo" onPointerDown={wipe} onPointerMove={wipe} onPointerUp={() => { last.current = null; }} onPointerLeave={() => { last.current = null; }} onPointerCancel={() => { last.current = null; }} />
      </div>
      {!touched && <span className="pw-ripples" aria-hidden="true"><i /><i /><i /></span>}
      <img className="pw-mirror-frame" src={`${IMG}/mirror-frame.webp`} alt="" draggable={false} />
    </div>
  );
  /* eslint-enable @next/next/no-img-element */
}

export function WebsiteExperience({ content: c, mode = "public", calendarHref, rsvpSlug, fill, startAt = "envelope", frameSize, backHref, coverOnly, autoHeight, ghosts, stillVideo }: { content: Content; mode?: "public" | "preview"; calendarHref?: string; rsvpSlug?: string; fill?: boolean; startAt?: View; frameSize?: { w: number; h: number }; backHref?: string; coverOnly?: boolean; autoHeight?: boolean; ghosts?: boolean; stillVideo?: boolean }) {
  const ph = mode === "preview";
  const root = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [view, setView] = useState<View>(startAt);
  const [opening, setOpening] = useState(false);
  const [music, setMusic] = useState<"none" | "on" | "off">("none");
  // empty until the page has been measured: nothing is shown before that (class pw-wait), so the page never appears at a guessed size and then jumps to the real one
  const [dim, setDim] = useState<{ w: number; h: number } | null>(null);
  const size = dim ?? { w: 390, h: 760 };

  // the width and height of the page decide the layout and the scale
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const read = () => { if (el.clientWidth) setDim({ w: el.clientWidth, h: el.clientHeight || 760 }); };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => () => { audio.current?.pause(); audio.current = null; }, []);

  // the pieces of the page appear while the page scrolls: each slides in from its own side and fades in the first time it comes into view
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const scroller = el.querySelector<HTMLElement>(".pw-scroll");
    const stage = el.querySelector<HTMLElement>(".pw-stage");
    if (!scroller || !stage) return;
    const items = Array.from(stage.children).filter((n): n is HTMLElement => n instanceof HTMLElement && n.classList.contains("pw-el"));
    const sw = stage.clientWidth || 1;
    const bn = scroller.querySelector<HTMLElement>(".pw-banner-in"); // the countdown rises into view too
    if (bn) items.push(bn);
    items.forEach((n) => {
      const cx = n === bn ? 0.5 : (n.offsetLeft + n.offsetWidth / 2) / sw;
      n.dataset.rv = cx < 0.4 ? "l" : cx > 0.62 ? "r" : "u";
      n.style.transition = "none";
      n.classList.remove("is-in");
      n.classList.add("pw-rv");
    });
    let batch = 0;
    const io = new IntersectionObserver((entries) => {
      batch = 0;
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const n = e.target as HTMLElement;
        n.style.setProperty("--rd", `${batch++ * 90}ms`);
        n.classList.add("is-in"); // each piece slides in once, when it first comes into view; scrolling back up does not replay it
        io.unobserve(n);
      });
    }, { root: scroller, threshold: 0.08 });
    void stage.offsetHeight; // the hidden start state is set without a transition, so the slide-in is seen
    items.forEach((n) => { n.style.transition = ""; });
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => items.forEach((n) => io.observe(n))));
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [view, size.w]);

  // always one vertical column: a phone fills its screen, a computer shows the same column in the middle (MAXW pixels wide) and the page scrolls
  const col = Math.min(size.w, MAXW);
  const air = size.w < 600 ? 0.97 : 1; // on a phone the collage leaves some space at the sides of the screen
  const u = (col * air) / STAGE.cw;
  const ue = Math.min(col / 390, size.h / 660); // the envelope page has to fit the width and the height of the screen
  const dx = (size.w - col * air) / 2 - STAGE.x0 * u + (size.w < 600 ? -2.7 * u : 0); // on a phone the pieces sit a little to the left: the big mirror on the right makes the collage look heavy at that side
  const box = (k: string): CSSProperties => {
    const b = POS[k];
    return { left: b.x * u, top: b.y * u, width: b.w * u, height: b.h * u, transform: b.r ? `rotate(${b.r}deg)` : undefined };
  };


  function startMusic() {
    if (!c.music) return;
    const a = new Audio(c.music.url);
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
  function openEnvelope() {
    if (opening || coverOnly) return; // the cover shown beside the editor is only a picture of the cover
    startMusic();
    setOpening(true);
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(() => setView("home"), reduce ? 0 : 2900);
  }
  function backToEnvelope() {
    setOpening(false);
    setView("envelope");
  }

  const first = c.couple.first || (ph ? "Beloved" : "");
  const second = c.couple.second || (ph ? "Beloved" : "");
  const t = c.texts;
  const W = (k: keyof typeof PW_DEFAULTS) => pwText(t, k); // the words of the website: the couple's own, or the design's
  const lead = W("coverTop");
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(c.event.date);
  const day = dm ? String(+dm[3]) : "";
  const month = dm ? MONTHS[+dm[2] - 1] : "";
  const year = dm ? dm[1] : "";
  const short = dm ? `${dm[3]}.${dm[2]}.${dm[1].slice(2)}` : "";
  // under the word RSVP: the date till which the guests are asked to reply
  const rb = /^(\d{4})-(\d{2})-(\d{2})$/.exec(c.rsvp.deadline);
  const replyBy = rb ? `until ${+rb[3]} ${MONTHS[+rb[2] - 1]} ${rb[1]}` : "";
  const when = target(c.event.date, c.event.time);
  const addr = c.event.address.split("\n").filter(Boolean);
  const registry = c.registry.filter((r) => r.url);
  // a short, warm welcome for the guests, written from the first screen's data: what happens, when and where
  const couple = [first, second].filter(Boolean).join(" & ");
  const weekday = dm ? WEEKDAYS[new Date(+dm[1], +dm[2] - 1, +dm[3]).getDay()] : "";
  const whenText = dm ? `${weekday}, the ${+dm[3]}${["th", "st", "nd", "rd"][((+dm[3] % 100) - 20) % 10] || ["th", "st", "nd", "rd"][+dm[3] % 100] || "th"} of ${month} ${year}` : "";
  const placeText = [c.event.venue, addr.join(", ")].filter(Boolean).join(", ");
  const introLines: string[] = [];
  introLines.push(couple ? `With full hearts, ${couple} invite you to share the day they say “I do”.` : "With full hearts, we invite you to share the day we say “I do”.");
  if (whenText || c.event.time) introLines.push(`Please join us ${whenText ? `on ${whenText}` : ""}${c.event.time ? `${whenText ? " " : ""}at ${c.event.time}` : ""}${placeText ? `, at ${placeText}` : ""}.`);
  else if (placeText) introLines.push(`Please join us at ${placeText}.`);
  introLines.push("Come as you are, bring your smiles, and let us celebrate love together. We cannot wait to be with you.");
  const hasDress = !!(c.dressCode.label || c.dressCode.colors.length > 0);
  const off = (n: number) => c.hidden.includes(n);
  // the host's own blocks of the details page (an older invitation kept its one block in the texts)
  const ownBlocks = [...(t.detailsExtraTitle || t.detailsExtraText ? [{ title: t.detailsExtraTitle, text: t.detailsExtraText }] : []), ...c.extraBlocks].filter((b) => b.title || b.text);
  const gh = !!ghosts; // the editor preview only: empty cards of the details page are shown as faint placeholders
  // the two names get the same size, as big as the card allows: the longer name takes the whole width of the text area (measured, so it also fits the real font)
  const ornate = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const card = ornate.current;
    if (!card) return;
    const run = () => {
      const inner = card.querySelector<HTMLElement>(".pw-fit");
      const names = Array.from(card.querySelectorAll<HTMLElement>(".pw-name"));
      if (!inner || !names.length || !card.clientWidth) return;
      const z = inner.style.zoom; inner.style.zoom = "1";
      let widest = 0;
      for (const p of names) {
        p.style.whiteSpace = "nowrap"; p.style.fontSize = "100px";
        const r = document.createRange(); r.selectNodeContents(p);
        widest = Math.max(widest, r.getBoundingClientRect().width);
      }
      const px = widest ? Math.min((inner.clientWidth / widest) * 100 * 0.97, card.clientWidth * 0.24) : 20;
      for (const p of names) { p.style.whiteSpace = ""; p.style.fontSize = `${px}px`; }
      inner.style.zoom = z;
    };
    run();
    document.fonts?.ready.then(run);
    document.fonts?.addEventListener?.("loadingdone", run);
    const ro = new ResizeObserver(run);
    ro.observe(card);
    return () => { document.fonts?.removeEventListener?.("loadingdone", run); ro.disconnect(); };
  }, [first, second, view, size.w]);

  /* eslint-disable @next/next/no-img-element */
  const deco = (k: string, file: string, cls = "") => <img className={`pw-el pw-deco ${cls}`} style={box(k)} src={`${IMG}/${file}.webp`} alt="" draggable={false} />;

  const countdownBanner = (
    <div className="pw-banner" data-pv="banner">
      <LoopVideo className="pw-banner-bg" src={`${IMG}/garden.mp4`} poster={`${IMG}/garden-poster.webp`} active={view === "home"} still={stillVideo} />
      <div className="pw-banner-in">
        <p className="pw-banner-script">{PW_DEFAULTS.bannerTitle}</p>
        <Countdown to={when} />
        <p className="pw-banner-names">{[first, second].filter(Boolean).join(" & ")}{short && <span className="pw-banner-date"> · {short}</span>}</p>
        <button type="button" className="pw-link" onClick={backToEnvelope}>{PW_DEFAULTS.bannerLink}</button>
      </div>
    </div>
  );

  return (
    <div
      ref={root}
      className={`pw ${mode === "public" || fill ? "pw-fill" : "pw-box"}${coverOnly ? " pw-cover-only" : ""}${autoHeight && view === "home" ? " pw-tall" : ""}${autoHeight && view === "details" ? " pw-tall-d" : ""} pw-v-${view} pw-narrow${dim ? "" : " pw-wait"}`}
      data-template="peach-website"
      style={{ "--u": u, "--ue": ue, ...(autoHeight && view === "home" ? { height: STAGE.h * u + 400 } : {}), ...(frameSize ? { width: frameSize.w, height: frameSize.h, borderRadius: 0, boxShadow: "none" } : {}) } as CSSProperties}
    >
      {/* the way back to the editor (in the preview only): it stays on every screen, before and after the envelope is opened */}
      {backHref && <a className="pw-editor-back" href={backHref}>← Back to editor</a>}

      {/* 1 — the envelope */}
      <section className="pw-page pw-envelope" data-pv="cover" aria-hidden={view !== "envelope"} hidden={view !== "envelope"}>
        <button type="button" className={`pw-envbtn${opening ? " is-opening" : ""}`} onClick={openEnvelope} aria-label="Open the invitation" disabled={opening || coverOnly}>
          <span className="pw-env-top">{lead}</span>
          <span className="pw-env-names">{[first, second].filter(Boolean).join(" & ")}</span>
          <span className="pw-env-box"><PeachEnvelope open={opening} /></span>
          <span className="pw-env-hint">{opening ? " " : "Click the envelope to open"}</span>
        </button>
      </section>

      {/* 2 — the page */}
      <section className="pw-page pw-home" aria-hidden={view !== "home"} hidden={view !== "home"}>
        <div className="pw-scroll">
          <div className="pw-stage" style={{ width: STAGE.w * u, height: STAGE.h * u, marginLeft: dx }}>
            <div className="pw-el pw-envstill" style={box("env")}><PeachEnvelope open still /></div>

            <div className="pw-el pw-green" data-pv="date" style={box("green")}>
              <Fit className="pw-green-in">
                <p className="pw-day">{day || "00"}</p>
                <p className="pw-month">{month || "Month"}</p>
                <p className="pw-year">{year || "0000"}</p>
                <p className="pw-at">{c.event.time ? `At ${c.event.time}` : ""}</p>
                <p className="pw-venue">{c.event.venue}</p>
                {addr[0] && <p className="pw-addr">{addr.join(", ")}</p>}
                {c.event.mapUrl && <a className="pw-dir" href={c.event.mapUrl} target="_blank" rel="noopener noreferrer">{PW_DEFAULTS.dirText}</a>}
              </Fit>
            </div>

            <div ref={ornate} className="pw-el pw-ornate" data-pv="names" style={box("ornate")}>
              <img className="pw-ornate-bg" src={`${IMG}/ornate.webp`} alt="" draggable={false} />
              <Fit className="pw-ornate-in">
                <p className="pw-lead">{W("cardTop")}</p>
                <p className="pw-name">{first}</p>
                <p className="pw-amp">&amp;</p>
                <p className="pw-name">{second}</p>
                <p className="pw-more">{W("cardNote")}</p>
              </Fit>
            </div>

            {(
              <div className="pw-el pw-rsvp" data-pv="rsvp" style={box("rsvp")}>
                {(
                  <RsvpForm slug={rsvpSlug} deadline={c.rsvp.deadline} maxParty={c.rsvp.maxParty} contactEmail={c.rsvp.email} hostSelector=".pw" triggerClassName="pw-rsvp-btn" trigger={<><span>Kindly</span><strong>RSVP</strong><em>{replyBy || "Here"}</em></>} />
                )}
              </div>
            )}

            {(
              <button type="button" className="pw-el pw-peach" data-pv="peach" style={box("peach")} onClick={() => setView("details")} aria-label={W("detailsButton")}>
                <img src={`${IMG}/peach.webp`} alt="" draggable={false} />
                <span className="pw-peach-hit" aria-hidden="true" />
                <span className="pw-peach-text">{W("detailsButton")}</span>
              </button>
            )}

            {(
              <div className="pw-el pw-photo" data-pv="photo" style={box("photo")}>
                <div className="pw-photo-card">
                <div className="pw-photo-in">
                  {c.photo ? <img src={c.photo.url} alt={c.photo.alt || ""} draggable={false} style={photoImgStyle(c.photo, PHOTO_RATIO)} /> : ph ? <span className="pw-ph">Your photo</span> : null}
                </div>
                </div>
              </div>
            )}

            {deco("spray", "spray", "pw-d-spray")}
            <Mirror photo={c.secretPhoto ?? c.photo} placeholder={ph} style={box("mirror")} />
            {deco("bq", "bouquet", "pw-d-bq")}
            {deco("lavender", "lavender", "pw-d-back")}
            {deco("small", "small")}
            {deco("rose", "rose")}
            {deco("key", "key", "pw-d-key")}
            {deco("lilac", "lilac")}
            {deco("dragon", "dragonfly")}
          </div>
          {countdownBanner}
        </div>
      </section>
      {/* eslint-enable @next/next/no-img-element */}

      {/* 3 — the details */}
      <section className="pw-page pw-details" aria-hidden={view !== "details"} hidden={view !== "details"}>
        <div className="pw-details-scroll">
          <header className="pw-details-head" data-pv="d-top">
            <LoopVideo className="pw-details-video" src={`${IMG}/garden.mp4`} poster={`${IMG}/garden-poster.webp`} active={view === "details"} still={stillVideo} />
            <button type="button" className="pw-back" onClick={() => setView("home")}><span aria-hidden="true">←</span> {PW_DEFAULTS.goBackText}</button>
            <h2>{W("detailsTitle")}</h2>
          </header>
          <div className="pw-details-grid">
            <p className="pw-intro" data-pv="d-intro">{pwStored(t, "detailsIntro") || introLines.join(" ")}</p>
            {!off(4) && (c.timeline.length > 0 || gh) && (
              <article className={`pw-card${c.timeline.length === 0 ? " pw-ghost" : ""}`} data-pv="d-timeline">
                <h3>{W("timelineTitle")}</h3>
                <ul className="pw-tl">{(c.timeline.length > 0 ? c.timeline : [{ time: "00:00", label: "Your schedule appears here" }]).map((x, i) => <li key={i}><b>{x.time}</b><span>{x.label}</span></li>)}</ul>
              </article>
            )}
            {!off(12) && (c.hotel.name || gh) && (
              <article className={`pw-card${c.hotel.name ? "" : " pw-ghost"}`} data-pv="d-hotel">
                <h3>{W("detailsAccommodation")}</h3>
                <p className="pw-lead-in">{W("detailsAccommodationNote")}</p>
                <p className="pw-strong pw-caps">{c.hotel.name || "Hotel name"}</p>
                {(c.hotel.name ? c.hotel.address : "Hotel address").split("\n").map((l, i) => <p key={i} className="pw-hotel-addr">{l}</p>)}
              </article>
            )}
            {!off(11) && (hasDress || gh) && (
              <article className={`pw-card${hasDress ? "" : " pw-ghost"}`} data-pv="d-dress">
                <h3>{W("detailsDressCode")}</h3>
                <p className="pw-lead-in">{pwStored(t, "detailsDressNote") || (c.dressCode.colors.length > 0 ? W("detailsDressNote") : "To make the day as beautiful as it feels, we kindly invite you to dress in the style below, so we can all blend into one lovely picture.")}</p>
                {c.dressCode.colors.length > 0 && <p className="pw-dots">{c.dressCode.colors.map((col, i) => <i key={i} style={{ background: col }} />)}</p>}
                {c.dressCode.label && <p className="pw-dress-word">{c.dressCode.label}</p>}
              </article>
            )}
            {!off(13) && (registry.length > 0 || gh) && (
              <article className={`pw-card${registry.length > 0 ? "" : " pw-ghost"}`} data-pv="d-registry">
                <h3>{W("detailsRegistry")}</h3>
                <p className="pw-lead-in">{W("detailsRegistryNote")}</p>
                {registry.length > 0 ? <div className="pw-qrs">{registry.map((r, i) => <figure key={i}><Qr value={r.url} label={`${r.label} registry`} /><figcaption>{r.label}</figcaption></figure>)}</div> : <p className="pw-lead-in">Your registry QR codes appear here.</p>}
              </article>
            )}
            {!off(15) && ownBlocks.map((b, i) => (
              <article key={i} className="pw-card" data-pv={i ? `d-own${i}` : "d-own"}>
                {b.title && <h3>{b.title}</h3>}
                {b.text && <p className="pw-pre">{b.text}</p>}
              </article>
            ))}
            {!off(15) && gh && ownBlocks.length === 0 && (
              <article className="pw-card pw-ghost" data-pv="d-own">
                <h3>Your own block</h3>
                <p className="pw-pre">Your own text appears here.</p>
              </article>
            )}
          </div>
          {calendarHref && dm && <p className="pw-cal" data-pv="d-cal"><a className="pw-a" href={calendarHref}>{PW_DEFAULTS.calendarText}</a></p>}
        </div>
      </section>

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
