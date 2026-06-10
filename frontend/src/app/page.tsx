import Link from "next/link";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Compass,
  LineChart,
  ScanSearch,
  ShieldCheck,
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
    title: "Analytics and Visibility",
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

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden border-b border-border/60">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at top left, hsl(var(--primary) / 0.2), transparent 34%), radial-gradient(circle at 80% 20%, hsl(var(--accent) / 0.16), transparent 26%), linear-gradient(180deg, hsl(var(--background)), hsl(var(--secondary) / 0.45))",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-4 rounded-[1.75rem] border border-border/70 bg-card/75 px-5 py-4 shadow-glow backdrop-blur md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Highlight AI SEO Tool
                </p>
                <p className="mt-1 text-sm text-foreground">
                  Bridge traditional SEO with AI-powered search visibility.
                </p>
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-3 text-sm">
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
                className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-4 font-medium text-foreground transition hover:bg-muted"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 font-semibold text-primary-foreground transition hover:opacity-95"
              >
                Get Started
              </Link>
            </nav>
          </header>

          <div className="grid gap-10 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
            <div className="space-y-8">
              <div className="inline-flex items-center rounded-full border border-border/70 bg-card/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground backdrop-blur">
                SEO + GEO Operating System
              </div>

              <div className="space-y-5">
                <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
                  Make your website visible to both search engines and AI answer engines.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                  HIGHLIGHT AI SEO Tool helps teams bridge traditional SEO with AI-powered search
                  visibility using automated audits, competitor benchmarking, prompt optimization,
                  RAG-backed content generation, and workflow-driven fixes.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
                >
                  Login
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-card px-6 text-sm font-semibold text-foreground transition hover:bg-muted"
                >
                  Sign Up
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {trustPillars.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-border/70 bg-card/75 px-4 py-4 text-sm leading-6 text-muted-foreground backdrop-blur"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 self-center">
              <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-glow backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      System Introduction
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold text-foreground">
                      One workspace for audits, content, fixes, and AI visibility.
                    </h2>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  Instead of treating SEO and generative search as separate problems, Highlight
                  gives you one connected system to analyze pages, understand competitors,
                  retrieve semantic context, and generate actionable outputs.
                </p>
              </div>

              <div className="rounded-[1.75rem] border border-border/70 bg-foreground p-6 text-background">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-background/70">
                  What The Platform Does
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-background/10 p-4">
                    <p className="text-sm font-semibold">AI Content Generation</p>
                    <p className="mt-2 text-sm leading-6 text-background/75">
                      Uses retrieved project context to create SEO content that stays grounded in
                      your own data.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-background/10 p-4">
                    <p className="text-sm font-semibold">Competitor Benchmarking</p>
                    <p className="mt-2 text-sm leading-6 text-background/75">
                      Compare competitor pages to reveal keyword and semantic gaps quickly.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-background/10 p-4">
                    <p className="text-sm font-semibold">Prompt Optimization</p>
                    <p className="mt-2 text-sm leading-6 text-background/75">
                      Generate higher-quality prompts for users searching through AI interfaces.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-background/10 p-4">
                    <p className="text-sm font-semibold">Automated SEO Fixes</p>
                    <p className="mt-2 text-sm leading-6 text-background/75">
                      Launch workflows that inspect your pages and suggest practical fixes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
            Feature Overview
          </p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
            Built around the workflows modern SEO teams actually need.
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Highlight combines technical SEO, AI content workflows, and semantic retrieval into a
            single operating layer so teams can move from diagnosis to execution without switching
            tools.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {featureCards.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-glow"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-2xl font-semibold text-foreground">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="workflow"
        className="border-y border-border/60 bg-secondary/40"
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-20">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
              How It Works
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
              From website URL to AI-ready SEO action plan.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              The platform follows a practical pipeline: collect site data, analyze it, retrieve
              the most relevant context, then produce content and recommendations you can use.
            </p>
          </div>

          <div className="grid gap-4">
            {workflowSteps.map((step, index) => (
              <div
                key={step}
                className="flex gap-4 rounded-[1.5rem] border border-border/70 bg-card p-5"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </div>
                <p className="pt-1 text-sm leading-7 text-muted-foreground">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="platform" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="rounded-[2rem] border border-border/70 bg-card p-8 shadow-glow md:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
                Ready To Enter The System?
              </p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
                Use the public landing page to understand the platform, then sign in when you are ready to work.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Existing users can go directly to login. New users can create an account and move
                into the dashboard, project shell, and AI workflow features immediately.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
              >
                Login
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-background px-6 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>

        <footer className="mt-8 flex flex-col gap-3 border-t border-border/70 pt-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>HIGHLIGHT AI SEO Tool</p>
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
