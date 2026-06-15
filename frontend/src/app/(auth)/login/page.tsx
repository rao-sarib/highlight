"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

import api from "@/lib/api";
import { LogoGlyph } from "@/components/global/Logo";
import { useAuthStore } from "@/store/authStore";
import { toast } from "@/store/toastStore";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const needsVerification = errorMessage.toLowerCase().includes("verify your email");

  const resendVerification = async () => {
    setResending(true);
    try {
      await api.post("/auth/resend-verification", { email: email.trim() });
      toast.success("Verification email sent — check your inbox.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't resend the email.");
    } finally {
      setResending(false);
    }
  };

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [hasHydrated, isAuthenticated, router]);

  const isDisabled = useMemo(() => {
    return isSubmitting || email.trim().length === 0 || password.trim().length === 0;
  }, [email, isSubmitting, password]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await login({
        email: email.trim(),
        password,
      });
      router.push("/dashboard");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to sign you in right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Already signed in — show a redirect spinner instead of the form (avoids the
  // "blank login flashes then jumps to dashboard" effect on slow loads).
  if (hasHydrated && isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> You&apos;re signed in — taking you to your
        dashboard…
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-10 text-foreground sm:px-6">
      <div aria-hidden="true" className="absolute inset-0 bg-aurora" />
      <div aria-hidden="true" className="absolute inset-0 bg-dots opacity-30" />

      <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden rounded-[2rem] border border-border/60 bg-brand-gradient p-10 text-white shadow-glow lg:block">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-dots opacity-20" />
          <div className="relative max-w-lg space-y-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-inset ring-white/25">
                <LogoGlyph className="h-6 w-6" />
              </div>
              <p className="font-display text-lg font-semibold tracking-tight">Highlight</p>
            </div>
            <div className="space-y-4">
              <h1 className="max-w-md font-display text-5xl font-semibold tracking-tight">
                Step back into your SEO command center.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-white/85">
                Audit websites, generate AI-ready content, and keep every project moving
                with a cleaner workflow built for search teams.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Prompt optimization for AI search",
                "RAG-assisted content generation",
                "Competitor and visibility analysis",
                "Temporal-powered automated fixes",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-2.5 rounded-2xl bg-white/10 p-4 text-sm leading-6 text-white/90 ring-1 ring-inset ring-white/15"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-white" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-border/60 bg-card/80 p-6 shadow-soft backdrop-blur-xl sm:p-8">
          <div className="mx-auto max-w-md space-y-8">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/60 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-gradient" />
                Login
              </span>
              <div>
                <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">
                  Welcome back
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Sign in to continue managing projects, content generation, and SEO
                  workflows.
                </p>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="email">
                  Work email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
                  placeholder="name@company.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground" htmlFor="password">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
                  placeholder="Enter your password"
                  required
                />
              </div>

              {errorMessage ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {errorMessage}
                  {needsVerification ? (
                    <button
                      type="button"
                      onClick={resendVerification}
                      disabled={resending}
                      className="mt-2 inline-flex items-center gap-1.5 font-semibold text-destructive underline underline-offset-4 disabled:opacity-60"
                    >
                      {resending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      {resending ? "Sending…" : "Resend verification email"}
                    </button>
                  ) : null}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isDisabled}
                className="btn-brand inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? "Signing in..." : "Sign in"}
                {!isSubmitting ? <ArrowRight className="h-4 w-4" /> : null}
              </button>
            </form>

            <div className="rounded-2xl border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
              New to Highlight?{" "}
              <Link className="font-semibold text-primary underline-offset-4 hover:underline" href="/signup">
                Create your account
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
