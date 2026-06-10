"use client";

import type { ReactNode } from "react";

interface FeaturePageFrameProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  aside?: ReactNode;
}

export function FeaturePageFrame({
  eyebrow,
  title,
  description,
  children,
  aside,
}: FeaturePageFrameProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-border/70 bg-card p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">
          {eyebrow}
        </p>
        <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {description}
            </p>
          </div>
          {aside ? <div className="lg:max-w-sm">{aside}</div> : null}
        </div>
      </section>

      {children}
    </div>
  );
}
