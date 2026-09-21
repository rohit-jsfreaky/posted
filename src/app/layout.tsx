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

/**
 * What a link to this looks like when somebody pastes it somewhere.
 *
 * A judge meets this before they meet the game — in the submission form, in a
 * thread, in a group chat — and a blank card there is a wasted first impression.
 * The image is the first job already finished: the street the player is about to
 * rewrite, with the man gone off the door and a queue where nobody was. Next
 * finds `opengraph-image.png` and `icon.png` sitting next to this file on its own.
 */
export const metadata: Metadata = {
  metadataBase: new URL("https://posted-omega.vercel.app"),
  title: "POSTED",
  description: "In Leonida, whatever you post becomes true.",
  openGraph: {
    type: "website",
    title: "POSTED",
    description:
      "Edit a photograph, post it, and the city rearranges itself to match your lie. Built with the Unlayer React Image Editor.",
    siteName: "POSTED",
  },
  twitter: {
    card: "summary_large_image",
    title: "POSTED",
    description:
      "Edit a photograph, post it, and the city rearranges itself to match your lie.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable} h-full`}>
      <body className="h-full overflow-hidden bg-ink text-text">{children}</body>
    </html>
  );
}
