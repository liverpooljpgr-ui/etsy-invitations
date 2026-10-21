/** Helpers for Google Maps links, used by the browser and by the server route that follows short links. */

/** True for the link shapes Google Maps produces (short share links and long place links). */
export function isMapsLink(text: string): boolean {
  let u: URL;
  try { u = new URL(text.trim()); } catch { return false; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  const h = u.hostname.toLowerCase();
  if (h === "maps.app.goo.gl") return true;
  if (h === "goo.gl") return u.pathname.startsWith("/maps");
  if (/^maps\.google\.[a-z.]{2,6}$/.test(h)) return true;
  return /^(www\.)?google\.[a-z.]{2,6}$/.test(h) && u.pathname.startsWith("/maps");
}

export type ParsedMapsUrl = { name?: string; lat?: number; lng?: number; placeId?: string };

/** What a long Google Maps address tells us: the place name, its coordinates and, sometimes, its place id. */
export function parseMapsUrl(url: string): ParsedMapsUrl {
  let u: URL;
  try { u = new URL(url); } catch { return {}; }
  const out: ParsedMapsUrl = {};
  const seg = /\/maps\/place\/([^/]+)/.exec(u.pathname);
  if (seg) {
    try { out.name = decodeURIComponent(seg[1].replace(/\+/g, " ")).trim(); } catch { out.name = seg[1].replace(/\+/g, " "); }
  }
  const q = u.searchParams.get("q") ?? u.searchParams.get("query");
  if (!out.name && q && !/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(q.trim())) out.name = q.trim();
  out.placeId = u.searchParams.get("query_place_id") ?? u.searchParams.get("place_id") ?? undefined;
  const at = /@(-?\d+\.\d+),(-?\d+\.\d+)/.exec(u.pathname) ?? /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/.exec(url);
  if (at) { out.lat = Number(at[1]); out.lng = Number(at[2]); }
  return out;
}
