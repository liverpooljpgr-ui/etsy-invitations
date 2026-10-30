import { DEFAULT_TEMPLATE, PHOTO_FRAME, type TemplateSlug } from "@/lib/templates";
import { RsvpForm } from "./RsvpForm";
import { photoImgStyle } from "@/lib/photo-crop";
import type { Content } from "@/lib/content/schema";
import { CoverInner } from "./Cover";
import { Qr } from "./Qr";

const MONTHS = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
const DAYS = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];

function parts(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const dt = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return { month: MONTHS[dt.getUTCMonth()], weekday: DAYS[dt.getUTCDay()], day: String(+m[3]), year: m[1], dt };
}

/** Month / WEEKDAY | day | AT time / year — the format of the reference design. */
function DateBlock({ d, time }: { d: NonNullable<ReturnType<typeof parts>>; time: string }) {
  return (
    <div className="dt">
      <span className="dt-month">{d.month}</span>
      <span className="dt-row">
        <span>{d.weekday}</span>
        <b>{d.day}</b>
        {time && <span>{time.toUpperCase()}</span>}
      </span>
      <span className="dt-year">{d.year}</span>
    </div>
  );
}

function longDate(iso: string) {
  const p = parts(iso);
  return p ? `${p.month[0]}${p.month.slice(1).toLowerCase()} ${p.day}, ${p.year}` : "";
}

/** "please RSVP" → small script lead + big letter-spaced caps; a single word (e.g. "RSVP") is split over two lines (RS / VP). */
const SMALL = new Set(["a", "an", "the", "of", "and", "or", "in", "on", "at", "to", "for"]);
/** Title Case for the card headings: "save the date" -> "Save the Date" (small words stay lower case, except the first). */
function titleCase(text: string) {
  return text.replace(/\S+/g, (w, i: number) => (i > 0 && SMALL.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)));
}

function RsvpTitle({ text }: { text: string }) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lead = words.length >= 2 ? words[0] : "please";
  const bigText = (words.length >= 2 ? words.slice(1).join(" ") : words[0] || "").toUpperCase();
  const half = Math.ceil(bigText.length / 2);
  const big = !bigText.includes(" ") && bigText.length >= 4 ? [bigText.slice(0, half), bigText.slice(half)] : [bigText];
  return (
    <h2 className="rsvp-title" aria-label={text}>
      {lead && <span className="rsvp-lead" aria-hidden="true">{lead}</span>}
      {big.map((b, i) => <span className="rsvp-big" key={i} aria-hidden="true">{b}</span>)}
    </h2>
  );
}

