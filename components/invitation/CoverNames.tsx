"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * "First & Second" on the cover: one line while it fits; when the names are too long for one line
 * the ampersand gets a line of its own between the two names, and everything is centred.
 */
export function CoverNames({ first, second }: { first: string; second: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.classList.remove("stacked");
      if (el.scrollWidth > el.clientWidth + 1) el.classList.add("stacked");
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [first, second]);
  // the web fonts arrive after the first paint and change the widths
  useEffect(() => {
    const el = ref.current;
    if (!el || !document.fonts) return;
    void document.fonts.ready.then(() => {
      el.classList.remove("stacked");
      if (el.scrollWidth > el.clientWidth + 1) el.classList.add("stacked");
    });
  }, [first, second]);
  return (
    <span className="cover-names" ref={ref}>
      <span>{first}</span>
      <span className="amp">&amp;</span>
      <span>{second}</span>
    </span>
  );
}
