/** The invitation designs we sell. The slug is what the `templates` table stores; the page paints itself from it. */
export const TEMPLATES = ["sage-story", "white-roses", "mono-script", "cupid-script", "lilac-script"] as const;
export type TemplateSlug = (typeof TEMPLATES)[number];
export const DEFAULT_TEMPLATE: TemplateSlug = "sage-story";

export function templateSlug(v: unknown): TemplateSlug {
  return (TEMPLATES as readonly string[]).includes(v as string) ? (v as TemplateSlug) : DEFAULT_TEMPLATE;
}

/** Where each design keeps its envelope pictures (and their file type). White Roses has its own envelope pictures (made from the files in assets/white-roses). */
export const ENVELOPE_ART: Record<TemplateSlug, { base: string; ext: "webp" | "svg" }> = {
  "sage-story": { base: "/templates/aquarelle/v1", ext: "webp" },
  "white-roses": { base: "/templates/jasmin/v1", ext: "webp" },
  "mono-script": { base: "/templates/script/v1", ext: "webp" },
  "cupid-script": { base: "/templates/cupid/v1", ext: "webp" },
  "lilac-script": { base: "/templates/lilac/v1", ext: "webp" },
};

/** The shape the couple's photo is shown in: the first design uses an arch, White Roses an oval. */
export type PhotoShape = "arch" | "oval" | "rect";
export const PHOTO_SHAPE: Record<TemplateSlug, PhotoShape> = { "sage-story": "arch", "white-roses": "oval", "mono-script": "rect", "cupid-script": "rect", "lilac-script": "rect" };

/** Width / height of the photo frame (the crop tool and the invitation use the same one). 3 / 4 unless a design says otherwise. */
export const PHOTO_FRAME: Record<TemplateSlug, number> = { "sage-story": 3 / 4, "white-roses": 3 / 4, "mono-script": 12 / 13, "cupid-script": 12 / 13, "lilac-script": 12 / 13 };

/** A wax seal picture lying on the closed envelope (it dissolves when the envelope is tapped). Only the designs listed here have one. */
export const ENVELOPE_SEAL: Partial<Record<TemplateSlug, string>> = { "mono-script": "/templates/script/v1/seal.webp", "cupid-script": "/templates/cupid/v1/seal.webp", "lilac-script": "/templates/lilac/v1/seal.webp" };

/** Designs where the couple's photo slides out of the opening envelope and lands on the second screen. */
export const FLYING_PHOTO: Partial<Record<TemplateSlug, true>> = { "mono-script": true, "cupid-script": true, "lilac-script": true };

/** Designs whose envelope has a separate lining picture (envelope-liner) seen in the V of the pocket: the photo slides out between it and the pocket front. */
export const ENVELOPE_LINER: Partial<Record<TemplateSlug, true>> = { "mono-script": true, "cupid-script": true, "lilac-script": true };

/** Cover wording that belongs to a design: Cupid Script has no "the wedding of" line and says "you are invited to our wedding" under the envelope
 *  (it replaces the standard "you are invited" until the host writes their own line, so it stays an editable field). */
export const TEMPLATE_COVER: Partial<Record<TemplateSlug, { hideTop?: boolean; bottomDefault?: string }>> = {
  "cupid-script": { hideTop: true, bottomDefault: "you are invited to our wedding" },
  "lilac-script": { hideTop: true, bottomDefault: "you are invited to our wedding" },
};
export function coverBottomText(template: TemplateSlug | undefined, value: string): string {
  const d = template ? TEMPLATE_COVER[template]?.bottomDefault : undefined;
  return d && value.trim().toLowerCase() === "you are invited" ? d : value;
}
