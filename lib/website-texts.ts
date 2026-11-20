/** The words of the Peach Website (a website-type design). Every one of them can be changed in the editor; a field left empty shows the design's own wording below.
 *  Drafts saved before these fields existed hold the generic defaults of the other designs ("the wedding of", "you are invited", "Details", ...): those count as empty too. */
export const PW_DEFAULTS = {
  coverTop: "Please join us for the wedding of",
  coverBottom: "Click the envelope to open",
  cardTop: "Please join us for the wedding of",
  cardNote: "with joy in our hearts",
  dirText: "Get directions",
  rsvpKindly: "Kindly",
  rsvpWord: "RSVP",
  rsvpHere: "Here",
  detailsButton: "Details",
  bannerTitle: "Time to celebrate",
  bannerLink: "Click to return to the envelope",
  detailsTitle: "Wedding Details",
  timelineTitle: "The Timeline of the Big Day",
  detailsIntro: "",
  detailsAccommodation: "Accommodation",
  detailsAccommodationNote: "We kindly suggest you stay at the hotel below, where we have reserved rooms for our guests for the night, so you can celebrate in comfort and rest well after the big day.",
  detailsDressCode: "Dress code",
  detailsDressNote: "To make the day as beautiful as it feels, we kindly invite you to dress in the style below and to choose outfits in the colours shown, so we can all blend into one lovely picture.",
  detailsRegistry: "Registry",
  detailsRegistryNote: "Your presence is the loveliest gift we could wish for. If you would still like to give us something to remember the day by, we have gathered our wishes in the registries below. Simply scan a code with your phone. Thank you with all our hearts.",
  calendarText: "Add event to the calendar",
  goBackText: "Go back",
} as const;
export type PwKey = keyof typeof PW_DEFAULTS;

const LEGACY: Partial<Record<PwKey, string>> = { coverTop: "the wedding of", coverBottom: "you are invited", detailsTitle: "Details", timelineTitle: "Timeline", detailsAccommodation: "Accommodation", detailsDressCode: "Dress code", detailsRegistry: "Registry", calendarText: "Add to calendar" };

/** What the editor shows in the field: empty when the design's own wording is used. */
export function pwStored(texts: Record<string, string | undefined>, key: PwKey): string {
  const v = (texts[key] ?? "").trim();
  if (!v) return "";
  const l = LEGACY[key];
  return l && v.toLowerCase() === l.toLowerCase() ? "" : (texts[key] as string);
}
/** The wording the website shows. */
export function pwText(texts: Record<string, string | undefined>, key: PwKey): string {
  return pwStored(texts, key) || PW_DEFAULTS[key];
}
