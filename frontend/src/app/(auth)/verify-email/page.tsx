"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { toast } from "@/store/toastStore";

interface TokenResponse {
  access_token: string;
  token_type: string;
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const establishSession = useAuthStore((state) => state.establishSession);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email…");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // guard against React StrictMode double-invoke
    ran.current = true;

    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setStatus("error");
      setMessage("This verification link is missing its token.");
      return;
    }

    (async () => {
      try {
        const res = await api.post<TokenResponse>("/auth/verify-email", { token });
        await establishSession(res.data.access_token);
        setStatus("success");
        setMessage("Your email is verified. Taking you to your dashboard…");
        toast.success("Email verified — welcome to Highlight!");
        setTimeout(() => router.replace("/dashboard"), 1200);
      } catch (error) {
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "This verification link is invalid or has expired.",
        );
      }
    })();
  }, [establishSession, router]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground">
      <div aria-hidden="true" className="absolute inset-0 bg-aurora" />
      <div aria-hidden="true" className="absolute inset-0 bg-dots opacity-30" />
      <div className="relative w-full max-w-md rounded-[2rem] border border-border/60 bg-card/80 p-8 text-center shadow-soft backdrop-blur-xl">
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
            status === "error" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
          }`}
        >
          {status === "loading" ? (
            <Loader2 className="h-7 w-7 animate-spin" />
          ) : status === "success" ? (
            <CheckCircle2 className="h-7 w-7" />
          ) : (
            <XCircle className="h-7 w-7" />
          )}
        </div>
        <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight">
          {status === "success"
            ? "Email verified"
            : status === "error"
              ? "Verification failed"
              : "Verifying…"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
        {status === "error" ? (
          <div className="mt-6 flex flex-col items-center gap-3">
            <Link
              href="/signup"
              className="btn-brand inline-flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold text-white shadow-glow"
            >
              Back to sign up
            </Link>
            <Link
              href="/login"
              className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              Go to login
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
