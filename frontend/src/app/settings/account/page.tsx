"use client";

import { useState } from "react";
import Link from "next/link";
import { CreditCard, Loader2, Lock, ShieldCheck, UserCog } from "lucide-react";

import { FeaturePageFrame } from "@/components/global/feature-page-frame";
import api from "@/lib/api";
import { clearBillingCache, useBilling } from "@/lib/billing";
import { useAuthStore } from "@/store/authStore";

const ROLE_LABELS: Record<string, string> = {
  seo_expert: "SEO Expert",
  content_writer: "Content Writer",
  analytics_manager: "Analytics Manager",
  admin: "Admin",
  seo_manager: "SEO Manager",
  viewer: "Viewer",
};

export default function AccountSettingsPage() {
  const user = useAuthStore((s) => s.user);
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);
  const { me } = useBilling();

  const [name, setName] = useState(user?.full_name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState("");

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  const [planMsg, setPlanMsg] = useState("");
  const [deactivating, setDeactivating] = useState(false);

  const saveName = async () => {
    setNameMsg("");
    setSavingName(true);
    try {
      await api.patch("/users/me", { full_name: name.trim() });
      await fetchCurrentUser();
      setNameMsg("Name updated.");
    } catch (e) {
      setNameMsg(e instanceof Error ? e.message : "Could not update name.");
    } finally {
      setSavingName(false);
    }
  };

  const changePassword = async () => {
    setPwMsg("");
    if (newPw !== confirmPw) {
      setPwMsg("New passwords do not match.");
      return;
    }
    setSavingPw(true);
    try {
      await api.post("/users/me/password", { current_password: curPw, new_password: newPw });
      setCurPw("");
      setNewPw("");
      setConfirmPw("");
      setPwMsg("Password changed.");
    } catch (e) {
      setPwMsg(e instanceof Error ? e.message : "Could not change password.");
    } finally {
      setSavingPw(false);
    }
  };

  const deactivatePlan = async () => {
    setPlanMsg("");
    setDeactivating(true);
    try {
      await api.post("/billing/cancel");
      clearBillingCache();
      setPlanMsg("Your paid plan has been deactivated — you're back on Free.");
    } catch (e) {
      setPlanMsg(e instanceof Error ? e.message : "Could not deactivate plan.");
    } finally {
      setDeactivating(false);
    }
  };

  const isPaid = me ? me.plan.key !== "free" : false;

  return (
    <FeaturePageFrame
      eyebrow="Settings"
      title="Account settings"
      description="Manage your profile, password, and subscription."
    >
      <div className="grid gap-6">
        {/* Profile */}
        <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Profile</h2>
          </div>
          <div className="mt-5 grid gap-4 sm:max-w-md">
            <div>
              <label className="text-sm font-medium text-foreground">Full name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Email: <span className="font-medium text-foreground">{user?.email ?? "—"}</span>
            </div>
            <button
              type="button"
              onClick={() => void saveName()}
              disabled={savingName || !name.trim()}
              className="btn-brand inline-flex h-11 w-fit items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save changes
            </button>
            {nameMsg ? <p className="text-sm text-muted-foreground">{nameMsg}</p> : null}
          </div>
        </section>

        {/* Password */}
        <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Password</h2>
          </div>
          <div className="mt-5 grid gap-4 sm:max-w-md">
            <input
              type="password"
              placeholder="Current password"
              value={curPw}
              onChange={(e) => setCurPw(e.target.value)}
              className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
            />
            <input
              type="password"
              placeholder="New password (min 8 chars)"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
            />
            <button
              type="button"
              onClick={() => void changePassword()}
              disabled={savingPw || curPw.length < 1 || newPw.length < 8}
              className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-xl border border-border bg-background px-6 text-sm font-semibold text-foreground transition hover:border-primary/50 disabled:opacity-60"
            >
              {savingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Change password
            </button>
            {pwMsg ? <p className="text-sm text-muted-foreground">{pwMsg}</p> : null}
          </div>
        </section>

        {/* Subscription */}
        <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Subscription</h2>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm">
              <p className="text-muted-foreground">
                Current plan:{" "}
                <span className="font-semibold text-foreground">{me?.plan.name ?? "—"}</span>
              </p>
              {me ? (
                <p className="mt-1 text-muted-foreground">
                  {me.projects_used}/{me.projects_limit} projects · {me.usage.used}/{me.usage.quota}{" "}
                  AI scans this month
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/settings/plan"
                className="btn-brand inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5"
              >
                {isPaid ? "Change plan" : "Upgrade plan"}
              </Link>
              {isPaid ? (
                <button
                  type="button"
                  onClick={() => void deactivatePlan()}
                  disabled={deactivating}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-background px-5 text-sm font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-60"
                >
                  {deactivating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Deactivate paid plan
                </button>
              ) : null}
            </div>
          </div>
          {planMsg ? <p className="mt-3 text-sm text-muted-foreground">{planMsg}</p> : null}
        </section>

        {/* Role (read-only) */}
        <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Your role</h2>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            You are a{" "}
            <span className="font-semibold text-foreground">
              {ROLE_LABELS[user?.role ?? ""] ?? user?.role ?? "—"}
            </span>
            . Your role determines which tools you can use. Role permissions are managed by an
            administrator.
          </p>
        </section>
      </div>
    </FeaturePageFrame>
  );
}
