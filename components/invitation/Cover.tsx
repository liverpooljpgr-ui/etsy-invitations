import type { Content } from "@/lib/content/schema";
import { EnvelopeArt } from "./EnvelopeArt";

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
        <EnvelopeArt />
      </span>
      {c.texts.coverBottom && <span className="cover-bottom">{c.texts.coverBottom}</span>}
      {hint && <span className="env-hint">Tap to open</span>}
    </>
  );
}
