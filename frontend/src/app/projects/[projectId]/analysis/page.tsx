"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  CheckCircle2,
  Download,
  Gauge,
  Loader2,
  PenTool,
  Rocket,
  ShieldCheck,
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

interface EngineBreakdown {
  engine: string;
  label: string;
  share_of_voice: number;
  cited_rate?: number;
  cited: number;
  in_sources?: number;
  prompts: number;
  responses?: number;
  attempted?: number;
  total_prompts?: number;
}

interface AnalysisReport {
  project_id: string;
  niche: string | null;
  seo_health_score: number | null;
  pages_crawled: number;
  total_issues: number;
  top_issues: { issue_type: string; count: number }[];
  severity_counts: { critical?: number; warning?: number; info?: number };
  share_of_voice: number | null;
  engines_used: string[];
  per_engine: EngineBreakdown[];
  cited_count: number;
  in_sources_count: number;
  prompt_count: number;
  cited_prompts: string[];
  gap_prompts: string[];
  competitors: string[];
  strengths: string[];
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

function humanIssue(issueType: string): string {
  return issueType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildReportMarkdown(report: AnalysisReport): string {
  const seo = report.seo_health_score ?? 0;
  const hasSov = report.share_of_voice !== null && report.share_of_voice !== undefined;
  const sov = report.share_of_voice ?? 0;
  const highlightScore = Math.round(hasSov ? 0.5 * seo + 0.5 * sov : seo);
  const date = report.generated_at ? new Date(report.generated_at).toLocaleString() : "—";
  const lines: string[] = [];

  lines.push(`# AI Visibility & SEO Report`);
  lines.push("");
  lines.push(`**Niche:** ${report.niche || "—"}`);
  lines.push(`**Generated:** ${date}`);
  lines.push(`**Highlight Score (SEO + GEO):** ${highlightScore}/100`);
  lines.push("");

  lines.push(`## AI Visibility (GEO) — headline`);
  lines.push("");
  lines.push(`- **AI Share of Voice:** ${hasSov ? `${sov}%` : "not scanned"}`);
  lines.push(`- **Cited in:** ${report.cited_count} of ${report.prompt_count} buyer prompts`);
  lines.push(`- **Appears in sources for:** ${report.in_sources_count} prompt(s)`);
  lines.push(`- **Engines scanned:** ${report.per_engine.map((e) => e.label).join(", ") || "—"}`);
  lines.push("");

  if (report.per_engine.length > 0) {
    lines.push(`### Per-engine citation breakdown`);
    lines.push("");
    lines.push(`| Engine | Cited responses | Citation rate | Share of voice |`);
    lines.push(`| --- | --- | --- | --- |`);
    for (const e of report.per_engine) {
      const responses = e.responses ?? e.prompts;
      const rate = e.cited_rate ?? (responses ? Math.round((e.cited / responses) * 100) : 0);
      lines.push(`| ${e.label} | ${e.cited}/${responses} | ${rate}% | ${e.share_of_voice}% |`);
    }
    lines.push("");
  }

  if (report.strengths.length > 0) {
    lines.push(`## What's already working`);
    lines.push("");
    for (const s of report.strengths) lines.push(`- ${s}`);
    lines.push("");
  }

  if (report.cited_prompts.length > 0) {
    lines.push(`## Prompts you already win`);
    lines.push("");
    for (const p of report.cited_prompts) lines.push(`- ${p}`);
    lines.push("");
  }

  if (report.gap_prompts.length > 0) {
    lines.push(`## Prompts you're not cited for (opportunities)`);
    lines.push("");
    for (const p of report.gap_prompts) lines.push(`- ${p}`);
    lines.push("");
  }

  if (report.action_plan.length > 0) {
    lines.push(`## Prioritized action plan`);
    lines.push("");
    for (const a of report.action_plan) {
      lines.push(`${a.priority}. **[${a.category.toUpperCase()}] ${a.title}** — impact ${a.impact}, effort ${a.effort}`);
      lines.push(`   ${a.detail}`);
    }
    lines.push("");
  }

  lines.push(`## SEO foundation (secondary)`);
  lines.push("");
  lines.push(`- **SEO health:** ${report.seo_health_score ?? "—"}/100`);
  lines.push(`- **Pages crawled:** ${report.pages_crawled}`);
  lines.push(`- **Total issues:** ${report.total_issues}`);
  const sc = report.severity_counts || {};
  lines.push(`- **By severity:** ${sc.critical ?? 0} critical · ${sc.warning ?? 0} warning · ${sc.info ?? 0} info`);
  if (report.top_issues.length > 0) {
    lines.push("");
    lines.push(`### Top on-page issues`);
    for (const i of report.top_issues) lines.push(`- ${humanIssue(i.issue_type)} — ${i.count}`);
  }
  lines.push("");

  if (report.competitors.length > 0) {
    lines.push(`## Competitors winning AI citations`);
    lines.push("");
    for (const d of report.competitors) lines.push(`- ${d}`);
    lines.push("");
  }

  lines.push(`---`);
  lines.push(`_Generated by Highlight — AI SEO & GEO toolkit._`);
  return lines.join("\n");
}

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

  const downloadReport = () => {
    if (!report) return;
    const md = buildReportMarkdown(report);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const slug = (report.niche || "project").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-visibility-report-${slug}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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
      eyebrow="Full Analysis · GEO + SEO"
      title="AI visibility command center"
      description="Runs the whole pipeline in one go: scans every AI engine (ChatGPT, Perplexity, Gemini, Google AI Overview) to see who they cite, audits your site, and builds a prioritized plan to win more AI citations."
    >
      <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Run full analysis</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {hasReport && report.generated_at
                ? `Last run ${new Date(report.generated_at).toLocaleString()}. Re-run after you publish changes.`
                : "Multi-engine AI scan → site audit → niche → buyer prompts → action plan. Takes ~1–2 minutes."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasReport ? (
              <button
                type="button"
                onClick={downloadReport}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:border-primary/50"
              >
                <Download className="h-4 w-4" /> Download report
              </button>
            ) : null}
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
        </div>
        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}
        {isRunning ? (
          <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
            Querying ChatGPT, Perplexity, Gemini and Google AI Overview for your brand, auditing
            on-page SEO, and writing your action plan… keep this tab open.
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
            generate your first AI-visibility report and action plan.
          </p>
        </section>
      ) : null}

      {!isRunning && hasReport && report ? (
        <>
          {/* Unified Highlight Score */}
          {(() => {
            const seo = report.seo_health_score ?? 0;
            const hasSov = report.share_of_voice !== null && report.share_of_voice !== undefined;
            const sov = report.share_of_voice ?? 0;
            const highlightScore = Math.round(hasSov ? 0.5 * seo + 0.5 * sov : seo);
            const grade =
              highlightScore >= 80 ? "Excellent" : highlightScore >= 55 ? "Good" : "Needs work";
            return (
              <section className="overflow-hidden rounded-[1.5rem] border border-border/70 bg-brand-gradient p-6 text-white shadow-glow">
                <div className="flex flex-wrap items-center justify-between gap-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/80">
                      Highlight Score · combined SEO + GEO
                    </p>
                    <p className="mt-2 text-6xl font-semibold tracking-tight">
                      {highlightScore}
                      <span className="text-2xl text-white/70">/100</span>
                    </p>
                    <p className="mt-1 text-sm text-white/85">{grade}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-6 text-sm">
                    <div>
                      <p className="text-white/70">AI Share of Voice</p>
                      <p className="text-2xl font-semibold">{hasSov ? `${sov}%` : "—"}</p>
                    </div>
                    <div>
                      <p className="text-white/70">SEO health</p>
                      <p className="text-2xl font-semibold">{report.seo_health_score ?? "—"}</p>
                    </div>
                  </div>
                </div>
              </section>
            );
          })()}

          {/* ── PRIMARY: AI visibility, engine by engine ───────────────── */}
          <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                Which AI engines cite you — and how often
              </h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Across {report.prompt_count} buyer prompt(s): cited in{" "}
              <span className="font-semibold text-foreground">{report.cited_count}</span>, in the
              sources for{" "}
              <span className="font-semibold text-foreground">{report.in_sources_count}</span>.
            </p>

            {report.per_engine.length > 0 ? (
              <div className="mt-5 grid gap-3">
                {report.per_engine.map((eng) => {
                  const responses = eng.responses ?? eng.prompts;
                  const rate =
                    eng.cited_rate ?? (responses ? Math.round((eng.cited / responses) * 100) : 0);
                  const isAio = eng.engine === "google_aio";
                  return (
                    <div
                      key={eng.engine}
                      className="rounded-[1.25rem] border border-border/70 bg-background p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{eng.label}</p>
                          <p className="text-xs text-muted-foreground">
                            Cited in{" "}
                            <span className="font-semibold text-foreground">
                              {eng.cited} of {responses}
                            </span>{" "}
                            response(s) · {rate}% citation rate
                            {isAio && eng.attempted !== undefined
                              ? ` · AI Overview shown for ${responses}/${eng.attempted} prompts`
                              : ""}
                          </p>
                        </div>
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary ring-1 ring-inset ring-primary/30">
                          {eng.share_of_voice}% SoV
                        </span>
                      </div>
                      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-brand-gradient"
                          style={{ width: `${Math.min(100, rate)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No AI engines configured for this scan. Add API keys (Perplexity, OpenAI, Gemini,
                Serper) to enable multi-engine citation checking.
              </p>
            )}
          </section>

          {/* ── What's already working (strengths) ─────────────────────── */}
          {report.strengths.length > 0 || report.cited_prompts.length > 0 ? (
            <section className="rounded-[1.5rem] border border-success/30 bg-success/5 p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-success" />
                <h2 className="text-lg font-semibold text-foreground">What's already working well</h2>
              </div>
              {report.strengths.length > 0 ? (
                <ul className="mt-4 grid gap-2">
                  {report.strengths.map((s) => (
                    <li key={s} className="flex items-start gap-2 text-sm text-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {report.cited_prompts.length > 0 ? (
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-success">
                    Prompts you already win
                  </p>
                  <div className="mt-2 grid gap-2">
                    {report.cited_prompts.map((prompt) => (
                      <div
                        key={prompt}
                        className="rounded-xl border border-success/30 bg-card px-4 py-2.5 text-sm text-foreground"
                      >
                        “{prompt}”
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

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

          {/* ── SECONDARY: SEO foundation ──────────────────────────────── */}
          <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold text-foreground">SEO foundation</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                supporting
              </span>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.25rem] border border-border/70 bg-background p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
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
              <div className="rounded-[1.25rem] border border-border/70 bg-background p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  By severity
                </p>
                <div className="mt-3 grid gap-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-destructive">Critical</span>
                    <span className="font-semibold text-foreground">
                      {report.severity_counts?.critical ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-warning">Warning</span>
                    <span className="font-semibold text-foreground">
                      {report.severity_counts?.warning ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Info</span>
                    <span className="font-semibold text-foreground">
                      {report.severity_counts?.info ?? 0}
                    </span>
                  </div>
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-border/70 bg-background p-5">
                <div className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Detected niche
                  </p>
                </div>
                <p className="mt-2 text-sm leading-6 text-foreground">{report.niche || "—"}</p>
              </div>
            </div>
            {report.top_issues.length > 0 ? (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Top on-page issues to fix
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {report.top_issues.map((issue) => (
                    <span
                      key={issue.issue_type}
                      className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground"
                    >
                      {humanIssue(issue.issue_type)} · {issue.count}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </FeaturePageFrame>
  );
}
