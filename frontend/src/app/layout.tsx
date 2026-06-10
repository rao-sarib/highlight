import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Highlight AI SEO Tool",
  description: "AI-powered SEO audits, content workflows, and project visibility tooling.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html className="h-full" lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${manrope.variable} ${fraunces.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
