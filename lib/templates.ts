/** The invitation designs we sell. The slug is what the `templates` table stores; the page paints itself from it. */
export const TEMPLATES = ["sage-story", "white-roses", "mono-elegance", "mono-script"] as const;
export type TemplateSlug = (typeof TEMPLATES)[number];
export const DEFAULT_TEMPLATE: TemplateSlug = "sage-story";

export function templateSlug(v: unknown): TemplateSlug {
  return (TEMPLATES as readonly string[]).includes(v as string) ? (v as TemplateSlug) : DEFAULT_TEMPLATE;
}

/** Where each design keeps its envelope pictures (and their file type). White Roses has its own envelope pictures (made from the files in assets/white-roses). */
export const ENVELOPE_ART: Record<TemplateSlug, { base: string; ext: "webp" | "svg" }> = {
  "sage-story": { base: "/templates/aquarelle/v1", ext: "webp" },
  "white-roses": { base: "/templates/jasmin/v1", ext: "webp" },
  "mono-elegance": { base: "/templates/mono/v1", ext: "webp" },
  // placeholder outlines (.svg) until the real envelope pictures are added: put them in public/templates/script/v1 and change ext to "webp" or "png"
  "mono-script": { base: "/templates/script/v1", ext: "svg" },
};

/** The shape the couple's photo is shown in: the first design uses an arch, White Roses an oval, Mono Elegance a plain frame. */
export type PhotoShape = "arch" | "oval" | "rect";
export const PHOTO_SHAPE: Record<TemplateSlug, PhotoShape> = { "sage-story": "arch", "white-roses": "oval", "mono-elegance": "oval", "mono-script": "rect" };

/** Width / height of the photo frame (the crop tool and the invitation use the same one). 3 / 4 unless a design says otherwise. */
export const PHOTO_FRAME: Record<TemplateSlug, number> = { "sage-story": 3 / 4, "white-roses": 3 / 4, "mono-elegance": 3 / 4, "mono-script": 8 / 7 };
