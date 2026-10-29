import type { Metadata } from "next";
import { Manrope, Libre_Caslon_Text, Rouge_Script, Jost, Oranienbaum, Pinyon_Script, Licorice, Marcellus, Barlow_Semi_Condensed, Cormorant_Garamond, Herr_Von_Muellerhoff, Mrs_Saint_Delafield } from "next/font/google";
import "./globals.css";
import "./templates/mono-script.css";

const serif = Oranienbaum({ variable: "--font-serif", subsets: ["latin", "latin-ext", "cyrillic"], weight: "400" });
const script = Pinyon_Script({ variable: "--font-script", subsets: ["latin"], weight: "400" });
const sans = Jost({ variable: "--font-sans", subsets: ["latin"] });
// Platform UI (the invitation itself keeps its own fonts): Manrope for text and labels, Libre Caslon for headings, Rouge Script for accents
const ui = Manrope({ variable: "--font-ui", subsets: ["latin", "latin-ext", "cyrillic"] });
const head = Libre_Caslon_Text({ variable: "--font-head", subsets: ["latin", "latin-ext"], weight: ["400", "700"] });
const accent = Rouge_Script({ variable: "--font-accent", subsets: ["latin"], weight: "400" });

// "White Roses" invitation: a thin handwritten script, a flared serif for headings and a light, narrow sans
const wrScript = Licorice({ variable: "--font-wr-script", subsets: ["latin"], weight: "400" });
const wrHead = Marcellus({ variable: "--font-wr-head", subsets: ["latin", "latin-ext"], weight: "400" });
const wrBody = Barlow_Semi_Condensed({ variable: "--font-wr-body", subsets: ["latin", "latin-ext", "vietnamese"], weight: ["300", "400", "600"] });

// "Mono Elegance" invitation: classic letterpress capitals (Cormorant) and a swash script for the monogram (Pinyon, shared with the first design)
const meSerif = Cormorant_Garamond({ variable: "--font-me-serif", subsets: ["latin", "latin-ext", "cyrillic"], weight: ["400", "500", "600"] });
const meScript = Herr_Von_Muellerhoff({ variable: "--font-me-script", subsets: ["latin"], weight: "400" });
// "Mono Script" invitation (app/templates/mono-script.css): Mrs Saint Delafield for the handwritten words, Jost (--font-sans) for the spaced capitals
const msScript = Mrs_Saint_Delafield({ variable: "--font-ms-script", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "PixelBridge Invitations",
  description: "Interactive digital invitations",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${serif.variable} ${script.variable} ${sans.variable} ${ui.variable} ${head.variable} ${accent.variable} ${wrScript.variable} ${wrHead.variable} ${wrBody.variable} ${meSerif.variable} ${meScript.variable} ${msScript.variable}`}>
      <body>{children}</body>
    </html>
  );
}
