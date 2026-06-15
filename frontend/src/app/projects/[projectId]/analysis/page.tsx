"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Download,
  Gauge,
  Loader2,
  Lock,
  PenTool,
  Rocket,
  ShieldCheck,
  Sparkles,
  Tag,
  Target,
  TrendingUp,
} from "lucide-react";

import { jsPDF } from "jspdf";

import { FeaturePageFrame } from "@/components/global/feature-page-frame";
import api from "@/lib/api";
import { toLocalDateTime } from "@/lib/format";
import { toast } from "@/store/toastStore";

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
  errored?: number;
  unavailable?: boolean;
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
  report_locked?: boolean;
  summary?: string | null;
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

interface ScorePointPdf {
  date: string;
  seo_health: number | null;
  ai_visibility: number | null;
}
interface AnalyticsForPdf {
  ai_share_of_voice: number | null;
  seo_health_score: number | null;
  total_content_pieces: number;
  indexed_chunks: number;
  keywords_tracked: number;
  competitors_found: number;
  backlink_opportunities: number;
  scans_run: number;
  google_keywords_ranking: number;
  google_best_rank: number | null;
  google_avg_rank: number | null;
  content_by_type: Record<string, number>;
  score_history: ScorePointPdf[];
}

type RGB = [number, number, number];

