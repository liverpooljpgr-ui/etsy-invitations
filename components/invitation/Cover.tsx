import type { Content } from "@/lib/content/schema";
import type { TemplateSlug } from "@/lib/templates";
import { EnvelopeArt } from "./EnvelopeArt";

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
  return (
    <>
      {c.texts.coverTop && <span className="cover-top">{c.texts.coverTop}</span>}
      <span className="cover-names">
        <span>{first}</span>
        <span className="amp">&amp;</span>
        <span>{second}</span>
      </span>
      <span className="cover-env">
        <EnvelopeArt monogram={monogram} template={template} />
      </span>
      {c.texts.coverBottom && <span className="cover-bottom">{c.texts.coverBottom}</span>}
      {hint && <span className="env-hint">Tap to open</span>}
    </>
  );
}
