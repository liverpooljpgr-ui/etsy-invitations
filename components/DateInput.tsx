"use client";

import { useState } from "react";

/** "YYYY-MM-DD" -> "DD/MM/YYYY" ("" when empty or malformed). */
const display = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
};

/** Up to 8 digits -> "DD/MM/YYYY" with the slashes put in as you type. */
const mask = (digits: string, slash: boolean) => [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join("/") + (slash && (digits.length === 2 || digits.length === 4) ? "/" : "");

/** "YYYY-MM-DD" when the 8 digits are a real calendar date, otherwise "". */
function toIso(digits: string) {
  if (digits.length !== 8) return "";
  const d = Number(digits.slice(0, 2)), m = Number(digits.slice(2, 4)), y = Number(digits.slice(4));
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (y < 1000 || dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return "";
  return `${digits.slice(4)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
}

/**
 * One date field with a DD/MM/YYYY mask: tapping it opens the numeric keyboard on phones, the slashes appear by
 * themselves, and the button beside it opens the browser's calendar. The value is an ISO date, or "" while incomplete.
 */
export function DateInput({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const [text, setText] = useState(() => display(value));

  // the value changed from outside (the calendar, another version loaded): show it
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (value !== toIso(text.replace(/\D/g, ""))) setText(display(value));
  }

  const digits = text.replace(/\D/g, "");
  const bad = digits.length === 8 && !toIso(digits);

  const type = (raw: string) => {
    let d = raw.replace(/\D/g, "").slice(0, 8);
    // deleting a slash would otherwise bring it straight back: take the digit before it instead
    if (raw.length < text.length && d === digits) d = d.slice(0, -1);
    setText(mask(d, raw.length > text.length)); // the next slash is added while typing forward, not while deleting
    const iso = toIso(d);
    if (iso !== value) onChange(iso);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 48px", gap: 8, position: "relative" }}>
      <input className="ui-input" inputMode="numeric" autoComplete="off" placeholder="DD/MM/YYYY" aria-label="Date (day / month / year)" aria-invalid={bad}
        onFocus={(e) => e.target.select()} value={text} onChange={(e) => type(e.target.value)} />
      {/* the browser's own calendar: a real date input laid invisibly over the icon, so the tap lands on it directly (phones refuse to open a picker from a hidden field) */}
      <div className="ui-btn ui-btn-gray" style={{ position: "relative", padding: 0, minHeight: 48, borderRadius: 12, overflow: "hidden" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ pointerEvents: "none" }}><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
        <input type="date" aria-label="Pick a date from the calendar" value={value}
          onClick={(e) => { try { e.currentTarget.showPicker(); } catch { /* the browser opens it by itself */ } }}
          onChange={(e) => { setText(display(e.target.value)); onChange(e.target.value); }}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", border: 0, padding: 0, margin: 0, fontSize: 16 }} />
      </div>
      {bad && <span className="ui-help" style={{ gridColumn: "1 / -1", color: "var(--ui-red)" }}>That date doesn’t exist. Use day / month / year, for example 25/06/2027.</span>}
    </div>
  );
}
