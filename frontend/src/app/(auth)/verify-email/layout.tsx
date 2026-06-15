import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Verify your email",
  // Token-dependent utility page — no SEO value, keep it out of the index.
  robots: { index: false, follow: false },
};

export default function VerifyEmailLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
