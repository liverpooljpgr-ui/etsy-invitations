import type { CSSProperties } from "react";
import type { Content } from "@/lib/content/schema";
import { EnvelopeArt } from "./EnvelopeArt";

/* ── Golden dust ─────────────────────────────────────────────────────────────────────────
   A fixed set of sparkles generated from a seed, so server and client render identical HTML.
   Positions are % of the envelope box; ~1/3 sit on the envelope itself, the rest orbit around it.
   Edit the numbers here (count, size, speed) or the .dust rules in app/globals.css. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}
const rnd = seeded(20271);
const DUST = Array.from({ length: 44 }, (_, i) => {
  const onEnvelope = i % 4 === 0;
  const a = rnd() * Math.PI * 2;
  const x = onEnvelope ? 6 + rnd() * 88 : 50 + Math.cos(a) * (52 + rnd() * 9);
  const y = onEnvelope ? 12 + rnd() * 76 : 50 + Math.sin(a) * (54 + rnd() * 26);
  const star = i % 3 !== 1;
  return {
    x: +x.toFixed(1),
    y: +y.toFixed(1),
    size: star ? +(12 + rnd() * 8).toFixed(1) : +(3.5 + rnd() * 3.5).toFixed(1),
    star,
    dx: Math.round((rnd() - 0.5) * 22),
    dy: -Math.round(6 + rnd() * 18), // drifts upward
    dur: +(2.8 + rnd() * 2.8).toFixed(2),
    delay: -+(rnd() * 6).toFixed(2), // negative: starts mid-cycle so it is sparkling immediately
  };
});

function GoldDust() {
  return (
    <span className="dust">
      {DUST.map((p, i) => (
        <i
          key={i}
          className={p.star ? "star" : undefined}
          style={
            {
              left: `${p.x}%`,
              top: `${p.y}%`,
              "--s": `${p.size}px`,
              "--dx": `${p.dx}px`,
              "--dy": `${p.dy}px`,
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}

/**
 * Inside of the first screen ("cover"): small line, the couple's names, the envelope, a closing line.
 * Used both by the static card 1 (editor preview) and by the tappable overlay (published page).
 * Rendered with spans only, because the published version lives inside a <button>.
 */
export function CoverInner({ content: c, mode, hint }: { content: Content; mode: "preview" | "public"; hint?: boolean }) {
  const ph = mode === "preview";
  const first = c.couple.first || (ph ? "First name" : "");
  const second = c.couple.second || (ph ? "Second name" : "");
  return (
    <>
      {c.texts.coverTop && <span className="cover-top">{c.texts.coverTop}</span>}
      <span className="cover-names">
        <span>{first}</span>
        <span className="amp">&amp;</span>
        <span>{second}</span>
      </span>
      <span className="cover-env">
        <span className="magic magic-back" aria-hidden="true">
          <span className="glow" />
        </span>
        <EnvelopeArt />
        <span className="magic magic-front" aria-hidden="true">
          <span className="glint" />
          <GoldDust />
        </span>
      </span>
      {c.texts.coverBottom && <span className="cover-bottom">{c.texts.coverBottom}</span>}
      {hint && <span className="env-hint">Tap to open</span>}
    </>
  );
}
