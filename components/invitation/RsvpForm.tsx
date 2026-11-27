"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { submitRsvp } from "@/app/[slug]/actions";

type Attendance = "attending" | "declined" | "maybe";
const CHOICES: { id: Attendance; label: string }[] = [
  { id: "attending", label: "Joyfully accept" },
  { id: "declined", label: "Regretfully decline" },
  { id: "maybe", label: "Not sure yet" },
];

/** True once the reply-by day is over everywhere in the world. */
const isClosed = (deadline: string) => !!deadline && Date.now() > Date.parse(`${deadline}T12:00:00Z`) + 24 * 3600 * 1000;

/**
 * "Reply now" for the RSVP card: a bottom sheet with the guest's name, yes / no / maybe, how many are coming and an optional
 * note. In the editor's preview it looks the same but sends nothing. After the reply-by day it says replies are closed.
 */
/** The headings of the form: a party has a host, a wedding a couple; the owner can write their own in the editor (empty: these words). */
export type RsvpLabels = { food?: string; message?: string; privacy?: string };
export function RsvpForm({ slug, deadline, maxParty, contactEmail, hostSelector = ".inv", triggerClassName = "rsvp-open", trigger, party = false, labels }: { slug?: string; deadline: string; maxParty: number; contactEmail?: string; hostSelector?: string; triggerClassName?: string; trigger?: React.ReactNode; party?: boolean; labels?: RsvpLabels }) {
  const foodLabel = labels?.food || (party ? "Food allergy, if any" : "Food needs or allergies (optional)");
  const messageLabel = labels?.message || (party ? "A message to the host (optional)" : "A message for the couple (optional)");
  const privacy = labels?.privacy || (party ? "Only the host will see your reply." : "Only the couple will see your reply.");
  const btn = useRef<HTMLButtonElement>(null);
  const [host, setHost] = useState<Element | null>(null);
  const [open, setOpen] = useState(false);
  const [key] = useState(() => crypto.randomUUID());
  const [name, setName] = useState("");
  const [attendance, setAttendance] = useState<Attendance>("attending");
  const [count, setCount] = useState(1);
  const [dietary, setDietary] = useState("");
  const [message, setMessage] = useState("");
  const [trap, setTrap] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const closed = isClosed(deadline);

  // the sheet is drawn inside the invitation itself (it carries the fonts and colours)
  useEffect(() => { setHost(btn.current?.closest(hostSelector) ?? null); }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) { setError("This is a preview, so nothing is sent."); return; }
    setBusy(true); setError("");
    try {
      const r = await submitRsvp({ slug, key, name, attendance, count: attendance === "declined" ? 0 : count, dietary, message, website: trap });
      if (r.ok) setDone(r.message); else setError(r.message);
    } catch { setError("Sorry, something went wrong. Please try again."); }
    setBusy(false);
  };

  const sheet = open && host ? createPortal(
    <div className="rsvp-bg" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="rsvp-sheet" role="dialog" aria-modal="true" aria-label="Reply to the invitation">
        <button type="button" className="rsvp-x" onClick={() => setOpen(false)} aria-label="Close">×</button>
        {done ? (
          <div className="rsvp-done">
            <p className="rsvp-sheet-title">Thank you{name ? `, ${name.split(" ")[0]}` : ""}</p>
            <p>{done}</p>
            <button type="button" className="rsvp-send" onClick={() => setOpen(false)}>Close</button>
          </div>
        ) : closed ? (
          <div className="rsvp-done">
            <p className="rsvp-sheet-title">Replies are closed</p>
            <p>The reply date has passed. Please contact {party ? "the host" : "the couple"} directly{contactEmail ? <>: <a className="rsvp-mail" href={`mailto:${contactEmail}`}>{contactEmail}</a></> : ""}.</p>
          </div>
        ) : (
          <form onSubmit={send}>
            <p className="rsvp-sheet-title">Will you join us?</p>
            <label className="rsvp-field"><span>Your name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required autoComplete="name" />
            </label>
            <div className="rsvp-choices" role="radiogroup" aria-label="Your answer">
              {CHOICES.map((c) => (
                <button key={c.id} type="button" role="radio" aria-checked={attendance === c.id} className="rsvp-choice" onClick={() => setAttendance(c.id)}>{c.label}</button>
              ))}
            </div>
            {attendance !== "declined" && (
              <div className="rsvp-field"><span>How many of you are coming</span>
                <div className="rsvp-count">
                  <button type="button" aria-label="One fewer" onClick={() => setCount((n) => Math.max(1, n - 1))}>−</button>
                  <b aria-live="polite">{count}</b>
                  <button type="button" aria-label="One more" onClick={() => setCount((n) => Math.min(maxParty, n + 1))}>+</button>
                </div>
              </div>
            )}
            <label className="rsvp-field"><span>{foodLabel}</span>
              <input value={dietary} onChange={(e) => setDietary(e.target.value)} maxLength={300} />
            </label>
            <label className="rsvp-field"><span>{messageLabel}</span>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} rows={3} />
            </label>
            <input className="rsvp-trap" tabIndex={-1} autoComplete="off" aria-hidden="true" value={trap} onChange={(e) => setTrap(e.target.value)} />
            {error && <p className="rsvp-err" role="alert">{error}</p>}
            <button className="rsvp-send" disabled={busy}>{busy ? "Sending…" : "Send my reply"}</button>
            <p className="rsvp-fine">{privacy}</p>
          </form>
        )}
      </div>
    </div>,
    host,
  ) : null;

  return (
    <>
      <button ref={btn} type="button" className={triggerClassName} onClick={() => setOpen(true)}>{trigger ?? (closed ? "Replies closed" : "Reply now")}</button>
      {sheet}
    </>
  );
}
