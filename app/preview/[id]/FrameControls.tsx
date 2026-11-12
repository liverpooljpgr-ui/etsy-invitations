"use client";

import { useEffect } from "react";

/**
 * Inside the phone frame of "Preview animation" (a computer): no scroll bar, no free scrolling. The next screen comes
 * by dragging up / down with the mouse (a swipe), by one turn of the mouse wheel, by the arrow keys or by the chevron at the bottom of the screen.
 */
export function FrameControls() {
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = ".inv[data-phase]{scrollbar-width:none;-ms-overflow-style:none}.inv[data-phase]::-webkit-scrollbar{display:none}.inv[data-phase]{user-select:none;-webkit-user-select:none}";
    document.head.appendChild(style);

    let cleanup = () => {};
    const attach = (inv: HTMLElement) => {
      const go = (dir: 1 | -1) => {
        const h = inv.clientHeight || 1;
        const i = Math.round(inv.scrollTop / h);
        const last = Math.round((inv.scrollHeight - h) / h);
        inv.scrollTo({ top: Math.max(0, Math.min(last, i + dir)) * h, behavior: "smooth" });
      };
      let locked = false;
      const step = (dir: 1 | -1) => { if (locked) return; locked = true; go(dir); setTimeout(() => { locked = false; }, 750); };
      // mouse wheel: one turn = one screen (no free scrolling)
      const onWheel = (e: WheelEvent) => { e.preventDefault(); if (Math.abs(e.deltaY) > 4) step(e.deltaY > 0 ? 1 : -1); };
      // mouse drag = swipe (touch screens swipe natively)
      let y0: number | null = null;
      const onDown = (e: PointerEvent) => { if (e.pointerType === "mouse" && !(e.target as HTMLElement).closest("a,button,input,textarea,select,label")) y0 = e.clientY; };
      const onUp = (e: PointerEvent) => { if (y0 === null) return; const dy = e.clientY - y0; y0 = null; if (Math.abs(dy) > 40) step(dy < 0 ? 1 : -1); };
      const onKey = (e: KeyboardEvent) => {
        if ((e.target as HTMLElement)?.closest("input,textarea,select")) return;
        if (e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); step(1); }
        if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); step(-1); }
      };
      inv.addEventListener("wheel", onWheel, { passive: false });
      inv.addEventListener("pointerdown", onDown);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("keydown", onKey);
      cleanup = () => { inv.removeEventListener("wheel", onWheel); inv.removeEventListener("pointerdown", onDown); window.removeEventListener("pointerup", onUp); window.removeEventListener("keydown", onKey); };
    };

    // the invitation mounts a moment after this component
    let tries = 0;
    const timer = setInterval(() => {
      const inv = document.querySelector<HTMLElement>(".inv[data-phase]");
      if (inv) { clearInterval(timer); attach(inv); } else if (++tries > 60) clearInterval(timer);
    }, 150);
    return () => { clearInterval(timer); cleanup(); style.remove(); };
  }, []);
  return null;
}
