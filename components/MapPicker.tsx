"use client";

import { useEffect, useRef, useState } from "react";
import { MapPreview, type Place } from "@/components/PlaceSearch";

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
const MAX_LOOKUPS = 40; // per time the editor is open

type Win = Window & { gm_authFailure?: () => void };
const failListeners = new Set<() => void>();
let loader: Promise<void> | null = null;
let lookups = 0;

/** Loads Google's map script once. Rejects when the script can not load; auth problems are reported to the listeners. */
function loadMaps(): Promise<void> {
  if (typeof window === "undefined" || !KEY) return Promise.reject(new Error("no key"));
  if (typeof google !== "undefined" && typeof google.maps?.importLibrary === "function") return Promise.resolve();
  loader ??= new Promise<void>((resolve, reject) => {
    (window as Win).gm_authFailure = () => failListeners.forEach((f) => f()); // key refused or the Maps JavaScript API is not enabled
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&v=weekly&loading=async`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { loader = null; reject(new Error("load")); };
    document.head.append(s);
  });
  return loader;
}

type Details = { displayName?: { text?: string }; formattedAddress?: string; googleMapsUri?: string; location?: { latitude: number; longitude: number } };
const DETAILS_MASK = "displayName,formattedAddress,googleMapsUri,location";

async function placeById(id: string): Promise<Place | null> {
  if (!KEY || lookups >= MAX_LOOKUPS) return null;
  lookups += 1;
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`, { headers: { "X-Goog-Api-Key": KEY, "X-Goog-FieldMask": DETAILS_MASK } });
  if (!res.ok) return null;
  const d = (await res.json()) as Details;
  return { name: d.displayName?.text ?? "", address: d.formattedAddress ?? "", mapUrl: d.googleMapsUri ?? "", lat: d.location?.latitude, lng: d.location?.longitude };
}

async function placeByText(text: string): Promise<{ lat: number; lng: number } | null> {
  if (!KEY || lookups >= MAX_LOOKUPS) return null;
  lookups += 1;
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": KEY, "X-Goog-FieldMask": "places.location" },
    body: JSON.stringify({ textQuery: text, maxResultCount: 1 }),
  });
  if (!res.ok) return null;
  const l = ((await res.json()) as { places?: { location?: { latitude: number; longitude: number } }[] }).places?.[0]?.location;
  return l ? { lat: l.latitude, lng: l.longitude } : null;
}

/**
 * A real map to choose the place on: tap a venue / hotel / landmark on the map and its name, address and map link come
 * back through onPick. The map moves to whatever is typed in the search box above it (or already filled in below).
 * If Google refuses the interactive map, a plain preview map is shown instead.
 */
export function MapPicker({ query, center, onPick, hint }: { query: string; center?: { lat: number; lng: number } | null; onPick: (p: Place) => void; hint?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const marker = useRef<google.maps.Marker | null>(null);
  const resolved = useRef("");
  const pickRef = useRef(onPick);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => { pickRef.current = onPick; }, [onPick]);

  const show = (lat: number, lng: number, zoom = 16) => {
    const m = map.current;
    if (!m) return;
    m.setCenter({ lat, lng });
    m.setZoom(zoom);
    if (marker.current) marker.current.setPosition({ lat, lng });
    else marker.current = new google.maps.Marker({ map: m, position: { lat, lng } });
  };

  // create the map once
  useEffect(() => {
    if (!KEY) return;
    let gone = false;
    const onFail = () => setFailed(true);
    failListeners.add(onFail);
    loadMaps()
      .then(() => google.maps.importLibrary("maps"))
      .then(async () => {
        await google.maps.importLibrary("marker");
        if (gone || !box.current) return;
        const m = new google.maps.Map(box.current, { center: { lat: 25, lng: 10 }, zoom: 2, mapTypeControl: false, streetViewControl: false, fullscreenControl: false, clickableIcons: true, gestureHandling: "greedy" });
        map.current = m;
        m.addListener("click", async (e: google.maps.MapMouseEvent) => {
          const id = (e as google.maps.IconMouseEvent).placeId;
          if (!id) { setNote("Tap one of the places on the map (a venue, hotel or landmark)."); return; }
          (e as google.maps.IconMouseEvent).stop(); // no Google info window
          setBusy(true); setNote("");
          try {
            const p = await placeById(id);
            if (!p || !p.name) { setNote("Could not load that place. Try another one or use the search above."); return; }
            if (p.lat !== undefined && p.lng !== undefined) show(p.lat, p.lng, m.getZoom() ?? 16);
            resolved.current = [p.name, p.address].filter(Boolean).join(", ");
            pickRef.current(p);
            setNote(`Selected: ${p.name}`);
          } catch { setNote("Could not load that place. Try again or fill in the details by hand."); }
          finally { setBusy(false); }
        });
        setReady(true);
      })
      .catch(() => { if (!gone) setFailed(true); });
    return () => { gone = true; failListeners.delete(onFail); };
  }, []);

  // the search box above picked a place: go there (its text is already known, so no second lookup)
  useEffect(() => {
    if (!ready || !center) return;
    resolved.current = query.trim();
    show(center.lat, center.lng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, ready]);

  // follow what is typed / already filled in (not the pick we just made ourselves)
  useEffect(() => {
    const q = query.trim();
    if (!ready || q.length < 3 || q === resolved.current) return;
    const t = setTimeout(async () => {
      resolved.current = q;
      try { const l = await placeByText(q); if (l) show(l.lat, l.lng); } catch { /* the map just stays where it is */ }
    }, 900);
    return () => clearTimeout(t);
  }, [query, ready]);

  if (!KEY) return null;
  if (failed) return <MapPreview query={query} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ position: "relative", height: 320, borderRadius: 16, overflow: "hidden", boxShadow: "0 0 0 .5px var(--ui-hair)", background: "var(--ui-fill)" }}>
        <div ref={box} style={{ position: "absolute", inset: 0 }} />
        {busy && <div className="ui-help" style={{ position: "absolute", left: 8, top: 8, padding: "4px 10px", borderRadius: 999, background: "rgba(255,255,255,.92)" }}>Loading place…</div>}
      </div>
      <p className="ui-help" role="status" style={{ margin: 0 }}>{note || hint || "Tap a place on the map to choose it. Drag to move the map."}</p>
    </div>
  );
}
