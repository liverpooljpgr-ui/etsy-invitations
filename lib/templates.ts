/** The invitation designs we sell (and the Peach Website, a one-page wedding website). The slug is what the `templates` table stores; the page paints itself from it. */
export const TEMPLATES = ["sage-story", "white-roses", "mono-script", "cupid-script", "lilac-script", "sage-forest", "christmas-party", "christmas-velvet", "peach-website", "burgundy-olive-website", "chandelier-garden-website", "country-dahlia-wedding-website", "christmas-amsterdam", "christmas-paris"] as const;
export type TemplateSlug = (typeof TEMPLATES)[number];
export const DEFAULT_TEMPLATE: TemplateSlug = "sage-story";

/** Old internal names of designs that were renamed: a database row may still carry one */
const OLD_NAMES: Record<string, TemplateSlug> = { "dahlia-village-website": "country-dahlia-wedding-website", "cozy-blue-city": "christmas-amsterdam" };
export function templateSlug(v: unknown): TemplateSlug {
  const s = OLD_NAMES[v as string] ?? v;
  return (TEMPLATES as readonly string[]).includes(s as string) ? (s as TemplateSlug) : DEFAULT_TEMPLATE;
}

/** Where each design keeps its envelope pictures (and their file type). White Roses has its own envelope pictures (made from the files in assets/white-roses). */
export const ENVELOPE_ART: Record<TemplateSlug, { base: string; ext: "webp" | "svg" }> = {
  "sage-story": { base: "/templates/aquarelle/v1", ext: "webp" },
  "white-roses": { base: "/templates/jasmin/v1", ext: "webp" },
  "mono-script": { base: "/templates/script/v1", ext: "webp" },
  "cupid-script": { base: "/templates/cupid/v1", ext: "webp" },
  "lilac-script": { base: "/templates/lilac/v1", ext: "webp" },
  "sage-forest": { base: "/templates/forest/v1", ext: "webp" },
  "christmas-party": { base: "/templates/christmas/v1", ext: "webp" }, //
  "christmas-velvet": { base: "/templates/christmas-velvet/v1", ext: "webp" },
  "peach-website": { base: "/templates/forest/v1", ext: "webp" },
  "burgundy-olive-website": { base: "/templates/forest/v1", ext: "webp" }, // the wedding website uses the Sage Garden pictures
  "chandelier-garden-website": { base: "/templates/forest/v1", ext: "webp" },
  "country-dahlia-wedding-website": { base: "/templates/forest/v1", ext: "webp" },
  "christmas-amsterdam": { base: "/templates/forest/v1", ext: "webp" }, // has its own cover (the present), not an envelope
  "christmas-paris": { base: "/templates/forest/v1", ext: "webp" }, // the same: its own present on the cover
};

/** The shape the couple's photo is shown in: the first design uses an arch, White Roses an oval. */
export type PhotoShape = "arch" | "oval" | "rect";
export const PHOTO_SHAPE: Record<TemplateSlug, PhotoShape> = { "sage-story": "arch", "white-roses": "oval", "mono-script": "rect", "cupid-script": "rect", "lilac-script": "rect", "sage-forest": "arch", "christmas-party": "rect", "christmas-velvet": "rect", "peach-website": "rect", "burgundy-olive-website": "rect", "chandelier-garden-website": "rect", "country-dahlia-wedding-website": "rect", "christmas-amsterdam": "rect", "christmas-paris": "rect" };

/** Width / height of the photo frame (the crop tool and the invitation use the same one). 3 / 4 unless a design says otherwise. */
export const PHOTO_FRAME: Record<TemplateSlug, number> = { "sage-story": 3 / 4, "white-roses": 3 / 4, "mono-script": 12 / 13, "cupid-script": 12 / 13, "lilac-script": 12 / 13, "sage-forest": 13 / 16, "christmas-party": 3 / 4, "christmas-velvet": 3 / 4, "peach-website": 3 / 4, "burgundy-olive-website": 0.81, "chandelier-garden-website": 0.77, "country-dahlia-wedding-website": 0.77, "christmas-amsterdam": 3 / 4, "christmas-paris": 3 / 4 };

