"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { LogoGlyph } from "@/components/global/Logo";
import { useAuthStore } from "@/store/authStore";

export default function SignupPage() {
  const router = useRouter();
  const signup = useAuthStore((state) => state.signup);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [hasHydrated, isAuthenticated, router]);

  const isDisabled = useMemo(() => {
    return (
      isSubmitting ||
      fullName.trim().length === 0 ||
      email.trim().length === 0 ||
      password.length < 8 ||
      confirmPassword.length < 8
    );
  }, [confirmPassword.length, email, fullName, isSubmitting, password.length]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await signup({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
      });
      router.push("/dashboard");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to create your account right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-10 text-foreground sm:px-6">
      <div aria-hidden="true" className="absolute inset-0 bg-aurora" />
      <div aria-hidden="true" className="absolute inset-0 bg-dots opacity-30" />

      <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[2rem] border border-border/60 bg-card/80 p-6 shadow-soft backdrop-blur-xl sm:p-8">
          <div className="mx-auto max-w-md space-y-8">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/60 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-gradient" />
                Create account
              </span>
              <div>
                <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
                  Start your Highlight workspace
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Join the platform and move straight into AI SEO audits, project tracking,
                  and automated optimization workflows.
                </p>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="full-name">
                  Full name
                </label>
                <input
                  id="full-name"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
                  placeholder="Areeba Khan"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="signup-email">
                  Work email
                </label>
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
                  placeholder="you@company.com"
                  required
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="signup-password">
                    Password
                  </label>
                  <input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
                    placeholder="Minimum 8 characters"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="confirm-password">
                    Confirm password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
                    placeholder="Repeat password"
                    required
                  />
                </div>
              </div>

              {errorMessage ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {errorMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isDisabled}
                className="btn-brand inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {isSubmitting ? "Creating account..." : "Create account"}
                {!isSubmitting ? <ArrowRight className="h-4 w-4" /> : null}
              </button>
            </form>

            <div className="rounded-2xl border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link className="font-semibold text-primary underline-offset-4 hover:underline" href="/login">
                Sign in instead
              </Link>
            </div>
          </div>
        </section>

        <section className="relative hidden overflow-hidden rounded-[2rem] border border-border/60 bg-brand-gradient p-10 text-white shadow-glow lg:block">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-dots opacity-20" />
          <div className="relative max-w-lg space-y-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-inset ring-white/25">
                <LogoGlyph className="h-6 w-6" />
              </div>
              <p className="font-display text-lg font-semibold tracking-tight">Built for SEO teams</p>
            </div>
            <div className="space-y-4">
              <h2 className="max-w-md font-display text-5xl font-semibold tracking-tight">
                Bring audits, prompts, content, and fixes into one flow.
              </h2>
              <p className="max-w-xl text-lg leading-8 text-white/85">
                Launch faster with a workspace designed around AI visibility, semantic
                content planning, and repeatable SEO execution.
              </p>
            </div>
            <div className="space-y-3">
              {[
                "Secure JWT-based access and project ownership",
                "FastAPI + Temporal backend for long-running AI workflows",
                "RAG context from your own project embeddings",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-2.5 rounded-2xl bg-white/10 px-5 py-4 text-sm leading-6 text-white/90 ring-1 ring-inset ring-white/15"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-white" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
