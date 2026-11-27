"use client";

import type { Content } from "@/lib/content/schema";
import { GiftCover } from "./GiftCover";
import { GiftStreet, type StreetText } from "./GiftStreet";
import { useEffect, useState } from "react";
import { czHostDefault, czText, type CzKey } from "@/lib/cozy-texts";

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
    host: czText(t, "czHost", czHostDefault(c.couple.first)), // warm wording after the Christmas invitation guides: the hosts would love you at their table
    when: d ? `${d.weekday} · ${d.month} ${d.day}` : "Date", // the month first, then the day
    time: c.event.time ? [w("czTimeWord"), c.event.time].filter(Boolean).join(" ") : undefined,
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
    replyBy: by ? [w("czReplyByWord"), `${by.month} ${by.day}`].filter(Boolean).join(" ") : "",
    reply: w("czReplyButton"),
    calendar: w("czCalendar"),
    closing: w("czClosing"),
    down: w("czDown"),
  };
}

/**
 * The Cozy Blue City invitation: the present on the cover (tap it: it shakes, rings, whirls and opens), then the snowy street,
 * the Christmas tree with the details and the sky with the reply. `fill` makes it the whole page (a guest's link);
 * without it, it fills the box it is put in (the editor's preview).
 */
export type CozyScreen = "cover" | "street" | "place" | "details" | "reply";
const PAGE_OF: Record<Exclude<CozyScreen, "cover">, 2 | 3 | 5 | 4> = { street: 2, place: 3, details: 5, reply: 4 };
export function CozyCity({ content, rsvpSlug, calendarHref, fill = true, startOpen = false, screen }: { content: Content; rsvpSlug?: string; calendarHref?: string; fill?: boolean; startOpen?: boolean; screen?: CozyScreen }) {
  const [open, setOpen] = useState(startOpen || (!!screen && screen !== "cover"));
  // the editor's preview goes to the screen being edited
  useEffect(() => { if (screen) setOpen(screen !== "cover"); }, [screen]);
  const view = (
    <div className="gx-screen">
      {!open ? (
        <div className="gx-page"><GiftCover img={`${IMG}/gift.webp`} bell={`${IMG}/bell.webp`} onOpen={() => setOpen(true)} top={czText(content.texts as unknown as Record<string, string>, "czCoverTop")} title={czText(content.texts as unknown as Record<string, string>, "czCoverTitle")} hint={czText(content.texts as unknown as Record<string, string>, "czCoverHint")} /></div>
      ) : (
        <div className="gx-page gx-in">
          <GiftStreet text={cozyCityText(content)} calendarHref={calendarHref} page={screen && screen !== "cover" ? PAGE_OF[screen] : undefined} rsvp={{ slug: rsvpSlug, deadline: content.rsvp.deadline, maxParty: content.rsvp.maxParty, email: content.rsvp.email, labels: { food: content.texts.rsvpFoodLabel, message: content.texts.rsvpMessageLabel, privacy: content.texts.rsvpPrivacy } }} />
        </div>
      )}
    </div>
  );
  return fill ? <main className="gx-stage">{view}</main> : <div className="gx-embed">{view}</div>;
}
