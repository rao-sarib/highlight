"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

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
    <main
      className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6"
      style={{
        backgroundImage:
          "radial-gradient(circle at top left, hsl(var(--primary) / 0.18), transparent 30%), radial-gradient(circle at bottom, hsl(var(--accent) / 0.14), transparent 34%)",
      }}
    >
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[2rem] border border-border/60 bg-card/90 p-6 shadow-2xl backdrop-blur sm:p-8">
          <div className="mx-auto max-w-md space-y-8">
            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
                Create account
              </p>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
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
                className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Creating account..." : "Create account"}
              </button>
            </form>

            <div className="rounded-2xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link className="font-semibold text-foreground underline-offset-4 hover:underline" href="/login">
                Sign in instead
              </Link>
            </div>
          </div>
        </section>

        <section className="hidden rounded-[2rem] border border-border/60 bg-card/70 p-10 shadow-2xl backdrop-blur lg:block">
          <div className="max-w-lg space-y-8">
            <div className="inline-flex items-center rounded-full border border-border/70 bg-background/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Built for SEO teams
            </div>
            <div className="space-y-4">
              <h2 className="max-w-md text-5xl font-semibold tracking-tight text-foreground">
                Bring audits, prompts, content, and fixes into one flow.
              </h2>
              <p className="max-w-xl text-lg leading-8 text-muted-foreground">
                Launch faster with a workspace designed around AI visibility, semantic
                content planning, and repeatable SEO execution.
              </p>
            </div>
            <div className="space-y-4">
              {[
                "Secure JWT-based access and project ownership",
                "FastAPI + Temporal backend for long-running AI workflows",
                "RAG context from your own project embeddings",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-border/60 bg-background/80 px-5 py-4 text-sm leading-6 text-muted-foreground"
                >
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
