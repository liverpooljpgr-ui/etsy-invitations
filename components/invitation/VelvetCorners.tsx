/** Purple Vintage Christmas: the two ornament corners at the top of a screen. */
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

/** Purple Vintage Christmas: the candle garland; a soft warm glow on each flame flickers on its own rhythm. */
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

/** Purple Vintage Christmas cover: a gold separator with three candles and fir twigs in the middle; the flames flicker inside the SVG file
 *  (a self-contained picture: an inline SVG would share its gradient ids with other copies of the cover, e.g. the editor preview). */
export function VelvetCandleSep() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="xv-csep" src="/templates/christmas-velvet/v1/candle-sep.svg" alt="" width={600} height={128} draggable={false} aria-hidden="true" />;
}
