/** The designs of the website type: where every piece of the collage lies (in the units of an 800-wide reference picture), which pictures it uses and the shape of the mirror's glass.
 *  One page component (components/website) draws every website design from its theme; the colours and the finishing touches are in the design's own stylesheet (app/templates/*.css). */
export type Box = { x: number; y: number; w: number; h: number; r?: number };
export type Deco = { k: string; file: string; cls?: string; z?: number; clip?: string }; // clip: a clip-path, to show only a part of the picture
export type WebsiteTheme = {
  slug: string;
  dir: string; // /templates/<dir>/v1
  stage: { w: number; h: number; x0: number; cw: number }; // x0 and cw: the part of the picture that holds the pieces; it is stretched over the whole width of a phone
  photoRatio: number; // the frame of the photo (the crop tool of the editor uses the same one)
  pos: Record<string, Box>;
  before: Deco[]; // pieces drawn before the mirror
  after: Deco[]; // pieces drawn after the mirror (on top)
  rsvpImg?: string; // the RSVP card as a picture of its own (so its shadow follows its shape), not a background
  rsvpTiers?: boolean; // the RSVP words lie on the tiers of a cake-shaped card: "Please RSVP" on the second, the date (or "RSVP here") on the third
  detailsImg: string; // the picture of the button that opens the details page
  banner: { video?: string; poster: string; image?: string }; // the garden under the page: a moving picture, or a painting
  share: { sealW: number; sealY: number; bg: [string, string]; ink: string; caps: string; flap?: { w: number; x: number; y: number } }; // the link-preview picture: the seal (width and height as a part of the envelope), the paper and the colours of the words
  mobile?: { stage: { w: number; h: number; x0: number; cw: number }; pos: Record<string, Box>; before?: Deco[]; after?: Deco[] }; // a phone: the pieces in one column (a piece missing from pos is not drawn)
  phoneCrop?: { x0: number; cw: number }; // a phone with the computer layout: the part of the stage stretched over the screen (narrower than cw = the pieces bigger; the outer flowers may go past the edges)
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
  share: { sealW: 0.57, sealY: 0.64, bg: ["#ffffff", "#f7f1ee"], ink: "#59394f", caps: "#7b5a6e" },
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
  share: { sealW: 0.27, sealY: 0.6, bg: ["#f9f0ec", "#efdfd9"], ink: "#6a1b32", caps: "#7a3a4b" },
  mirror: {
    // the glass is the real opening of the frame (found in the picture: mirror-glass.png), its box is in percent of the mirror picture
    vars: { "--glass-clip": "none", "--glass-mask": "url(/templates/burgundy-olive-website/v1/mirror-glass.png)", "--gl": "12.91%", "--gt": "8.95%", "--gw": "73.84%", "--gh": "82.59%" },
    ratio: 0.6141,
  },
};


