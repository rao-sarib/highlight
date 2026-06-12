"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Gauge,
  Loader2,
  MinusCircle,
  RefreshCcw,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react";

import { FeaturePageFrame } from "@/components/global/feature-page-frame";
import api from "@/lib/api";

interface PromptResult {
  prompt: string;
  status: "cited" | "in_sources" | "absent" | "error";
  answer: string;
  citations: string[];
  matched_urls: string[];
  brand_mentioned_in_text: boolean;
  competitor_domains: string[];
  error: string | null;
}

interface CompetitorEntry {
  domain: string;
  count: number;
}

interface VisibilityResponse {
  project_id: string;
  keyword: string;
  share_of_voice: number;
  rating: string;
  cited_count: number;
  in_sources_count: number;
  prompt_count: number;
  results: PromptResult[];
  top_competitors: CompetitorEntry[];
  scored_by: string;
  cached: boolean;
  scanned_at: string;
}

const STATUS_META: Record<
  PromptResult["status"],
  { label: string; chip: string; Icon: typeof CheckCircle2; iconClass: string }
> = {
  cited: {
    label: "Cited",
    chip: "bg-success/10 text-success ring-1 ring-inset ring-success/30",
    Icon: CheckCircle2,
    iconClass: "text-success",
  },
  in_sources: {
    label: "In sources",
    chip: "bg-warning/10 text-warning ring-1 ring-inset ring-warning/30",
    Icon: AlertTriangle,
    iconClass: "text-warning",
  },
  absent: {
    label: "Not mentioned",
    chip: "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/30",
    Icon: XCircle,
    iconClass: "text-destructive",
  },
  error: {
    label: "Query failed",
    chip: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
    Icon: MinusCircle,
    iconClass: "text-muted-foreground",
  },
};

