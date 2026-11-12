import type { Metadata } from "next";
import { Manrope, Libre_Caslon_Text, Rouge_Script, Jost, Oranienbaum, Pinyon_Script, Licorice, Marcellus, Barlow_Semi_Condensed, Mrs_Saint_Delafield, Alex_Brush, Mea_Culpa, Playfair_Display } from "next/font/google";
import "./globals.css";
import "./templates/mono-script.css";
import "./templates/cupid-script.css";
import "./templates/lilac-script.css";
import "./templates/sage-forest.css";

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

// "Mono Script" invitation (app/templates/mono-script.css): Mrs Saint Delafield for the handwritten words, Jost (--font-sans) for the spaced capitals
const msScript = Mrs_Saint_Delafield({ variable: "--font-ms-script", subsets: ["latin"], weight: "400" });
// the handwritten words of the Cupid Script invitation (app/templates/cupid-script.css)
// the handwritten words of the Lilac Script invitation (app/templates/lilac-script.css)
const meaCulpa = Mea_Culpa({ variable: "--font-mea-culpa", subsets: ["latin"], weight: "400" });
// "Sage Garden" invitation (app/templates/sage-forest.css): Playfair Display (lining figures) for the spaced capitals, the italic lines and the big day number
const sfSerif = Playfair_Display({ variable: "--font-sf-serif", subsets: ["latin", "latin-ext", "cyrillic"], weight: ["400", "500", "700"], style: ["normal", "italic"] });
const alexBrush = Alex_Brush({ variable: "--font-alex-brush", subsets: ["latin", "latin-ext"], weight: "400" });

export const metadata: Metadata = {
  title: "PixelBridge Invitations",
  description: "Interactive digital invitations",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${serif.variable} ${script.variable} ${sans.variable} ${ui.variable} ${head.variable} ${accent.variable} ${wrScript.variable} ${wrHead.variable} ${wrBody.variable} ${msScript.variable} ${alexBrush.variable} ${meaCulpa.variable} ${sfSerif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
