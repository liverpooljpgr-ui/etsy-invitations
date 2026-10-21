import type { Metadata } from "next";
import { Raleway, Jost, Oranienbaum, Pinyon_Script } from "next/font/google";
import "./globals.css";

const serif = Oranienbaum({ variable: "--font-serif", subsets: ["latin", "latin-ext", "cyrillic"], weight: "400" });
const script = Pinyon_Script({ variable: "--font-script", subsets: ["latin"], weight: "400" });
const sans = Jost({ variable: "--font-sans", subsets: ["latin"] });
// UI body text and labels (the invitation itself keeps its own fonts; UI headings use Nohemi, see globals.css)
const ui = Raleway({ variable: "--font-ui", subsets: ["latin", "latin-ext", "cyrillic"] });

export const metadata: Metadata = {
  title: "PixelBridge Invitations",
  description: "Interactive digital invitations",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${serif.variable} ${script.variable} ${sans.variable} ${ui.variable}`}>
      <body>{children}</body>
    </html>
  );
}
