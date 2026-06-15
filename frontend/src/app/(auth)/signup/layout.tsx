import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Start your Highlight workspace — measure AI Share of Voice, audit your site, and generate GEO content that earns citations.",
  alternates: { canonical: "/signup" },
  openGraph: { title: "Create your Highlight account", url: "/signup" },
};

export default function SignupLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
