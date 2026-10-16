import type { Content } from "@/lib/content/schema";
import { CoverInner } from "./Cover";
import { Qr } from "./Qr";

const WINGS = (
  <>
    <path d="M50 40 C32 4 4 8 8 32 C10 50 30 52 50 42 Z" />
    <path d="M50 43 C34 48 18 68 30 74 C42 78 50 58 50 45 Z" />
  </>
);

function Butterfly() {
  return (
    <svg className="butterfly" viewBox="0 0 100 80" aria-hidden="true">
      <g fill="var(--wing)" stroke="var(--gold)" strokeWidth="0.8" strokeLinejoin="round">{WINGS}</g>
      <g fill="var(--wing)" stroke="var(--gold)" strokeWidth="0.8" strokeLinejoin="round" transform="translate(100 0) scale(-1 1)">{WINGS}</g>
      <path d="M50 30 V58 M50 31 C46 22 42 20 40 19 M50 31 C54 22 58 20 60 19" fill="none" stroke="var(--gold)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

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
        {time && <span>AT {time.toUpperCase()}</span>}
      </span>
      <span className="dt-year">{d.year}</span>
    </div>
  );
}

function longDate(iso: string) {
  const p = parts(iso);
  return p ? `${p.month[0]}${p.month.slice(1).toLowerCase()} ${p.day}, ${p.year}` : "";
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
}: {
  content: Content;
  mode: "preview" | "public";
  /** Set by the animated experience; omitted for the plain static rendering. */
  phase?: "closed" | "opening" | "open";
  /** Animated envelope overlay. When given it replaces static card 1 and sits over card 2. */
  envelope?: React.ReactNode;
}) {
  const ph = mode === "preview";
  const first = c.couple.first || (ph ? "First name" : "");
  const second = c.couple.second || (ph ? "Second name" : "");
  const d = parts(c.event.date);
  const butterfly = c.decor === "butterfly";
  const registry = c.registry.filter((r) => r.url);
  const hasInfo = c.parking || c.hotel.name || c.dressCode.label || c.dressCode.colors.length > 0 || ph;
  const hasRegistry = registry.length > 0 || ph;
  const hasRsvp = c.rsvp.deadline || c.rsvp.email || c.rsvp.note || ph;

  return (
    <div className="inv" data-theme={c.theme} data-phase={phase}>
      {/* 1 — cover (static view; the animated experience puts the same cover, tappable, over card 2) */}
      {!phase && (
        <section className="card cover cover-static" data-card="1" aria-label="Cover">
          <CoverInner content={c} mode={mode} />
        </section>
      )}

      {/* 2 — invited (the envelope overlay sits on top of this card until opened) */}
      <div className="stage">
        <section className="card card-sheet" data-card="2" tabIndex={-1}>
          <div className={c.photo || ph ? "sheet-in" : "sheet-in no-photo"}>
            {c.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="arch" src={c.photo.url} alt={c.photo.alt || `${first} and ${second}`} />
            ) : ph ? (
              <div className="arch arch-empty">Photo</div>
            ) : null}
            {(d || ph) && c.texts.saveTheDate && <p className="save">{c.texts.saveTheDate}</p>}
            {d ? (
              <DateBlock d={d} time={c.event.time} />
            ) : ph ? (
              <div className="dt"><span className="dt-month">Date</span></div>
            ) : null}
          </div>
        </section>
        {envelope}
      </div>

      {/* 3 — venue: name, full address, directions link, "reception to follow" */}
      {(c.event.venue || ph) && (
        <section className="card card-venue" data-card="3">
          <div className="venue-in">
            {c.texts.venueIntro && <p className="venue-intro">{c.texts.venueIntro}</p>}
            <p className="venue-name">{c.event.venue || "Venue name"}</p>
            <span className="venue-rule" aria-hidden="true" />
            {(c.event.address || ph) && <p className="venue-addr">{c.event.address || "Street address, city"}</p>}
            {c.event.mapUrl && <a className="link venue-link" href={c.event.mapUrl} target="_blank" rel="noopener noreferrer">Get directions</a>}
            {c.texts.receptionNote && <p className="venue-recep">{c.texts.receptionNote}</p>}
          </div>
        </section>
      )}

      {/* 4 — details: parking, accommodation, dress code (the save-the-date sheet, flipped: flowers hang from the top) */}
      {hasInfo && (
        <section className="card card-details" data-card="4">
          <div className="dtl-in">
            <h2 className="script tl-title">{c.texts.detailsTitle || "details"}</h2>
            {(c.parking || ph) && (
              <div className="blk dtl-blk">
                <p className="caps tiny">Parking</p>
                <p className="sub dtl-text">{c.parking || "Where guests can park"}</p>
              </div>
            )}
            {(c.hotel.name || ph) && (
              <div className="blk dtl-blk">
                <p className="caps tiny">Accommodation</p>
                <p className="val sm">{c.hotel.name || "Hotel name"}</p>
                {c.hotel.address && <p className="sub dtl-text">{c.hotel.address}</p>}
              </div>
            )}
            {(c.dressCode.label || c.dressCode.colors.length > 0) && (
              <div className="blk dtl-blk">
                <p className="caps tiny">Dress code</p>
                <p className="dots">
                  {c.dressCode.colors.map((col) => <i key={col} style={{ background: col }} />)}
                </p>
                {c.dressCode.label && <p className="val sm">{c.dressCode.label}</p>}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 5 — timeline: flowers along the bottom of the sheet; an ornament sits between the time stamps */}
      {(c.timeline.length > 0 || ph) && (
        <section className="card card-timeline" data-card="5">
          <div className="tl-in">
            <h2 className="script tl-title">{c.texts.timelineTitle || "timeline"}</h2>
            {c.timeline.length === 0 && <p className="hint">Add schedule items in the editor</p>}
            <ul className={c.timeline.length > 5 ? "tl tl-dense" : "tl"}>
              {c.timeline.map((it, i) => (
                <li key={i}><span>{it.label}</span><b>{it.time}</b></li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* 6 — names */}
      <section className="card" data-card="6">
        {butterfly ? <Butterfly /> : <div className="orn" aria-hidden="true">✦</div>}
        <p className="caps">{c.texts.headline}</p>
        <h1 className="names">
          <span>{first}</span>
          <span className="amp">&amp;</span>
          <span>{second}</span>
        </h1>
      </section>

      {/* 7 — invitation text */}
      <section className="card" data-card="7">
        {c.texts.celebration && <p className="caps tiny">{c.texts.celebration}</p>}
        <p className="small">{c.texts.invited || "you are cordially invited to our wedding"}</p>
      </section>

      {/* 8 — registry (QR codes) */}
      {hasRegistry && (
        <section className="card" data-card="8">
          <h2 className="title">The<br /><i>registry</i></h2>
          {registry.length > 0 && (
            <div className="blk">
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
          {registry.length === 0 && <p className="hint">Add registry links in the editor</p>}
        </section>
      )}

      {/* 9 — RSVP */}
      {hasRsvp && (
        <section className="card" data-card="9">
          <h2 className="title">{c.texts.rsvpTitle || "please RSVP"}</h2>
          {(c.rsvp.deadline || ph) && <p className="val">By {longDate(c.rsvp.deadline) || "date"}</p>}
          {c.rsvp.email && <p className="sub"><a className="link" href={`mailto:${c.rsvp.email}`}>{c.rsvp.email}</a></p>}
          {c.rsvp.note && <p className="sub note">{c.rsvp.note}</p>}
        </section>
      )}

      {/* 10 — closing */}
      <section className="card card-dark" data-card="10">
        <div className="frame">
          {c.texts.closing
            ? <p className="script big">{c.texts.closing}</p>
            : <p className="script big">{first}<br /><span className="amp">&amp;</span><br />{second}</p>}
        </div>
      </section>
    </div>
  );
}
