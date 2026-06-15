"use client";

import type { ReactNode } from "react";

import Header from "@/components/global/Header";
import Sidebar from "@/components/global/Sidebar";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative h-screen overflow-hidden bg-background">
      {/* Ambient backdrop — aurora wash + slow drifting colour blobs so the app
          never looks flat/white behind the content. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-aurora opacity-70" />
        <div className="absolute -top-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-primary/15 blur-[140px] animate-aurora-drift" />
        <div className="absolute bottom-[-10rem] left-[-6rem] h-[26rem] w-[26rem] rounded-full bg-accent/10 blur-[140px] animate-float-slow" />
      </div>
      <div className="relative grid h-full lg:grid-cols-[290px_1fr]">
        <Sidebar />
        <div className="flex min-w-0 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto px-5 py-6 md:px-8 md:py-8 lg:px-10">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