/** A wax seal picture lying on the closed envelope (it dissolves when the envelope is tapped). Only the designs listed here have one. */
export const ENVELOPE_SEAL: Partial<Record<TemplateSlug, string>> = { "mono-script": "/templates/script/v1/seal.webp", "cupid-script": "/templates/cupid/v1/seal.webp", "lilac-script": "/templates/lilac/v1/seal.webp", "sage-forest": "/templates/forest/v1/seal.webp", "christmas-party": "/templates/christmas/v1/seal.webp", "christmas-velvet": "/templates/christmas-velvet/v1/seal.webp" };

/** Designs where the couple's photo slides out of the opening envelope and lands on the second screen. */
/** Designs whose envelope is made of two layers (the back sheet, then the front pocket) with the photo card sliding out between them: the back sheet is envelope-body-back. */
export const ENVELOPE_BODY_BACK: Partial<Record<TemplateSlug, true>> = { "white-roses": true };
export const FLYING_PHOTO: Partial<Record<TemplateSlug, true>> = { "white-roses": true, "mono-script": true, "cupid-script": true, "lilac-script": true, "sage-forest": true, "christmas-party": true, "christmas-velvet": true };

/** Designs whose envelope has a separate lining picture (envelope-liner) seen in the V of the pocket: the photo slides out between it and the pocket front. */
export const ENVELOPE_LINER: Partial<Record<TemplateSlug, true>> = { "mono-script": true, "cupid-script": true, "lilac-script": true, "sage-forest": true, "christmas-party": true, "christmas-velvet": true };

/** Cover wording that belongs to a design: Cupid Script has no "the wedding of" line and says "you are invited to our wedding" under the envelope
 *  (it replaces the standard "you are invited" until the host writes their own line, so it stays an editable field). */
export const TEMPLATE_COVER: Partial<Record<TemplateSlug, { hideTop?: boolean; bottomDefault?: string }>> = {
  "cupid-script": { hideTop: true, bottomDefault: "you are invited to our wedding" },
  "lilac-script": { hideTop: true, bottomDefault: "you are invited to our wedding" },
  "sage-forest": { hideTop: true, bottomDefault: "you are invited to our wedding" },
};
export function coverBottomText(template: TemplateSlug | undefined, value: string): string {
  const d = template ? TEMPLATE_COVER[template]?.bottomDefault : undefined;
  return d && value.trim().toLowerCase() === "you are invited" ? d : value;
}

/** Designs without an envelope (yet): the cover shows the wreath picture and "Tap to open", and the invitation opens the same way. */

/** The Christmas party design is not a wedding: its host is one name ("The Martins"), its pages are cover, dinner (date, time, place), details, RSVP and closing. */
/** Website-type designs: not an invitation but a one-page wedding website (the envelope, a page of cards, a details page). They have their own editor, with the sections in the order of the website, and their own page (components/website). */
export const WEBSITE_TEMPLATES: Partial<Record<TemplateSlug, true>> = { "peach-website": true, "burgundy-olive-website": true, "chandelier-garden-website": true, "country-dahlia-wedding-website": true };
export const isWebsiteTemplate = (t: TemplateSlug | string | null | undefined): boolean => !!t && !!(WEBSITE_TEMPLATES as Record<string, true | undefined>)[t];

export const PARTY_TEMPLATES: Partial<Record<TemplateSlug, true>> = { "christmas-party": true, "christmas-velvet": true, "christmas-amsterdam": true, "christmas-paris": true };
/** True for the party designs (Christmas Party, Purple Vintage Christmas): same screens, editor and wording. */
export const isPartyTemplate = (slug: string | null | undefined): boolean => !!slug && !!PARTY_TEMPLATES[slug as TemplateSlug];
/** The layout a design is painted with: Purple Vintage Christmas uses the Christmas Party layout (its own pictures, colours and fonts on top, see christmas-velvet.css). */
export const layoutTemplate = (slug: TemplateSlug): TemplateSlug => (slug === "christmas-velvet" ? "christmas-party" : slug);

/** The designs built on the present and the street (Christmas Amsterdam, Christmas Paris): their own screens and editor. */
export const isCozyTemplate = (slug: string | null | undefined): boolean => slug === "christmas-amsterdam" || slug === "christmas-paris";
