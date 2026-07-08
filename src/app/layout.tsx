import * as Sentry from "@sentry/nextjs";
import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import localFont from "next/font/local";

import { AppBackdrop } from "@/components/kash/AppBackdrop";
import { DesktopFullscreenFlag } from "@/components/kash/DesktopFullscreenFlag";
import { DesktopRuntimeFlag } from "@/components/kash/DesktopRuntimeFlag";
import { SpacingVariantInit } from "@/components/kash/dev/SpacingVariantInit";
import { TRPCReactProvider } from "@/trpc/client";

import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-sans",
  display: "swap",
});
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export function generateMetadata(): Metadata {
  return {
    title: "Kash",
    description: "Keyboard-first daily planning",
    other: {
      ...Sentry.getTraceData(),
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${figtree.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppBackdrop />
        <DesktopRuntimeFlag />
        <DesktopFullscreenFlag />
        {process.env.NODE_ENV === "development" ? <SpacingVariantInit /> : null}
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
