"use client";

import type { ReactNode } from "react";

import AppShell from "@/components/global/AppShell";

export default function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
