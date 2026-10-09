import type { Content } from "@/lib/content/schema";
import { Qr } from "./Qr";

const MONTHS = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
const DAYS = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];

function parts(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const dt = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return { month: MONTHS[dt.getUTCMonth()], weekday: DAYS[dt.getUTCDay()], day: String(+m[3]), year: m[1], dt };
}

function longDate(iso: string) {
  const p = parts(iso);
  return p ? `${p.month[0]}${p.month.slice(1).toLowerCase()} ${p.day}, ${p.year}` : "";
}

/**
 * Static story-card rendering of the "sage-story" template.
 * mode="preview" shows placeholders for empty fields; "public" hides empty things.
 */
export function Invitation({ content: c, mode }: { content: Content; mode: "preview" | "public" }) {
  const ph = mode === "preview";
  const first = c.couple.first || (ph ? "First name" : "");
  const second = c.couple.second || (ph ? "Second name" : "");
  const d = parts(c.event.date);
  const initials = `${(first[0] ?? "").toUpperCase()}&${(second[0] ?? "").toUpperCase()}`;
  const registry = c.registry.filter((r) => r.url);
  const hasDetails = c.event.venue || registry.length || c.dressCode.label || c.dressCode.colors.length || c.hotel.name || ph;
  const hasRsvp = c.rsvp.deadline || c.rsvp.email || c.rsvp.note || ph;

  return (
    <div className="inv" data-theme={c.theme}>
      {/* 1 — envelope */}
      <section className="card card-dark" aria-label="Envelope">
        <svg className="env-lines" viewBox="0 0 100 160" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 0 L50 92 L100 0 M0 160 L50 92 L100 160" fill="none" stroke="currentColor" strokeWidth="0.4" />
        </svg>
        <div className="seal" aria-hidden="true"><span>{initials}</span></div>
      </section>

      {/* 2 — invited */}
      <section className="card">
        <div className="orn" aria-hidden="true">✦</div>
        <p className="small">{c.texts.invited || "You're cordially invited"}</p>
      </section>

      {/* 3 — names */}
      <section className="card">
        <div className="orn" aria-hidden="true">✦</div>
        <p className="caps">{c.texts.headline}</p>
        <h1 className="names">
          <span>{first}</span>
          <span className="amp">&amp;</span>
          <span>{second}</span>
        </h1>
      </section>

      {/* 4 — photo + date */}
      <section className="card">
        {c.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="arch" src={c.photo.url} alt={c.photo.alt || `${first} and ${second}`} />
        ) : ph ? (
          <div className="arch arch-empty">Photo</div>
        ) : null}
        <p className="caps tiny">{c.texts.celebration}</p>
        {d ? (
          <>
            <p className="caps month">{d.month}</p>
            <p className="datebar">
              <span>{d.weekday}</span>
              <b>{d.day}</b>
              <span>{c.event.time ? `AT ${c.event.time.toUpperCase()}` : d.year}</span>
            </p>
          </>
        ) : ph ? <p className="caps month">Date</p> : null}
        {c.texts.receptionNote && <p className="caps tiny">{c.texts.receptionNote}</p>}
      </section>

      {/* 5 — timeline */}
      {(c.timeline.length > 0 || ph) && (
        <section className="card">
          <h2 className="script">timeline</h2>
          {c.timeline.length === 0 && <p className="hint">Add schedule items in the editor</p>}
          <ul className="tl">
            {c.timeline.map((t, i) => (
              <li key={i}><span>{t.label}</span><b>{t.time}</b></li>
            ))}
          </ul>
        </section>
      )}

      {/* 6 — details */}
      {hasDetails && (
        <section className="card">
          <h2 className="title">The<br /><i>details</i></h2>
          {(c.event.venue || ph) && (
            <div className="blk">
              <p className="caps tiny">Venue</p>
              <p className="val">{c.event.venue || "Venue name"}</p>
              {c.event.address && <p className="sub">{c.event.address}</p>}
              {c.event.mapUrl && <a className="link" href={c.event.mapUrl} target="_blank" rel="noopener noreferrer">Get directions</a>}
            </div>
          )}
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
          {(c.dressCode.label || c.dressCode.colors.length > 0) && (
            <div className="blk">
              <p className="caps tiny">Dress code</p>
              <p className="dots">
                {c.dressCode.colors.map((col) => <i key={col} style={{ background: col }} />)}
              </p>
              {c.dressCode.label && <p className="val sm">{c.dressCode.label}</p>}
            </div>
          )}
          {c.hotel.name && (
            <div className="blk">
              <p className="caps tiny">Recommended hotel</p>
              <p className="val sm">{c.hotel.name}</p>
              {c.hotel.address && <p className="sub">{c.hotel.address}</p>}
            </div>
          )}
        </section>
      )}

      {/* 7 — RSVP */}
      {hasRsvp && (
        <section className="card">
          <h2 className="title">please<br />RSVP</h2>
          {(c.rsvp.deadline || ph) && <p className="val">By {longDate(c.rsvp.deadline) || "date"}</p>}
          {c.rsvp.email && <p className="sub"><a className="link" href={`mailto:${c.rsvp.email}`}>{c.rsvp.email}</a></p>}
          {c.rsvp.note && <p className="sub note">{c.rsvp.note}</p>}
        </section>
      )}

      {/* 8 — closing */}
      <section className="card card-dark">
        <div className="frame">
          <p className="script big">{first}<br /><span className="amp">&amp;</span><br />{second}</p>
        </div>
      </section>
    </div>
  );
}
