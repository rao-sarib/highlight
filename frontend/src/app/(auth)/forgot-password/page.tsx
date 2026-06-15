"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, Loader2, MailCheck } from "lucide-react";

import api from "@/lib/api";
import { toast } from "@/store/toastStore";

interface ForgotResponse {
  message: string;
  emailed: boolean;
  dev_url?: string | null;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ForgotResponse | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post<ForgotResponse>("/auth/forgot-password", {
        email: email.trim(),
      });
      setResult(res.data);
      if (res.data.emailed) toast.success("Reset link sent — check your inbox.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground">
      <div aria-hidden="true" className="absolute inset-0 bg-aurora" />
      <div aria-hidden="true" className="absolute inset-0 bg-dots opacity-30" />
      <div className="relative w-full max-w-md rounded-[2rem] border border-border/60 bg-card/80 p-8 shadow-soft backdrop-blur-xl">
        {result ? (
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MailCheck className="h-7 w-7" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight">Check your email</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{result.message}</p>

            {result.dev_url ? (
              <a
                href={result.dev_url}
                className="btn-brand mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-glow"
              >
                Reset your password <ArrowRight className="h-4 w-4" />
              </a>
            ) : null}

            <p className="mt-5 text-sm text-muted-foreground">
              <Link
                className="font-semibold text-primary underline-offset-4 hover:underline"
                href="/login"
              >
                Back to login
              </Link>
            </p>
            {result.dev_url ? (
              <p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-left text-xs text-muted-foreground">
                Email isn&apos;t configured yet, so the reset link is shown here for now. Once SMTP is
                enabled in the admin panel, this link is emailed instead.
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-semibold tracking-tight">Forgot your password?</h1>
              <p className="text-sm leading-6 text-muted-foreground">
                Enter the email for your account and we&apos;ll send you a link to reset your password.
              </p>
            </div>
            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
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
              <button
                type="submit"
                disabled={submitting || email.trim().length === 0}
                className="btn-brand inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {submitting ? "Sending…" : "Send reset link"}
                {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Remembered it?{" "}
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
