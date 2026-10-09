import QRCode from "qrcode";

/** QR rendered as an SVG path in React (no innerHTML). */
export function Qr({ value, label }: { value: string; label: string }) {
  const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  let d = "";
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) if (qr.modules.get(r, c)) d += `M${c} ${r}h1v1h-1z`;
  return (
    <svg viewBox={`-1 -1 ${n + 2} ${n + 2}`} role="img" aria-label={label} className="qr" shapeRendering="crispEdges">
      <path d={d} fill="currentColor" />
    </svg>
  );
}
