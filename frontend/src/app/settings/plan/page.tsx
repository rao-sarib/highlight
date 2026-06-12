"use client";

import { useEffect, useState } from "react";
import { Check, CreditCard, Loader2, Sparkles } from "lucide-react";

import { FeaturePageFrame } from "@/components/global/feature-page-frame";
import api from "@/lib/api";

interface Plan {
  key: string;
  name: string;
  price_monthly: number;
  max_projects: number;
  max_crawl_pages: number;
  monthly_scan_quota: number;
  engines: string[];
  features: string[];
  blurb: string;
}

interface BillingMe {
  plan: Plan;
  usage: { used: number; quota: number; period: string; remaining: number };
  projects_used: number;
  projects_limit: number;
}

const FEATURE_LABELS: Record<string, string> = {
  audit: "Whole-site SEO audit",
  fixes: "On-page fixes",
  prompts: "Prompt optimization",
  lsi: "Semantic keywords",
  analytics: "Analytics",
  visibility: "AI visibility scans",
  content: "AI content generation",
  competitors: "Competitor benchmarking",
  backlinks: "Backlink outreach",
  refresh: "Scheduled content refresh",
  action_plan: "Full Analysis + action plan",
};

export default function PlanPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [me, setMe] = useState<BillingMe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);

  const load = async () => {
    const [plansRes, meRes] = await Promise.all([
      api.get<Plan[]>("/billing/plans"),
      api.get<BillingMe>("/billing/me"),
    ]);
    setPlans(plansRes.data);
    setMe(meRes.data);
  };

  useEffect(() => {
    void load().finally(() => setIsLoading(false));
  }, []);

  const switchPlan = async (key: string) => {
    setSwitching(key);
    try {
      const res = await api.post<BillingMe>("/billing/switch", { plan_key: key });
      setMe(res.data);
    } finally {
      setSwitching(null);
    }
  };

  const usagePct = me ? Math.min((me.usage.used / Math.max(me.usage.quota, 1)) * 100, 100) : 0;

  return (
    <FeaturePageFrame
      eyebrow="Plan & Billing"
      title="Choose your plan"
      description="Plans control how many projects you can run, how deep we crawl, how many AI-visibility scans you get each month, and which engines + features are unlocked. Switching is instant (no payment in this FYP build)."
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your plan…</p>
      ) : (
        <>
          {/* Current usage */}
          {me ? (
            <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Current plan
                    </p>
                    <p className="text-lg font-semibold text-foreground">{me.plan.name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Projects</p>
                    <p className="font-semibold text-foreground">
                      {me.projects_used} / {me.projects_limit}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      AI scans this month
                    </p>
                    <p className="font-semibold text-foreground">
                      {me.usage.used} / {me.usage.quota}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${usagePct}%` }} />
              </div>
            </section>
          ) : null}

          {/* Plan cards */}
          <div className="grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = me?.plan.key === plan.key;
              return (
                <section
                  key={plan.key}
                  className={`relative flex flex-col rounded-[1.5rem] border bg-card p-6 shadow-sm ${
                    isCurrent ? "border-primary ring-2 ring-primary/30" : "border-border/70"
                  }`}
                >
                  {plan.key === "pro" ? (
                    <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-brand-gradient px-3 py-1 text-xs font-semibold text-white shadow-glow">
                      <Sparkles className="h-3 w-3" /> Popular
                    </span>
                  ) : null}
                  <h2 className="text-xl font-semibold text-foreground">{plan.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.blurb}</p>
                  <p className="mt-4">
                    <span className="text-4xl font-semibold text-foreground">${plan.price_monthly}</span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </p>

                  <ul className="mt-5 grid gap-2 text-sm">
                    <li className="flex items-center gap-2 text-foreground">
                      <Check className="h-4 w-4 text-success" /> {plan.max_projects} project
                      {plan.max_projects === 1 ? "" : "s"}
                    </li>
                    <li className="flex items-center gap-2 text-foreground">
                      <Check className="h-4 w-4 text-success" /> Crawl up to {plan.max_crawl_pages} pages
                    </li>
                    <li className="flex items-center gap-2 text-foreground">
                      <Check className="h-4 w-4 text-success" /> {plan.monthly_scan_quota} AI scans / month
                    </li>
                    <li className="flex items-center gap-2 text-foreground">
                      <Check className="h-4 w-4 text-success" /> Engines: {plan.engines.join(", ")}
                    </li>
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-muted-foreground">
                        <Check className="h-4 w-4 text-success/70" /> {FEATURE_LABELS[f] ?? f}
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    disabled={isCurrent || switching === plan.key}
                    onClick={() => void switchPlan(plan.key)}
                    className={`mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition disabled:cursor-not-allowed ${
                      isCurrent
                        ? "border border-border bg-muted text-muted-foreground"
                        : "btn-brand text-white shadow-glow hover:-translate-y-0.5"
                    }`}
                  >
                    {switching === plan.key ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    {isCurrent ? "Current plan" : `Switch to ${plan.name}`}
                  </button>
                </section>
              );
            })}
          </div>
        </>
      )}
    </FeaturePageFrame>
  );
}
