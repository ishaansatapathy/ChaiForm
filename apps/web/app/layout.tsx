import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { caveat, exo2, orbitron, rubikDirt, shadowsIntoLight } from "~/lib/fonts";
import { GlobalProviders } from "~/providers/global";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "ChaiForm",
  description: "Production-style form builder SaaS — create, publish and collect responses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} ${exo2.variable} ${shadowsIntoLight.variable} ${caveat.variable} ${rubikDirt.variable}`}
      >
        <GlobalProviders>{children}</GlobalProviders>
      </body>
    </html>
  );
}
