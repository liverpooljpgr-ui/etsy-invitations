import { DEFAULT_TEMPLATE, ENVELOPE_ART, ENVELOPE_LINER, ENVELOPE_SEAL, PHOTO_FRAME, type TemplateSlug } from "@/lib/templates";
import { photoImgStyle } from "@/lib/photo-crop";
import type { Content } from "@/lib/content/schema";

/**
 * Three real envelope layers, stacked in the body's coordinate system (see globals.css):
 *  - body:        the envelope front
 *  - flap-closed: the flap lying closed over the body (hinged at the body's top edge)
 *  - flap-open:   the inside of the flap once opened (standing on the same hinge)
 * Opening swings the closed flap to edge-on, then lands the open flap in its place.
 *
 * `monogram` (the couple's initials) is drawn ON the closed flap, so it swings open with it.
 */
export function EnvelopeArt({ monogram, template = DEFAULT_TEMPLATE, photo }: { monogram?: React.ReactNode; template?: TemplateSlug; photo?: Content["photo"] }) {
  // an unknown design name (e.g. a stale browser copy of the design list) falls back to the default envelope instead of crashing the page
  const tpl: TemplateSlug = template in ENVELOPE_ART ? template : DEFAULT_TEMPLATE;
  const { base: ART, ext } = ENVELOPE_ART[tpl];
  const seal = ENVELOPE_SEAL[tpl];
  return (
    <span className="env-art" aria-hidden="true">
      {/* eslint-disable @next/next/no-img-element */}
      {ENVELOPE_LINER[tpl] && <img className="env-liner" src={`${ART}/envelope-liner.${ext}`} alt="" width={1587} height={1072} decoding="async" draggable={false} />}
      {photo && (
        <span className="env-photo">
          <span className="arch-in">
            <img src={photo.url} alt="" draggable={false} style={photoImgStyle(photo, PHOTO_FRAME[tpl])} />
          </span>
        </span>
      )}
      <img className="env-body" src={`${ART}/envelope-body.${ext}`} alt="" width={1200} height={772} decoding="async" draggable={false} />
      <img className="env-flap-open" src={`${ART}/envelope-flap-open.${ext}`} alt="" width={1182} height={587} decoding="async" draggable={false} />
      <span className="env-flap-closed">
        <img src={`${ART}/envelope-flap-closed.${ext}`} alt="" width={1200} height={605} decoding="async" draggable={false} />
        {monogram}
      </span>
      {seal && <img className="env-seal" src={seal} alt="" width={240} height={228} decoding="async" draggable={false} />}
      {/* eslint-enable @next/next/no-img-element */}
    </span>
  );
}
