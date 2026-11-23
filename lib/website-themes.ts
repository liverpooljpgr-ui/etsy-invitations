/** The designs of the website type: where every piece of the collage lies (in the units of an 800-wide reference picture), which pictures it uses and the shape of the mirror's glass.
 *  One page component (components/website) draws every website design from its theme; the colours and the finishing touches are in the design's own stylesheet (app/templates/*.css). */
export type Box = { x: number; y: number; w: number; h: number; r?: number };
export type Deco = { k: string; file: string; cls?: string; z?: number };
export type WebsiteTheme = {
  slug: string;
  dir: string; // /templates/<dir>/v1
  stage: { w: number; h: number; x0: number; cw: number }; // x0 and cw: the part of the picture that holds the pieces; it is stretched over the whole width of a phone
  photoRatio: number; // the frame of the photo (the crop tool of the editor uses the same one)
  pos: Record<string, Box>;
  before: Deco[]; // pieces drawn before the mirror
  after: Deco[]; // pieces drawn after the mirror (on top)
  detailsImg: string; // the picture of the button that opens the details page
  banner: { video?: string; poster: string; image?: string }; // the garden under the page: a moving picture, or a painting
  mirror: { vars: Record<string, string>; ratio: number }; // the glass: its shape (clip-path) and its box in the mirror picture
};

const PEACH: WebsiteTheme = {
  slug: "peach-website",
  dir: "peach-website",
  stage: { w: 800, h: 1550, x0: 34, cw: 708 },
  photoRatio: 3 / 4,
  pos: {
    env: { x: 197, y: 280, w: 350, h: 266 },
    green: { x: 96, y: 486, w: 281, h: 356 },
    ornate: { x: 380, y: 394, w: 322, h: 413 },
    rsvp: { x: 397, y: 767, w: 292, h: 223 },
    peach: { x: 60, y: 796, w: 332, h: 305, r: -8 },
    photo: { x: 123, y: 1086, w: 256, h: 335, r: -3 },
    bq: { x: 62, y: 330, w: 215, h: 202 },
    lavender: { x: 520, y: 243, w: 128, h: 205 },
    small: { x: 296, y: 458, w: 98, h: 59 },
    rose: { x: 360, y: 722, w: 92, h: 125, r: 5 },
    key: { x: 604, y: 672, w: 108, h: 140, r: -10 },
    lilac: { x: 648, y: 766, w: 72, h: 53 },
    spray: { x: 322, y: 1206, w: 190, h: 248 },
    mirror: { x: 360, y: 950, w: 366, h: 438 },
    dragon: { x: 80, y: 880, w: 128, h: 142 },
  },
  before: [{ k: "spray", file: "spray", cls: "pw-d-spray" }],
  after: [
    { k: "bq", file: "bouquet", cls: "pw-d-bq" },
    { k: "lavender", file: "lavender", cls: "pw-d-back" },
    { k: "small", file: "small" },
    { k: "rose", file: "rose" },
    { k: "key", file: "key", cls: "pw-d-key" },
    { k: "lilac", file: "lilac" },
    { k: "dragon", file: "dragonfly" },
  ],
  detailsImg: "peach",
  banner: { video: "garden.mp4", poster: "garden-poster.webp" },
  mirror: { vars: {}, ratio: 0.69 },
};

const BURGUNDY: WebsiteTheme = {
  slug: "burgundy-olive-website",
  dir: "burgundy-olive-website",
  stage: { w: 800, h: 1580, x0: 36, cw: 720 },
  photoRatio: 0.81,
  pos: {
    env: { x: 218, y: 266, w: 360, h: 269 },
    green: { x: 62, y: 392, w: 317, h: 452 }, // the date and place card: the burgundy book
    ornate: { x: 405, y: 372, w: 324, h: 416 }, // the names card
    rsvp: { x: 386, y: 738, w: 352, h: 248, r: -2 }, // the burgundy paper
    peach: { x: 55, y: 838, w: 352, h: 227 }, // the terracotta oval: the button of the details
    photo: { x: 90, y: 1064, w: 314, h: 386, r: -3 },
    mirror: { x: 403, y: 968, w: 322, h: 469 },
    bouquet: { x: 50, y: 270, w: 192, h: 178 },
    orange: { x: 534, y: 283, w: 148, h: 143 },
    petal: { x: 662, y: 396, w: 54, h: 48, r: 8 },
    dahlia: { x: 341, y: 552, w: 98, h: 98 },
    dusty: { x: 344, y: 636, w: 130, h: 128 },
    ribbon: { x: 527, y: 736, w: 208, h: 96 },
    filigree: { x: 650, y: 938, w: 86, h: 95 },
    dark: { x: 46, y: 983, w: 80, h: 84 },
    orchid: { x: 340, y: 978, w: 100, h: 286 },
    peony: { x: 630, y: 1348, w: 122, h: 110 },
  },
  before: [],
  after: [
    { k: "bouquet", file: "bouquet", cls: "pw-d-bq" },
    { k: "orange", file: "peony-orange" },
    { k: "petal", file: "petal" },
    { k: "dahlia", file: "dahlia-magenta" },
    { k: "dusty", file: "peony-dusty" },
    { k: "ribbon", file: "ribbon", z: 4 },
    { k: "filigree", file: "filigree" },
    { k: "dark", file: "dahlia-dark" },
    { k: "orchid", file: "orchid" },
    { k: "peony", file: "peony-red" },
  ],
  detailsImg: "oval",
  banner: { image: "banner.webp", poster: "banner.webp" },
  mirror: {
    // the glass is the real opening of the frame (found in the picture: mirror-glass.png), its box is in percent of the mirror picture
    vars: { "--glass-clip": "none", "--glass-mask": "url(/templates/burgundy-olive-website/v1/mirror-glass.png)", "--gl": "12.91%", "--gt": "8.95%", "--gw": "73.84%", "--gh": "82.59%" },
    ratio: 0.6141,
  },
};

export const WEBSITE_THEMES: Record<string, WebsiteTheme> = { [PEACH.slug]: PEACH, [BURGUNDY.slug]: BURGUNDY };
export const websiteTheme = (slug?: string | null): WebsiteTheme => (slug && WEBSITE_THEMES[slug]) || PEACH;
