"use client";

import { useEffect, useState } from "react";
import { Check, CreditCard, Loader2, Lock, Sparkles } from "lucide-react";

import { FeaturePageFrame } from "@/components/global/feature-page-frame";
import api from "@/lib/api";
import { type BillingMe, type BillingPlan, clearBillingCache, fetchBillingMe } from "@/lib/billing";

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

const ENGINE_LABELS: Record<string, string> = {
  perplexity: "Perplexity",
  openai: "ChatGPT",
  gemini: "Gemini",
  google_aio: "Google AI Overview",
};

const ALL_FEATURES = [
  "audit",
  "fixes",
  "prompts",
  "lsi",
  "analytics",
  "visibility",
  "action_plan",
  "content",
  "competitors",
  "backlinks",
  "refresh",
];

export default function PlanPage() {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [me, setMe] = useState<BillingMe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>("");

  const load = async () => {
    const [plansRes, meData] = await Promise.all([
      api.get<BillingPlan[]>("/billing/plans"),
      fetchBillingMe(true),
    ]);
    setPlans(plansRes.data);
    setMe(meData);
  };

  useEffect(() => {
    void load().finally(() => setIsLoading(false));
    // Surface the result of a Stripe redirect (?checkout=success|cancelled).
    const params = new URLSearchParams(window.location.search);
    const c = params.get("checkout");
    if (c === "success") setNotice("Payment complete — your plan has been upgraded.");
    if (c === "cancelled") setNotice("Checkout cancelled — no changes were made.");
  }, []);

  // Test bypass — activate a package instantly without paying (demo only).
  const activateTest = async (key: string) => {
    setBusy(key);
    setNotice("");
    try {
      const res = await api.post<BillingMe>("/billing/dev-activate", { plan_key: key });
      setMe(res.data);
      clearBillingCache();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not activate plan.");
    } finally {
      setBusy(null);
    }
  };

  // Real payment — redirect to Stripe hosted checkout.
  const buyWithStripe = async (key: string) => {
    setBusy(`stripe-${key}`);
    setNotice("");
    try {
      const res = await api.post<{ url: string }>("/billing/checkout", { plan_key: key });
      window.location.href = res.data.url;
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `${error.message} (tip: use "Activate (test)" for the $0 demo).`
          : "Could not start checkout.",
      );
      setBusy(null);
    }
  };

  const usagePct = me ? Math.min((me.usage.used / Math.max(me.usage.quota, 1)) * 100, 100) : 0;

  return (
    <FeaturePageFrame
      eyebrow="Plan & Billing"
      title="Choose your package"
      description="Free lets you register one site and run a quick AI-visibility test. Buy a package to unlock the full report and tools — each tier adds more projects, deeper crawls, more AI scans, more engines, and more features."
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your plan…</p>
      ) : (
        <>
          {notice ? (
            <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
              {notice}
            </div>
          ) : null}

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
              {!me.stripe_enabled ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Stripe isn&apos;t configured yet — use “Activate (test)” to switch packages for the
                  demo. Add Stripe keys to enable real checkout.
                </p>
              ) : null}
            </section>
          ) : null}

          {/* Plan cards */}
          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => {
              const isCurrent = me?.plan.key === plan.key;
              const isFree = !plan.purchasable;
              return (
                <section
                  key={plan.key}
                  className={`relative flex flex-col rounded-[1.5rem] border bg-card p-6 shadow-sm ${
                    isCurrent ? "border-primary ring-2 ring-primary/30" : "border-border/70"
                  }`}
                >
                  {plan.key === "pro_plus" ? (
                    <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-brand-gradient px-3 py-1 text-xs font-semibold text-white shadow-glow">
                      <Sparkles className="h-3 w-3" /> Popular
                    </span>
                  ) : null}
                  <h2 className="text-xl font-semibold text-foreground">{plan.name}</h2>
                  <p className="mt-1 min-h-[2.5rem] text-sm text-muted-foreground">{plan.blurb}</p>
                  <p className="mt-4">
                    <span className="text-4xl font-semibold text-foreground">${plan.price_monthly}</span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </p>

                  <ul className="mt-5 grid flex-1 gap-2 text-sm">
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
                      <Check className="h-4 w-4 text-success" />{" "}
                      {plan.engines.map((e) => ENGINE_LABELS[e] ?? e).join(", ")}
                    </li>
                    {isFree ? (
                      <li className="flex items-center gap-2 text-muted-foreground">
                        <Check className="h-4 w-4 text-success/70" /> Initial AI-visibility test score
                      </li>
                    ) : (
                      ALL_FEATURES.filter((f) => plan.features.includes(f)).map((f) => (
                        <li key={f} className="flex items-center gap-2 text-muted-foreground">
                          <Check className="h-4 w-4 text-success/70" /> {FEATURE_LABELS[f] ?? f}
                        </li>
                      ))
                    )}
                    {!isFree
                      ? ALL_FEATURES.filter((f) => !plan.features.includes(f)).map((f) => (
                          <li key={f} className="flex items-center gap-2 text-muted-foreground/50">
                            <Lock className="h-3.5 w-3.5" /> {FEATURE_LABELS[f] ?? f}
                          </li>
                        ))
                      : null}
                  </ul>

                  {/* Actions */}
                  <div className="mt-6 grid gap-2">
                    {isCurrent ? (
                      <button
                        type="button"
                        disabled
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-muted px-5 text-sm font-semibold text-muted-foreground"
                      >
                        Current plan
                      </button>
                    ) : isFree ? (
                      <button
                        type="button"
                        disabled={busy === plan.key}
                        onClick={() => void activateTest(plan.key)}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 text-sm font-semibold text-foreground transition hover:border-primary/50 disabled:opacity-60"
                      >
                        {busy === plan.key ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Switch to Free (test)
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={busy === `stripe-${plan.key}`}
                          onClick={() => void buyWithStripe(plan.key)}
                          className="btn-brand inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 disabled:opacity-60"
                        >
                          {busy === `stripe-${plan.key}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CreditCard className="h-4 w-4" />
                          )}
                          Subscribe with Stripe
                        </button>
                        {/* TEST ONLY — bypasses payment. Remove before production. */}
                        <button
                          type="button"
                          disabled={busy === plan.key}
                          onClick={() => void activateTest(plan.key)}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-background px-5 text-xs font-semibold text-primary transition hover:bg-primary/5 disabled:opacity-60"
                        >
                          {busy === plan.key ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          Activate (test — no payment)
                        </button>
                      </>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}
    </FeaturePageFrame>
  );
}
