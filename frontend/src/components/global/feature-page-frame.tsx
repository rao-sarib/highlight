"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();

  const gated = Boolean(feature);
  // Role gate: does the user's RBAC role permit this feature at all?
  const roleAllows = !gated || (me?.role_features?.includes(feature as string) ?? false);
  // Plan gate: does the purchased package include it?
  const planAllows = !gated || (me?.plan.features?.includes(feature as string) ?? false);
  const unlocked = roleAllows && planAllows;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-6 shadow-soft backdrop-blur md:p-8">
        {/* Decorative corner glows — gentle drifting colour */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl animate-float-slow"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-accent/10 blur-3xl animate-float-slow animation-delay-300"
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
      ) : !roleAllows ? (
        <RoleWall />
      ) : (
        <UpgradeWall planName={me?.plan.name ?? "Free"} next={pathname} />
      )}
    </div>
  );
}

function RoleWall() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-warning/40 bg-card/80 p-10 text-center shadow-soft">
      <div className="relative mx-auto flex max-w-md flex-col items-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/10 text-warning">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="mt-5 font-display text-2xl font-semibold text-foreground">
          Your role can&apos;t access this feature
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          This tool isn&apos;t part of your assigned role. If you need access, ask an administrator
          to update your role&apos;s permissions.
        </p>
      </div>
    </section>
  );
}

function UpgradeWall({ planName, next }: { planName: string; next?: string }) {
  const href = next ? `/settings/plan?next=${encodeURIComponent(next)}` : "/settings/plan";
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
          href={href}
          className="btn-brand mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5"
        >
          <Sparkles className="h-4 w-4" /> View packages
        </Link>
      </div>
    </section>
  );
}
