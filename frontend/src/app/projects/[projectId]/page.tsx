"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BookOpen,
  Cpu,
  Eye,
  FileText,
  Gauge,
  Layers,
  Link2,
  MousePointerClick,
  Percent,
  ScanSearch,
  Search,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";

import { FeaturePageFrame } from "@/components/global/feature-page-frame";
import api from "@/lib/api";
import { toLocalDate } from "@/lib/format";

interface AnalyticsPoint {
  date: string;
  content_count: number;
}

interface ScorePoint {
  date: string;
  seo_health: number | null;
  ai_visibility: number | null;
}

interface AnalyticsSummary {
  project_id: string;
  niche: string | null;
  ai_share_of_voice: number | null;
  ai_rating: string | null;
  cited_count: number;
  in_sources_count: number;
  prompt_count: number;
  engines_checked: number;
  scans_run: number;
  seo_health_score: number | null;
  pages_crawled: number;
  last_audited_at: string | null;
  total_content_pieces: number;
  content_by_type: Record<string, number>;
  indexed_chunks: number;
  keywords_tracked: number;
  competitors_found: number;
  backlink_opportunities: number;
  google_keywords_ranking: number;
  google_best_rank: number | null;
  google_avg_rank: number | null;
  content_history: AnalyticsPoint[];
  score_history: ScorePoint[];
}

interface ProjectDetail {
  id: string;
  name: string;
  url: string;
  ga4_property_id: string | null;
}

interface GA4SetupInfo {
  configured: boolean;
  service_account_email: string | null;
}

interface GA4DailyPoint {
  date: string;
  sessions: number;
  active_users: number;
  page_views: number;
}

interface GA4TopPage {
  page_path: string;
  views: number;
}

interface GA4ChannelPoint {
  channel: string;
  sessions: number;
}

interface GA4Summary {
  property_id: string;
  period_days: number;
  total_sessions: number;
  total_active_users: number;
  total_new_users: number;
  total_page_views: number;
  average_bounce_rate: number;
  average_session_duration: number;
  history: GA4DailyPoint[];
  top_pages: GA4TopPage[];
  channels: GA4ChannelPoint[];
}

