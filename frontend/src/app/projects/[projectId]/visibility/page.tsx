"use client";

import { useEffect, useState } from "react";
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
  TrendingUp,
  Trophy,
  XCircle,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AutoModePanel } from "@/components/global/auto-mode-panel";
import { FeaturePageFrame } from "@/components/global/feature-page-frame";
import api from "@/lib/api";
import { useProjectContext } from "@/lib/useProjectContext";

interface ScanHistoryEntry {
  id: string;
  keyword: string;
  share_of_voice: number;
  cited_count: number;
  prompt_count: number;
  created_at: string;
}

interface EngineAnswer {
  engine: string;
  status: "cited" | "in_sources" | "absent" | "error";
  answer: string;
  citations: string[];
  matched_urls: string[];
  brand_mentioned_in_text: boolean;
  competitor_domains: string[];
  error: string | null;
}

interface PromptResult {
  prompt: string;
  status: "cited" | "in_sources" | "absent" | "error";
  engines: EngineAnswer[];
  competitor_domains: string[];
}

interface CompetitorEntry {
  domain: string;
  count: number;
}

interface EngineSummary {
  engine: string;
  label: string;
  share_of_voice: number;
  cited: number;
  in_sources: number;
  prompts: number;
}

interface VisibilityResponse {
  project_id: string;
  keyword: string;
  share_of_voice: number;
  rating: string;
  cited_count: number;
  in_sources_count: number;
  prompt_count: number;
  engines_used: string[];
  per_engine: EngineSummary[];
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

const ENGINE_LABEL: Record<string, string> = {
  perplexity: "Perplexity",
  openai: "ChatGPT",
  gemini: "Gemini",
};

export default function ProjectVisibilityPage() {
  const params = useParams<{ projectId: string }>();
  const { context, isLoading: contextLoading } = useProjectContext(params.projectId);
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState<VisibilityResponse | null>(null);
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadHistory = async () => {
    try {
      const res = await api.get<ScanHistoryEntry[]>(`/visibility/history/${params.projectId}`);
      setHistory(res.data);
    } catch {
      // none yet
    }
  };

  // Auto-restore the most recent scan + the trend history on open (no new scan).
  useEffect(() => {
    const restore = async () => {
      try {
        const response = await api.get<VisibilityResponse | null>(
          `/visibility/latest/${params.projectId}`,
        );
        if (response.data) {
          setResult(response.data);
          setKeyword(response.data.keyword);
        }
      } catch {
        // none yet
      }
    };
    if (params.projectId) {
      void restore();
      void loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.projectId]);

  const trendData = [...history]
    .reverse()
    .map((h) => ({
      date: new Date(h.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      sov: h.share_of_voice,
    }));

  const runScan = async (forceRefresh: boolean) => {
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const response = await api.post<VisibilityResponse>("/visibility/score", {
        project_id: params.projectId,
        keyword: keyword.trim() || null,
        prompt_count: 4,
        force_refresh: forceRefresh,
      });
      setResult(response.data);
      void loadHistory();
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
      description="Asks real buyer questions to multiple live AI answer engines (Perplexity + ChatGPT, and Gemini when configured) and measures how often your brand is cited — with a per-engine breakdown and the competitors cited instead."
    >
      <section className="space-y-4 rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
        <AutoModePanel
          context={context}
          isLoading={contextLoading}
          projectId={params.projectId}
          onPickKeyword={setKeyword}
        />
        <form className="grid gap-4 lg:grid-cols-[1fr_auto]" onSubmit={handleSubmit}>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={
              context?.primary_keyword
                ? `Leave blank to use “${context.primary_keyword}”`
                : "e.g. project management software"
            }
            className="h-12 rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
          />
          <button
            type="submit"
            disabled={isSubmitting || (!keyword.trim() && !context?.has_audit)}
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

      {!isSubmitting && trendData.length >= 2 ? (
        <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Share of Voice over time</h2>
          </div>
          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="sovFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={36} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${v}%`, "Share of Voice"]}
                />
                <Area type="monotone" dataKey="sov" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#sovFill)" />
              </AreaChart>
            </ResponsiveContainer>
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

            {result.per_engine.length > 0 ? (
              <div className="rounded-[1.5rem] border border-border/70 bg-card p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  By engine
                </p>
                <div className="mt-4 grid gap-3.5">
                  {result.per_engine.map((eng) => (
                    <div key={eng.engine}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">{eng.label}</span>
                        <span className="font-semibold text-foreground">{eng.share_of_voice}%</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-brand-gradient"
                          style={{ width: `${Math.min(eng.share_of_voice, 100)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {eng.cited}/{eng.prompts} prompts cited
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

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

                  <div className="mt-4 grid gap-2.5">
                    {item.engines.map((eng) => {
                      const em = STATUS_META[eng.status] ?? STATUS_META.error;
                      const EIcon = em.Icon;
                      return (
                        <div
                          key={eng.engine}
                          className="rounded-xl border border-border bg-background p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {ENGINE_LABEL[eng.engine] ?? eng.engine}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${em.chip}`}
                            >
                              <EIcon className={`h-3 w-3 ${em.iconClass}`} />
                              {em.label}
                            </span>
                          </div>
                          {eng.status === "error" ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {eng.error ?? "Query failed."}
                            </p>
                          ) : (
                            <>
                              <p className="mt-2 line-clamp-3 text-xs leading-6 text-muted-foreground">
                                {eng.answer || "No answer returned."}
                              </p>
                              {eng.matched_urls.length > 0 ? (
                                <a
                                  href={eng.matched_urls[0]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-2 flex items-center gap-1.5 text-xs text-success hover:underline"
                                >
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                  <span className="truncate">Your page in sources: {eng.matched_urls[0]}</span>
                                </a>
                              ) : null}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {item.competitor_domains.length > 0 ? (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
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
