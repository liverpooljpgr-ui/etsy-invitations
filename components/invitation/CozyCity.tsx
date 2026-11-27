"use client";

import type { Content } from "@/lib/content/schema";
import { GiftCover } from "./GiftCover";
import { GiftStreet, type StreetText } from "./GiftStreet";
import { useState } from "react";

const IMG = "/templates/christmas-gift/v1";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dayParts = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const dt = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return { weekday: DAYS[dt.getUTCDay()], day: +m[3], month: MONTHS[dt.getUTCMonth()] };
};

/** The words of the street pages, taken from the invitation's content (the same fields as the Christmas party design). */
export function cozyCityText(c: Content): StreetText {
  const d = dayParts(c.event.date), by = dayParts(c.rsvp.deadline);
  const title = [c.texts.coverTop, c.texts.headline].filter(Boolean).join(" ").trim();
  const details = [
    { label: c.texts.detailsExtraTitle, text: c.texts.detailsExtraText },
    { label: c.texts.detailsDressCode || "Dress code", text: c.dressCode.note || c.dressCode.label },
    { label: c.texts.detailsExtra2Title, text: c.texts.detailsExtra2Text },
  ].filter((x) => x.label && x.text);
  return {
    intro: c.texts.coverIntro || "You are invited to a",
    title: title || "Christmas Dinner",
    // warm, friendly wording (after the Christmas invitation guides of Paperlust, Renty and Paper Divas): the hosts would love you at their table
    host: c.couple.first ? `${c.couple.first.charAt(0).toUpperCase()}${c.couple.first.slice(1)} would love you at their table` : "",
    when: d ? `${d.weekday} · ${d.month} ${d.day}` : "Date", // the month first, then the day
    time: c.event.time ? `from ${c.event.time}` : undefined,
    where: "Where?",
    placeIntro: c.texts.venueIntro && c.texts.venueIntro !== "ceremony will take place" ? c.texts.venueIntro : "", // e.g. "We have reserved a table at"
    place: c.event.venue || "",
    address: (c.event.address || "").split("\n").filter(Boolean).join(", ") || "Address",
    mapUrl: c.event.mapUrl || undefined,
    next: "Details",
    detailsTitle: c.texts.detailsTitle || "Details",
    details,
    detailsNext: "Will you come?",
    replyTitle: "Please RSVP",
    replyBy: by ? `by ${by.month} ${by.day}` : "",
    reply: "Reply now",
    calendar: "Add to calendar",
    closing: c.texts.closingNote && !/come hungry/i.test(c.texts.closingNote) ? c.texts.closingNote : "We look forward to a cozy evening with you!",
  };
}

/**
 * The Cozy Blue City invitation: the present on the cover (tap it: it shakes, rings, whirls and opens), then the snowy street,
 * the Christmas tree with the details and the sky with the reply. `fill` makes it the whole page (a guest's link);
 * without it, it fills the box it is put in (the editor's preview).
 */
export function CozyCity({ content, rsvpSlug, calendarHref, fill = true, startOpen = false }: { content: Content; rsvpSlug?: string; calendarHref?: string; fill?: boolean; startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const screen = (
    <div className="gx-screen">
      {!open ? (
        <div className="gx-page"><GiftCover img={`${IMG}/gift.webp`} bell={`${IMG}/bell.webp`} onOpen={() => setOpen(true)} /></div>
      ) : (
        <div className="gx-page gx-in">
          <GiftStreet text={cozyCityText(content)} calendarHref={calendarHref} rsvp={{ slug: rsvpSlug, deadline: content.rsvp.deadline, maxParty: content.rsvp.maxParty, email: content.rsvp.email, labels: { food: content.texts.rsvpFoodLabel, message: content.texts.rsvpMessageLabel, privacy: content.texts.rsvpPrivacy } }} />
        </div>
      )}
    </div>
  );
  return fill ? <main className="gx-stage">{screen}</main> : <div className="gx-embed">{screen}</div>;
}
