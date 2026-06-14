"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Lock, Loader2, Sparkles } from "lucide-react";

import { useBilling } from "@/lib/billing";

interface FeaturePageFrameProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  aside?: ReactNode;
  // When set, the page content is locked unless the user's plan includes this
  // feature key (e.g. "fixes", "content"). Free users see an upgrade wall.
  feature?: string;
}

export function FeaturePageFrame({
  eyebrow,
  title,
  description,
  children,
  aside,
  feature,
}: FeaturePageFrameProps) {
  const { me, loading } = useBilling();

  const gated = Boolean(feature);
  const unlocked = !gated || (me?.plan.features?.includes(feature as string) ?? false);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-6 shadow-soft backdrop-blur md:p-8">
        {/* Decorative corner glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/60 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-gradient" />
            {eyebrow}
          </span>
          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
                {title}
              </h1>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {description}
              </p>
            </div>
            {aside ? <div className="lg:max-w-sm">{aside}</div> : null}
          </div>
        </div>
      </section>

      {gated && loading ? (
        <div className="flex items-center justify-center rounded-3xl border border-border/60 bg-card/60 p-12 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking your plan…
        </div>
      ) : unlocked ? (
        children
      ) : (
        <UpgradeWall planName={me?.plan.name ?? "Free"} />
      )}
    </div>
  );
}

function UpgradeWall({ planName }: { planName: string }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card/80 p-10 text-center shadow-soft">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative mx-auto flex max-w-md flex-col items-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="mt-5 font-display text-2xl font-semibold text-foreground">
          This feature is locked
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Your <span className="font-semibold text-foreground">{planName}</span> plan doesn&apos;t
          include this tool. Upgrade to a package to unlock it — every paid plan adds more projects,
          deeper crawls, more AI scans, and more engines.
        </p>
        <Link
          href="/settings/plan"
          className="btn-brand mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5"
        >
          <Sparkles className="h-4 w-4" /> View packages
        </Link>
      </div>
    </section>
  );
}
