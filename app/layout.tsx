import type { Metadata } from "next";
import { Manrope, Libre_Caslon_Text, Rouge_Script, Jost, Oranienbaum, Pinyon_Script, Licorice, Marcellus, Josefin_Sans } from "next/font/google";
import "./globals.css";

const serif = Oranienbaum({ variable: "--font-serif", subsets: ["latin", "latin-ext", "cyrillic"], weight: "400" });
const script = Pinyon_Script({ variable: "--font-script", subsets: ["latin"], weight: "400" });
const sans = Jost({ variable: "--font-sans", subsets: ["latin"] });
// Platform UI (the invitation itself keeps its own fonts): Manrope for text and labels, Libre Caslon for headings, Rouge Script for accents
const ui = Manrope({ variable: "--font-ui", subsets: ["latin", "latin-ext", "cyrillic"] });
const head = Libre_Caslon_Text({ variable: "--font-head", subsets: ["latin", "latin-ext"], weight: ["400", "700"] });
const accent = Rouge_Script({ variable: "--font-accent", subsets: ["latin"], weight: "400" });

// "White Roses" invitation: a thin handwritten script, a flared serif for headings and a light geometric sans
const wrScript = Licorice({ variable: "--font-wr-script", subsets: ["latin"], weight: "400" });
const wrHead = Marcellus({ variable: "--font-wr-head", subsets: ["latin", "latin-ext"], weight: "400" });
const wrBody = Josefin_Sans({ variable: "--font-wr-body", subsets: ["latin", "latin-ext", "vietnamese"], weight: ["300", "400", "600"] });

export const metadata: Metadata = {
  title: "PixelBridge Invitations",
  description: "Interactive digital invitations",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${serif.variable} ${script.variable} ${sans.variable} ${ui.variable} ${head.variable} ${accent.variable} ${wrScript.variable} ${wrHead.variable} ${wrBody.variable}`}>
      <body>{children}</body>
    </html>
  );
}
