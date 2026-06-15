import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";
import NextTopLoader from "nextjs-toploader";
import Toaster from "@/components/global/Toaster";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://highlight-fyp.netlify.app"),
  title: {
    default: "Highlight — AI SEO & GEO Platform",
    template: "%s · Highlight",
  },
  description:
    "Highlight measures whether AI answer engines (ChatGPT, Perplexity, Gemini) cite your brand, audits your whole site for on-page SEO, and generates the GEO content that wins citations — in one workspace.",
  keywords: [
    "Generative Engine Optimization",
    "GEO",
    "AI SEO",
    "AI visibility",
    "ChatGPT citations",
    "Perplexity SEO",
    "answer engine optimization",
    "AI share of voice",
  ],
  authors: [{ name: "Highlight" }],
  applicationName: "Highlight",
  category: "technology",
  alternates: { canonical: "/" },
  formatDetection: { telephone: false, email: false, address: false },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: {
    type: "website",
    siteName: "Highlight",
    title: "Highlight — Get cited by AI answer engines",
    description:
      "Measure your AI Share of Voice across ChatGPT, Perplexity & Gemini, fix on-page SEO across your whole site, and generate GEO content that earns citations.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Highlight — AI SEO & GEO Platform",
    description:
      "See whether AI engines cite your brand, then generate the content that wins those citations.",
  },
};

export const viewport: Viewport = {
  themeColor: "#6F55EE",
};

// Applied before paint to avoid a flash of the wrong theme.
const themeInitScript = `
(function () {
  var d = document.documentElement;
  // Mark JS as available so scroll-reveal effects engage only with JS on
  // (content stays visible by default for no-JS / SEO / slow hydration).
  d.classList.add('js');
  try {
    var stored = localStorage.getItem('highlight-theme');
    var theme = stored === 'light' || stored === 'dark' ? stored : 'light';
    if (theme === 'dark') d.classList.add('dark');
    else d.classList.remove('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html className="h-full" lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${sora.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
      >
        <NextTopLoader color="#6F55EE" height={3} showSpinner={false} shadow="0 0 10px #1BC8E8" />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
