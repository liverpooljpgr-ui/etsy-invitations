"use client";

import type { Content } from "@/lib/content/schema";
import { GiftCover } from "./GiftCover";
import { GiftStreet, type StreetText } from "./GiftStreet";
import { useEffect, useRef, useState } from "react";
import { czText, type CzKey } from "@/lib/cozy-texts";

const IMG = "/templates/christmas-gift/v1";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dayParts = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const dt = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return { weekday: DAYS[dt.getUTCDay()], day: +m[3], month: MONTHS[dt.getUTCMonth()] };
};

/** The words of every screen, from the invitation's content: each line has its own field (lib/cozy-texts.ts); an empty field gives the design's own wording.
 *  The facts come from the usual fields: the hosts' name, the date and time, the place, the details and the reply-by date. */
export function cozyCityText(c: Content): StreetText {
  const t = c.texts as unknown as Record<string, string | undefined>;
  const w = (k: CzKey) => czText(t, k);
  const d = dayParts(c.event.date), by = dayParts(c.rsvp.deadline);
  const details = [
    { label: c.texts.detailsExtraTitle, text: c.texts.detailsExtraText },
    { label: c.texts.detailsDressCode || "Dress code", text: c.dressCode.note || c.dressCode.label },
  ].filter((x) => x.label && x.text);
  return {
    intro: w("czIntro"),
    title: w("czTitle"),
    host: c.couple.first.trim() ? `Hosted by ${c.couple.first.trim()}` : "", // "Hosted by" and the hosts' name (only the name is written in the editor)
    when: d ? `${d.weekday} · ${d.month} ${d.day}` : "Date", // the month first, then the day
    time: c.event.time ? `at ${c.event.time}` : undefined, // "at 7 PM"
    where: w("czWhere"),
    placeIntro: w("czPlaceIntro"),
    place: c.event.venue || "",
    address: (c.event.address || "").split("\n").filter(Boolean).join(", ") || "Address",
    mapUrl: c.event.mapUrl || undefined,
    directions: w("czDirections"),
    next: w("czDetailsButton"),
    detailsTitle: w("czDetailsTitle"),
    details,
    detailsNext: w("czComeButton"),
    replyTitle: w("czReplyTitle"),
    replyBy: by ? `by ${by.month} ${by.day}` : "", // "by December 13"
    reply: "Reply now", // fixed words
    calendar: "Add to calendar", // fixed words
    closing: w("czClosing"),
    down: w("czDown"),
  };
}

/**
 * The Christmas Amsterdam invitation: the present on the cover (tap it: it shakes, rings, whirls and opens), then the snowy street,
 * the Christmas tree with the details and the sky with the reply. `fill` makes it the whole page (a guest's link);
 * without it, it fills the box it is put in (the editor's preview).
 */
export type CozyScreen = "cover" | "street" | "place" | "details" | "reply";
const PAGE_OF: Record<Exclude<CozyScreen, "cover">, 2 | 3 | 5 | 4> = { street: 2, place: 3, details: 5, reply: 4 };
export function CozyCity({ content, rsvpSlug, calendarHref, fill = true, startOpen = false, screen, variant = "amsterdam" }: { variant?: "amsterdam" | "paris"; content: Content; rsvpSlug?: string; calendarHref?: string; fill?: boolean; startOpen?: boolean; screen?: CozyScreen }) {
  const [open, setOpen] = useState(startOpen || (!!screen && screen !== "cover"));
  // the editor's preview goes to the screen being edited
  useEffect(() => { if (screen) setOpen(screen !== "cover"); }, [screen]);
  // the host's music (one of the Christmas songs or their own MP3): browsers allow sound only after a tap, so it starts with the tap on the present
  const audio = useRef<HTMLAudioElement | null>(null);
  const [music, setMusic] = useState<"none" | "on" | "off">("none");
  const startMusic = () => {
    if (!fill || !content.music || audio.current) return; // a guest's page only (not the editor's preview)
    const a = new Audio(content.music.url);
    a.loop = true; a.volume = 0.6;
    a.addEventListener("error", () => { audio.current = null; setMusic("none"); });
    audio.current = a;
    if ((window as Window & { __piSoundOff?: boolean }).__piSoundOff) { setMusic("off"); return; } // the preview's sound switch is off
    a.play().then(() => setMusic("on")).catch(() => { if (audio.current === a) setMusic("off"); });
  };
  const toggleMusic = () => { const a = audio.current; if (!a) return; if (a.paused) a.play().then(() => setMusic("on")).catch(() => setMusic("off")); else { a.pause(); setMusic("off"); } };
  useEffect(() => () => { audio.current?.pause(); audio.current = null; }, []);
  // the sound switch above the phone in "Preview animation"
  useEffect(() => {
    const on = (e: Event) => { const a = audio.current; if (!a) return; if ((e as CustomEvent).detail === "off") { a.pause(); setMusic("off"); } else { a.play().then(() => setMusic("on")).catch(() => setMusic("off")); } };
    window.addEventListener("pi-sound", on);
    return () => window.removeEventListener("pi-sound", on);
  }, []);
  const view = (
    <div className={`gx-screen gx-${variant}`}>
      {!open ? (
        <div className="gx-page"><GiftCover img={variant === "paris" ? "/templates/christmas-paris/v1/gift.webp" : `${IMG}/gift.webp`} bell={variant === "paris" ? undefined : `${IMG}/bell.webp`} onOpen={() => setOpen(true)} onTap={startMusic} starDots={variant === "paris"} top={czText(content.texts as unknown as Record<string, string>, "czCoverTop")} title={czText(content.texts as unknown as Record<string, string>, "czCoverTitle", variant === "paris" ? "a Christmas Invitation" : undefined)} hint={czText(content.texts as unknown as Record<string, string>, "czCoverHint")} /></div>
      ) : (
        <div className="gx-page gx-in">
          <GiftStreet variant={variant} text={cozyCityText(content)} calendarHref={calendarHref} page={screen && screen !== "cover" ? PAGE_OF[screen] : undefined} rsvp={{ slug: rsvpSlug, deadline: content.rsvp.deadline, maxParty: content.rsvp.maxParty, email: content.rsvp.email, labels: { food: content.texts.rsvpFoodLabel } }} />
        </div>
      )}
    </div>
  );
  const musicBtn = music !== "none" && (
    <button type="button" className="music-btn gx-music" onClick={toggleMusic} aria-pressed={music === "on"} aria-label={music === "on" ? "Turn the music off" : "Turn the music on"}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 18V6l10-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" />
        {music === "off" && <path d="M3 3l18 18" />}
      </svg>
    </button>
  );
  return fill ? <main className="gx-stage">{view}{musicBtn}</main> : <div className="gx-embed">{view}</div>;
}
