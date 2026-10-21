"use client";

import { useRef, useState } from "react";

const parts = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? { d: String(Number(m[3])), m: String(Number(m[2])), y: m[1] } : { d: "", m: "", y: "" };
};

/** "YYYY-MM-DD" when day / month / year make a real calendar date, otherwise "". */
function compose(d: string, m: string, y: string) {
  if (y.length !== 4 || !d || !m) return "";
  const dn = Number(d), mn = Number(m), yn = Number(y);
  const dt = new Date(Date.UTC(yn, mn - 1, dn));
  if (dt.getUTCFullYear() !== yn || dt.getUTCMonth() !== mn - 1 || dt.getUTCDate() !== dn) return "";
  return `${y}-${String(mn).padStart(2, "0")}-${String(dn).padStart(2, "0")}`;
}

/**
 * Date as three number fields (day, month, year). Unlike <input type="date"> this opens the numeric keyboard on phones,
 * and it can't be misread (no DD/MM vs MM/DD guessing). The value is an ISO date, or "" while it is incomplete.
 */
export function DateInput({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const [p, setP] = useState(() => parts(value));
  const mRef = useRef<HTMLInputElement>(null);
  const yRef = useRef<HTMLInputElement>(null);

  // the value changed from outside (another version loaded): show it
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (value !== compose(p.d, p.m, p.y)) setP(parts(value));
  }

  const update = (next: { d: string; m: string; y: string }) => {
    setP(next);
    const iso = compose(next.d, next.m, next.y);
    if (iso !== value) onChange(iso);
  };
  const digits = (v: string, max: number) => v.replace(/\D/g, "").slice(0, max);
  const bad = !!(p.d || p.m || p.y) && p.y.length === 4 && !compose(p.d, p.m, p.y);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: 8 }}>
      <input className="ui-input" inputMode="numeric" autoComplete="off" onFocus={(e) => e.target.select()} placeholder="Day" aria-label="Day" aria-invalid={bad} value={p.d}
        onChange={(e) => { const d = digits(e.target.value, 2); update({ ...p, d }); if (d.length === 2) mRef.current?.focus(); }} style={{ textAlign: "center" }} />
      <input ref={mRef} className="ui-input" inputMode="numeric" autoComplete="off" onFocus={(e) => e.target.select()} placeholder="Month" aria-label="Month" aria-invalid={bad} value={p.m}
        onChange={(e) => { const m = digits(e.target.value, 2); update({ ...p, m }); if (m.length === 2) yRef.current?.focus(); }} style={{ textAlign: "center" }} />
      <input ref={yRef} className="ui-input" inputMode="numeric" autoComplete="off" onFocus={(e) => e.target.select()} placeholder="Year" aria-label="Year" aria-invalid={bad} value={p.y}
        onChange={(e) => update({ ...p, y: digits(e.target.value, 4) })} style={{ textAlign: "center" }} />
    </div>
  );
}
