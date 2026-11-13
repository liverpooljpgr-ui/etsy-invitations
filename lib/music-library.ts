/** Songs every customer can pick without uploading their own (files live in public/music). */
export type LibrarySong = { id: string; name: string; url: string; /** only offered for this design (the Christmas party has its own songs) */ only?: string };

export const MUSIC_LIBRARY: readonly LibrarySong[] = [
  { id: "wildflower", name: "Wildflower", url: "/music/wildflower.mp3" },
  { id: "forever-begins", name: "Forever Begins", url: "/music/forever-begins.mp3" },
  { id: "petals", name: "Petals", url: "/music/petals.mp3" },
  { id: "golden-hour", name: "Golden Hour", url: "/music/golden-hour.mp3" },
  { id: "first-dance", name: "First Dance", url: "/music/first-dance.mp3" },
  // the Christmas party (slug christmas-party) has its own five songs
  { id: "christmas-spirit", name: "Christmas Spirit", url: "/music/christmas-spirit.mp3", only: "christmas-party" },
  { id: "winter-glow", name: "Winter Glow", url: "/music/winter-glow.mp3", only: "christmas-party" },
  { id: "silent-night-piano", name: "Silent Night (Piano)", url: "/music/silent-night-piano.mp3", only: "christmas-party" },
  { id: "jingle-evening", name: "Jingle Evening", url: "/music/jingle-evening.mp3", only: "christmas-party" },
  { id: "fireside-acoustic", name: "Fireside Acoustic", url: "/music/fireside-acoustic.mp3", only: "christmas-party" },
];

/** The songs a design offers: the Christmas party only its own songs, every other design the general ones. */
export function songsFor(template: string | undefined): LibrarySong[] {
  return MUSIC_LIBRARY.filter((s) => (template === "christmas-party" ? s.only === "christmas-party" : !s.only));
}
