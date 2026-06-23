import * as Sentry from "@sentry/nextjs";
import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import localFont from "next/font/local";

import { AppBackdrop } from "@/components/kash/AppBackdrop";
import { DesktopRuntimeFlag } from "@/components/kash/DesktopRuntimeFlag";
import { DesktopSyncBanner } from "@/components/kash/DesktopSyncBanner";
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
        <TRPCReactProvider>
          {children}
          <DesktopSyncBanner />
        </TRPCReactProvider>
      </body>
    </html>
  );
}
