"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Info,
  Loader2,
  RefreshCcw,
  Tag,
  WandSparkles,
} from "lucide-react";

import { FeaturePageFrame } from "@/components/global/feature-page-frame";
import api from "@/lib/api";

interface IssueCount {
  issue_type: string;
  count: number;
}

interface PageAudit {
  url: string;
  status_code: number;
  title: string | null;
  word_count: number;
  h1_count: number;
  issue_count: number;
  issues: { issue_type: string; severity: string; description: string; suggestion: string }[];
}

interface SiteAudit {
  project_id: string;
  pages_crawled: number;
  total_issues: number;
  seo_health_score: number | null;
  severity_counts: Record<string, number>;
  top_issues: IssueCount[];
  detected_niche: string | null;
  audited_at: string | null;
  pages: PageAudit[];
}

const SEVERITY_STYLE: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive ring-destructive/30",
  warning: "bg-warning/10 text-warning ring-warning/30",
  info: "bg-muted text-muted-foreground ring-border",
};

function healthColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 80) return "text-success";
  if (score >= 55) return "text-warning";
  return "text-destructive";
}

export default function ProjectFixesPage() {
  const params = useParams<{ projectId: string }>();
  const [audit, setAudit] = useState<SiteAudit | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Auto-restore the last stored audit on open — no re-crawl.
  useEffect(() => {
    const loadStored = async () => {
      try {
        const response = await api.get<SiteAudit>(`/fixes/audit/${params.projectId}`);
        if (response.data.pages_crawled > 0) setAudit(response.data);
      } catch {
        // No prior audit — that's fine.
      } finally {
        setIsLoading(false);
      }
    };
    if (params.projectId) void loadStored();
  }, [params.projectId]);

  const runAudit = async () => {
    setErrorMessage("");
    setIsRunning(true);
    try {
      const response = await api.post<SiteAudit>("/fixes/audit", {
        project_id: params.projectId,
      });
      setAudit(response.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to run the site audit.");
    } finally {
      setIsRunning(false);
    }
  };

  const hasAudit = audit !== null && audit.pages_crawled > 0;

  return (
    <FeaturePageFrame
      feature="fixes"
      eyebrow="SEO Fixes"
      title="Audit & fix your site"
      description="Crawls your whole site, finds on-page SEO issues, scores your site health, and detects your niche. Results are saved, so you can reopen anytime."
    >
      <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Run a full-site audit</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {hasAudit
                ? `Last crawled ${audit && audit.audited_at ? new Date(audit.audited_at).toLocaleString() : ""}. Re-run only when your site changes.`
                : "Crawls and audits every reachable page, then stores the result."}
            </p>
          </div>
          <button
            type="button"
            onClick={runAudit}
            disabled={isRunning}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : hasAudit ? (
              <RefreshCcw className="h-4 w-4" />
            ) : (
              <WandSparkles className="h-4 w-4" />
            )}
            {isRunning ? "Crawling site…" : hasAudit ? "Re-run audit" : "Run site audit"}
          </button>
        </div>
        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}
      </section>

      {isRunning ? (
        <section className="rounded-[1.5rem] border border-border/70 bg-card p-8 shadow-sm">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Crawling pages, auditing on-page SEO, and detecting your niche…</span>
          </div>
        </section>
      ) : null}

      {!isRunning && isLoading ? (
        <p className="text-sm text-muted-foreground">Loading saved audit…</p>
      ) : null}

      {!isRunning && !isLoading && !hasAudit ? (
        <section className="rounded-[1.5rem] border border-dashed border-border bg-card/50 p-6">
          <p className="text-sm text-muted-foreground">
            No audit yet. Click <span className="font-medium text-foreground">Run site audit</span> to
            crawl and analyze your whole website.
          </p>
        </section>
      ) : null}

      {!isRunning && hasAudit && audit ? (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Gauge className="h-5 w-5" />
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                SEO health
              </p>
              <p className={`mt-1 text-4xl font-semibold ${healthColor(audit.seo_health_score)}`}>
                {audit.seo_health_score ?? "—"}
                <span className="text-lg text-muted-foreground">/100</span>
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Pages crawled
              </p>
              <p className="mt-1 text-4xl font-semibold text-foreground">{audit.pages_crawled}</p>
              <p className="mt-2 text-sm text-muted-foreground">{audit.total_issues} issues found</p>
            </div>
            <div className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Severity
              </p>
              <div className="mt-3 space-y-1.5 text-sm">
                <p className="flex items-center justify-between">
                  <span className="text-destructive">Critical</span>
                  <span className="font-semibold text-foreground">{audit.severity_counts.critical ?? 0}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-warning">Warning</span>
                  <span className="font-semibold text-foreground">{audit.severity_counts.warning ?? 0}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">Info</span>
                  <span className="font-semibold text-foreground">{audit.severity_counts.info ?? 0}</span>
                </p>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <Tag className="h-5 w-5" />
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Detected niche
              </p>
              <p className="mt-1 text-sm leading-6 text-foreground">
                {audit.detected_niche || "Not detected"}
              </p>
            </div>
          </div>

          {/* Top issues */}
          {audit.top_issues.length > 0 ? (
            <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">Most common issues</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {audit.top_issues.map((issue) => (
                  <span
                    key={issue.issue_type}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground"
                  >
                    {issue.issue_type.replace(/_/g, " ")}
                    <span className="rounded-full bg-muted px-2 text-xs font-semibold text-muted-foreground">
                      {issue.count}
                    </span>
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {/* Per-page breakdown */}
          <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Per-page audit</h2>
            <div className="mt-4 grid gap-3">
              {audit.pages.map((page) => (
                <details
                  key={page.url}
                  className="group rounded-[1.25rem] border border-border/70 bg-background p-5"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {page.title || page.url}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{page.url}</p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                        page.issue_count === 0
                          ? "bg-success/10 text-success"
                          : "bg-warning/10 text-warning"
                      }`}
                    >
                      {page.issue_count === 0 ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      )}
                      {page.issue_count} issue{page.issue_count === 1 ? "" : "s"}
                    </span>
                  </summary>
                  {page.issues.length > 0 ? (
                    <div className="mt-4 grid gap-2">
                      {page.issues.map((issue, i) => (
                        <div
                          key={`${issue.issue_type}-${i}`}
                          className="rounded-xl border border-border bg-card p-3"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                                SEVERITY_STYLE[issue.severity] ?? SEVERITY_STYLE.info
                              }`}
                            >
                              <Info className="h-3 w-3" />
                              {issue.severity}
                            </span>
                            <span className="text-sm font-medium text-foreground">
                              {issue.issue_type.replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{issue.description}</p>
                          <p className="mt-1 text-sm text-foreground">
                            <span className="font-medium">Fix:</span> {issue.suggestion}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-success">No on-page issues found 🎉</p>
                  )}
                </details>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </FeaturePageFrame>
  );
}
