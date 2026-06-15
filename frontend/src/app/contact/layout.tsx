import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Questions about Highlight's AI SEO & GEO platform? Send us a message and we'll get back to you.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Highlight",
    description: "Get in touch with the Highlight team about AI SEO & GEO.",
    url: "/contact",
  },
};

export default function ContactLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
