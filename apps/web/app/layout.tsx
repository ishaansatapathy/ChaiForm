import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { caveat, exo2, orbitron, rubikDirt } from "~/lib/fonts";
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
  icons: {
    icon: "/favicon.ico?v=4",
    shortcut: "/favicon.ico?v=4",
    apple: "/favicon.ico?v=4",
  },
};

import type { ReactNode } from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: "html,body{background:#020202!important;color:#fff}",
          }}
        />
        <link rel="icon" href="/favicon.ico?v=4" type="image/png" />
        <link rel="shortcut icon" href="/favicon.ico?v=4" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.ico?v=4" />
        <link rel="preload" href="/images/ben10/landing-wallpaper.png" as="image" />
      </head>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} ${exo2.variable} ${caveat.variable} ${rubikDirt.variable} bg-(--landing-bg) text-white antialiased`}
      >
        <GlobalProviders>{children}</GlobalProviders>
      </body>
    </html>
  );
}
