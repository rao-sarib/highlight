"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  CheckCircle2,
  Gauge,
  Loader2,
  PenTool,
  Rocket,
  Sparkles,
  Tag,
  Target,
  TrendingUp,
} from "lucide-react";

import { FeaturePageFrame } from "@/components/global/feature-page-frame";
import api from "@/lib/api";

interface ActionItem {
  priority: number;
  category: string;
  title: string;
  detail: string;
  effort: string;
  impact: string;
  prompts_targeted: string[];
}

interface AnalysisReport {
  project_id: string;
  niche: string | null;
  seo_health_score: number | null;
  pages_crawled: number;
  total_issues: number;
  top_issues: { issue_type: string; count: number }[];
  share_of_voice: number | null;
  engines_used: string[];
  per_engine: { engine: string; label: string; share_of_voice: number; cited: number; prompts: number }[];
  cited_count: number;
  prompt_count: number;
  gap_prompts: string[];
  competitors: string[];
  action_plan: ActionItem[];
  generated_at: string | null;
}

const CATEGORY_STYLE: Record<string, string> = {
  geo: "bg-primary/10 text-primary ring-primary/30",
  seo: "bg-accent/10 text-accent ring-accent/30",
  content: "bg-success/10 text-success ring-success/30",
  backlinks: "bg-warning/10 text-warning ring-warning/30",
};

const LEVEL_STYLE: Record<string, string> = {
  high: "text-success",
  medium: "text-warning",
  low: "text-muted-foreground",
};

