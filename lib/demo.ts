import { defaultContent, type Content } from "@/lib/content/schema";
import { isPartyTemplate } from "@/lib/templates";

/** The address of a demo is the name of the design as customers know it ("Pure Jasmin" is /demo/pure-jasmin), not its internal name (which stays "white-roses", because guest links and files use it). The old addresses go to the new ones. */
const DEMO_ADDRESS: Record<string, string> = {
  "sage-story": "wild-flowers",
  "white-roses": "pure-jasmin",
  "mono-script": "ivory-roses",
  "cupid-script": "cupid-trumpets",
  "lilac-script": "lilac-blossom",
  "sage-forest": "sage-garden",
  "christmas-velvet": "purple-vintage-christmas",
  "burgundy-olive-website": "burgundy-peach-website",
};
const DEMO_DESIGN: Record<string, string> = Object.fromEntries(Object.entries(DEMO_ADDRESS).map(([design, address]) => [address, design]));
/** "/demo/burgundy-peach-website" for a design */
export const demoPath = (design: string) => `/demo/${DEMO_ADDRESS[design] ?? design}`;
/** The Etsy listing of each design (key = internal design name). A demo shows the "see it on Etsy" button only for a design that has a link here. */
const ETSY_LISTING: Record<string, string> = {
  "sage-story": "https://pixelinvitedigital.etsy.com/listing/4615797375/animated-digital-wedding-invitation", // Wild Flowers
  "white-roses": "https://pixelinvitedigital.etsy.com/listing/4619705848/animated-wedding-invitation-digital-card", // Pure Jasmin
  "mono-script": "https://pixelinvitedigital.etsy.com/listing/4613983905/animated-digital-wedding-invitation", // Ivory Roses
  "cupid-script": "https://pixelinvitedigital.etsy.com/listing/4621239559/animated-wedding-invitation-digital-card", // Cupid Trumpets
  "lilac-script": "https://pixelinvitedigital.etsy.com/listing/4617772945/animated-wedding-invitation-digital-card", // Lilac Blossom
  "sage-forest": "https://pixelinvitedigital.etsy.com/listing/4615750882/animated-digital-wedding-invitation-sage", // Sage Garden
  "christmas-party": "https://pixelinvitedigital.etsy.com/listing/4616674385/christmas-party-invitation-digital", // Christmas Party
  "christmas-velvet": "https://pixelinvitedigital.etsy.com/listing/4618643258/christmas-party-invitation-animated", // Purple Vintage Christmas
  "peach-website": "https://pixelinvitedigital.etsy.com/listing/4622672188/wedding-website-with-animated-envelope", // Peach Website
  "burgundy-olive-website": "https://pixelinvitedigital.etsy.com/listing/4624111553/wedding-website-with-animated-envelope", // Burgundy Peach Website
  "chandelier-garden-website": "https://pixelinvitedigital.etsy.com/listing/4624581372/wedding-website-with-animated-envelope", // Chandelier Garden Website
};
export const etsyListing = (design: string): string | null => ETSY_LISTING[design] ?? null;
/** The design that a demo address stands for (the same text when it has no special address) */
export const designOfDemo = (address: string) => DEMO_DESIGN[address] ?? address;
/** The address that replaced the old one, or null when this address is the current one */
/** Designs whose internal name changed: the old demo address leads to the new one */
const RENAMED: Record<string, string> = { "dahlia-village-website": "country-dahlia-wedding-website" };
export const newerDemoAddress = (address: string) => RENAMED[address] ?? (DEMO_ADDRESS[address] && DEMO_ADDRESS[address] !== address ? DEMO_ADDRESS[address] : null);

/** The sample wedding that every demo shows. The date is always in the future (about 9 months ahead), so the countdown and the "reply by" line look alive. */
export function demoContent(now = new Date(), template?: string): Content {
  const day = (months: number) => { const d = new Date(now); d.setMonth(d.getMonth() + months); return d.toISOString().slice(0, 10); };
  const photo = { url: "/demo/couple.webp", alt: "", ar: 1.5, cx: 0.38, cy: 0.5, zoom: 1 };
  const party = isPartyTemplate(template);
  return {
    ...defaultContent,
    couple: party ? { first: "The Martins", second: "" } : { first: "Anna", second: "Daniel" },
    // the Christmas party is a party, not a wedding: its own words
    texts: party ? { ...defaultContent.texts, coverIntro: "you are invited to a", coverTop: "Christmas", headline: "Dinner Party", saveTheDate: "Join us for dinner", closing: "We are waiting for you:", closingNote: "come hungry, come merry and be ready to have fun!" } : defaultContent.texts,
    event: { date: day(9), time: "4:00 PM", venue: "Villa Rosa Garden", address: "12 Lakeview Road\nLake Como, Italy", mapUrl: "https://maps.google.com" },
    photo,
    secretPhoto: photo,
    timeline: [
      { time: "3:30 PM", label: "Guests arrive" },
      { time: "4:00 PM", label: "Ceremony" },
      { time: "5:30 PM", label: "Cocktails" },
      { time: "7:00 PM", label: "Dinner" },
      { time: "9:00 PM", label: "First dance" },
    ],
    registry: [
      { label: "Gift list 1", url: "https://example.com/gifts-1" },
      { label: "Gift list 2", url: "https://example.com/gifts-2" },
    ],
    extraBlocks: [{ title: "Kids", text: "We love your little ones, and they are very welcome to celebrate with us. A children's corner with games and snacks will be ready, and a nanny will look after the kids during the evening." }],
    dressCode: { label: "Formal attire", colors: ["#7b7f6a", "#b8964f", "#efe3c9"] },
    hotel: { name: "Grand Hotel Lakeside", address: "5 Via Roma, Lake Como, Italy\nBook with code ANNA-DANIEL" },
    rsvp: { deadline: day(7), email: "hello@example.com", note: "", online: true, maxParty: 6 },
    ...(template === "christmas-party" ? christmasPartyDemo(now) : {}),
  };
}

/** The Christmas Party demo: every part of the invitation filled in (a dinner party on the next 20 December, replies a week before). */
function christmasPartyDemo(now: Date): Partial<Content> {
  const y = now.getMonth() === 11 && now.getDate() > 20 ? now.getFullYear() + 1 : now.getFullYear();
  return {
    texts: {
      ...defaultContent.texts,
      coverIntro: "you are invited to a",
      coverTop: "Christmas",
      headline: "Dinner Party",
      saveTheDate: "Join us for dinner",
      detailsTitle: "Details",
      detailsAccommodation: "Stay the night",
      detailsDressCode: "Dress code",
      detailsExtraTitle: "Secret Santa",
      detailsExtraText: "A small wrapped gift (up to $20) for our gift exchange.",
      rsvpTitle: "please RSVP",
      closing: "We are waiting for you:",
      closingNote: "come hungry, come merry and be ready to have fun!",
    },
    event: { date: `${y}-12-20`, time: "7:00 PM", venue: "The Martins' Home", address: "18 Holly Lane\nYork, United Kingdom", mapUrl: "https://maps.google.com" },
    hotel: { name: "Snowy Pines Inn", address: "2 Holly Lane, York" },
    dressCode: { label: "Cozy & festive", colors: ["#6b7048", "#b5434b", "#c9a96b", "#f1e6d2"] },
    registry: [],
    rsvp: { deadline: `${y}-12-13`, email: "hello@example.com", note: "Please let us know how many of you are coming and any food wishes.", online: true, maxParty: 6 },
  };
}