const CHANDELIER: WebsiteTheme = {
  slug: "chandelier-garden-website",
  dir: "chandelier-garden-website",
  stage: { w: 800, h: 1580, x0: 34, cw: 732 },
  photoRatio: 0.77,
  pos: {
    env: { x: 222, y: 252, w: 356, h: 239 }, // the green envelope with a lining
    ornate: { x: 30, y: 378, w: 312, h: 400 }, // the names card
    green: { x: 362, y: 446, w: 400, h: 274 }, // the date and place card: the blue card
    rsvp: { x: 62, y: 776, w: 324, h: 309 }, // the mauve cake-shaped card
    peach: { x: 436, y: 708, w: 288, h: 286 }, // the plates: the button of the details
    photo: { x: 92, y: 1090, w: 300, h: 400, r: -3 }, // a wide print border, with room for a word at the bottom left
    mirror: { x: 325, y: 985, w: 435, h: 507 },
    champagne: { x: 136, y: 274, w: 124, h: 113 },
    chandelier: { x: 245, y: 545, w: 232, h: 255 }, // hangs on a long chain from under the envelope (the canopy of the picture is not drawn)
    chain: { x: 355, y: 440, w: 12, h: 150 }, // the chain: from behind the envelope (its bottom is at y 491) down to the crown of the chandelier
    corner: { x: 561, y: 390, w: 205, h: 230 }, // the flowers on the corner of the blue card: 20 to the right, 10% smaller
    orchid: { x: 74, y: 722, w: 100, h: 102 },
    olive: { x: 306, y: 790, w: 146, h: 243 },
    tulip: { x: 378, y: 780, w: 94, h: 195 },
    queen: { x: 668, y: 722, w: 96, h: 96 },
    seal: { x: 407, y: 195, w: 168, h: 84 }, // the wax seal on the lining of the opened envelope (10% bigger, moved onto the lining)
  },
  before: [],
  after: [
    { k: "seal", file: "seal" },
    { k: "olive", file: "olive", z: 5 },
    { k: "tulip", file: "tulip" },
    { k: "champagne", file: "champagne" },
    { k: "chain", file: "chain", cls: "pw-d-nosh", z: 2 },
    { k: "chandelier", file: "chandelier", cls: "pw-d-nosh", clip: "inset(13% 0 0 0)" },
    { k: "corner", file: "corner", cls: "pw-d-bq" },
    { k: "orchid", file: "orchid" },
    { k: "queen", file: "queen" },
  ],
  rsvpImg: "card-cake",
  rsvpTiers: true,
  detailsImg: "plates",
  banner: { image: "banner.webp", poster: "banner.webp" },
  mobile: {
    // on a phone: one column, the pieces bigger and set left and right in turn; two pieces are in view at a time
    stage: { w: 400, h: 2400, x0: 0, cw: 400 },
    pos: {
      env: { x: 60, y: 253, w: 279, h: 187 },
      seal: { x: 212, y: 170, w: 129, h: 64 }, // on the lining of the opened envelope
      champagne: { x: 4, y: 378, w: 117, h: 107 },
      chandelier: { x: 226, y: 442, w: 172, h: 189 },
      chain: { x: 307, y: 400, w: 9, h: 64 },
      ornate: { x: 8, y: 452, w: 284, h: 364 },
      green: { x: 40, y: 832, w: 346, h: 237 },
      corner: { x: 244, y: 772, w: 155, h: 174 }, // the flowers on the corner of the blue card: 20 to the right, 10% smaller
      orchid: { x: 24, y: 832, w: 84, h: 86 }, // on the top left corner of the blue card
      rsvp: { x: 6, y: 1076, w: 326, h: 311 },
      olive: { x: 300, y: 1090, w: 100, h: 167 },
      tulip: { x: 15, y: 1438, w: 111, h: 230, r: -18 }, // the tulip and the hydrangeas at the plates: turned -18 degrees, 10% bigger, 10 up
      peach: { x: 70, y: 1360, w: 326, h: 324 },
      queen: { x: 326, y: 1330, w: 74, h: 74 },
      photo: { x: 14, y: 1640, w: 270, h: 360, r: -3 }, // goes a little under the plates
      mirror: { x: 80, y: 1966, w: 320, h: 373 },
    },
    after: [
      { k: "seal", file: "seal" },
      { k: "olive", file: "olive", z: 5 },
      { k: "tulip", file: "tulip" },
      { k: "champagne", file: "champagne" },
      { k: "chain", file: "chain", cls: "pw-d-nosh", z: 2 },
      { k: "chandelier", file: "chandelier", cls: "pw-d-nosh", clip: "inset(13% 0 0 0)" },
      { k: "corner", file: "corner", cls: "pw-d-bq" },
      { k: "orchid", file: "orchid" },
      { k: "queen", file: "queen" },
    ],
  },
  share: { sealW: 0.46, sealY: 0.61, bg: ["#ffffff", "#f6f4ee"], ink: "#46627f", caps: "#6f7f8f", flap: { w: 1.062, x: -0.031, y: -0.002 } },
  mirror: {
    // the glass is the real oval of the wreath mirror (found in the picture: mirror-glass.png)
    vars: { "--glass-clip": "none", "--glass-mask": "url(/templates/chandelier-garden-website/v1/mirror-glass.png)", "--gl": "26.92%", "--gt": "23.73%", "--gw": "50.11%", "--gh": "55.78%" },
    ratio: 0.7706,
  },
};

