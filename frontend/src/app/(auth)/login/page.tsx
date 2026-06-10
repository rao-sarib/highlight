"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuthStore } from "@/store/authStore";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <main
      className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6"
      style={{
        backgroundImage:
          "radial-gradient(circle at top, hsl(var(--primary) / 0.16), transparent 34%), radial-gradient(circle at bottom right, hsl(var(--accent) / 0.12), transparent 28%)",
      }}
    >
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden rounded-[2rem] border border-border/60 bg-card/70 p-10 shadow-2xl backdrop-blur lg:block">
          <div className="max-w-lg space-y-8">
            <div className="inline-flex items-center rounded-full border border-border/70 bg-background/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Highlight AI SEO
            </div>
            <div className="space-y-4">
              <h1 className="max-w-md text-5xl font-semibold tracking-tight text-foreground">
                Step back into your SEO command center.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-muted-foreground">
                Audit websites, generate AI-ready content, and keep every project moving
                with a cleaner workflow built for search teams.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                "Prompt optimization for AI search",
                "RAG-assisted content generation",
                "Competitor and visibility analysis",
                "Temporal-powered automated fixes",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-border/60 bg-background/80 p-4 text-sm leading-6 text-muted-foreground"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-border/60 bg-card/90 p-6 shadow-2xl backdrop-blur sm:p-8">
          <div className="mx-auto max-w-md space-y-8">
            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
                Login
              </p>
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-foreground">
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
                <label className="text-sm font-medium text-foreground" htmlFor="password">
                  Password
                </label>
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
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isDisabled}
                className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="rounded-2xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
              New to Highlight?{" "}
              <Link className="font-semibold text-foreground underline-offset-4 hover:underline" href="/signup">
                Create your account
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
