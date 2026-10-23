/** The invitation designs we sell. The slug is what the `templates` table stores; the page paints itself from it. */
export const TEMPLATES = ["sage-story", "white-roses"] as const;
export type TemplateSlug = (typeof TEMPLATES)[number];
export const DEFAULT_TEMPLATE: TemplateSlug = "sage-story";

export function templateSlug(v: unknown): TemplateSlug {
  return (TEMPLATES as readonly string[]).includes(v as string) ? (v as TemplateSlug) : DEFAULT_TEMPLATE;
}

/** Where each design keeps its envelope pictures (and their file type). White Roses draws a plain paper envelope: no flowers. */
export const ENVELOPE_ART: Record<TemplateSlug, { base: string; ext: "webp" | "svg" }> = {
  "sage-story": { base: "/templates/sage-story/v1", ext: "webp" },
  "white-roses": { base: "/templates/white-roses/v1", ext: "svg" },
};
