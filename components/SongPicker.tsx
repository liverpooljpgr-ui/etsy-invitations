"use client";

import { useEffect, useRef, useState } from "react";
import { MUSIC_LIBRARY, type LibrarySong } from "@/lib/music-library";

const Play = () => (
  <svg width="14" height="16" viewBox="0 0 13 14" fill="currentColor" aria-hidden="true"><path d="M1.5 1.3v11.4a.8.8 0 0 0 1.2.7l9.2-5.7a.8.8 0 0 0 0-1.4L2.7.6a.8.8 0 0 0-1.2.7z" /></svg>
);
const Pause = () => (
  <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor" aria-hidden="true"><rect x="2" y="1.5" width="3.6" height="13" rx="1" /><rect x="8.4" y="1.5" width="3.6" height="13" rx="1" /></svg>
);

/** A few ready songs: listen with the play button, tap "Use" to put one on the invitation. */
export function SongPicker({ currentUrl, onPick }: { currentUrl: string | null; onPick: (song: LibrarySong) => void }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => () => { audio.current?.pause(); }, []); // stop when the editor closes

  const toggle = (song: LibrarySong) => {
    if (!audio.current) {
      audio.current = new Audio();
      audio.current.addEventListener("ended", () => setPlaying(null));
    }
    const a = audio.current;
    if (playing === song.id) { a.pause(); setPlaying(null); return; }
    a.src = song.url;
    a.currentTime = 0;
    setPlaying(song.id);
    a.play().catch(() => setPlaying(null));
  };

  return (
    <ul className="ui-group" style={{ listStyle: "none", margin: 0, padding: 0 }} aria-label="Songs to choose from">
      {MUSIC_LIBRARY.map((s, i) => {
        const chosen = currentUrl === s.url;
        return (
          <li key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderTop: i ? ".5px solid var(--ui-hair)" : 0 }}>
            <button type="button" className="ui-icon-btn" onClick={() => toggle(s)} aria-label={playing === s.id ? `Pause ${s.name}` : `Play ${s.name}`}
              style={{ background: "var(--ui-tint-soft)", color: "var(--ui-tint)", width: 40, height: 40 }}>
              {playing === s.id ? <Pause /> : <Play />}
            </button>
            <span style={{ flex: 1, minWidth: 0, fontWeight: chosen ? 700 : 500 }}>{s.name}</span>
            {chosen ? (
              <span className="ui-help" style={{ margin: 0, color: "var(--ui-tint)", fontWeight: 600 }}>✓ Selected</span>
            ) : (
              <button type="button" className="ui-btn ui-btn-soft ui-btn-sm" onClick={() => { audio.current?.pause(); setPlaying(null); onPick(s); }}>Use</button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
