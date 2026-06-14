import Link from "next/link";
import {
  ArrowRight,
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

const engines = ["ChatGPT", "Perplexity", "Gemini", "Google AI Overviews"];

const facts = [
  { value: "3 engines", label: "Live checks across ChatGPT, Perplexity and Gemini" },
  { value: "Whole-site", label: "Every page crawled, audited and scored" },
  { value: "SEO + GEO", label: "Traditional search and AI search in one place" },
];

const features = [
  {
    icon: Gauge,
    title: "See if AI recommends you",
    body: "We ask the engines your buyers ask the questions they actually type, then show where your brand appears — and who gets cited instead.",
    wide: true,
  },
  {
    icon: ScanSearch,
    title: "Audit every page",
    body: "One crawl checks titles, meta, headings, thin content and alt text across your whole site, then scores its health.",
  },
  {
    icon: FileText,
    title: "Write content AI will quote",
    body: "For each question you're missing, generate a direct answer, key facts, an FAQ and the schema engines look for.",
  },
  {
    icon: Swords,
    title: "Know who you're up against",
    body: "Compare your pages to the ones outranking you and see the terms they cover that you don't.",
  },
  {
    icon: Search,
    title: "Find the right questions",
    body: "Turn one keyword into the prompts and supporting terms people search — pulled from your own site's context.",
  },
  {
    icon: ClipboardList,
    title: "Get a plan, not a report",
    body: "Fixes are ranked by impact and effort, with the changes drafted for you — so you know exactly what to do next.",
  },
];

const steps = [
  {
    title: "Add your site",
    body: "Paste a URL. Highlight crawls your pages and learns your niche on its own.",
  },
  {
    title: "See where you stand",
    body: "Get your AI share of voice, a site health score, and the gaps holding both back.",
  },
  {
    title: "Fix and publish",
    body: "Apply the ranked fixes and publish the generated content built to earn citations.",
  },
  {
    title: "Track the climb",
    body: "Re-scan to watch your visibility move across every engine over time.",
  },
];

const faqs = [
  {
    q: "What is Generative Engine Optimization (GEO)?",
    a: "GEO is getting your brand mentioned and cited by AI answer engines like ChatGPT, Perplexity and Google's AI Overviews when people ask questions in your category. Highlight measures your AI share of voice across these engines and creates the content that earns citations.",
  },
  {
    q: "How does Highlight measure AI visibility?",
    a: "It generates the real questions buyers ask AI assistants in your niche, sends each to live engines (Perplexity, ChatGPT, and Gemini when configured), and checks whether your domain or brand is cited. You get a share-of-voice score, a per-engine breakdown, and the competitors cited instead.",
  },
  {
    q: "Does Highlight handle traditional SEO too?",
    a: "Yes. It crawls your whole site, audits every page for on-page issues (titles, meta descriptions, headings, thin content, image alt text), scores your site health, and writes specific fixes — alongside the GEO features, in the same workspace.",
  },
  {
    q: "Can it create content to improve my citations?",
    a: "For the questions where you're not cited, Highlight writes GEO-ready content: a direct answer, citable key facts, an FAQ, and FAQPage schema. Publish it, re-scan, and watch your share of voice move.",
  },
  {
    q: "Which engines does it check?",
    a: "Perplexity and ChatGPT out of the box, plus Google Gemini when a Gemini key is configured. Each scan shows a per-engine breakdown so you can see exactly where you win and lose citations.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const appJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Highlight",
  applicationCategory: "BusinessApplication",
  description:
    "AI SEO & GEO platform that measures whether AI answer engines cite your brand, audits on-page SEO across your whole site, and generates content that wins AI citations.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-background text-foreground">
      {/* Quiet background: a faint grid that fades out, one soft glow behind the hero. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:64px_64px] opacity-[0.4] mask-fade-b" />
        <div className="absolute -top-40 right-0 h-[32rem] w-[32rem] rounded-full bg-primary/10 blur-[140px]" />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* ── Header ─────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 -mx-4 border-b border-border/50 bg-background/80 px-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <Logo className="h-8 w-8" />
              <span className="font-display text-lg font-semibold tracking-tight">Highlight</span>
            </Link>

            <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
              <a className="link-underline transition hover:text-foreground" href="#features">
                Features
              </a>
              <a className="link-underline transition hover:text-foreground" href="#how">
                How it works
              </a>
              <a className="link-underline transition hover:text-foreground" href="#faq">
                FAQ
              </a>
            </nav>

            <div className="flex items-center gap-2">
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
            </div>
          </div>
        </header>

        {/* ── Hero ───────────────────────────────────────────── */}
        <section className="grid items-center gap-14 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              AI search visibility, built on real SEO
            </span>

            <h1 className="mt-6 max-w-xl font-display text-[2.75rem] font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              When buyers ask AI,{" "}
              <span className="text-gradient">be the answer</span> it gives.
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">
              Highlight tells you whether ChatGPT, Perplexity and Gemini point people to you —
              then audits your site and writes the content that gets you cited.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="btn-brand inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5"
              >
                Check your visibility
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-card px-6 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                See how it works
              </a>
            </div>

            <p className="mt-5 text-sm text-muted-foreground">
              No credit card. Start with just your URL.
            </p>
          </div>

          {/* Product preview — no fabricated floating numbers. */}
          <div className="relative">
            <div className="absolute -inset-8 -z-10 rounded-[2.5rem] bg-primary/10 blur-3xl" />
            <ProductPreview />
          </div>
        </section>

        {/* ── Engines strip ──────────────────────────────────── */}
        <section className="border-y border-border/50 py-8">
          <p className="text-center text-sm text-muted-foreground">
            Tracks the answer engines your customers already ask
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {engines.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-2 text-base font-semibold text-foreground/70"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                {name}
              </span>
            ))}
          </div>
        </section>

        {/* ── Honest facts ───────────────────────────────────── */}
        <section className="grid gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/60 sm:grid-cols-3">
          {facts.map((f) => (
            <div key={f.value} className="bg-card p-6">
              <p className="font-display text-2xl font-semibold tracking-tight text-foreground">
                {f.value}
              </p>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{f.label}</p>
            </div>
          ))}
        </section>

        {/* ── Features ───────────────────────────────────────── */}
        <section id="features" className="py-20 lg:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-sm font-semibold text-primary">What you get</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Everything you need to win in search — old and new.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Find out where you stand, fix what&apos;s holding you back, and publish the content that
              gets picked up. No switching between five different tools.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, body, wide }, index) => (
              <Reveal
                key={title}
                delay={(index % 3) * 70}
                className={wide ? "lg:col-span-2" : ""}
              >
                <article className="group flex h-full flex-col rounded-2xl border border-border/60 bg-card p-6 transition hover:border-primary/40 hover:shadow-soft">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 font-display text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── How it works ───────────────────────────────────── */}
        <section id="how" className="py-12 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
            <Reveal>
              <p className="text-sm font-semibold text-primary">How it works</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                From a URL to a clear plan in minutes.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                You don&apos;t fill out forms or wire up tools. Add your site and Highlight does the
                analysis, then hands you the work in priority order.
              </p>
              <Link
                href="/signup"
                className="btn-brand mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5"
              >
                Run your first scan
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>

            <div className="grid gap-3 sm:grid-cols-2">
              {steps.map((step, index) => (
                <Reveal key={step.title} delay={index * 80}>
                  <div className="h-full rounded-2xl border border-border/60 bg-card p-6">
                    <span className="font-display text-sm font-semibold text-primary">
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

        {/* ── Closing CTA ────────────────────────────────────── */}
        <section className="py-12 lg:py-20">
          <Reveal className="relative overflow-hidden rounded-[1.75rem] border border-border/60 bg-card p-10 md:p-14">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
            />
            <div className="relative max-w-xl">
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Find out what AI says about you today.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Add your site and get your first AI share-of-voice score and site audit in one run.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="btn-brand inline-flex h-12 items-center justify-center gap-2 rounded-xl px-7 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5"
                >
                  Start free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-background px-7 text-sm font-semibold text-foreground transition hover:bg-muted"
                >
                  Log in
                </Link>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── FAQ (also published as FAQPage schema) ─────────── */}
        <section id="faq" className="py-12 lg:py-20">
          <Reveal className="max-w-2xl">
            <p className="text-sm font-semibold text-primary">FAQ</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Questions, answered.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/60">
            {faqs.map((faq) => (
              <details key={faq.q} className="group bg-card px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-semibold text-foreground">
                  {faq.q}
                  <span className="text-xl font-normal text-muted-foreground transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Structured data: helps search + AI engines cite this page. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
        />

        {/* ── Footer ─────────────────────────────────────────── */}
        <footer className="mt-8 border-t border-border/60 py-12">
          <div className="flex flex-col justify-between gap-10 sm:flex-row">
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5">
                <Logo className="h-8 w-8" />
                <span className="font-display text-lg font-semibold tracking-tight">Highlight</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                One workspace for traditional SEO and getting cited by AI answer engines.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-10 sm:gap-16">
              <div>
                <p className="text-sm font-semibold text-foreground">Product</p>
                <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
                  <li><a href="#features" className="transition hover:text-foreground">Features</a></li>
                  <li><a href="#how" className="transition hover:text-foreground">How it works</a></li>
                  <li><a href="#faq" className="transition hover:text-foreground">FAQ</a></li>
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
            © {new Date().getFullYear()} Highlight. SEO and Generative Engine Optimization in one place.
          </div>
        </footer>
      </div>
    </main>
  );
}
