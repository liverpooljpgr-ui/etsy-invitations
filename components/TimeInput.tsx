"use client";

import { useState } from "react";

type Period = "AM" | "PM";

/** Every half hour of the day, in the same "4:30 PM" style that is stored and shown on the invitation. */
const SLOTS: string[] = Array.from({ length: 48 }, (_, i) => {
  const h24 = Math.floor(i / 2), min = i % 2 ? "30" : "00";
  return `${h24 % 12 === 0 ? 12 : h24 % 12}:${min} ${h24 < 12 ? "AM" : "PM"}`;
});

/** "4:30 PM" (or just "4:30", shown as PM) -> its parts; anything else, such as older free text, is not a time. */
function parse(value: string): { text: string; ap: Period } | null {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(value.trim());
  return m ? { text: `${Number(m[1])}:${m[2]}`, ap: (m[3]?.toUpperCase() as Period | undefined) ?? "PM" } : null;
}

/** Typed digits -> "H:MM" (hours 1-12; a first minute digit above 5 is refused). */
function format(digits: string): string {
  if (!digits) return "";
  let h = digits[0], i = 1;
  if (h === "0") {
    if (digits.length === 1) return "0";
    h = digits[1]; i = 2;
    if (h === "0") return "";
  } else if (h === "1" && digits[1] && digits[1] <= "2") { h = `1${digits[1]}`; i = 2; }
  const m = digits.slice(i, i + 2);
  const colon = h.length === 2 || h > "1" || digits.length > i;
  const mins = m[0] && m[0] > "5" ? "" : m;
  return h + (colon ? ":" : "") + mins;
}

/** A complete, valid time as "H:MM AM/PM", otherwise "". */
function compose(text: string, ap: Period): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text);
  return m && Number(m[1]) >= 1 && Number(m[1]) <= 12 ? `${Number(m[1])}:${m[2]} ${ap}` : "";
}

/**
 * Time field: type digits (the colon appears by itself, "430" -> "4:30") and flip AM / PM, or tap the clock to pick a
 * time from a list in 30-minute steps. The value is text like "4:30 PM", or "" while incomplete.
 */
export function TimeInput({ value, onChange, label = "Time" }: { value: string; onChange: (time: string) => void; label?: string }) {
  const start = parse(value);
  const [text, setText] = useState(start?.text ?? value);
  const [ap, setAp] = useState<Period>(start?.ap ?? "PM");

  // the value changed from outside (another version loaded): show it
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (value !== compose(text, ap)) {
      const p = parse(value);
      setText(p?.text ?? value);
      if (p) setAp(p.ap);
    }
  }

  const emit = (t: string, a: Period) => { const iso = compose(t, a); if (iso !== value) onChange(iso); };
  const digitsOf = (s: string) => s.replace(/\D/g, "");

  const type = (raw: string) => {
    let d = digitsOf(raw).slice(0, 4);
    const prev = digitsOf(text);
    if (raw.length < text.length && d === prev) d = d.slice(0, -1); // deleting the colon takes the digit before it
    const next = format(d);
    let a = ap;
    if (/p/i.test(raw)) a = "PM"; else if (/a/i.test(raw)) a = "AM"; // "p" / "a" also work
    setText(next); setAp(a); emit(next, a);
  };
  const flip = () => { const a: Period = ap === "AM" ? "PM" : "AM"; setAp(a); emit(text, a); };
  const pick = (slot: string) => { const p = parse(slot)!; setText(p.text); setAp(p.ap); emit(p.text, p.ap); };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 64px 48px", gap: 8 }}>
      <input className="ui-input" inputMode="numeric" autoComplete="off" placeholder="4:30" aria-label={label} onFocus={(e) => e.target.select()} value={text} onChange={(e) => type(e.target.value)} />
      <button type="button" className="ui-btn ui-btn-gray" style={{ padding: 0, minHeight: 48, borderRadius: 12 }} aria-label={`${ap}, tap to switch`} onClick={flip}>{ap}</button>
      {/* the browser's own list, laid invisibly over the clock so the tap opens it directly */}
      <div className="ui-btn ui-btn-gray" style={{ position: "relative", padding: 0, minHeight: 48, borderRadius: 12, overflow: "hidden" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ pointerEvents: "none" }}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
        <select aria-label="Pick a time" value={SLOTS.includes(value) ? value : ""} onChange={(e) => e.target.value && pick(e.target.value)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", border: 0, fontSize: 16 }}>
          <option value="" disabled>Pick a time</option>
          {SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    </div>
  );
}