export default function ProjectVisibilityPage() {
  const params = useParams<{ projectId: string }>();
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState<VisibilityResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const runScan = async (forceRefresh: boolean) => {
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const response = await api.post<VisibilityResponse>("/visibility/score", {
        project_id: params.projectId,
        keyword: keyword.trim(),
        prompt_count: 4,
        force_refresh: forceRefresh,
      });
      setResult(response.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to run the scan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runScan(false);
  };

  const absentCount = result
    ? result.prompt_count - result.cited_count - result.in_sources_count
    : 0;

  return (
    <FeaturePageFrame
      eyebrow="AI Visibility · GEO"
      title="AI Share of Voice"
      description="Asks real buyer questions to a live AI answer engine (Perplexity) and measures how often your brand is cited in the answers — plus which competitors get cited instead."
    >
      <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
        <form className="grid gap-4 lg:grid-cols-[1fr_auto]" onSubmit={handleSubmit}>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="e.g. project management software"
            className="h-12 rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
            required
          />
          <button
            type="submit"
            disabled={isSubmitting || !keyword.trim()}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isSubmitting ? "Scanning AI engines…" : "Run live scan"}
          </button>
        </form>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Each scan asks 4 brand-neutral questions to the live engine. Results are cached for
          24 hours per keyword to protect API credits — use re-scan to force a fresh run.
        </p>
        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}
      </section>

      {isSubmitting ? (
        <section className="rounded-[1.5rem] border border-border/70 bg-card p-8 shadow-sm">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">
              Generating buyer prompts and querying the live AI engine — usually 10–25 seconds…
            </span>
          </div>
          <div className="mt-6 grid gap-4 xl:grid-cols-[320px_1fr]">
            <div className="rounded-[1.5rem] border border-border/70 bg-background p-6">
              <div className="h-14 w-14 animate-pulse rounded-2xl bg-muted" />
              <div className="mt-5 h-3 w-24 animate-pulse rounded-lg bg-muted" />
              <div className="mt-3 h-14 w-24 animate-pulse rounded-lg bg-muted" />
            </div>
            <div className="grid gap-4">
              {[0, 1].map((i) => (
                <div key={i} className="rounded-[1.5rem] border border-border/70 bg-background p-6">
                  <div className="h-4 w-2/3 animate-pulse rounded-lg bg-muted" />
                  <div className="mt-4 space-y-2">
                    <div className="h-3 w-full animate-pulse rounded-lg bg-muted" />
                    <div className="h-3 w-4/5 animate-pulse rounded-lg bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {!isSubmitting && result ? (
        <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
          {/* Left column: score + competitors */}
          <section className="flex flex-col gap-4">
            <div className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Gauge className="h-6 w-6" />
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                AI Share of Voice
              </p>
              <p className="mt-3 text-6xl font-semibold tracking-tight text-foreground">
                {result.share_of_voice}
                <span className="text-2xl text-muted-foreground">%</span>
              </p>
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                Rating: <span className="capitalize text-foreground">{result.rating}</span>
              </p>

              <div className="mt-5 grid gap-2 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-success/10 px-3 py-2">
                  <span className="flex items-center gap-2 text-success">
                    <CheckCircle2 className="h-4 w-4" /> Cited in answer
                  </span>
                  <span className="font-semibold text-foreground">{result.cited_count}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-warning/10 px-3 py-2">
                  <span className="flex items-center gap-2 text-warning">
                    <AlertTriangle className="h-4 w-4" /> In sources only
                  </span>
                  <span className="font-semibold text-foreground">{result.in_sources_count}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-destructive/10 px-3 py-2">
                  <span className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-4 w-4" /> Not mentioned
                  </span>
                  <span className="font-semibold text-foreground">{absentCount}</span>
                </div>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                Scanned {new Date(result.scanned_at).toLocaleString()}
                {result.cached ? " · cached result" : " · live"}
              </p>
              {result.cached ? (
                <button
                  type="button"
                  onClick={() => void runScan(true)}
                  className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition hover:border-primary/50"
                >
                  <RefreshCcw className="h-3.5 w-3.5" /> Re-scan live now
                </button>
              ) : null}
            </div>

            {result.top_competitors.length > 0 ? (
              <div className="rounded-[1.5rem] border border-border/70 bg-card p-5 shadow-sm">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  <Trophy className="h-4 w-4 text-warning" /> Cited competitors
                </p>
                <div className="mt-4 grid gap-2">
                  {result.top_competitors.slice(0, 8).map((entry) => (
                    <div key={entry.domain} className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm text-foreground">{entry.domain}</span>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                        {entry.count}/{result.prompt_count}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-5 text-muted-foreground">
                  These domains are being cited by the AI engine for your keyword — they are
                  your real GEO competition.
                </p>
              </div>
            ) : null}
          </section>

          {/* Right column: per-prompt results */}
          <section className="grid content-start gap-4">
            {result.results.map((item, index) => {
              const meta = STATUS_META[item.status] ?? STATUS_META.error;
              const { Icon } = meta;
              return (
                <article
                  key={`${index}-${item.prompt.slice(0, 24)}`}
                  className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h2 className="max-w-[70%] text-base font-semibold leading-6 text-foreground">
                      “{item.prompt}”
                    </h2>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.chip}`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${meta.iconClass}`} />
                      {meta.label}
                    </span>
                  </div>

                  {item.status === "error" ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      {item.error ?? "The engine query failed."}
                    </p>
                  ) : (
                    <>
                      <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                        {item.answer || "No answer returned."}
                      </p>

                      {item.matched_urls.length > 0 ? (
                        <div className="mt-4 rounded-xl border border-success/30 bg-success/10 px-4 py-3">
                          <p className="text-xs font-semibold text-success">
                            Your pages in this answer's sources:
                          </p>
                          {item.matched_urls.map((url) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 flex items-center gap-1.5 text-xs text-success hover:underline"
                            >
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              <span className="truncate">{url}</span>
                            </a>
                          ))}
                        </div>
                      ) : null}

                      {item.competitor_domains.length > 0 ? (
                        <div className="mt-4 flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-medium text-muted-foreground">
                            Cited instead:
                          </span>
                          {item.competitor_domains.slice(0, 6).map((domain) => (
                            <span
                              key={domain}
                              className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-foreground"
                            >
                              {domain}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </>
                  )}
                </article>
              );
            })}

            <div className="rounded-[1.5rem] border border-dashed border-border bg-card/50 p-5">
              <p className="text-sm leading-6 text-muted-foreground">
                <span className="font-semibold text-foreground">Improve this score:</span>{" "}
                generate <span className="font-medium text-foreground">GEO content</span> for the
                prompts marked “Not mentioned” (Content Generation → type GEO), publish it on
                your site, and re-scan. AI engines cite pages with direct answers, citable
                facts, FAQ blocks, and FAQPage schema.
              </p>
            </div>
          </section>
        </div>
      ) : null}
    </FeaturePageFrame>
  );
}
