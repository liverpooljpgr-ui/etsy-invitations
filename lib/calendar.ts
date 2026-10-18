import type { Content } from "@/lib/content/schema";

/** "2:00 PM", "2pm", "14:00", "14.30" → hours/minutes, or null when the free text is not a clock time. */
function parseTime(raw: string): { h: number; m: number } | null {
  const t = /^(\d{1,2})(?:[:.](\d{2}))?\s*([ap])?\.?m?\.?$/i.exec(raw.trim());
  if (!t) return null;
  let h = Number(t[1]);
  const m = t[2] ? Number(t[2]) : 0;
  const ap = t[3]?.toLowerCase();
  if (ap === "p" && h < 12) h += 12;
  if (ap === "a" && h === 12) h = 0;
  return h > 23 || m > 59 ? null : { h, m };
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const pad = (n: number) => String(n).padStart(2, "0");

/** A one-event iCalendar file (opens in Apple Calendar, Google Calendar, Outlook…). Times are "floating": local time at the guest's device. */
export function buildIcs(c: Content, uid: string, url: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(c.event.date);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const names = [c.couple.first, c.couple.second].filter(Boolean).join(" & ");
  const time = parseTime(c.event.time);

  let start: string;
  let end: string;
  if (time) {
    const s = new Date(Date.UTC(y, mo - 1, d, time.h, time.m));
    const e = new Date(s.getTime() + 4 * 3600e3); // typical length; guests can edit it
    const f = (x: Date) => `${x.getUTCFullYear()}${pad(x.getUTCMonth() + 1)}${pad(x.getUTCDate())}T${pad(x.getUTCHours())}${pad(x.getUTCMinutes())}00`;
    start = `DTSTART:${f(s)}`;
    end = `DTEND:${f(e)}`;
  } else {
    const next = new Date(Date.UTC(y, mo - 1, d + 1));
    start = `DTSTART;VALUE=DATE:${m[1]}${m[2]}${m[3]}`;
    end = `DTEND;VALUE=DATE:${next.getUTCFullYear()}${pad(next.getUTCMonth() + 1)}${pad(next.getUTCDate())}`;
  }

  const location = [c.event.venue, c.event.address].filter(Boolean).join(", ");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wedding invitation//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    start,
    end,
    `SUMMARY:${esc(names ? `Wedding of ${names}` : "Wedding")}`,
    ...(location ? [`LOCATION:${esc(location)}`] : []),
    `DESCRIPTION:${esc(`You are invited! ${url}`)}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    "DESCRIPTION:Wedding tomorrow",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}
