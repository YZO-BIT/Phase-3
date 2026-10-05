import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const spaceGrotesk = localFont({
  src: "./fonts/space-grotesk-latin.woff2",
  variable: "--font-space",
  weight: "300 700",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Portal Symbols", "sans-serif"],
});

const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  variable: "--font-inter",
  weight: "400 600",
  display: "swap",
});

export const metadata: Metadata = {
  title: "technIEEEks’26 — Phase 03 | IEEE SB GEHU",
  description: "The official technIEEEks’26 Phase 3 festival portal. Explore 10 technical, strategy, and esports competitions at Graphic Era Hill University, Dehradun, on 16 and 17 October 2026.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${inter.variable}`}>{children}</body>
    </html>
  );
}
