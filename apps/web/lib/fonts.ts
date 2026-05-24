import { Caveat, Exo_2, Orbitron, Rubik_Dirt } from "next/font/google";

/** BRAVE GATES-style heavy rough brush — hero headline */
export const rubikDirt = Rubik_Dirt({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-brush",
  display: "swap",
});

export const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-orbitron",
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
