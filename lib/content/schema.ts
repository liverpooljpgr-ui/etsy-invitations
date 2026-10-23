import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => {
    try {
      return new URL(v).protocol === "https:";
    } catch {
      return false;
    }
  }, "Must be a link starting with https://");
const optUrl = z.union([z.literal(""), httpsUrl]);
const optDate = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")]);
const optEmail = z.union([z.literal(""), z.email().max(200)]);
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

// Photos may only come from our own public storage bucket. Compare parsed URLs, not raw strings:
// an env value with stray characters (e.g. a BOM added when it was pasted into Vercel) must not break uploads.
const SUPABASE_ORIGIN = (() => {
  try {
    return new URL((process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim()).origin;
  } catch {
    return "";
  }
})();
const PHOTO_PATH = "/storage/v1/object/public/invitation-media/";
const photoUrl = z
  .string()
  .max(500)
  .refine((v) => {
    try {
      const u = new URL(v);
      return !!SUPABASE_ORIGIN && u.origin === SUPABASE_ORIGIN && u.pathname.startsWith(PHOTO_PATH);
    } catch {
      return false;
    }
  }, "Photo must be uploaded through the editor");
// background music is either one of our own library songs (/music/...) or a file uploaded to our own storage bucket
const musicUrl = z.union([z.string().regex(/^\/music\/[a-z0-9-]+\.mp3$/), photoUrl]);

export const THEMES = ["sage", "ivory", "burgundy"] as const;

export const contentSchema = z.object({
  couple: z.object({ first: text(40), second: text(40) }),
  // New keys use .default() so drafts saved before they existed still parse.
  texts: z.object({
    invited: text(80),
    headline: text(60),
    celebration: text(80),
    receptionNote: text(80),
    timelineTitle: text(30).default("Timeline"),
    rsvpTitle: text(30).default("please RSVP"),
    closing: text(80).default(""),
    saveTheDate: text(40).default("Save the Date"),
    venueIntro: text(60).default("ceremony will take place"),
    detailsTitle: text(30).default("Details"),
    coverTop: text(40).default("the wedding of"),
    coverBottom: text(40).default("you are invited"),
  }),
  decor: z.enum(["butterfly", "none"]).default("butterfly"),
  event: z.object({ date: optDate, time: text(30), venue: text(120), address: text(300), mapUrl: optUrl }),
  photo: z.object({ url: photoUrl, alt: text(200), ar: z.number().min(0.1).max(10).optional(), cx: z.number().min(0).max(1).optional(), cy: z.number().min(0).max(1).optional(), zoom: z.number().min(1).max(4).optional() }).nullable(),
  /** screens (3–7) the host switched off: not shown to guests */
  hidden: z.array(z.number().int().min(3).max(7)).max(5).default([]),
  /** show the "Add to calendar" link on the closing screen */
  showCalendar: z.boolean().default(true),
  music: z.object({ url: musicUrl, name: text(80) }).nullable().default(null),
  timeline: z.array(z.object({ time: text(20), label: text(60) })).max(10),
  registry: z.array(z.object({ label: text(40), url: optUrl })).max(2),
  dressCode: z.object({ label: text(60), colors: z.array(hex).max(4) }),
  hotel: z.object({ name: text(100), address: text(200) }),
  parking: text(100).default(""),
  rsvp: z.object({ deadline: optDate, email: optEmail, note: text(160), online: z.boolean().default(true), maxParty: z.number().int().min(1).max(20).default(6) }),
  theme: z.enum(THEMES),
});

export type Content = z.infer<typeof contentSchema>;

export const defaultContent: Content = {
  couple: { first: "", second: "" },
  texts: {
    invited: "you are cordially invited to our wedding",
    headline: "We're getting married",
    celebration: "with joy in our hearts",
    receptionNote: "Reception to follow",
    timelineTitle: "Timeline",
    rsvpTitle: "please RSVP",
    closing: "",
    saveTheDate: "Save the Date",
    venueIntro: "ceremony will take place",
    detailsTitle: "Details",
    coverTop: "the wedding of",
    coverBottom: "you are invited",
  },
  decor: "butterfly",
  event: { date: "", time: "", venue: "", address: "", mapUrl: "" },
  photo: null,
  hidden: [],
  showCalendar: true,
  music: null,
  // four common moments of the day, without times: the couple adds the times (or removes what they do not need)
  timeline: [
    { time: "", label: "Getting ready" },
    { time: "", label: "Ceremony" },
    { time: "", label: "Cocktail hour" },
    { time: "", label: "Reception" },
  ],
  registry: [],
  dressCode: { label: "", colors: [] },
  hotel: { name: "", address: "" },
  parking: "",
  rsvp: { deadline: "", email: "", note: "Please include all guests name you are taking with you", online: true, maxParty: 6 },
  theme: "sage",
};

/** Parse stored JSON; fall back to defaults so a bad row can never crash a page. */
export function parseContent(raw: unknown): Content {
  const r = contentSchema.safeParse(raw);
  return r.success ? r.data : defaultContent;
}

export function publishMissing(c: Content): string[] {
  const m: string[] = [];
  if (!c.couple.first) m.push("First beloved's name");
  if (!c.couple.second) m.push("Second beloved's name");
  if (!c.event.date) m.push("Event date");
  if (!c.event.venue) m.push("Venue name");
  return m;
}

export type PlanFeatures = Record<string, boolean>;

/** Remove sections the purchased plan does not include. Applied in preview AND at publish. */
export function applyPlan(c: Content, f: PlanFeatures): Content {
  return {
    ...c,
    timeline: f.schedule ? c.timeline : [],
    registry: f.registry ? c.registry : [],
    dressCode: f.dress_code ? c.dressCode : { label: "", colors: [] },
  };
}
