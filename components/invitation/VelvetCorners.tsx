/** Velvet Christmas: the two ornament corners at the top of a screen. */
export function VelvetCorners() {
  return (
    <>
      {/* eslint-disable @next/next/no-img-element */}
      <img className="xv-tl" src="/templates/christmas-velvet/v1/corner-tl.webp" alt="" width={1081} height={1100} decoding="async" draggable={false} />
      <img className="xv-tr" src="/templates/christmas-velvet/v1/corner-tr.webp" alt="" width={1081} height={1100} decoding="async" draggable={false} />
      {/* eslint-enable @next/next/no-img-element */}
    </>
  );
}

/** Velvet Christmas: the candle garland; a soft warm glow on each flame flickers on its own rhythm. */
const FLAMES: [number, number][] = [[10, 18.5], [18.1, 5.2], [31.8, 13.6], [67.4, 13.1], [80.7, 5.2], [89.7, 17.8]];
/** duration and start offset (seconds) per flame: unrelated lengths, so the six flames never fall into step and the blinking looks random */
const RHYTHM: [number, number][] = [[2.9, 0.4], [3.7, 2.2], [2.3, 1.1], [4.3, 3.0], [3.1, 0.9], [2.6, 1.9]];
export function VelvetCandles() {
  return (
    <span className="xv-candles" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/templates/christmas-velvet/v1/candles.webp" alt="" width={1400} height={692} decoding="async" draggable={false} />
      {FLAMES.map(([x, y], i) => <i key={i} className={`xv-flame xv-f${i % 3}`} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${-RHYTHM[i][1]}s`, animationDuration: `${RHYTHM[i][0]}s` }} />)}
    </span>
  );
}

/** Velvet Christmas cover: a gold separator with three candles in the middle; each flame flickers on its own rhythm. */
export function VelvetCandleSep() {
  const candle = (x: number, h: number, i: number) => {
    const top = 52 - h; // candle top (the base sits on the line at y 52)
    return (
      <g key={i}>
        <rect x={x - 4.2} y={top} width={8.4} height={h} rx={1.6} fill="url(#xvWax)" stroke="url(#xvGold)" strokeWidth={0.9} />
        <path d={`M${x - 4.2} ${top + 3}c1.4 1.2 2.4.2 3.2 2.4.6 1.6 1.4.4 1.8-.6`} fill="none" stroke="#e9dcc0" strokeWidth={0.9} />
        <line x1={x} y1={top} x2={x} y2={top - 2.6} stroke="#5a4630" strokeWidth={0.8} />
        <circle className={`xv-sglow xv-g${i}`} cx={x} cy={top - 7} r={7.5} fill="url(#xvGlow)" />
        <path className={`xv-sflame xv-g${i}`} d={`M${x} ${top - 13.5}c2.6 3.4 3.8 5.6 3.8 7.6 0 2.4-1.7 3.6-3.8 3.6s-3.8-1.2-3.8-3.6c0-2 1.2-4.2 3.8-7.6z`} fill="url(#xvFlame)" />
        <path className={`xv-sflame xv-g${i}`} d={`M${x} ${top - 8.6}c1.1 1.5 1.6 2.5 1.6 3.3 0 1-.7 1.5-1.6 1.5s-1.6-.5-1.6-1.5c0-.8.5-1.8 1.6-3.3z`} fill="#fff8e6" />
      </g>
    );
  };
  // a fir twig: a curved stem with fine needles on both sides, from (x0, y0) outwards (dir -1 left, 1 right)
  const twig = (x0: number, y0: number, dir: 1 | -1, len: number, rise: number, k: string) => {
    const pts: string[] = [];
    const at = (t: number) => [x0 + dir * len * t, y0 - rise * t * (2 - t)] as const;
    for (let t = 0.12; t <= 1.001; t += 0.07) {
      const [x, y] = at(t); const [x2, y2] = at(Math.min(1, t + 0.01));
      const ang = Math.atan2(y2 - y, x2 - x), n = 5.6 * (1 - t * 0.45);
      for (const s of [-1, 1]) { const a = ang + s * 0.95 + (dir > 0 ? 0 : 0); pts.push(`M${x.toFixed(2)} ${y.toFixed(2)}l${(Math.cos(a) * n).toFixed(2)} ${(Math.sin(a) * n).toFixed(2)}`); }
    }
    const [xe, ye] = at(1), [xm, ym] = at(0.5);
    return (
      <g key={k}>
        <path d={`M${x0} ${y0}Q${xm.toFixed(2)} ${(ym - rise * 0.25).toFixed(2)} ${xe.toFixed(2)} ${ye.toFixed(2)}`} fill="none" stroke="#4f5f3a" strokeWidth={0.9} />
        <path d={pts.join("")} fill="none" stroke="url(#xvNeedle)" strokeWidth={0.75} strokeLinecap="round" />
      </g>
    );
  };
  return (
    <svg className="xv-csep" viewBox="0 0 300 64" aria-hidden="true">
      <defs>
        <linearGradient id="xvGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d2ad62" /><stop offset=".55" stopColor="#b08640" /><stop offset="1" stopColor="#8f6a2e" /></linearGradient>
        <linearGradient id="xvWax" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#efe4cc" /><stop offset=".45" stopColor="#fbf6ea" /><stop offset="1" stopColor="#e2d3b4" /></linearGradient>
        <linearGradient id="xvL" gradientUnits="userSpaceOnUse" x1="6" y1="0" x2="118" y2="0"><stop offset="0" stopColor="#b48c45" stopOpacity="0" /><stop offset="1" stopColor="#b48c45" /></linearGradient>
        <linearGradient id="xvR" gradientUnits="userSpaceOnUse" x1="182" y1="0" x2="294" y2="0"><stop offset="0" stopColor="#b48c45" /><stop offset="1" stopColor="#b48c45" stopOpacity="0" /></linearGradient>
        <radialGradient id="xvFlame" cx=".5" cy=".7" r=".6"><stop offset="0" stopColor="#ffe9a8" /><stop offset=".6" stopColor="#f6b84a" /><stop offset="1" stopColor="#e08a2a" /></radialGradient>
        <linearGradient id="xvNeedle" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5f8452" /><stop offset="1" stopColor="#2f5236" /></linearGradient>
        <radialGradient id="xvGlow"><stop offset="0" stopColor="#ffd98a" stopOpacity=".75" /><stop offset=".5" stopColor="#ffc865" stopOpacity=".25" /><stop offset="1" stopColor="#ffc865" stopOpacity="0" /></radialGradient>
      </defs>
      <path d="M6 52H118" stroke="url(#xvL)" strokeWidth={1.1} />
      <path d="M182 52H294" stroke="url(#xvR)" strokeWidth={1.1} />
      <path d="M122 52l3.4-3 3.4 3-3.4 3z M171.2 52l3.4-3 3.4 3-3.4 3z" fill="#b48c45" />
      {twig(134, 51.5, -1, 30, 6, "l1")}
      {twig(135, 50.5, -1, 22, 15, "l2")}
      {twig(166, 51.5, 1, 30, 6, "r1")}
      {twig(165, 50.5, 1, 22, 15, "r2")}
      <circle cx={127} cy={49.2} r={1.6} fill="#6a2a5c" /><circle cx={124.4} cy={50.6} r={1.2} fill="#c9a24e" />
      <circle cx={173} cy={49.2} r={1.6} fill="#6a2a5c" /><circle cx={175.6} cy={50.6} r={1.2} fill="#c9a24e" />
      <path d="M132 52.6h36" stroke="url(#xvGold)" strokeWidth={2.2} strokeLinecap="round" />
      {candle(139, 22, 0)}
      {candle(150, 30, 1)}
      {candle(161, 22, 2)}
    </svg>
  );
}
