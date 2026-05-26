import localFont from "next/font/local";

/** BRAVE GATES-style heavy rough brush — hero headline */
export const rubikDirt = localFont({
  src: "../node_modules/@fontsource/rubik-dirt/files/rubik-dirt-latin-400-normal.woff2",
  weight: "400",
  variable: "--font-brush",
  display: "swap",
});

export const orbitron = localFont({
  src: [
    {
      path: "../node_modules/@fontsource/orbitron/files/orbitron-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/orbitron/files/orbitron-latin-800-normal.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/orbitron/files/orbitron-latin-900-normal.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-orbitron",
  display: "swap",
});

/** Handwritten annotations for callouts */
export const caveat = localFont({
  src: [
    {
      path: "../node_modules/@fontsource/caveat/files/caveat-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/caveat/files/caveat-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/caveat/files/caveat-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-annotate",
  display: "swap",
});

export const exo2 = localFont({
  src: [
    {
      path: "../node_modules/@fontsource/exo-2/files/exo-2-latin-300-normal.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/exo-2/files/exo-2-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/exo-2/files/exo-2-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-exo",
  display: "swap",
});
