"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Loader2, Mail, Send } from "lucide-react";

import { Logo } from "@/components/global/Logo";
import api from "@/lib/api";
import { DEFAULT_LANDING } from "@/lib/landing";
import { toast } from "@/store/toastStore";

export default function ContactPage() {
  const [email, setEmail] = useState(DEFAULT_LANDING.footer.email);
  const [brand, setBrand] = useState(DEFAULT_LANDING.brand.name);
  const [name, setName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    api
      .get<{ footer?: { email?: string }; brand?: { name?: string } }>("/site/landing")
      .then((res) => {
        if (res.data?.footer?.email) setEmail(res.data.footer.email);
        if (res.data?.brand?.name) setBrand(res.data.brand.name);
      })
      .catch(() => {});
  }, []);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/site/contact", { name: name.trim(), email: fromEmail.trim(), message: message.trim() });
      setSent(true);
      setName("");
      setFromEmail("");
      setMessage("");
      toast.success("Thanks! Your message has been sent.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send your message.");
    } finally {
      setBusy(false);
    }
  };

  const valid = name.trim() && /\S+@\S+\.\S+/.test(fromEmail) && message.trim().length > 3;

  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 right-0 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-[140px]" />
      </div>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="h-8 w-8" />
            <span className="font-display text-lg font-semibold tracking-tight">{brand}</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back home
          </Link>
        </div>

        <div className="mt-10">
          <h1 className="font-display text-4xl font-semibold tracking-tight">Contact us</h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground">
            Questions about Highlight, pricing, or a partnership? Send us a message and we&apos;ll get
            back to you.
          </p>
          <a
            href={`mailto:${email}`}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/50"
          >
            <Mail className="h-4 w-4 text-primary" /> {email}
          </a>
        </div>

        {sent ? (
          <div className="mt-8 rounded-2xl border border-success/30 bg-success/5 p-6 text-sm text-foreground">
            Thanks — your message has been received. We&apos;ll reply to your email shortly.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 grid gap-4 rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-foreground">Your name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:ring-2 focus:ring-ring/40" />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-foreground">Your email</span>
                <input type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:ring-2 focus:ring-ring/40" />
              </label>
            </div>
            <label className="block text-sm">
              <span className="font-medium text-foreground">Message</span>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1 min-h-32 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-ring/40" />
            </label>
            <button
              type="submit"
              disabled={busy || !valid}
              className="btn-brand inline-flex h-12 w-fit items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {busy ? "Sending…" : "Send message"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
