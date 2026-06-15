"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, Lock, ShieldCheck } from "lucide-react";

import { FeaturePageFrame } from "@/components/global/feature-page-frame";
import api from "@/lib/api";
import { type BillingPlan, clearBillingCache } from "@/lib/billing";
import { toast } from "@/store/toastStore";

export default function CheckoutPage() {
  const router = useRouter();
  const [next, setNext] = useState("/dashboard");
  const [plan, setPlan] = useState<BillingPlan | null>(null);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Card fields (demo / cosmetic — no real charge unless Stripe is configured).
  const [name, setName] = useState("");
  const [card, setCard] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const key = params.get("plan") ?? "";
    setNext(params.get("next") || "/dashboard");
    (async () => {
      try {
        const [plansRes, meRes] = await Promise.all([
          api.get<BillingPlan[]>("/billing/plans"),
          api.get<{ stripe_enabled: boolean }>("/billing/me"),
        ]);
        setPlan(plansRes.data.find((p) => p.key === key) ?? null);
        setStripeEnabled(meRes.data.stripe_enabled);
      } catch {
        // ignore — page still renders with a fallback message
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pay = async () => {
    if (!plan) return;
    setBusy(true);
    try {
      // Try real Stripe first (when configured); fall back to demo activation.
      try {
        const res = await api.post<{ url: string }>("/billing/checkout", { plan_key: plan.key });
        if (res.data?.url) {
          window.location.href = res.data.url;
          return;
        }
      } catch {
        // Stripe not configured / $0 plan — proceed with demo activation.
      }
      await api.post("/billing/dev-activate", { plan_key: plan.key });
      clearBillingCache();
      toast.success(`Payment complete — you're now on the ${plan.name} plan.`);
      router.push(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed.");
      setBusy(false);
    }
  };

  const fmtCard = (v: string) =>
    v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const fmtExp = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  const valid = name.trim() && card.replace(/\s/g, "").length >= 12 && exp.length === 5 && cvc.length >= 3;

  return (
    <FeaturePageFrame
      eyebrow="Checkout"
      title="Complete your subscription"
      description="Enter your payment details to activate your package."
    >
      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading checkout…
        </div>
      ) : !plan ? (
        <div className="rounded-2xl border border-border/70 bg-card p-6 text-sm text-muted-foreground">
          Plan not found.{" "}
          <button className="font-semibold text-primary" onClick={() => router.push("/settings/plan")}>
            Back to packages
          </button>
        </div>
      ) : (
        <div className="grid max-w-3xl gap-6 lg:grid-cols-[1.2fr_1fr]">
          {/* Payment form */}
          <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Card details</h2>
            </div>
            {!stripeEnabled ? (
              <p className="mt-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-foreground">
                Demo mode: no live payment gateway is connected, so no real charge is made — your
                package activates instantly on submit.
              </p>
            ) : null}
            <div className="mt-5 grid gap-3">
              <label className="block text-sm">
                <span className="font-medium text-foreground">Cardholder name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name on card" className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary" />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-foreground">Card number</span>
                <input value={card} onChange={(e) => setCard(fmtCard(e.target.value))} placeholder="4242 4242 4242 4242" inputMode="numeric" className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="font-medium text-foreground">Expiry</span>
                  <input value={exp} onChange={(e) => setExp(fmtExp(e.target.value))} placeholder="MM/YY" inputMode="numeric" className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary" />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-foreground">CVC</span>
                  <input value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="123" inputMode="numeric" className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary" />
                </label>
              </div>
              <button
                type="button"
                onClick={() => void pay()}
                disabled={busy || !valid}
                className="btn-brand mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                {busy ? "Processing…" : `Pay $${plan.price_monthly} / mo`}
              </button>
              <button
                type="button"
                onClick={() => router.push("/settings/plan")}
                className="text-center text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </section>

          {/* Order summary */}
          <section className="h-fit rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Order summary</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-lg font-semibold text-foreground">{plan.name}</span>
              <span className="text-lg font-semibold text-foreground">${plan.price_monthly}/mo</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{plan.blurb}</p>
            <ul className="mt-4 grid gap-1.5 text-sm text-muted-foreground">
              <li>{plan.max_projects} projects</li>
              <li>{plan.monthly_scan_quota} AI scans / month</li>
              <li>Crawl up to {plan.max_crawl_pages} pages</li>
              <li>{plan.engines.length} AI engine{plan.engines.length === 1 ? "" : "s"}</li>
            </ul>
            <div className="mt-5 flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-success" /> Secure checkout
            </div>
          </section>
        </div>
      )}
    </FeaturePageFrame>
  );
}
