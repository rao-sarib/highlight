"use client";

import type { ReactNode } from "react";

import Header from "@/components/global/Header";
import Sidebar from "@/components/global/Sidebar";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="h-screen overflow-hidden bg-background">
      <div className="grid h-full lg:grid-cols-[300px_1fr]">
        <Sidebar />
        <div className="flex min-w-0 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
