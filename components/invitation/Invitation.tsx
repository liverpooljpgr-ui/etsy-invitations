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

/** "please RSVP" → small script lead + big letter-spaced caps; a single word (e.g. "RSVP") is split over two lines (RS / VP). */
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
  const registry = c.registry.filter((r) => r.url);
  const hasDress = !!(c.dressCode.label || c.dressCode.colors.length > 0);
  const hasInfo = c.hotel.name || c.dressCode.label || c.dressCode.colors.length > 0 || registry.length > 0 || ph;
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

      {/* 4 — timeline: flowers along the bottom of the sheet; an ornament sits between the time stamps */}
      {(c.timeline.length > 0 || ph) && (
        <section className="card card-timeline" data-card="4">
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

      {/* 5 — details: accommodation, dress code, registry (the save-the-date sheet, flipped: flowers hang from the top) */}
      {hasInfo && (
        <section className="card card-details" data-card="5">
          <div className="dtl-in">
            <h2 className="script tl-title">{c.texts.detailsTitle || "details"}</h2>
            {(c.hotel.name || ph) && (
              <div className="blk dtl-blk">
                <p className="caps tiny">Accommodation</p>
                <div className="dtl-pair">
                  <p className="val sm">{c.hotel.name || "Hotel name"}</p>
                  {c.hotel.address && <p className="sub dtl-text">{c.hotel.address}</p>}
                </div>
              </div>
            )}
            {(hasDress || registry.length > 0) && (
              <div className="dtl-row">
                {hasDress && (
                  <div className="blk dtl-blk">
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
                  <div className="blk dtl-blk">
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
        </section>
      )}

      {/* 6 — RSVP: script lead + big letter-spaced caps, flowers along the bottom */}
      {hasRsvp && (
        <section className="card card-rsvp" data-card="6">
          <div className="rsvp-in">
            <RsvpTitle text={c.texts.rsvpTitle || "please RSVP"} />
            {(c.rsvp.deadline || ph) && <p className="rsvp-by">By {longDate(c.rsvp.deadline) || "date"}</p>}
            {c.rsvp.email && <a className="rsvp-mail" href={`mailto:${c.rsvp.email}`}>{c.rsvp.email}</a>}
            {c.rsvp.note && <p className="rsvp-note">{c.rsvp.note}</p>}
          </div>
        </section>
      )}

      {/* 7 — closing */}
      <section className="card card-closing" data-card="7">
        <div className="closing-in">
          <p className="closing-names">{first}<span className="amp">&amp;</span>{second}</p>
          <p className="closing-text">{c.texts.closing || "Our forever begins"}</p>
        </div>
      </section>
    </div>
  );
}
