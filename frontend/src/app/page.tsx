import Link from "next/link";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Compass,
  LineChart,
  ScanSearch,
  Sparkles,
  Workflow,
} from "lucide-react";

const featureCards = [
  {
    icon: Sparkles,
    title: "Prompt Optimization",
    description:
      "Turn a basic keyword into AI-search-ready prompts designed for answer engines and discovery workflows.",
  },
  {
    icon: BrainCircuit,
    title: "RAG Content Generation",
    description:
      "Generate blog, FAQ, and meta content grounded in your own project context through pgvector-powered retrieval.",
  },
  {
    icon: Compass,
    title: "Competitor Benchmarking",
    description:
      "Compare your project against competitor URLs to identify density gaps, semantic opportunities, and visibility weaknesses.",
  },
  {
    icon: ScanSearch,
    title: "Technical SEO Audits",
    description:
      "Scrape pages, detect missing H1/title/meta tags, and surface practical fixes before rankings and AI visibility slip.",
  },
  {
    icon: Workflow,
    title: "Automated Fix Workflows",
    description:
      "Use Temporal-driven workflows to run SEO audits, generate fixes, refresh content, and keep projects moving in the background.",
  },
  {
    icon: LineChart,
    title: "Analytics & Visibility",
    description:
      "Track project performance, AI visibility signals, and progress over time in one dashboard built for SEO teams.",
  },
];

const workflowSteps = [
  "Create a project and connect the site you want to monitor.",
  "Scrape and analyze pages to identify content and technical SEO issues.",
  "Index content into embeddings so the platform can retrieve semantic context.",
  "Generate prompts, content, visibility insights, and AI-assisted fixes from one workflow.",
];

const trustPillars = [
  "FastAPI backend with JWT auth and project ownership controls",
  "PostgreSQL + pgvector for semantic search and RAG context",
  "Temporal workflows for long-running audits and scheduled refreshes",
];

