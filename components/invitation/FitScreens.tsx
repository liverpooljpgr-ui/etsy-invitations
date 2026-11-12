"use client";

import { useEffect, useRef } from "react";

/**
 * "Fit to the phone": the invitation is designed for a 340 x 567 screen and scales with the width. A phone that shows less height (browser bars, a small screen)
 * would let the content of a screen run into the arrow at the bottom. This measures the content of every screen and, when it is too tall for the room it has,
 * scales it down about its centre (CSS `scale`), so all of it fits. It re-measures when the size or the text changes.
 */
const WRAPPERS = ".sheet-in, .venue-in, .tl-in, .dtl-in, .rsvp-in, .closing-in";

export function FitScreens() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const root = ref.current?.closest<HTMLElement>(".inv");
    if (!root) return;
    let raf = 0;
    const fit = () => {
      const k = parseFloat(getComputedStyle(root).getPropertyValue("--k")) || 1;
      const reserve = 54 * k; // room kept free at the top and at the bottom (the arrow)
      root.querySelectorAll<HTMLElement>(WRAPPERS).forEach((w) => {
        w.style.scale = "";
        const card = w.closest<HTMLElement>(".card");
        if (!card) return;
        let top = Infinity, bottom = -Infinity;
        for (const c of Array.from(w.children) as HTMLElement[]) {
          if (getComputedStyle(c).position === "absolute") continue;
          top = Math.min(top, c.offsetTop);
          bottom = Math.max(bottom, c.offsetTop + c.offsetHeight + (parseFloat(getComputedStyle(c).marginBottom) || 0));
        }
        const content = bottom - top, room = card.clientHeight - 2 * reserve;
        if (content > 0 && room > 0 && content > room * 1.01) w.style.scale = String(Math.max(0.55, room / content));
      });
    };
    const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); };
    fit();
    const ro = new ResizeObserver(schedule);
    ro.observe(root);
    const mo = new MutationObserver(schedule); // the text changes while the owner types in the editor
    mo.observe(root, { childList: true, subtree: true, characterData: true });
    document.fonts?.ready.then(schedule).catch(() => {});
    return () => { cancelAnimationFrame(raf); ro.disconnect(); mo.disconnect(); };
  }, []);
  return <span ref={ref} hidden aria-hidden="true" />;
}
