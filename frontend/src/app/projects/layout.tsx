"use client";

import type { ReactNode } from "react";

import AppShell from "@/components/global/AppShell";

export default function ProjectsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