const DAHLIA: WebsiteTheme = {
  slug: "country-dahlia-wedding-website",
  dir: "country-dahlia-wedding-website",
  stage: { w: 800, h: 1600, x0: 6, cw: 750 },
  photoRatio: 0.77,
  pos: {
    env: { x: 226, y: 241, w: 345, h: 231 }, // the pink envelope with the arch painting in its lining
    ornate: { x: 66, y: 465, w: 359, h: 460 }, // the names card
    green: { x: 431, y: 432, w: 311, h: 415 }, // the date and place card: the green card with a bow
    rsvp: { x: 407, y: 842, w: 305, h: 206 }, // the yellow card with hearts
    peach: { x: 112, y: 930, w: 350, h: 187 }, // the cup: the button of the details
    photo: { x: 114, y: 1100, w: 326, h: 424, r: -3 },
    mirror: { x: 405, y: 1015, w: 352, h: 539 },
    jar: { x: 120, y: 216, w: 127, h: 320 },
    vase: { x: 500, y: 222, w: 201, h: 260 },
    bunting: { x: 320, y: 322, w: 425, h: 209 },
    bow: { x: 218, y: 92, w: 150, h: 142 }, // the bow lies over the opened envelope
    gerbera: { x: 28, y: 520, w: 89, h: 160 },
    eucalyptusWhite: { x: 345, y: 430, w: 130, h: 293 },
    bunch: { x: 0, y: 895, w: 220, h: 152 },
    eucalyptusLily: { x: -10, y: 1310, w: 280, h: 270 },
    dahliaPink: { x: 662, y: 1000, w: 85, h: 190 },
  },
  before: [],
  after: [
    { k: "gerbera", file: "gerbera", z: 3 },
    { k: "jar", file: "jar", z: 4 },
    { k: "vase", file: "vase", z: 3 },
    { k: "bunch", file: "bunch", z: 5 },
    { k: "eucalyptusWhite", file: "eucalyptus-center", z: 5 },
    { k: "bunting", file: "bunting" },
    { k: "bow", file: "bow", z: 6 },
    { k: "eucalyptusLily", file: "eucalyptus-photo", z: 2 },
    { k: "dahliaPink", file: "dahlia-pink", z: 4 },
  ],
  detailsImg: "cup",
  banner: { image: "banner.webp", poster: "banner.webp" },
  phoneCrop: { x0: 68, cw: 680 }, // on a phone the pieces are about 10% bigger
  share: { sealW: 0.38, sealY: 0.77, bg: ["#ffffff", "#f7f1ee"], ink: "#3f5f3a", caps: "#8a5a4a", flap: { w: 1.062, x: -0.031, y: -0.002 } },
  mirror: {
    // the glass is the real oval of the mirror on its stand (found in the picture: mirror-glass.png)
    vars: { "--glass-clip": "none", "--glass-mask": "url(/templates/country-dahlia-wedding-website/v1/mirror-glass.png)", "--gl": "22.47%", "--gt": "10.49%", "--gw": "57.78%", "--gh": "62.1%" },
    ratio: 0.6077,
  },
};

export const WEBSITE_THEMES: Record<string, WebsiteTheme> = { [PEACH.slug]: PEACH, [BURGUNDY.slug]: BURGUNDY, [CHANDELIER.slug]: CHANDELIER, [DAHLIA.slug]: DAHLIA };
export const websiteTheme = (slug?: string | null): WebsiteTheme => (slug && WEBSITE_THEMES[slug]) || PEACH;
