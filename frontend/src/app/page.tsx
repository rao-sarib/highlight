"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentType } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  Gauge,
  ScanSearch,
  Search,
  Swords,
} from "lucide-react";

import ProductPreview from "@/components/landing/ProductPreview";
import Reveal from "@/components/landing/Reveal";
import { Logo } from "@/components/global/Logo";
import api from "@/lib/api";
import { DEFAULT_LANDING, type LandingContent } from "@/lib/landing";
import { useAuthStore } from "@/store/authStore";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  Gauge,
  ScanSearch,
  FileText,
  Swords,
  Search,
  ClipboardList,
};

export default function HomePage() {
  // Render defaults immediately (SSR/SEO), then overlay CMS content on mount.
  const [c, setC] = useState<LandingContent>(DEFAULT_LANDING);
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  const hydrated = useAuthStore((s) => s.hasHydrated);
  const loggedIn = hydrated && isAuthed;
  const primaryCtaHref = loggedIn ? "/dashboard" : "/signup";

  useEffect(() => {
    let active = true;
    api
      .get<Partial<LandingContent>>("/site/landing")
      .then((res) => {
        if (active && res.data && typeof res.data === "object") {
          // Shallow-merge top level, deep-merge footer so newer fields (e.g. the
          // contact email) still appear over older saved CMS content.
          setC({
            ...DEFAULT_LANDING,
            ...res.data,
            about: { ...DEFAULT_LANDING.about, ...(res.data.about ?? {}) },
            footer: { ...DEFAULT_LANDING.footer, ...(res.data.footer ?? {}) },
          } as LandingContent);
        }
      })
      .catch(() => {
        /* keep defaults if the API is unreachable */
      });
    return () => {
      active = false;
    };
  }, []);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faq.items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: c.brand.name,
    applicationCategory: "BusinessApplication",
    description: c.hero.subtitle,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <main className="relative min-h-screen overflow-x-clip bg-background text-foreground">
      {/* Scroll-driven progress bar (modern CSS scroll animation) */}
      <div aria-hidden="true" className="scroll-progress" />

      {/* Ambient animated colour — drifting gradient blobs keep the page alive */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:64px_64px] opacity-[0.35] mask-fade-b" />
        <div className="absolute -top-40 -right-24 h-[34rem] w-[34rem] rounded-full bg-primary/20 blur-[150px] animate-aurora-drift" />
        <div className="absolute left-[-10rem] top-[34%] h-[30rem] w-[30rem] rounded-full bg-accent/15 blur-[150px] animate-float-slow" />
        <div className="absolute bottom-[-8rem] right-[6%] h-[28rem] w-[28rem] rounded-full bg-primary/15 blur-[150px] animate-float-slow animation-delay-500" />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* ── Header ─────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 -mx-4 border-b border-border/50 bg-background/80 px-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <Logo className="h-8 w-8" />
              <span className="font-display text-lg font-semibold tracking-tight">{c.brand.name}</span>
            </Link>

            <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
              {c.nav.map((item) => (
                <a key={item.href} className="link-underline transition hover:text-foreground" href={item.href}>
                  {item.label}
                </a>
              ))}
              <a className="link-underline transition hover:text-foreground" href="#about">
                About
              </a>
              <Link className="link-underline transition hover:text-foreground" href="/contact">
                Contact
              </Link>
            </nav>

            <div className="flex items-center gap-2">
              {loggedIn ? (
                <Link
                  href="/dashboard"
                  className="btn-brand inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                >
                  Go to dashboard
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="hidden h-9 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition hover:text-foreground sm:inline-flex"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="btn-brand inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                  >
                    Start free
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        {/* ── Hero ───────────────────────────────────────────── */}
        <section className="grid items-center gap-14 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {c.hero.badge}
            </span>

            <h1 className="mt-6 max-w-xl font-display text-[2.75rem] font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              {c.hero.titleLead} <span className="text-gradient-animated">{c.hero.titleHighlight}</span>{" "}
              {c.hero.titleTail}
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">{c.hero.subtitle}</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={primaryCtaHref}
                className="btn-brand inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5"
              >
                {loggedIn ? "Go to dashboard" : c.hero.primaryCta}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-card px-6 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                {c.hero.secondaryCta}
              </a>
            </div>

            <p className="mt-5 text-sm text-muted-foreground">{c.hero.note}</p>
          </div>

          <div className="relative">
            <div className="absolute -inset-8 -z-10 rounded-[2.5rem] bg-primary/10 blur-3xl" />
            <ProductPreview />
          </div>
        </section>

        {/* ── Engines strip ──────────────────────────────────── */}
        <section className="border-y border-border/50 py-8">
          <p className="text-center text-sm text-muted-foreground">{c.engines.label}</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {c.engines.items.map((name) => (
              <span key={name} className="inline-flex items-center gap-2 text-base font-semibold text-foreground/70">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                {name}
              </span>
            ))}
          </div>
        </section>

        {/* ── Facts ──────────────────────────────────────────── */}
        <section className="grid gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/60 sm:grid-cols-3">
          {c.facts.map((f) => (
            <div key={f.value} className="group bg-card p-6 transition hover:bg-muted/30">
              <p className="font-display text-2xl font-semibold tracking-tight text-gradient">{f.value}</p>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{f.label}</p>
            </div>
          ))}
        </section>

        {/* ── Features ───────────────────────────────────────── */}
        <section id="features" className="py-20 lg:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-sm font-semibold text-primary">{c.features.eyebrow}</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {c.features.title}
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">{c.features.subtitle}</p>
          </Reveal>

          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {c.features.items.map((item, index) => {
              const Icon = ICONS[item.icon] ?? Gauge;
              return (
                <Reveal key={item.title} delay={(index % 3) * 70} className={item.wide ? "lg:col-span-2" : ""}>
                  <article className="card-hover group flex h-full flex-col rounded-2xl border border-border/60 bg-gradient-to-b from-card to-card/40 p-6">
                    <div className="icon-halo flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/15 text-primary transition group-hover:scale-110">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 font-display text-lg font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.body}</p>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* ── How it works ───────────────────────────────────── */}
        <section id="how" className="py-12 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
            <Reveal>
              <p className="text-sm font-semibold text-primary">{c.steps.eyebrow}</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                {c.steps.title}
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">{c.steps.subtitle}</p>
              <Link
                href={primaryCtaHref}
                className="btn-brand mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5"
              >
                {loggedIn ? "Go to dashboard" : c.steps.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>

            <div className="grid gap-3 sm:grid-cols-2">
              {c.steps.items.map((step, index) => (
                <Reveal key={step.title} delay={index * 80}>
                  <div className="card-hover h-full rounded-2xl border border-border/60 bg-gradient-to-b from-card to-card/40 p-6">
                    <span className="font-display text-sm font-semibold text-gradient">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="mt-3 font-display text-lg font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{step.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── About ──────────────────────────────────────────── */}
        <section id="about" className="py-12 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <Reveal>
              <p className="text-sm font-semibold text-primary">{c.about.eyebrow}</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                {c.about.title}
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">{c.about.body}</p>
            </Reveal>
            <Reveal>
              <ul className="grid gap-3">
                {c.about.points.map((point) => (
                  <li
                    key={point}
                    className="card-hover flex items-start gap-3 rounded-2xl border border-border/60 bg-gradient-to-b from-card to-card/40 p-5"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                    <span className="text-sm leading-6 text-foreground">{point}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* ── Closing CTA ────────────────────────────────────── */}
        <section className="py-12 lg:py-20">
          <Reveal className="relative overflow-hidden rounded-[1.75rem] border border-border/60 bg-gradient-to-br from-card via-card to-primary/5 p-10 shadow-soft md:p-14">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl animate-float-slow"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-accent/15 blur-3xl animate-float-slow animation-delay-300"
            />
            <div className="relative max-w-xl">
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{c.closing.title}</h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">{c.closing.subtitle}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={primaryCtaHref}
                  className="btn-brand inline-flex h-12 items-center justify-center gap-2 rounded-xl px-7 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5"
                >
                  {loggedIn ? "Go to dashboard" : c.closing.primaryCta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-background px-7 text-sm font-semibold text-foreground transition hover:bg-muted"
                >
                  {c.closing.secondaryCta}
                </Link>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── FAQ ────────────────────────────────────────────── */}
        <section id="faq" className="py-12 lg:py-20">
          <Reveal className="max-w-2xl">
            <p className="text-sm font-semibold text-primary">{c.faq.eyebrow}</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{c.faq.title}</h2>
          </Reveal>
          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/60">
            {c.faq.items.map((faq) => (
              <details key={faq.q} className="group bg-card px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-semibold text-foreground">
                  {faq.q}
                  <span className="text-xl font-normal text-muted-foreground transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }} />

        {/* ── Footer ─────────────────────────────────────────── */}
        <footer className="mt-8 border-t border-border/60 py-12">
          <div className="flex flex-col justify-between gap-10 sm:flex-row">
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5">
                <Logo className="h-8 w-8" />
                <span className="font-display text-lg font-semibold tracking-tight">{c.brand.name}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{c.footer.tagline}</p>
              {c.footer.email ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Contact us:{" "}
                  <a
                    href={`mailto:${c.footer.email}`}
                    className="font-medium text-foreground transition hover:text-primary"
                  >
                    {c.footer.email}
                  </a>
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-10 sm:gap-16">
              <div>
                <p className="text-sm font-semibold text-foreground">Product</p>
                <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
                  {c.nav.map((item) => (
                    <li key={item.href}>
                      <a href={item.href} className="transition hover:text-foreground">
                        {item.label}
                      </a>
                    </li>
                  ))}
                  <li>
                    <a href="#about" className="transition hover:text-foreground">About</a>
                  </li>
                  <li>
                    <Link href="/contact" className="transition hover:text-foreground">Contact</Link>
                  </li>
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Account</p>
                <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
                  <li><Link href="/login" className="transition hover:text-foreground">Log in</Link></li>
                  <li><Link href="/signup" className="transition hover:text-foreground">Sign up</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-border/60 pt-6 text-xs text-muted-foreground">
            © {new Date().getFullYear()} {c.footer.copyright}
          </div>
        </footer>
      </div>
    </main>
  );
}
