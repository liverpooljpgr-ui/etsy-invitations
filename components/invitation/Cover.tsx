import type { Content } from "@/lib/content/schema";
import { coverBottomText, FLYING_PHOTO, PARTY_TEMPLATES, TEMPLATE_COVER, type TemplateSlug } from "@/lib/templates";
import { EnvelopeArt } from "./EnvelopeArt";
import { CoverNames } from "./CoverNames";

/**
 * Inside of the first screen ("cover"): small line, the couple's names, the envelope, a closing line.
 * Used both by the static card 1 (editor preview) and by the tappable overlay (published page).
 * Rendered with spans only, because the published version lives inside a <button>.
 */
export function CoverInner({ content: c, mode, hint, template }: { content: Content; mode: "preview" | "public"; hint?: boolean; template?: TemplateSlug }) {
  const ph = mode === "preview";
  const first = c.couple.first || (ph ? "Beloved" : "");
  const second = c.couple.second || (ph ? "Beloved" : "");
  // First letter of each name, taken from the names above (works for any alphabet or emoji)
  const initial = (n: string) => Array.from(n.trim())[0]?.toUpperCase() ?? "";
  const [i1, i2] = [initial(first), initial(second)];
  const monogram =
    i1 || i2 ? (
      <span className="monogram">
        {i1 && <span>{i1}</span>}
        {i1 && i2 && <span className="amp">&amp;</span>}
        {i2 && <span>{i2}</span>}
      </span>
    ) : null;
  // the Christmas party: the line above the title, the title, then the envelope with the second card inside
  if (template && PARTY_TEMPLATES[template]) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="xm-deco" src="/templates/christmas/v1/garland.webp" alt="" width={1300} height={678} decoding="async" draggable={false} />
        {c.texts.coverIntro && <span className="xm-intro">{c.texts.coverIntro}</span>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {c.texts.coverIntro && <img className="xm-sep" src="/templates/christmas/v1/divider.svg" alt="" width={240} height={28} draggable={false} />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="xm-sep2" src="/templates/christmas/v1/divider-gold.svg" alt="" width={240} height={28} draggable={false} />
        {c.texts.coverTop && <span className="xm-join">{c.texts.coverTop}</span>}
        <span className="xm-title">{c.texts.headline || (ph ? "Your party title" : "")}</span>
        <span className="cover-env">
          <EnvelopeArt template={template} />
        </span>
        <span className="xm-stars" aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="xm-foot" src="/templates/christmas/v1/foot-gold.svg" alt="" width={320} height={44} draggable={false} />
        <span className="xm-glitter" aria-hidden="true" />
        {hint && <span className="env-hint">Tap to open</span>}
      </>
    );
  }
  return (
    <>
      {c.texts.coverTop && !(template && TEMPLATE_COVER[template]?.hideTop) && <span className="cover-top">{c.texts.coverTop}</span>}
      <CoverNames first={first} second={second} />
      <span className="cover-env">
        <EnvelopeArt monogram={monogram} template={template} photo={template && FLYING_PHOTO[template] ? c.photo ?? undefined : undefined} />
      </span>
      {c.texts.coverBottom && <span className="cover-bottom">{coverBottomText(template, c.texts.coverBottom)}</span>}
      {hint && <span className="env-hint">Tap to open</span>}
    </>
  );
}
