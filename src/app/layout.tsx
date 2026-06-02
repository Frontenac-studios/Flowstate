import * as Sentry from "@sentry/nextjs";
import type { Metadata } from "next";
import localFont from "next/font/local";

import { AppBackdrop } from "@/components/kash/AppBackdrop";
import { TRPCReactProvider } from "@/trpc/client";

import "./globals.css";

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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AppBackdrop />
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
