"use client";

import { useState } from "react";

/** Day first (most of the world) or month first (USA). */
export type DateOrder = "dmy" | "mdy";

/** "YYYY-MM-DD" -> "DD/MM/YYYY" or "MM/DD/YYYY" ("" when empty or malformed). */
const display = (iso: string, order: DateOrder) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "";
  return order === "mdy" ? `${m[2]}/${m[3]}/${m[1]}` : `${m[3]}/${m[2]}/${m[1]}`;
};

/** Up to 8 digits -> "AA/BB/YYYY" with the slashes put in as you type. */
const mask = (digits: string, slash: boolean) => [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join("/") + (slash && (digits.length === 2 || digits.length === 4) ? "/" : "");

/** "YYYY-MM-DD" when the 8 digits are a real calendar date, otherwise "". */
function toIso(digits: string, order: DateOrder) {
  if (digits.length !== 8) return "";
  const a = Number(digits.slice(0, 2)), b = Number(digits.slice(2, 4)), y = Number(digits.slice(4));
  const d = order === "mdy" ? b : a, m = order === "mdy" ? a : b;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (y < 1000 || dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return "";
  return `${digits.slice(4)}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * One date field with a DD/MM/YYYY mask (MM/DD/YYYY for visitors from the USA, Canada and the Philippines): tapping it opens the numeric keyboard on
 * phones, the slashes appear by themselves, and the button beside it opens the browser's calendar. The value is an ISO
 * date, or "" while incomplete.
 */
export function DateInput({ value, onChange, order = "dmy" }: { value: string; onChange: (iso: string) => void; order?: DateOrder }) {
  const [text, setText] = useState(() => display(value, order));

  // the value changed from outside (the calendar, another version loaded): show it
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (value !== toIso(text.replace(/\D/g, ""), order)) setText(display(value, order));
  }

  const digits = text.replace(/\D/g, "");
  const bad = digits.length === 8 && !toIso(digits, order);

  const type = (raw: string) => {
    let d = raw.replace(/\D/g, "").slice(0, 8);
    // deleting a slash would otherwise bring it straight back: take the digit before it instead
    if (raw.length < text.length && d === digits) d = d.slice(0, -1);
    setText(mask(d, raw.length > text.length)); // the next slash is added while typing forward, not while deleting
    const iso = toIso(d, order);
    if (iso !== value) onChange(iso);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 48px", gap: 8, position: "relative" }}>
      <input className="ui-input" inputMode="numeric" autoComplete="off" placeholder={order === "mdy" ? "MM/DD/YYYY" : "DD/MM/YYYY"}
        aria-label={order === "mdy" ? "Date (month / day / year)" : "Date (day / month / year)"} aria-invalid={bad}
        onFocus={(e) => e.target.select()} value={text} onChange={(e) => type(e.target.value)} />
      {/* the browser's own calendar: a real date input laid invisibly over the icon, so the tap lands on it directly (phones refuse to open a picker from a hidden field) */}
      <div className="ui-btn ui-btn-gray" style={{ position: "relative", padding: 0, minHeight: 48, borderRadius: 12, overflow: "hidden" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ pointerEvents: "none" }}><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
        <input type="date" aria-label="Pick a date from the calendar" value={value}
          onClick={(e) => { try { e.currentTarget.showPicker(); } catch { /* the browser opens it by itself */ } }}
          onChange={(e) => { setText(display(e.target.value, order)); onChange(e.target.value); }}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", border: 0, padding: 0, margin: 0, fontSize: 16 }} />
      </div>
      {bad && <span className="ui-help" style={{ gridColumn: "1 / -1", color: "var(--ui-red)" }}>That date doesn’t exist. {order === "mdy" ? "Use month / day / year, for example 06/25/2027." : "Use day / month / year, for example 25/06/2027."}</span>}
    </div>
  );
}
