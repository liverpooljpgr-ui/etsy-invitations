import type { ReactNode } from "react";

/**
 * Timeline icons: one hand-drawn style (24 × 24, thin round line, no fill) so they look like a set. The colour is the text colour.
 * `key` is what is stored in the invitation (timeline[i].icon).
 */
export const TIMELINE_ICONS: { key: string; label: string; paths: ReactNode }[] = [
  { key: "rings", label: "Rings", paths: (<>
    <circle cx="8.6" cy="14.6" r="5.4" /><circle cx="15.4" cy="14.6" r="5.4" />
    <path d="M13.6 6.6 L14.7 4.6 H16.1 L17.2 6.6 L15.4 9.2 Z" /><path d="M13.6 6.6 H17.2" />
  </>) },
  { key: "cocktail", label: "Cocktail", paths: (<>
    <path d="M4.5 5.5 H19.5 L12 13.8 Z" /><path d="M12 13.8 V20" /><path d="M8 20 H16" />
    <path d="M16.6 2.6 L12.8 8.4" /><circle cx="9.7" cy="8" r="1.1" />
  </>) },
  { key: "microphone", label: "Microphone", paths: (<>
    <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11 A6 6 0 0 0 18 11" />
    <path d="M12 17 V21" /><path d="M9 21 H15" /><path d="M9 8 H15" />
  </>) },
  { key: "dancing", label: "Dancing couple", paths: (<>
    <circle cx="7.6" cy="4.8" r="1.7" /><circle cx="16.4" cy="4.8" r="1.7" />
    <path d="M7.6 6.8 V13" /><path d="M7.6 13 L5.8 20.5" /><path d="M7.6 13 L9.6 20.5" />
    <path d="M7.6 8.6 Q10.4 6.8 12 7.8" /><path d="M16.4 8.6 Q13.6 6.8 12 7.8" />
    <path d="M16.4 6.8 V10.4" /><path d="M16.4 10.4 L12.6 20.5 H20.2 Z" />
  </>) },
  { key: "car", label: "Car", paths: (<>
    <path d="M5.2 16 H3 V12.8 Q3 12 3.8 11.7 L6.3 10.7 L8.1 7 H15.9 L17.7 10.7 L20.2 11.7 Q21 12 21 12.8 V16 H18.8" />
    <path d="M9.8 16 H14.2" /><circle cx="7.5" cy="16.2" r="2.3" /><circle cx="16.5" cy="16.2" r="2.3" />
    <path d="M6.3 10.7 H17.7" /><path d="M12 7 V10.7" />
  </>) },
  { key: "cake", label: "Cake", paths: (<>
    <path d="M3 20.5 H21" /><path d="M5 20.5 V13 H19 V20.5" />
    <path d="M5 13 Q7 15.2 9 13 Q11 15.2 13 13 Q15 15.2 17 13 Q18 14.2 19 13" />
    <path d="M5 17.2 H19" /><path d="M12 13 V8.6" /><path d="M12 3.8 Q14 6 12 8 Q10 6 12 3.8 Z" />
  </>) },
  { key: "dinner", label: "Dinner", paths: (<>
    <circle cx="12" cy="12" r="5.6" /><circle cx="12" cy="12" r="3.3" />
    <ellipse cx="4" cy="7.6" rx="1.6" ry="2.6" /><path d="M4 10.2 V20.5" />
    <path d="M20 20.5 V3.8 Q17.8 5.8 17.8 11 H20" />
  </>) },
  { key: "fireworks", label: "Fireworks", paths: (<>
    <path d="M14.5 10 H18.5" /><path d="M13.8 11.8 L16.6 14.6" /><path d="M12 12.5 V16.5" /><path d="M10.2 11.8 L7.4 14.6" />
    <path d="M9.5 10 H5.5" /><path d="M10.2 8.2 L7.4 5.4" /><path d="M12 7.5 V3.5" /><path d="M13.8 8.2 L16.6 5.4" />
    <path d="M4.6 19 V22" /><path d="M3.1 20.5 H6.1" /><path d="M19.6 18 V21" /><path d="M18.1 19.5 H21.1" />
  </>) },
  { key: "camera", label: "Photos", paths: (<>
    <rect x="3" y="7.5" width="18" height="12" rx="2.2" /><path d="M8.2 7.5 L9.6 5 H14.4 L15.8 7.5" />
    <circle cx="12" cy="13.5" r="3.6" /><circle cx="12" cy="13.5" r="1.4" /><path d="M17.6 10.2 H18.9" />
  </>) },
  { key: "music", label: "Music", paths: (<>
    <ellipse cx="7" cy="17.6" rx="2.7" ry="2.1" transform="rotate(-20 7 17.6)" /><ellipse cx="16.6" cy="15.6" rx="2.7" ry="2.1" transform="rotate(-20 16.6 15.6)" />
    <path d="M9.5 17 V6.6" /><path d="M19.1 15 V4.6" /><path d="M9.5 6.6 L19.1 4.6" /><path d="M9.5 9.4 L19.1 7.4" />
  </>) },
];

export function TimelineIcon({ name, size = 26 }: { name?: string; size?: number | string }) {
  const it = TIMELINE_ICONS.find((x) => x.key === name);
  if (!it) return null;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {it.paths}
    </svg>
  );
}
