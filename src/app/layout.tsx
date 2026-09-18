import type { Metadata } from "next";
import { Anton, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/**
 * Two faces, doing two jobs. A heavy condensed grotesque for anything that
 * shouts, and a monospace for everything the player actually reads — briefs,
 * usernames, measurements. It is the type pairing of a crime game's menus, and it
 * keeps the interface from competing with the photographs.
 */
const display = Anton({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "POSTED",
  description: "In Leonida, whatever you post becomes true.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable} h-full`}>
      <body className="h-full overflow-hidden bg-ink text-text">{children}</body>
    </html>
  );
}
