const ART = "/templates/sage-story/v1";

/** The two real envelope halves (left panel + right pointed half with the wax seal). */
export function EnvelopeArt() {
  return (
    <span className="env-art" aria-hidden="true">
      {/* eslint-disable @next/next/no-img-element */}
      <img className="env-l" src={`${ART}/envelope-left.webp`} alt="" width={760} height={1176} decoding="async" draggable={false} />
      <img className="env-r" src={`${ART}/envelope-right.webp`} alt="" width={523} height={1176} decoding="async" draggable={false} />
      {/* eslint-enable @next/next/no-img-element */}
    </span>
  );
}
