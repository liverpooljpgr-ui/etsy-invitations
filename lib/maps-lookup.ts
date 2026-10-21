import { parseMapsUrl } from "@/lib/maps-link";

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

export type LinkPlace = { name: string; address: string; mapUrl: string };

/**
 * A pasted Google Maps link -> the place's name, address and map link. Short links are followed by our own server
 * route first; the name and coordinates in the long address then identify the place through Google Places.
 * Returns null when the link carries no place we can recognise.
 */
export async function lookupPlaceFromLink(link: string): Promise<LinkPlace | null> {
  if (!KEY) return null;
  const res = await fetch(`/api/maps-link?u=${encodeURIComponent(link.trim())}`);
  if (!res.ok) return null;
  const { url } = (await res.json()) as { url?: string };
  if (!url) return null;
  const p = parseMapsUrl(url);
  const mask = "displayName,formattedAddress,googleMapsUri";
  type Raw = { displayName?: { text?: string }; formattedAddress?: string; googleMapsUri?: string };
  let place: Raw | undefined;
  if (p.placeId) {
    const r = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(p.placeId)}`, { headers: { "X-Goog-Api-Key": KEY, "X-Goog-FieldMask": mask } });
    if (r.ok) place = (await r.json()) as Raw;
  }
  if (!place && p.name) {
    const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": KEY, "X-Goog-FieldMask": mask.split(",").map((f) => `places.${f}`).join(",") },
      body: JSON.stringify({
        textQuery: p.name,
        maxResultCount: 1,
        ...(p.lat !== undefined && p.lng !== undefined ? { locationBias: { circle: { center: { latitude: p.lat, longitude: p.lng }, radius: 300 } } } : {}),
      }),
    });
    if (r.ok) place = ((await r.json()) as { places?: Raw[] }).places?.[0];
  }
  if (!place) return null;
  return { name: place.displayName?.text ?? p.name ?? "", address: place.formattedAddress ?? "", mapUrl: link.trim() };
}
