/**
 * Builds the downloadable PDF version of the Full Analysis report.
 *
 * Extracted verbatim from the analysis page — pure rendering logic with no
 * React state, so it lives on its own rather than inside the page component.
 */

import { jsPDF } from "jspdf";

import { toLocalDateTime } from "@/lib/format";

import type { AnalysisReport, AnalyticsForPdf, RGB, ScorePointPdf } from "./types";
import { humanIssue } from "./utils";

export function buildReportPdf(
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
