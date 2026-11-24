import { defaultContent, type Content } from "@/lib/content/schema";

/** The sample wedding that every demo shows. The date is always in the future (about 9 months ahead), so the countdown and the "reply by" line look alive. */
export function demoContent(now = new Date()): Content {
  const day = (months: number) => { const d = new Date(now); d.setMonth(d.getMonth() + months); return d.toISOString().slice(0, 10); };
  const photo = { url: "/demo/couple.webp", alt: "", ar: 1.5, cx: 0.38, cy: 0.5, zoom: 1 };
  return {
    ...defaultContent,
    couple: { first: "Anna", second: "Daniel" },
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
  };
}
