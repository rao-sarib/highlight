"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Loader2, XCircle } from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { toast } from "@/store/toastStore";

interface TokenResponse {
  access_token: string;
  token_type: string;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const establishSession = useAuthStore((state) => state.establishSession);
  // undefined = not read yet, null = missing, string = present
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token"));
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("This reset link is missing its token.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post<TokenResponse>("/auth/reset-password", {
        token,
        new_password: password,
      });
      await establishSession(res.data.access_token);
      toast.success("Password updated — you're signed in.");
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reset your password.");
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground">
      <div aria-hidden="true" className="absolute inset-0 bg-aurora" />
      <div aria-hidden="true" className="absolute inset-0 bg-dots opacity-30" />
      <div className="relative w-full max-w-md rounded-[2rem] border border-border/60 bg-card/80 p-8 shadow-soft backdrop-blur-xl">
        {token === undefined ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : token === null ? (
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <XCircle className="h-7 w-7" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight">Invalid reset link</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This password-reset link is missing or malformed. Request a new one to continue.
            </p>
            <Link
              href="/forgot-password"
              className="btn-brand mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold text-white shadow-glow"
            >
              Request a new link
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-semibold tracking-tight">Set a new password</h1>
              <p className="text-sm leading-6 text-muted-foreground">
                Choose a strong password. You&apos;ll be signed in automatically once it&apos;s saved.
              </p>
            </div>
            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="password">
                  New password
                </label>
                <input
                  id="password"
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
                <label className="text-sm font-medium text-foreground" htmlFor="confirm">
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
                  placeholder="Repeat password"
                  required
                />
              </div>

              {error ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="btn-brand inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {submitting ? "Saving…" : "Reset password"}
                {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link
                className="font-semibold text-primary underline-offset-4 hover:underline"
                href="/login"
              >
                Back to login
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
