const ART = "/templates/sage-story/v1";

/**
 * Three real envelope layers, stacked in the body's coordinate system (see globals.css):
 *  - body:        the envelope front
 *  - flap-closed: the flap lying closed over the body (hinged at the body's top edge)
 *  - flap-open:   the inside of the flap once opened (standing on the same hinge)
 * Opening swings the closed flap to edge-on, then lands the open flap in its place.
 *
 * `monogram` (the couple's initials) is drawn ON the closed flap, so it swings open with it.
 */
export function EnvelopeArt({ monogram }: { monogram?: React.ReactNode }) {
  return (
    <span className="env-art" aria-hidden="true">
      {/* eslint-disable @next/next/no-img-element */}
      <img className="env-body" src={`${ART}/envelope-body.webp`} alt="" width={1200} height={772} decoding="async" draggable={false} />
      <img className="env-flap-open" src={`${ART}/envelope-flap-open.webp`} alt="" width={1182} height={587} decoding="async" draggable={false} />
      <span className="env-flap-closed">
        <img src={`${ART}/envelope-flap-closed.webp`} alt="" width={1200} height={605} decoding="async" draggable={false} />
        {monogram}
      </span>
      {/* eslint-enable @next/next/no-img-element */}
    </span>
  );
}