export default function ProjectAnalysisPage() {
  const params = useParams<{ projectId: string }>();
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [genState, setGenState] = useState<Record<string, "loading" | "done">>({});

  useEffect(() => {
    const restore = async () => {
      try {
        const response = await api.get<AnalysisReport | null>(`/analysis/${params.projectId}/latest`);
        if (response.data) setReport(response.data);
      } catch {
        // none yet
      } finally {
        setIsLoading(false);
      }
    };
    if (params.projectId) void restore();
  }, [params.projectId]);

  const runAnalysis = async () => {
    setErrorMessage("");
    setIsRunning(true);
    try {
      const response = await api.post<AnalysisReport>(
        "/analysis/run",
        { project_id: params.projectId, prompt_count: 3 },
        { timeout: 240000 },
      );
      setReport(response.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to run the analysis.");
    } finally {
      setIsRunning(false);
    }
  };

  const generateForPrompt = async (prompt: string) => {
    setGenState((s) => ({ ...s, [prompt]: "loading" }));
    try {
      await api.post("/content/direct", {
        project_id: params.projectId,
        topic: prompt,
        content_type: "geo",
      });
      setGenState((s) => ({ ...s, [prompt]: "done" }));
    } catch {
      setGenState((s) => {
        const next = { ...s };
        delete next[prompt];
        return next;
      });
    }
  };

  const hasReport = report !== null;

  return (
    <FeaturePageFrame
      eyebrow="Full Analysis · SEO + GEO"
      title="One-click SEO + GEO command center"
      description="Runs the whole pipeline in one go: crawls and audits your site, detects your niche, generates buyer prompts, scans every AI engine for your brand, and builds a prioritized action plan to win citations."
    >
      <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Run full analysis</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {hasReport && report.generated_at
                ? `Last run ${new Date(report.generated_at).toLocaleString()}. Re-run after you publish changes.`
                : "Crawl → audit → niche → prompts → multi-engine scan → action plan. Takes ~1–2 minutes."}
            </p>
          </div>
          <button
            type="button"
            onClick={runAnalysis}
            disabled={isRunning}
            className="btn-brand inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            {isRunning ? "Analyzing your site…" : hasReport ? "Re-run analysis" : "Run full analysis"}
          </button>
        </div>
        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}
        {isRunning ? (
          <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
            Crawling pages, auditing on-page SEO, querying {`{Perplexity, ChatGPT}`} for your brand,
            and writing your action plan… keep this tab open.
          </div>
        ) : null}
      </section>

      {!isRunning && isLoading ? (
        <p className="text-sm text-muted-foreground">Loading last analysis…</p>
      ) : null}

      {!isRunning && !isLoading && !hasReport ? (
        <section className="rounded-[1.5rem] border border-dashed border-border bg-card/50 p-6">
          <p className="text-sm text-muted-foreground">
            No analysis yet. Click <span className="font-medium text-foreground">Run full analysis</span> to
            generate your first SEO + GEO report and action plan.
          </p>
        </section>
      ) : null}

      {!isRunning && hasReport && report ? (
        <>
          {/* Headline scorecards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <Gauge className="h-5 w-5" />
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                SEO health
              </p>
              <p className="mt-1 text-4xl font-semibold text-foreground">
                {report.seo_health_score ?? "—"}
                <span className="text-lg text-muted-foreground">/100</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {report.pages_crawled} pages · {report.total_issues} issues
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                AI Share of Voice
              </p>
              <p className="mt-1 text-4xl font-semibold text-foreground">
                {report.share_of_voice ?? "—"}
                <span className="text-lg text-muted-foreground">%</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                cited in {report.cited_count}/{report.prompt_count} prompts
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <Tag className="h-5 w-5" />
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Detected niche
              </p>
              <p className="mt-1 text-sm leading-6 text-foreground">{report.niche || "—"}</p>
            </div>
            <div className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Engines scanned
              </p>
              <div className="mt-3 grid gap-2">
                {report.per_engine.map((eng) => (
                  <div key={eng.engine} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{eng.label}</span>
                    <span className="font-semibold text-foreground">{eng.share_of_voice}%</span>
                  </div>
                ))}
                {report.per_engine.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No scan run</span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Action plan */}
          {report.action_plan.length > 0 ? (
            <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Your prioritized action plan</h2>
              </div>
              <div className="mt-5 grid gap-3">
                {report.action_plan.map((action) => (
                  <article
                    key={`${action.priority}-${action.title}`}
                    className="rounded-[1.25rem] border border-border/70 bg-background p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                        {action.priority}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ring-1 ring-inset ${
                          CATEGORY_STYLE[action.category] ?? CATEGORY_STYLE.geo
                        }`}
                      >
                        {action.category}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        impact{" "}
                        <span className={LEVEL_STYLE[action.impact] ?? "text-foreground"}>
                          {action.impact}
                        </span>{" "}
                        · effort {action.effort}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-foreground">{action.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{action.detail}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {/* Gap prompts -> close the loop */}
          {report.gap_prompts.length > 0 ? (
            <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-destructive" />
                <h2 className="text-lg font-semibold text-foreground">
                  Prompts you're not cited for — generate content to win them
                </h2>
              </div>
              <div className="mt-5 grid gap-3">
                {report.gap_prompts.map((prompt) => {
                  const state = genState[prompt];
                  return (
                    <div
                      key={prompt}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-4"
                    >
                      <p className="max-w-[70%] text-sm text-foreground">“{prompt}”</p>
                      <button
                        type="button"
                        onClick={() => void generateForPrompt(prompt)}
                        disabled={state === "loading" || state === "done"}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground transition hover:border-primary/50 disabled:opacity-60"
                      >
                        {state === "loading" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : state === "done" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <PenTool className="h-3.5 w-3.5" />
                        )}
                        {state === "done" ? "GEO content created" : "Generate GEO content"}
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Generated GEO content (direct answer + facts + FAQ + schema) is saved under Content
                Generation. Publish it on your site, then re-run the analysis to watch your share of
                voice climb.
              </p>
            </section>
          ) : null}

          {report.competitors.length > 0 ? (
            <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">Competitors winning AI citations</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {report.competitors.map((domain) => (
                  <span
                    key={domain}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground"
                  >
                    {domain}
                  </span>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </FeaturePageFrame>
  );
}
