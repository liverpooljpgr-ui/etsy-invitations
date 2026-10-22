/** Songs every customer can pick without uploading their own (files live in public/music). */
export type LibrarySong = { id: string; name: string; url: string };

export const MUSIC_LIBRARY: readonly LibrarySong[] = [
  { id: "wildflower", name: "Wildflower", url: "/music/wildflower.mp3" },
  { id: "forever-begins", name: "Forever Begins", url: "/music/forever-begins.mp3" },
  { id: "petals", name: "Petals", url: "/music/petals.mp3" },
  { id: "golden-hour", name: "Golden Hour", url: "/music/golden-hour.mp3" },
  { id: "first-dance", name: "First Dance", url: "/music/first-dance.mp3" },
];
