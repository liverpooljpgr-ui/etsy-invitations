import type { Metadata } from "next";
import { Jost, Oranienbaum, Pinyon_Script } from "next/font/google";
import "./globals.css";

const serif = Oranienbaum({ variable: "--font-serif", subsets: ["latin", "latin-ext", "cyrillic"], weight: "400" });
const script = Pinyon_Script({ variable: "--font-script", subsets: ["latin"], weight: "400" });
const sans = Jost({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PixelBridge Invitations",
  description: "Interactive digital invitations",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${serif.variable} ${script.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
