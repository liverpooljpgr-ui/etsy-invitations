"use client";

import { useEffect, useId, useRef, useState } from "react";
import { isMapsLink } from "@/lib/maps-link";
import { lookupPlaceFromLink } from "@/lib/maps-lookup";

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
const MAX_SEARCHES = 40; // per time the editor is open: keeps the Google bill at zero even if someone types a lot

export type Place = { name: string; address: string; mapUrl: string; lat?: number; lng?: number };
type Suggestion = { id: string; main: string; secondary: string };

const newToken = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random()).slice(2));

/**
 * Address search (Google Places). The customer types a venue or hotel, taps a result, and the name, full address and
 * map link come back through onPick. Searches are grouped into one "session" per pick, which Google bills as free
 * autocomplete. Renders nothing when no key is configured, so the form still works with plain typing.
 */
export function PlaceSearch({ label, placeholder, onPick }: { label: string; placeholder?: string; onPick: (p: Place) => void }) {
  const id = useId();
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ q: string; items: Suggestion[] } | null>(null);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const token = useRef(newToken());
  const used = useRef(0);

  // search 0.45 s after the typing stops, from the third character on
  useEffect(() => {
    const text = q.trim();
    if (!KEY || text.length < 3) return;
    if (isMapsLink(text)) { // a pasted Google Maps link: read the place out of it instead of searching
      const t = setTimeout(async () => {
        setReading(true); setError("");
        try {
          const p = await lookupPlaceFromLink(text);
          if (p) { onPick({ name: p.name, address: p.address, mapUrl: p.mapUrl }); setQ(""); }
          else setError("Could not read a place from that link. Try the search box or type the details by hand.");
        } catch { setError("Could not read that link. You can type the details by hand."); }
        setReading(false);
      }, 600);
      return () => clearTimeout(t);
    }
    const ctl = new AbortController();
    const timer = setTimeout(async () => {
      if (used.current >= MAX_SEARCHES) { setError("Search limit reached for now. Type the address by hand or reopen the editor."); return; }
      used.current += 1;
      try {
        const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
          method: "POST",
          signal: ctl.signal,
          headers: { "Content-Type": "application/json", "X-Goog-Api-Key": KEY },
          body: JSON.stringify({ input: text, sessionToken: token.current }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { suggestions?: { placePrediction?: { placeId: string; structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } }; text?: { text: string } } }[] };
        const items = (data.suggestions ?? [])
          .map((s) => s.placePrediction)
          .filter((p): p is NonNullable<typeof p> => !!p)
          .slice(0, 5)
          .map((p) => ({ id: p.placeId, main: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "", secondary: p.structuredFormat?.secondaryText?.text ?? "" }));
        setFound({ q: text, items });
        setError("");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError("Search is not available right now. You can type the address by hand.");
      }
    }, 450);
    return () => { clearTimeout(timer); ctl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  if (!KEY) return null;

  const pick = async (s: Suggestion) => {
    setError("");
    try {
      const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(s.id)}?sessionToken=${encodeURIComponent(token.current)}`, {
        headers: { "X-Goog-Api-Key": KEY, "X-Goog-FieldMask": "displayName,formattedAddress,googleMapsUri,location" },
      });
      if (!res.ok) throw new Error(String(res.status));
      const d = (await res.json()) as { displayName?: { text?: string }; formattedAddress?: string; googleMapsUri?: string; location?: { latitude: number; longitude: number } };
      onPick({ name: d.displayName?.text ?? s.main, address: d.formattedAddress ?? s.secondary, mapUrl: d.googleMapsUri ?? "", lat: d.location?.latitude, lng: d.location?.longitude });
      setQ("");
      setFound(null);
      token.current = newToken(); // a pick ends the Google session
    } catch {
      setError("Could not load that place. Try again or type the address by hand.");
    }
  };

  const items = q.trim().length >= 3 && found && found.q === q.trim() ? found.items : [];
  return (
    <div className="ui-field">
      <label className="ui-label" htmlFor={id}>{label}</label>
      <input id={id} className="ui-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder ?? "Name, address or a Google Maps link"}
        autoComplete="off" role="combobox" aria-expanded={items.length > 0} aria-controls={`${id}-list`} />
      {items.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="ui-group" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {items.map((s) => (
            <li key={s.id} role="option" aria-selected="false">
              <button type="button" onClick={() => void pick(s)} style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 16px", border: 0, borderBottom: ".5px solid var(--ui-hair)", background: "transparent", cursor: "pointer", font: "inherit" }}>
                <span style={{ display: "block", fontWeight: 600 }}>{s.main}</span>
                {s.secondary && <span className="ui-help" style={{ display: "block" }}>{s.secondary}</span>}
              </button>
            </li>
          ))}
          <li className="ui-help" style={{ padding: "8px 16px", textAlign: "right" }}>Powered by Google</li>
        </ul>
      )}
      {error && <p className="ui-help" style={{ color: "var(--ui-red)" }}>{error}</p>}
      {reading && <p className="ui-help">Reading the link…</p>}
      {!error && !reading && items.length === 0 && <p className="ui-help">Type a name or paste a Google Maps link, and the details below fill in for you. You can still change them.</p>}
    </div>
  );
}

/** Small map under the venue fields (Google Maps Embed: free). Shows nothing without a key or an address. */
export function MapPreview({ query }: { query: string }) {
  const [shown, setShown] = useState(query);
  useEffect(() => {
    const t = setTimeout(() => setShown(query), 700); // not on every keystroke
    return () => clearTimeout(t);
  }, [query]);
  const q = shown.trim();
  if (!KEY || q.length < 3) return null;
  return (
    <iframe
      title="Map of the venue"
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      src={`https://www.google.com/maps/embed/v1/place?key=${KEY}&q=${encodeURIComponent(q)}`}
      style={{ width: "100%", height: 200, border: 0, borderRadius: 16, boxShadow: "0 0 0 .5px var(--ui-hair)" }}
    />
  );
}