/** The chevron's job: scroll to the screen that follows the one the button is on. */
function goNext(e: React.MouseEvent<HTMLElement>) {
  const card = e.currentTarget.closest(".card");
  const holder = card?.closest(".stage") ?? card; // screen 2 sits inside the envelope stage
  let next = holder?.nextElementSibling ?? null;
  while (next && !next.matches(".card, .stage")) next = next.nextElementSibling;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  next?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

/**
 * Static story-card rendering of the "sage-story" template.
 * mode="preview" shows placeholders for empty fields; "public" hides empty things.
 */
export function Invitation({
  content: c,
  mode,
  phase,
  envelope,
  calendarHref,
  rsvpSlug,
  template,
}: {
  content: Content;
  mode: "preview" | "public";
  /** Set by the animated experience; omitted for the plain static rendering. */
  phase?: "closed" | "opening" | "open";
  /** Animated envelope overlay. When given it replaces static card 1 and sits over card 2. */
  envelope?: React.ReactNode;
  /** Published page only: link that downloads the event as a calendar file (.ics). */
  calendarHref?: string;
  /** Public invitations only: the address replies are sent to. Without it the reply form is a preview that sends nothing. */
  rsvpSlug?: string;
  /** Which design to paint (the invitation's template). */
  template?: TemplateSlug;
}) {
  const ph = mode === "preview";
  const first = c.couple.first || (ph ? "Beloved" : "");
  const second = c.couple.second || (ph ? "Beloved" : "");
  const d = parts(c.event.date);
  const registry = c.registry.filter((r) => r.url);
  const hasDress = !!(c.dressCode.label || c.dressCode.colors.length > 0);
  const hasInfo = c.hotel.name || c.dressCode.label || c.dressCode.colors.length > 0 || registry.length > 0 || ph;
  const hasRsvp = c.rsvp.deadline || c.rsvp.email || c.rsvp.note || c.rsvp.online || ph;
  const off = (n: number) => c.hidden.includes(n); // screens the host switched off
  const shown: Record<number, boolean> = {
    3: !off(3) && !!(c.event.venue || ph),
    4: !off(4) && (c.timeline.length > 0 || ph),
    5: !off(5) && !!hasInfo,
    6: !off(6) && !!hasRsvp,
    7: !off(7),
  };
  /** Down-chevron at the bottom of a screen, only when another screen follows. */
  const hint = (n: number) =>
    phase && [3, 4, 5, 6, 7].some((m) => m > n && shown[m]) ? (
      <button type="button" className="swipe-hint" aria-label="Next screen" onClick={goNext}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 9l7 7 7-7" /></svg>
      </button>
    ) : null;

  return (
    <div className="inv" data-theme={c.theme} data-template={template ?? DEFAULT_TEMPLATE} data-phase={phase}>
      {/* 1 — cover (static view; the animated experience puts the same cover, tappable, over card 2) */}
      {!phase && (
        <section className="card cover cover-static" data-card="1" aria-label="Cover">
          <CoverInner content={c} mode={mode} template={template} />
        </section>
      )}

      {/* 2 — invited (the envelope overlay sits on top of this card until opened) */}
      <div className="stage">
        <section className="card card-sheet" data-card="2" tabIndex={-1}>
          <div className={c.photo || ph ? "sheet-in" : "sheet-in no-photo"}>
            {c.photo ? (
              <div className="arch" role="img" aria-label={c.photo.alt || `${first} and ${second}`}>
                <span className="arch-in">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.photo.url} alt="" draggable={false} style={photoImgStyle(c.photo, PHOTO_FRAME[template ?? DEFAULT_TEMPLATE])} />
                </span>
              </div>
            ) : ph ? (
              <div className="arch arch-empty">Photo</div>
            ) : null}
            {(d || ph) && c.texts.saveTheDate && <p className="save">{titleCase(c.texts.saveTheDate)}</p>}
            {d ? (
              <DateBlock d={d} time={c.event.time} />
            ) : ph ? (
              <div className="dt"><span className="dt-month">Date</span></div>
            ) : null}
          </div>
          {hint(2)}
        </section>
        {envelope}
      </div>

      {/* 3 — venue: name, full address, directions link, "reception to follow" */}
      {!off(3) && (c.event.venue || ph) && (
        <section className="card card-venue" data-card="3">
          <div className="venue-in">
            {c.texts.venueIntro && <p className="venue-intro">{c.texts.venueIntro}</p>}
            <p className="venue-name">{c.event.venue || "Venue name"}</p>
            <span className="venue-rule" aria-hidden="true" />
            {(c.event.address || ph) && <p className="venue-addr">{c.event.address || "Street address, city"}</p>}
            {c.event.mapUrl && <a className="link venue-link" href={c.event.mapUrl} target="_blank" rel="noopener noreferrer">Get directions</a>}
            {c.texts.receptionNote && <p className="venue-recep">{c.texts.receptionNote}</p>}
          </div>
          {hint(3)}
        </section>
      )}

      {/* 4 — timeline: flowers along the bottom of the sheet; an ornament sits between the time stamps */}
      {!off(4) && (c.timeline.length > 0 || ph) && (
        <section className="card card-timeline" data-card="4">
          <div className="tl-in">
            <h2 className="script tl-title">{titleCase(c.texts.timelineTitle || "Timeline")}</h2>
            {c.timeline.length === 0 && <p className="hint">Add schedule items in the editor</p>}
            <ul className={c.timeline.length > 5 ? "tl tl-dense" : "tl"}>
              {c.timeline.map((it, i) => (
                <li key={i} className={it.time ? undefined : "no-time"}><span>{it.label}</span>{it.time && <b>{it.time}</b>}</li>
              ))}
            </ul>
          </div>
          {hint(4)}
        </section>
      )}

      {/* 5 — details: accommodation, dress code, registry (the save-the-date sheet, flipped: flowers hang from the top) */}
      {!off(5) && hasInfo && (
        <section className="card card-details" data-card="5">
          <div className="dtl-in">
            <h2 className="script tl-title">{titleCase(c.texts.detailsTitle || "Details")}</h2>
            {(registry.length > 0 || hasDress || c.hotel.name || ph) && (
              <div className="dtl-row">
                {(c.hotel.name || ph) && (
                  <div className="blk dtl-blk dtl-acc">
                    <p className="caps tiny">Accommodation</p>
                    <div className="dtl-pair">
                      <p className="val sm">{c.hotel.name || "Hotel name"}</p>
                      {c.hotel.address && <p className="sub dtl-text">{c.hotel.address}</p>}
                    </div>
                  </div>
                )}
                {hasDress && (
                  <div className="blk dtl-blk dtl-dresscode">
                    <p className="caps tiny">Dress code</p>
                    <div className="dtl-dress">
                      <p className="dots">
                        {c.dressCode.colors.map((col) => <i key={col} style={{ background: col }} />)}
                      </p>
                      {c.dressCode.label && <p className="val sm">{c.dressCode.label}</p>}
                    </div>
                  </div>
                )}
                {registry.length > 0 && (
                  <div className="blk dtl-blk dtl-reg">
                    <p className="caps tiny">Registry</p>
                    <div className="qrs">
                      {registry.map((r, i) => (
                        <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="qrbox">
                          <Qr value={r.url} label={`QR code for ${r.label || "registry"}`} />
                          <span>{r.label || "Registry"}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          {hint(5)}
        </section>
      )}

      {/* 6 — RSVP: script lead + big letter-spaced caps, flowers along the bottom */}
      {!off(6) && hasRsvp && (
        <section className="card card-rsvp" data-card="6">
          <div className="rsvp-in">
            <RsvpTitle text="Please RSVP" />
            {(c.rsvp.deadline || ph) && <p className="rsvp-by">By {longDate(c.rsvp.deadline) || "date"}</p>}
            {c.rsvp.email && <a className="rsvp-mail" href={`mailto:${c.rsvp.email}`}>{c.rsvp.email}</a>}
            {c.rsvp.note && <p className="rsvp-note">{c.rsvp.note}</p>}
            {c.rsvp.online && <RsvpForm slug={rsvpSlug} deadline={c.rsvp.deadline} maxParty={c.rsvp.maxParty} />}
          </div>
          {hint(6)}
        </section>
      )}

      {/* 7 — closing */}
      {!off(7) && (
        <section className="card card-closing" data-card="7">
          <div className="closing-in">
            <p className="closing-names">{first}<span className="amp">&amp;</span>{second}</p>
            <p className="closing-text">{c.texts.closing || "Thank you for your time."}</p>
            {calendarHref && d && c.showCalendar && <a className="link venue-link closing-cal" href={calendarHref}>Add to calendar</a>}
          </div>
        </section>
      )}
    </div>
  );
}