function buildReportPdf(
  report: AnalysisReport,
  analytics: AnalyticsForPdf | null,
  siteUrl = "",
): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  const CW = W - M * 2;

  const PRIMARY: RGB = [111, 85, 238];
  const ACCENT: RGB = [27, 200, 232];
  const SUCCESS: RGB = [22, 163, 74];
  const WARN: RGB = [217, 119, 6];
  const DANGER: RGB = [220, 38, 38];
  const INK: RGB = [28, 28, 38];
  const MUTE: RGB = [120, 120, 135];
  const LINE: RGB = [225, 227, 236];
  const SOFT: RGB = [244, 245, 250];
  const WHITE: RGB = [255, 255, 255];

  const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const ink = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const stroke = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);

  let y = 0;
  const ensure = (h: number) => {
    if (y + h > H - 48) {
      doc.addPage();
      y = M;
    }
  };
  const sectionHeader = (t: string) => {
    y += 8;
    ensure(26);
    fill(PRIMARY);
    doc.roundedRect(M, y - 9, 3, 13, 1, 1, "F");
    ink(INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(t, M + 10, y);
    y += 16;
  };
  const para = (t: string, size = 10, color: RGB = MUTE, indent = 0) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    ink(color);
    for (const ln of doc.splitTextToSize(t, CW - indent)) {
      ensure(size + 4);
      doc.text(ln, M + indent, y);
      y += size + 4;
    }
  };
  const bullet = (t: string, color: RGB = MUTE) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    ink(color);
    const lines = doc.splitTextToSize(t, CW - 14);
    ensure(lines.length * 13 + 2);
    fill(PRIMARY);
    doc.circle(M + 3, y - 3, 1.6, "F");
    for (const ln of lines) {
      doc.text(ln, M + 12, y);
      y += 13;
    }
  };
  const gridCards = (items: { label: string; value: string | number }[]) => {
    const perRow = 4;
    const gap = 10;
    const cw = (CW - gap * (perRow - 1)) / perRow;
    const ch = 50;
    for (let i = 0; i < items.length; i += perRow) {
      const row = items.slice(i, i + perRow);
      ensure(ch + 10);
      row.forEach((it, j) => {
        const x = M + j * (cw + gap);
        fill(SOFT);
        doc.roundedRect(x, y, cw, ch, 8, 8, "F");
        ink(INK);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text(String(it.value), x + 12, y + 26);
        ink(MUTE);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text(String(it.label).toUpperCase(), x + 12, y + 40);
      });
      y += ch + 10;
    }
  };
  const lineChart = (series: ScorePointPdf[]) => {
    const ch = 130;
    ensure(ch + 10);
    fill(SOFT);
    doc.roundedRect(M, y, CW, ch, 8, 8, "F");
    const plotX = M + 30;
    const plotTop = y + 12;
    const plotW = CW - 42;
    const plotH = ch - 44;
    stroke(LINE);
    doc.setLineWidth(0.5);
    ink(MUTE);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    [0, 25, 50, 75, 100].forEach((v) => {
      const gy = plotTop + plotH - (v / 100) * plotH;
      doc.line(plotX, gy, M + CW - 12, gy);
      doc.text(String(v), plotX - 6, gy + 2, { align: "right" });
    });
    const n = series.length;
    const xAt = (i: number) => (n <= 1 ? plotX + plotW / 2 : plotX + (i / (n - 1)) * plotW);
    const yAt = (v: number) => plotTop + plotH - (Math.max(0, Math.min(100, v)) / 100) * plotH;
    const drawSeries = (key: "ai_visibility" | "seo_health", color: RGB) => {
      const pts: [number, number][] = [];
      series.forEach((s, i) => {
        const v = s[key];
        if (typeof v === "number") pts.push([xAt(i), yAt(v)]);
      });
      stroke(color);
      doc.setLineWidth(1.5);
      for (let i = 1; i < pts.length; i++) doc.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
      fill(color);
      pts.forEach((p) => doc.circle(p[0], p[1], 2, "F"));
    };
    drawSeries("ai_visibility", PRIMARY);
    drawSeries("seo_health", ACCENT);
    const legendY = y + ch - 8;
    doc.setFontSize(8);
    fill(PRIMARY);
    doc.circle(plotX + 2, legendY - 3, 3, "F");
    ink(MUTE);
    doc.text("AI Share of Voice", plotX + 10, legendY);
    fill(ACCENT);
    doc.circle(plotX + 130, legendY - 3, 3, "F");
    doc.text("SEO Health", plotX + 138, legendY);
    y += ch + 12;
  };

  const seo = report.seo_health_score ?? 0;
  const hasSov = report.share_of_voice !== null && report.share_of_voice !== undefined;
  const sov = report.share_of_voice ?? 0;
  const highlightScore = Math.round(hasSov ? 0.5 * seo + 0.5 * sov : seo);

  // ── Cover band ──
  fill(PRIMARY);
  doc.rect(0, 0, W, 136, "F");
  fill(ACCENT);
  doc.rect(0, 136, W, 4, "F");
  ink(WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("HIGHLIGHT", M, 42);
  doc.setFontSize(22);
  doc.text("AI Visibility & SEO Report", M, 72);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const cleanUrl = siteUrl
    ? siteUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "").slice(0, 58)
    : "";
  doc.text(`Site: ${cleanUrl || "—"}`, M, 92);
  doc.text(`Niche: ${report.niche || "—"}`, M, 107);
  doc.text(`Generated: ${report.generated_at ? toLocalDateTime(report.generated_at) : "—"}`, M, 122);
  const bx = W - M - 116;
  fill(WHITE);
  doc.roundedRect(bx, 32, 116, 76, 10, 10, "F");
  ink(PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.text(String(highlightScore), bx + 58, 76, { align: "center" });
  ink(MUTE);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("HIGHLIGHT SCORE / 100", bx + 58, 96, { align: "center" });
  y = 168;

  // ── Headline metric cards ──
  const topCards: { label: string; value: string; color: RGB }[] = [
    { label: "AI Share of Voice", value: hasSov ? `${sov}%` : "—", color: PRIMARY },
    { label: "SEO Health", value: report.seo_health_score != null ? `${Math.round(seo)}/100` : "—", color: ACCENT },
    { label: "Cited prompts", value: report.prompt_count ? `${report.cited_count}/${report.prompt_count}` : "0", color: SUCCESS },
  ];
  {
    const gap = 10;
    const cw = (CW - gap * 2) / 3;
    const cardH = 58;
    ensure(cardH + 8);
    topCards.forEach((it, i) => {
      const x = M + i * (cw + gap);
      fill(SOFT);
      doc.roundedRect(x, y, cw, cardH, 8, 8, "F");
      fill(it.color);
      doc.roundedRect(x, y, 4, cardH, 2, 2, "F");
      ink(INK);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text(it.value, x + 14, y + 30);
      ink(MUTE);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(it.label.toUpperCase(), x + 14, y + 46);
    });
    y += cardH + 12;
  }

  // ── Per-engine citation bars ──
  if (report.per_engine.length) {
    sectionHeader("AI engines — citation rate");
    for (const e of report.per_engine) {
      ensure(24);
      const responses = e.responses ?? e.prompts;
      const rate = e.unavailable ? 0 : e.cited_rate ?? (responses ? Math.round((e.cited / responses) * 100) : 0);
      ink(INK);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(e.label, M, y);
      ink(MUTE);
      doc.text(e.unavailable ? "unavailable" : `${rate}%  (cited ${e.cited}/${responses})`, W - M, y, { align: "right" });
      y += 5;
      fill(LINE);
      doc.roundedRect(M, y, CW, 6, 3, 3, "F");
      if (!e.unavailable && rate > 0) {
        fill(PRIMARY);
        doc.roundedRect(M, y, (CW * Math.min(rate, 100)) / 100, 6, 3, 3, "F");
      }
      y += 16;
    }
  }

  // ── Score progress chart ──
  if (analytics && analytics.score_history && analytics.score_history.length) {
    sectionHeader("Score progress over time");
    lineChart(analytics.score_history);
  }

  // ── Analytics grid ──
  if (analytics) {
    sectionHeader("Analytics");
    gridCards([
      { label: "AI scans run", value: analytics.scans_run },
      { label: "Content pieces", value: analytics.total_content_pieces },
      { label: "Indexed chunks", value: analytics.indexed_chunks },
      { label: "Keywords tracked", value: analytics.keywords_tracked },
      { label: "Competitors found", value: analytics.competitors_found },
      { label: "Backlink prospects", value: analytics.backlink_opportunities },
      { label: "Google rankings", value: analytics.google_keywords_ranking },
      { label: "Best Google rank", value: analytics.google_best_rank != null ? `#${analytics.google_best_rank}` : "—" },
    ]);
  }

  // ── Strengths ──
  if (report.strengths.length) {
    sectionHeader("What's already working");
    report.strengths.forEach((s) => bullet(s, INK));
  }
  if (report.cited_prompts.length) {
    sectionHeader("Prompts you already win");
    report.cited_prompts.forEach((p) => bullet(p));
  }
  if (report.gap_prompts.length) {
    sectionHeader("Opportunities — prompts you're not cited for");
    report.gap_prompts.forEach((p) => bullet(p));
  }
  if (report.action_plan.length) {
    sectionHeader("Prioritized action plan");
    for (const a of report.action_plan) {
      ensure(28);
      ink(INK);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`${a.priority}. [${a.category.toUpperCase()}] ${a.title}`, M, y);
      ink(MUTE);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`impact ${a.impact} · effort ${a.effort}`, W - M, y, { align: "right" });
      y += 13;
      para(a.detail, 9, MUTE, 4);
      y += 3;
    }
  }

  // ── SEO foundation + severity bar ──
  sectionHeader("SEO foundation");
  bullet(`SEO health ${report.seo_health_score ?? "—"}/100 · ${report.pages_crawled} pages crawled · ${report.total_issues} issues`, INK);
  const sc = report.severity_counts || {};
  const crit = sc.critical ?? 0;
  const warn = sc.warning ?? 0;
  const info = sc.info ?? 0;
  const tot = Math.max(crit + warn + info, 1);
  ensure(22);
  fill(LINE);
  doc.roundedRect(M, y, CW, 8, 4, 4, "F");
  let cx = M;
  const seg = (cnt: number, c: RGB) => {
    if (cnt > 0) {
      const w = (CW * cnt) / tot;
      fill(c);
      doc.rect(cx, y, w, 8, "F");
      cx += w;
    }
  };
  seg(crit, DANGER);
  seg(warn, WARN);
  seg(info, MUTE);
  y += 14;
  para(`${crit} critical · ${warn} warning · ${info} info`, 8, MUTE);
  for (const i of report.top_issues) bullet(`${humanIssue(i.issue_type)} — ${i.count}`);

  // ── Competitors ──
  if (report.competitors.length) {
    sectionHeader("Competitors winning AI citations");
    para(report.competitors.join("   ·   "), 9, MUTE);
  }

  // ── Footer on every page ──
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    stroke(LINE);
    doc.setLineWidth(0.5);
    doc.line(M, H - 32, W - M, H - 32);
    ink(MUTE);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Generated by Highlight — AI SEO & GEO toolkit", M, H - 20);
    doc.text(`Page ${p} of ${pages}`, W - M, H - 20, { align: "right" });
  }

  return doc;
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
        { project_id: params.projectId, prompt_count: 5 },
        { timeout: 240000 },
      );
      setReport(response.data);
      toast.success(
        response.data.report_locked
          ? "Analysis complete — upgrade to unlock the full report."
          : "Full analysis complete.",
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to run the analysis.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsRunning(false);
    }
  };

  const downloadReport = async () => {
    if (!report) return;
    toast.info("Preparing your PDF report…");
    let analytics: AnalyticsForPdf | null = null;
    try {
      analytics = (await api.get<AnalyticsForPdf>(`/analytics/${params.projectId}`)).data;
    } catch {
      // analytics is optional in the PDF
    }
    let siteUrl = "";
    try {
      siteUrl = (await api.get<{ url: string }>(`/projects/${params.projectId}`)).data.url ?? "";
    } catch {
      // url is optional in the PDF
    }
    const doc = buildReportPdf(report, analytics, siteUrl);
    const slug = (report.niche || "project").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    doc.save(`ai-visibility-report-${slug}.pdf`);
    toast.success("Report downloaded as PDF.");
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
      eyebrow="Full Analysis"
      title="Full Analysis"
      description="Runs everything in one go: checks which AI engines cite you, audits your site, and gives you a ranked action plan."
    >
      <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Run full analysis</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {hasReport && report.generated_at
                ? `Last run ${toLocalDateTime(report.generated_at)}. Re-run after you publish changes.`
                : "Checks AI engines, audits your site, and builds an action plan. Takes about 1–2 minutes."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasReport && !report.report_locked ? (
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

          {report.report_locked ? (
            <section className="rounded-[1.5rem] border border-primary/30 bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">
                  AI visibility test
                </h2>
              </div>
              {report.summary ? (
                <p className="mt-3 text-sm leading-7 text-foreground">{report.summary}</p>
              ) : null}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.25rem] border border-border/70 bg-background p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Detected niche
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground">{report.niche || "—"}</p>
                </div>
                <div className="rounded-[1.25rem] border border-border/70 bg-background p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Pages audited
                  </p>
                  <p className="mt-1 text-4xl font-semibold text-foreground">
                    {report.pages_crawled}
                  </p>
                </div>
              </div>
              <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Unlock the full report</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Buy a package to see the per-engine citation breakdown, what&apos;s already working,
                  your prioritized action plan, the prompts you&apos;re missing, the competitors
                  winning citations, and a downloadable report.
                </p>
                <Link
                  href="/settings/plan"
                  className="btn-brand mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5"
                >
                  <Sparkles className="h-4 w-4" /> View packages
                </Link>
              </div>
            </section>
          ) : (
          <>
          {/* ── PRIMARY: AI visibility, engine by engine ───────────────── */}
          <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                Which engines cite you
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
                  if (eng.unavailable) {
                    return (
                      <div
                        key={eng.engine}
                        className="rounded-[1.25rem] border border-border/70 bg-background p-5 opacity-70"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">{eng.label}</p>
                          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                            Unavailable
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Couldn&apos;t reach this engine for this scan (rate-limited or no
                          credits) — excluded from the score.
                        </p>
                      </div>
                    );
                  }
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
                <h2 className="text-lg font-semibold text-foreground">What&apos;s working</h2>
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
                <h2 className="text-lg font-semibold text-foreground">Action plan</h2>
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
                  Prompts you&apos;re missing
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
              <h2 className="text-lg font-semibold text-foreground">Competitors cited by AI</h2>
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
          )}
        </>
      ) : null}
    </FeaturePageFrame>
  );
}
