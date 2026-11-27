/** The words of the Cozy Blue City invitation, screen by screen. In the editor every field starts with the design's own wording;
 *  the owner can change it or delete it. A deleted line is listed in `czCleared` and is not shown (a button keeps the design's wording). */
export const CZ_DEFAULTS = {
  // the cover: the present
  czCoverTop: "You have received",
  czCoverTitle: "a Christmas invitation",
  czCoverHint: "Tap the present to open it",
  // the street, first screen: the invitation
  czIntro: "You are invited to a",
  czTitle: "Christmas Dinner",
  czHost: "", // its own wording: "<the hosts' name> would love you at their table"
  czTimeWord: "from",
  czWhere: "Where?",
  // the street, second screen: the place
  czPlaceIntro: "We have reserved a table at",
  czDirections: "Get directions",
  czDetailsButton: "Details",
  // the Christmas tree: the details
  czDetailsTitle: "Details",
  czComeButton: "Will you come?",
  // the sky: the reply
  czReplyTitle: "Please RSVP",
  czReplyByWord: "by",
  czClosing: "We look forward to a cozy evening with you!",
  czReplyButton: "Reply now",
  czCalendar: "Add to calendar",
  czDown: "Down to the street",
} as const;
export type CzKey = keyof typeof CZ_DEFAULTS;

/** The buttons take the guest from screen to screen: an empty one keeps the design's wording. */
const CZ_BUTTONS: ReadonlySet<CzKey> = new Set<CzKey>(["czWhere", "czDetailsButton", "czComeButton", "czReplyButton", "czDown"]);

/** The host line's own wording. */
export const czHostDefault = (name: string) => (name ? `${name.charAt(0).toUpperCase()}${name.slice(1)} would love you at their table` : "");

type Texts = Record<string, string | undefined>;
/** The lines the owner deleted. */
export const czCleared = (texts: Texts): Set<string> => new Set((texts.czCleared ?? "").split(",").map((x) => x.trim()).filter(Boolean));

/** What the invitation shows: the owner's words, nothing for a deleted line, or the design's own. */
export function czText(texts: Texts, key: CzKey, own?: string): string {
  if (!CZ_BUTTONS.has(key) && czCleared(texts).has(key)) return "";
  return (texts[key] ?? "").trim() || (own ?? CZ_DEFAULTS[key]);
}

/** What the editor's field holds: the owner's words, empty for a deleted line, or the design's own wording to start from. */
export function czField(texts: Texts, key: CzKey | string, own?: string): string {
  if (czCleared(texts).has(key)) return "";
  return texts[key] || (own ?? (CZ_DEFAULTS as Record<string, string>)[key] ?? "");
}

/** The texts after the owner typed `value` in a field: an emptied field is remembered as deleted. */
export function czSet(texts: Texts, key: CzKey | string, value: string): Texts {
  const cl = czCleared(texts);
  if (value.trim()) cl.delete(key); else cl.add(key);
  return { ...texts, [key]: value, czCleared: [...cl].join(",") };
}
