import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  Compass,
  Database,
  LineChart,
  Network,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";

import Counter from "@/components/landing/Counter";
import ProductPreview from "@/components/landing/ProductPreview";
import Reveal from "@/components/landing/Reveal";
import { Logo } from "@/components/global/Logo";

const featureCards = [
  {
    icon: BrainCircuit,
    title: "RAG Content Generation",
    description:
      "Generate blog, FAQ, and meta content grounded in your own project context through pgvector-powered semantic retrieval — never generic, always on-brand.",
  },
  {
    icon: Sparkles,
    title: "Prompt Optimization",
    description:
      "Turn a basic keyword into AI-search-ready prompts designed for answer engines and discovery.",
  },
  {
    icon: Compass,
    title: "Competitor Benchmarking",
    description:
      "Compare against competitor URLs to expose density gaps and semantic opportunities.",
  },
  {
    icon: ScanSearch,
    title: "Technical SEO Audits",
    description:
      "Scrape pages, detect missing H1/title/meta tags, and surface practical fixes automatically.",
  },
  {
    icon: Workflow,
    title: "Automated Fix Workflows",
    description:
      "Temporal-driven workflows run audits, generate fixes, and refresh content in the background.",
  },
  {
    icon: LineChart,
    title: "Analytics & Visibility",
    description:
      "Track performance, AI visibility signals, and real GA4 traffic from one dashboard.",
  },
];

const workflowSteps = [
  {
    title: "Connect your site",
    body: "Create a project and point Highlight at the website you want to monitor and grow.",
  },
  {
    title: "Scrape & analyze",
    body: "Pages are crawled to surface content gaps and technical SEO issues in seconds.",
  },
  {
    title: "Index into embeddings",
    body: "Content is vectorized into pgvector so the platform retrieves true semantic context.",
  },
  {
    title: "Generate & optimize",
    body: "Produce prompts, content, visibility insights, and AI-assisted fixes from one flow.",
  },
];

const techStack = [
  "FastAPI",
  "Next.js 15",
  "PostgreSQL",
  "pgvector",
  "Temporal",
  "OpenAI GPT-4o",
  "Recharts",
  "JWT Auth",
  "Zustand",
  "Tailwind CSS",
];

const stats = [
  { value: 12, suffix: "", label: "Integrated modules" },
  { value: 4, suffix: "", label: "Automated AI workflows" },
  { value: 1536, suffix: "", label: "Embedding dimensions" },
  { value: 100, suffix: "%", label: "Grounded in your data" },
];

