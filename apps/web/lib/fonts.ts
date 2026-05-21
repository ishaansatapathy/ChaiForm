import { Caveat, Exo_2, Orbitron, Shadows_Into_Light } from "next/font/google";

export const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-orbitron",
  display: "swap",
});

/** Soft slanted marker handwriting — hero headline */
export const shadowsIntoLight = Shadows_Into_Light({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-hand",
  display: "swap",
});

/** Handwritten annotations — ChaiPoll-style callouts */
export const caveat = Caveat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-annotate",
  display: "swap",
});

export const exo2 = Exo_2({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-exo",
  display: "swap",
});
