import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Log in",
  description: "Sign in to your Highlight workspace to manage AI SEO audits, projects, and GEO content.",
  alternates: { canonical: "/login" },
  openGraph: { title: "Log in to Highlight", url: "/login" },
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