const spotlight = [
  {
    title: "AI Content Generation",
    body: "Uses retrieved project context to create SEO content that stays grounded in your own data.",
  },
  {
    title: "Competitor Benchmarking",
    body: "Compare competitor pages to reveal keyword and semantic gaps quickly.",
  },
  {
    title: "Prompt Optimization",
    body: "Generate higher-quality prompts for users searching through AI interfaces.",
  },
  {
    title: "Automated SEO Fixes",
    body: "Launch workflows that inspect your pages and suggest practical fixes.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div aria-hidden="true" className="absolute inset-0 bg-aurora" />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-dots opacity-40 mask-fade-b"
        />

        <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Nav */}
          <header className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/70 px-5 py-3.5 shadow-soft backdrop-blur-xl md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
                <Bot className="h-5 w-5" />
                <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20" />
              </div>
              <div>
                <p className="font-display text-base font-semibold tracking-tight text-foreground">
                  Highlight
                </p>
                <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  AI SEO · GEO Platform
                </p>
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-1.5 text-sm">
              <a
                className="rounded-full px-3 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                href="#features"
              >
                Features
              </a>
              <a
                className="rounded-full px-3 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                href="#workflow"
              >
                Workflow
              </a>
              <a
                className="rounded-full px-3 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                href="#platform"
              >
                Platform
              </a>
              <Link
                href="/login"
                className="ml-1 inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-4 font-medium text-foreground transition hover:bg-muted"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="btn-brand inline-flex h-10 items-center justify-center rounded-xl px-4 font-semibold text-white shadow-glow transition hover:-translate-y-0.5"
              >
                Get Started
              </Link>
            </nav>
          </header>

          {/* Hero body */}
          <div className="grid gap-10 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
            <div className="space-y-8">
              <div className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-border/70 bg-card/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground backdrop-blur">
                <span className="h-1.5 w-1.5 animate-glow-pulse rounded-full bg-brand-gradient" />
                SEO + GEO Operating System
              </div>

              <div className="space-y-5">
                <h1 className="max-w-4xl animate-fade-up font-display text-5xl font-semibold tracking-tight text-foreground animation-delay-100 sm:text-6xl">
                  Be visible to{" "}
                  <span className="text-gradient">search engines</span> and{" "}
                  <span className="text-gradient">AI answer engines</span>.
                </h1>
                <p className="max-w-2xl animate-fade-up text-lg leading-8 text-muted-foreground animation-delay-200">
                  Highlight bridges traditional SEO with AI-powered search visibility using
                  automated audits, competitor benchmarking, prompt optimization, RAG-backed
                  content generation, and workflow-driven fixes.
                </p>
              </div>

              <div className="flex animate-fade-up flex-col gap-3 animation-delay-300 sm:flex-row">
                <Link
                  href="/signup"
                  className="btn-brand inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5"
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-card px-6 text-sm font-semibold text-foreground transition hover:bg-muted"
                >
                  Login
                </Link>
              </div>

              <div className="grid animate-fade-up gap-3 animation-delay-500 sm:grid-cols-3">
                {trustPillars.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-border/60 bg-card/70 px-4 py-4 text-sm leading-6 text-muted-foreground backdrop-blur"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid animate-scale-in gap-4 self-center animation-delay-200">
              <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-6 shadow-glow backdrop-blur-xl">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/15 blur-3xl"
                />
                <div className="relative flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      One workspace
                    </p>
                    <h2 className="mt-3 font-display text-2xl font-semibold text-foreground">
                      Audits, content, fixes &amp; AI visibility — together.
                    </h2>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                    <Sparkles className="h-5 w-5" />
                  </div>
                </div>
                <p className="relative mt-4 text-sm leading-7 text-muted-foreground">
                  Instead of treating SEO and generative search as separate problems, Highlight
                  gives you one connected system to analyze pages, understand competitors,
                  retrieve semantic context, and generate actionable outputs.
                </p>
              </div>

              <div className="relative overflow-hidden rounded-3xl bg-brand-gradient p-6 text-white shadow-glow">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-dots opacity-20"
                />
                <p className="relative text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
                  What the platform does
                </p>
                <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
                  {spotlight.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm ring-1 ring-inset ring-white/15"
                    >
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-white/80">{item.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-gradient" />
            Feature Overview
          </p>
          <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight text-foreground">
            Built around the workflows modern SEO teams actually need.
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Highlight combines technical SEO, AI content workflows, and semantic retrieval into a
            single operating layer so teams can move from diagnosis to execution without switching
            tools.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {featureCards.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="group relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-6 shadow-soft backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-glow"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
              />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/10 transition group-hover:scale-105">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="relative mt-5 font-display text-xl font-semibold text-foreground">
                {title}
              </h3>
              <p className="relative mt-3 text-sm leading-7 text-muted-foreground">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Workflow ─────────────────────────────────────────── */}
      <section id="workflow" className="border-y border-border/60 bg-muted/30">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-gradient" />
              How It Works
            </p>
            <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight text-foreground">
              From website URL to AI-ready SEO action plan.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              The platform follows a practical pipeline: collect site data, analyze it, retrieve
              the most relevant context, then produce content and recommendations you can use.
            </p>
          </div>

          <div className="relative grid gap-4">
            {workflowSteps.map((step, index) => (
              <div
                key={step}
                className="group flex gap-4 rounded-2xl border border-border/60 bg-card/80 p-5 shadow-soft backdrop-blur transition hover:border-primary/40"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-sm font-semibold text-white shadow-glow">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <p className="pt-1.5 text-sm leading-7 text-muted-foreground">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA / Platform ───────────────────────────────────── */}
      <section id="platform" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/80 p-8 shadow-glow backdrop-blur md:p-12">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-aurora" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-gradient" />
                Ready to enter the system?
              </p>
              <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight text-foreground">
                Explore the platform, then sign in when you&apos;re ready to work.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Existing users can go directly to login. New users can create an account and move
                into the dashboard, project shell, and AI workflow features immediately.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="btn-brand inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-background px-6 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                Login
              </Link>
            </div>
          </div>
        </div>

        <footer className="mt-8 flex flex-col gap-3 border-t border-border/60 pt-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-gradient text-white">
              <Bot className="h-4 w-4" />
            </div>
            <p className="font-medium text-foreground">Highlight — AI SEO Tool</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <a href="#features" className="transition hover:text-foreground">
              Features
            </a>
            <a href="#workflow" className="transition hover:text-foreground">
              Workflow
            </a>
            <Link href="/login" className="transition hover:text-foreground">
              Login
            </Link>
            <Link href="/signup" className="transition hover:text-foreground">
              Sign Up
            </Link>
          </div>
        </footer>
      </section>
    </main>
  );
}