const spotlight = [
  { icon: BrainCircuit, title: "AI Content Generation", body: "Retrieved project context creates content grounded in your own data." },
  { icon: Compass, title: "Competitor Benchmarking", body: "Reveal keyword and semantic gaps against competitor pages fast." },
  { icon: Sparkles, title: "Prompt Optimization", body: "Higher-quality prompts for users searching through AI interfaces." },
  { icon: Zap, title: "Automated SEO Fixes", body: "Workflows inspect pages and suggest practical, ready-to-apply fixes." },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-background text-foreground">
      {/* ── Ambient animated background ──────────────────────── */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-dots opacity-[0.35] mask-fade-b" />
        <div className="absolute -left-32 -top-24 h-[34rem] w-[34rem] animate-aurora-drift rounded-full bg-primary/25 blur-[120px]" />
        <div className="absolute -right-24 top-10 h-[28rem] w-[28rem] animate-float-slow rounded-full bg-accent/20 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[26rem] w-[26rem] animate-aurora-drift rounded-full bg-primary/15 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ── Nav ────────────────────────────────────────────── */}
        <header className="sticky top-4 z-50 mt-4 flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card/70 px-4 py-3 shadow-soft backdrop-blur-xl sm:px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="h-9 w-9 shadow-glow" />
            <div className="leading-tight">
              <p className="font-display text-base font-semibold tracking-tight">Highlight</p>
              <p className="-mt-0.5 text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                AI SEO · GEO
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 text-sm md:flex">
            <a className="rounded-full px-3 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" href="#features">
              Features
            </a>
            <a className="rounded-full px-3 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" href="#workflow">
              Workflow
            </a>
            <a className="rounded-full px-3 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" href="#platform">
              Platform
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="btn-brand inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </header>

        {/* ── Hero ───────────────────────────────────────────── */}
        <section className="grid items-center gap-12 py-16 lg:grid-cols-[1.02fr_0.98fr] lg:py-24">
          <div className="space-y-8">
            <div className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-border/70 bg-card/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping-ring rounded-full bg-primary/70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-gradient" />
              </span>
              SEO + GEO Operating System
            </div>

            <h1 className="max-w-2xl animate-fade-up font-display text-5xl font-semibold leading-[1.05] tracking-tight animation-delay-100 sm:text-6xl">
              Be visible to{" "}
              <span className="text-gradient-animated">search engines</span> and{" "}
              <span className="text-gradient-animated">AI answer engines</span>.
            </h1>

            <p className="max-w-xl animate-fade-up text-lg leading-8 text-muted-foreground animation-delay-200">
              Highlight bridges traditional SEO with AI-powered search visibility — automated
              audits, competitor benchmarking, prompt optimization, RAG-backed content, and
              workflow-driven fixes, all in one modern workspace.
            </p>

            <div className="flex animate-fade-up flex-col gap-3 animation-delay-300 sm:flex-row">
              <Link
                href="/signup"
                className="btn-brand inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-card px-6 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                Explore features
              </a>
            </div>

            <div className="flex animate-fade-up flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-sm text-muted-foreground animation-delay-500">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                JWT-secured projects
              </span>
              <span className="inline-flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                pgvector RAG
              </span>
              <span className="inline-flex items-center gap-2">
                <Workflow className="h-4 w-4 text-primary" />
                Temporal workflows
              </span>
            </div>
          </div>

          {/* Product preview */}
          <div className="relative animate-scale-in animation-delay-200">
            <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-brand-gradient opacity-20 blur-3xl" />
            {/* Floating accent chips */}
            <div className="absolute -left-4 top-10 z-10 hidden animate-float-slow items-center gap-2 rounded-xl border border-border/60 bg-card/90 px-3 py-2 text-xs font-semibold shadow-glow backdrop-blur md:flex">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              AI Visibility +18%
            </div>
            <div className="absolute -right-3 bottom-12 z-10 hidden animate-float items-center gap-2 rounded-xl border border-border/60 bg-card/90 px-3 py-2 text-xs font-semibold shadow-glow backdrop-blur md:flex">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-success/15 text-success">
                <Network className="h-3.5 w-3.5" />
              </span>
              1,204 chunks indexed
            </div>
            <ProductPreview />
          </div>
        </section>

        {/* ── Tech marquee ───────────────────────────────────── */}
        <div className="border-y border-border/50 py-6">
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Built on a modern, production-grade stack
          </p>
          <div className="marquee-mask pause-on-hover relative overflow-hidden">
            <div className="flex w-max animate-marquee items-center gap-3 [--marquee-duration:36s]">
              {[...techStack, ...techStack].map((tech, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-4 py-2 text-sm font-medium text-muted-foreground backdrop-blur"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-gradient" />
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Stats ──────────────────────────────────────────── */}
        <section className="py-16 lg:py-20">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s, i) => (
              <Reveal
                key={s.label}
                delay={i * 90}
                className="rounded-2xl border border-border/60 bg-card/70 p-6 text-center shadow-soft backdrop-blur"
              >
                <p className="font-display text-4xl font-semibold tracking-tight text-gradient">
                  <Counter value={s.value} suffix={s.suffix} />
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Features (bento) ───────────────────────────────── */}
        <section id="features" className="py-12 lg:py-20">
          <Reveal className="max-w-3xl">
            <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-gradient" />
              Feature Overview
            </p>
            <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight">
              Everything an AI-era SEO team needs, in one place.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Technical SEO, AI content workflows, and semantic retrieval combined into a single
              operating layer — move from diagnosis to execution without switching tools.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featureCards.map(({ icon: Icon, title, description }, index) => (
              <Reveal
                key={title}
                delay={(index % 3) * 80}
                className={index === 0 ? "lg:col-span-2" : ""}
              >
                <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-6 shadow-soft backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-glow">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
                  />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/10 transition group-hover:scale-105">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="relative mt-5 font-display text-xl font-semibold">{title}</h3>
                  <p className="relative mt-3 text-sm leading-7 text-muted-foreground">
                    {description}
                  </p>

                  {index === 0 ? (
                    <div className="relative mt-6 flex items-end gap-1.5">
                      {[40, 64, 52, 78, 70, 92, 84].map((h, i) => (
                        <div
                          key={i}
                          style={{ height: `${h * 0.6}px`, animationDelay: `${i * 80}ms` }}
                          className="w-full origin-bottom animate-rise-bar rounded-t-md bg-gradient-to-t from-primary/25 to-accent/70"
                        />
                      ))}
                    </div>
                  ) : null}
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Workflow timeline ──────────────────────────────── */}
        <section id="workflow" className="py-12 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <Reveal>
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-gradient" />
                How It Works
              </p>
              <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight">
                From a URL to an AI-ready action plan.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                A practical pipeline: collect site data, analyze it, retrieve the most relevant
                context, then produce content and recommendations you can use immediately.
              </p>
              <Link
                href="/signup"
                className="btn-brand mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5"
              >
                Start your first audit
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>

            <div className="relative">
              {/* Connecting gradient line */}
              <div
                aria-hidden="true"
                className="absolute bottom-4 left-[1.35rem] top-4 w-px bg-gradient-to-b from-primary via-accent to-transparent"
              />
              <div className="space-y-4">
                {workflowSteps.map((step, index) => (
                  <Reveal key={step.title} delay={index * 110}>
                    <div className="group flex gap-5 rounded-2xl border border-border/60 bg-card/80 p-5 shadow-soft backdrop-blur transition hover:border-primary/40">
                      <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-sm font-semibold text-white shadow-glow">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <div className="pt-0.5">
                        <h3 className="font-display text-lg font-semibold">{step.title}</h3>
                        <p className="mt-1.5 text-sm leading-7 text-muted-foreground">
                          {step.body}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Platform spotlight ─────────────────────────────── */}
        <section id="platform" className="py-12 lg:py-20">
          <Reveal className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-brand-gradient p-8 text-white shadow-glow-lg md:p-12">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-dots opacity-20" />
            <div aria-hidden="true" className="grain pointer-events-none absolute inset-0 opacity-[0.15] mix-blend-overlay" />
            <div className="relative grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
                  One connected platform
                </p>
                <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                  Audits, content, fixes &amp; AI visibility — together.
                </h2>
                <p className="mt-4 text-base leading-7 text-white/85">
                  Instead of treating SEO and generative search as separate problems, Highlight
                  gives you one system to analyze pages, understand competitors, retrieve semantic
                  context, and generate actionable outputs.
                </p>
                <Link
                  href="/signup"
                  className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-primary shadow-lg transition hover:-translate-y-0.5"
                >
                  Create your workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {spotlight.map(({ icon: Icon, title, body }) => (
                  <div
                    key={title}
                    className="rounded-2xl bg-white/10 p-4 ring-1 ring-inset ring-white/15 backdrop-blur-sm transition hover:bg-white/15"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <p className="mt-3 text-sm font-semibold">{title}</p>
                    <p className="mt-1.5 text-sm leading-6 text-white/80">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── CTA ────────────────────────────────────────────── */}
        <section className="py-12 lg:py-20">
          <Reveal className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/80 p-10 text-center shadow-glow backdrop-blur md:p-16">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-aurora" />
            <div className="relative mx-auto max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/60 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-gradient" />
                Ready when you are
              </span>
              <h2 className="mt-5 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                Make your site the answer{" "}
                <span className="text-gradient-animated">AI engines cite</span>.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Create an account and move straight into the dashboard, project shell, and the full
                suite of AI SEO workflows.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="btn-brand inline-flex h-12 items-center justify-center gap-2 rounded-xl px-7 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5"
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-background px-7 text-sm font-semibold text-foreground transition hover:bg-muted"
                >
                  Login
                </Link>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── Footer ─────────────────────────────────────────── */}
        <footer className="flex flex-col gap-3 border-t border-border/60 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2.5">
            <Logo className="h-8 w-8" />
            <div>
              <p className="font-semibold text-foreground">Highlight — AI SEO Tool</p>
              <p className="text-xs">Bridging SEO and Generative Engine Optimization.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <a href="#features" className="transition hover:text-foreground">Features</a>
            <a href="#workflow" className="transition hover:text-foreground">Workflow</a>
            <Link href="/login" className="transition hover:text-foreground">Login</Link>
            <Link href="/signup" className="transition hover:text-foreground">Sign Up</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
