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

// Photos may only come from our own public storage bucket.
const PHOTO_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/invitation-media/`;

export const THEMES = ["sage", "ivory", "burgundy"] as const;

export const contentSchema = z.object({
  couple: z.object({ first: text(40), second: text(40) }),
  // New keys use .default() so drafts saved before they existed still parse.
  texts: z.object({
    invited: text(60),
    headline: text(60),
    celebration: text(80),
    receptionNote: text(80),
    timelineTitle: text(30).default("timeline"),
    rsvpTitle: text(30).default("please RSVP"),
    closing: text(60).default(""),
  }),
  seal: z.object({ text: text(4) }).default({ text: "" }),
  decor: z.enum(["butterfly", "none"]).default("butterfly"),
  event: z.object({ date: optDate, time: text(30), venue: text(120), address: text(200), mapUrl: optUrl }),
  photo: z.object({ url: z.string().startsWith(PHOTO_PREFIX).max(500), alt: text(200) }).nullable(),
  timeline: z.array(z.object({ time: text(20), label: text(60) })).max(10),
  registry: z.array(z.object({ label: text(40), url: optUrl })).max(2),
  dressCode: z.object({ label: text(60), colors: z.array(hex).max(4) }),
  hotel: z.object({ name: text(100), address: text(200) }),
  rsvp: z.object({ deadline: optDate, email: optEmail, note: text(160) }),
  theme: z.enum(THEMES),
});

export type Content = z.infer<typeof contentSchema>;

export const defaultContent: Content = {
  couple: { first: "", second: "" },
  texts: {
    invited: "You're cordially invited",
    headline: "We're getting married",
    celebration: "In celebration of our wedding",
    receptionNote: "Reception to follow",
    timelineTitle: "timeline",
    rsvpTitle: "please RSVP",
    closing: "",
  },
  seal: { text: "" },
  decor: "butterfly",
  event: { date: "", time: "", venue: "", address: "", mapUrl: "" },
  photo: null,
  timeline: [],
  registry: [],
  dressCode: { label: "", colors: [] },
  hotel: { name: "", address: "" },
  rsvp: { deadline: "", email: "", note: "" },
  theme: "sage",
};

/** Parse stored JSON; fall back to defaults so a bad row can never crash a page. */
export function parseContent(raw: unknown): Content {
  const r = contentSchema.safeParse(raw);
  return r.success ? r.data : defaultContent;
}

export function publishMissing(c: Content): string[] {
  const m: string[] = [];
  if (!c.couple.first) m.push("First name");
  if (!c.couple.second) m.push("Second name");
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
