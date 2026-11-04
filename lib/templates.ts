/** The invitation designs we sell. The slug is what the `templates` table stores; the page paints itself from it. */
export const TEMPLATES = ["sage-story", "white-roses", "mono-script", "cupid-script"] as const;
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
};

/** The shape the couple's photo is shown in: the first design uses an arch, White Roses an oval. */
export type PhotoShape = "arch" | "oval" | "rect";
export const PHOTO_SHAPE: Record<TemplateSlug, PhotoShape> = { "sage-story": "arch", "white-roses": "oval", "mono-script": "rect", "cupid-script": "rect" };

/** Width / height of the photo frame (the crop tool and the invitation use the same one). 3 / 4 unless a design says otherwise. */
export const PHOTO_FRAME: Record<TemplateSlug, number> = { "sage-story": 3 / 4, "white-roses": 3 / 4, "mono-script": 12 / 14, "cupid-script": 12 / 14 };

/** A wax seal picture lying on the closed envelope (it dissolves when the envelope is tapped). Only the designs listed here have one. */
export const ENVELOPE_SEAL: Partial<Record<TemplateSlug, string>> = { "mono-script": "/templates/script/v1/seal.webp", "cupid-script": "/templates/cupid/v1/seal.webp" };

/** Designs where the couple's photo slides out of the opening envelope and lands on the second screen. */
export const FLYING_PHOTO: Partial<Record<TemplateSlug, true>> = { "mono-script": true, "cupid-script": true };

/** Designs whose envelope has a separate lining picture (envelope-liner) seen in the V of the pocket: the photo slides out between it and the pocket front. */
export const ENVELOPE_LINER: Partial<Record<TemplateSlug, true>> = { "mono-script": true, "cupid-script": true };