function formatGa4Date(value: string): string {
  if (/^\d{8}$/.test(value)) {
    const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return value;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export default function ProjectAnalyticsPage() {
  const params = useParams<{ projectId: string }>();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [analyticsLocked, setAnalyticsLocked] = useState(false);

  const [ga4PropertyIdInput, setGa4PropertyIdInput] = useState("");
  const [ga4Setup, setGa4Setup] = useState<GA4SetupInfo | null>(null);
  const [ga4Data, setGa4Data] = useState<GA4Summary | null>(null);
  const [ga4Error, setGa4Error] = useState("");
  const [ga4Loading, setGa4Loading] = useState(false);
  const [savingGa4, setSavingGa4] = useState(false);
  const [ga4SaveMessage, setGa4SaveMessage] = useState("");

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const response = await api.get<AnalyticsSummary>(
          `/analytics/${params.projectId}`,
        );
        setAnalytics(response.data);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Failed to load analytics.";
        // Free tier: analytics is a paid feature (402) — show a locked card,
        // not a scary error banner.
        if (/upgrade your plan|doesn't include this feature/i.test(msg)) {
          setAnalyticsLocked(true);
        } else {
          setErrorMessage(msg);
        }
      }
    };

    if (params.projectId) {
      void loadAnalytics();
    }
  }, [params.projectId]);

  const loadGa4Data = async (projectId: string) => {
    setGa4Loading(true);
    setGa4Error("");
    try {
      const response = await api.get<GA4Summary>(`/analytics/${projectId}/ga4`);
      setGa4Data(response.data);
    } catch (error) {
      setGa4Data(null);
      setGa4Error(
        error instanceof Error ? error.message : "Failed to load Google Analytics data.",
      );
    } finally {
      setGa4Loading(false);
    }
  };

  useEffect(() => {
    if (!params.projectId) return;

    const loadProjectAndGa4 = async () => {
      try {
        const response = await api.get<ProjectDetail>(`/projects/${params.projectId}`);
        setGa4PropertyIdInput(response.data.ga4_property_id ?? "");

        if (response.data.ga4_property_id) {
          void loadGa4Data(params.projectId);
        }
      } catch {
        // Project layout already redirects on 404; ignore here.
      }
    };

    const loadGa4Setup = async () => {
      try {
        const response = await api.get<GA4SetupInfo>("/analytics/ga4/setup");
        setGa4Setup(response.data);
      } catch {
        setGa4Setup({ configured: false, service_account_email: null });
      }
    };

    void loadProjectAndGa4();
    void loadGa4Setup();
  }, [params.projectId]);

  const handleSaveGa4 = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingGa4(true);
    setGa4SaveMessage("");
    setGa4Error("");

    try {
      const response = await api.patch<ProjectDetail>(`/projects/${params.projectId}`, {
        ga4_property_id: ga4PropertyIdInput.trim(),
      });
      setGa4PropertyIdInput(response.data.ga4_property_id ?? "");

      if (response.data.ga4_property_id) {
        setGa4SaveMessage("Saved. Fetching Google Analytics data...");
        await loadGa4Data(response.data.id);
        setGa4SaveMessage("Saved.");
      } else {
        setGa4Data(null);
        setGa4SaveMessage("GA4 Property ID removed.");
      }
    } catch (error) {
      setGa4SaveMessage(
        error instanceof Error ? error.message : "Failed to save GA4 Property ID.",
      );
    } finally {
      setSavingGa4(false);
    }
  };

  return (
    <FeaturePageFrame
      eyebrow="Analytics"
      title="Analytics"
      description="Key metrics for this project, plus Google Analytics 4 traffic once you connect a property."
    >
      {errorMessage ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      {analyticsLocked ? (
        <section className="rounded-[1.5rem] border border-primary/30 bg-card p-6 text-sm shadow-sm">
          <p className="font-semibold text-foreground">Analytics is a paid feature</p>
          <p className="mt-2 text-muted-foreground">
            Your current plan doesn&apos;t include analytics. Buy a package to unlock content &amp;
            traffic metrics for this project.
          </p>
          <a
            href="/settings/plan"
            className="btn-brand mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5"
          >
            View packages
          </a>
        </section>
      ) : !analytics ? (
        <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 text-sm text-muted-foreground shadow-sm">
          Loading analytics...
        </section>
      ) : (
        <>
          {(() => {
            const a = analytics;
            const cards: { label: string; value: string; icon: typeof Eye; tone?: string }[] = [
              {
                label: "AI Share of Voice",
                value: a.ai_share_of_voice != null ? `${a.ai_share_of_voice}%` : "—",
                icon: Eye,
                tone: "primary",
              },
              {
                label: "SEO Health",
                value: a.seo_health_score != null ? `${Math.round(a.seo_health_score)}/100` : "—",
                icon: Gauge,
                tone: "accent",
              },
              {
                label: "Prompts cited",
                value: a.prompt_count ? `${a.cited_count}/${a.prompt_count}` : "0",
                icon: Sparkles,
                tone: "success",
              },
              { label: "Engines checked", value: `${a.engines_checked}`, icon: Cpu },
              { label: "AI scans run", value: `${a.scans_run}`, icon: ScanSearch },
              { label: "In AI sources", value: `${a.in_sources_count}`, icon: Percent },
              { label: "Pages crawled", value: `${a.pages_crawled}`, icon: FileText },
              { label: "Content pieces", value: `${a.total_content_pieces}`, icon: BookOpen },
              { label: "Indexed chunks", value: `${a.indexed_chunks}`, icon: Layers },
              { label: "Keywords tracked", value: `${a.keywords_tracked}`, icon: Search },
              { label: "Competitors found", value: `${a.competitors_found}`, icon: Target },
              { label: "Backlink prospects", value: `${a.backlink_opportunities}`, icon: Link2 },
              {
                label: "Google rankings",
                value: `${a.google_keywords_ranking}`,
                icon: Search,
                tone: "accent",
              },
              {
                label: "Best Google rank",
                value: a.google_best_rank != null ? `#${a.google_best_rank}` : "—",
                icon: TrendingUp,
                tone: "success",
              },
              {
                label: "Avg Google rank",
                value: a.google_avg_rank != null ? `#${a.google_avg_rank}` : "—",
                icon: Gauge,
              },
            ];
            return (
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {cards.map(({ label, value, icon: Icon, tone }) => (
                  <div key={label} className="rounded-[1.5rem] border border-border/70 bg-card p-5 shadow-sm">
                    <div
                      className={
                        "flex h-11 w-11 items-center justify-center rounded-2xl " +
                        (tone === "accent"
                          ? "bg-accent/10 text-accent"
                          : tone === "success"
                            ? "bg-success/10 text-success"
                            : "bg-primary/10 text-primary")
                      }
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {label}
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
                  </div>
                ))}
              </section>
            );
          })()}

          {/* Score progress over time */}
          {analytics.score_history.length > 0 ? (
            <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Score progress over time</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your AI Share of Voice and SEO Health from each analysis — track whether you&apos;re
                  improving. Real recorded history.
                </p>
              </div>
              <div className="mt-8 h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.score_history}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="4 4" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      tickFormatter={(v: string) => toLocalDate(v)}
                    />
                    <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "16px",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="ai_visibility"
                      name="AI Share of Voice"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      connectNulls
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="seo_health"
                      name="SEO Health"
                      stroke="hsl(var(--accent))"
                      strokeWidth={2}
                      connectNulls
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          ) : null}

          <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Content generated per week
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                AI-generated content pieces created each week over the last 12 weeks. Real data from your project.
              </p>
            </div>

            <div className="mt-8 h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.content_history}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="4 4" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickFormatter={(value: string) =>
                      new Date(value).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })
                    }
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "16px",
                    }}
                    labelFormatter={(value) =>
                      new Date(String(value)).toLocaleDateString()
                    }
                    formatter={(value) => [Number(value), "Content pieces"]}
                  />
                  <Bar
                    dataKey="content_count"
                    fill="hsl(var(--primary))"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ── Google Analytics 4 ─────────────────────────────────── */}
          <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold text-foreground">Google Analytics 4</h2>
              <span className="rounded-full border border-border/70 bg-muted/60 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Optional
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Connect this site&apos;s GA4 property to see real traffic data — sessions,
              users, page views, bounce rate, and top pages — directly from Google. This
              step is optional: if you skip it, the content metrics above remain your
              analytics view.
            </p>

            {ga4Setup && !ga4Setup.configured ? (
              <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm">
                <p className="font-semibold text-amber-700 dark:text-amber-400">
                  GA4 connection isn&apos;t available yet
                </p>
                <p className="mt-1 text-muted-foreground">
                  This platform hasn&apos;t finished its Google Analytics setup yet, so this
                  feature is temporarily unavailable. You can skip this section — the content
                  metrics above already work normally.
                </p>
              </div>
            ) : null}

            {ga4Setup?.configured && ga4Setup.service_account_email ? (
              <details className="mt-5 rounded-xl border border-border/70 bg-muted/40 p-4 text-sm" open={!ga4Data}>
                <summary className="cursor-pointer font-medium text-foreground">
                  How to find your GA4 Property ID (one-time, ~2 minutes) — or skip this section
                </summary>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted-foreground">
                  <li>
                    Sign in to{" "}
                    <a
                      href="https://analytics.google.com"
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-primary underline underline-offset-2"
                    >
                      Google Analytics
                    </a>{" "}
                    and select the GA4 property for this website. (If you don&apos;t use Google
                    Analytics, skip this section entirely.)
                  </li>
                  <li>
                    Click <strong>Admin</strong> (the gear icon, bottom left), then under the{" "}
                    <em>Property</em> column click <strong>Property Access Management</strong>.
                  </li>
                  <li>
                    Click the <strong>+</strong> button → <strong>Add users</strong>, paste this
                    email address:
                    <br />
                    <code className="mt-1 inline-block break-all rounded bg-background px-1.5 py-0.5 font-mono text-xs">
                      {ga4Setup.service_account_email}
                    </code>
                    <br />
                    set the role to <strong>Viewer</strong>, then click <strong>Add</strong>.
                  </li>
                  <li>
                    Still in <strong>Admin</strong>, click <strong>Property Settings</strong> and
                    copy the <strong>Property ID</strong> — a number such as{" "}
                    <code className="rounded bg-background px-1.5 py-0.5 font-mono text-xs">123456789</code>.
                  </li>
                  <li>
                    Paste that number into the field below and click <strong>Save</strong>. Real
                    traffic data will appear here automatically.
                  </li>
                </ol>
              </details>
            ) : null}

            <form
              onSubmit={handleSaveGa4}
              className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="ga4-property-id">
                  GA4 Property ID (leave blank to skip)
                </label>
                <input
                  id="ga4-property-id"
                  value={ga4PropertyIdInput}
                  onChange={(event) => setGa4PropertyIdInput(event.target.value)}
                  placeholder="e.g. 123456789"
                  disabled={!ga4Setup?.configured}
                  className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
              <button
                type="submit"
                disabled={savingGa4 || !ga4Setup?.configured}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingGa4 ? "Saving..." : "Save"}
              </button>
            </form>

            {ga4SaveMessage ? (
              <p className="mt-3 text-sm text-muted-foreground">{ga4SaveMessage}</p>
            ) : null}

            {ga4Error ? (
              <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {ga4Error}
              </div>
            ) : null}

            {ga4Loading ? (
              <p className="mt-5 text-sm text-muted-foreground">
                Loading Google Analytics data...
              </p>
            ) : null}

            {ga4Data ? (
              <div className="mt-6 space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-2xl border border-border/70 bg-background p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <MousePointerClick className="h-4 w-4" />
                    </div>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Sessions ({ga4Data.period_days}d)
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">
                      {ga4Data.total_sessions.toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-background p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Users className="h-4 w-4" />
                    </div>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Active users
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">
                      {ga4Data.total_active_users.toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-background p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <UserPlus className="h-4 w-4" />
                    </div>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      New users
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">
                      {ga4Data.total_new_users.toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-background p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Eye className="h-4 w-4" />
                    </div>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Page views
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">
                      {ga4Data.total_page_views.toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-background p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Percent className="h-4 w-4" />
                    </div>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Bounce rate
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">
                      {ga4Data.average_bounce_rate}%
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-background p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Timer className="h-4 w-4" />
                    </div>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Avg. session duration
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">
                      {formatDuration(ga4Data.average_session_duration)}
                    </p>
                  </div>
                </div>

                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ga4Data.history}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="4 4" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        tickFormatter={formatGa4Date}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "16px",
                        }}
                        labelFormatter={(value) => formatGa4Date(String(value))}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="sessions"
                        name="Sessions"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="active_users"
                        name="Active users"
                        stroke="hsl(var(--accent))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-background p-4">
                    <h3 className="text-sm font-semibold text-foreground">Top pages</h3>
                    <ul className="mt-3 space-y-2 text-sm">
                      {ga4Data.top_pages.length === 0 ? (
                        <li className="text-muted-foreground">No page view data yet.</li>
                      ) : (
                        ga4Data.top_pages.map((page) => (
                          <li
                            key={page.page_path}
                            className="flex items-center justify-between gap-3 border-b border-border/50 pb-2 last:border-0 last:pb-0"
                          >
                            <span className="truncate text-muted-foreground">{page.page_path}</span>
                            <span className="font-medium text-foreground">
                              {page.views.toLocaleString()}
                            </span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-background p-4">
                    <h3 className="text-sm font-semibold text-foreground">Traffic channels</h3>
                    <ul className="mt-3 space-y-2 text-sm">
                      {ga4Data.channels.length === 0 ? (
                        <li className="text-muted-foreground">No channel data yet.</li>
                      ) : (
                        ga4Data.channels.map((channel) => (
                          <li
                            key={channel.channel}
                            className="flex items-center justify-between gap-3 border-b border-border/50 pb-2 last:border-0 last:pb-0"
                          >
                            <span className="text-muted-foreground">{channel.channel}</span>
                            <span className="font-medium text-foreground">
                              {channel.sessions.toLocaleString()}
                            </span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        </>
      )}
    </FeaturePageFrame>
  );
}
