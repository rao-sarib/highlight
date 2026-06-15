"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { CalendarClock, CheckCircle2, Loader2, RefreshCcw } from "lucide-react";

import { FeaturePageFrame } from "@/components/global/feature-page-frame";
import api from "@/lib/api";
import { toast } from "@/store/toastStore";

interface RefreshResponse {
  workflow_id: string;
  run_id: string;
  project_id: string;
  cron_schedule: string;
  status: string;
}

interface RefreshStatus {
  scheduled: boolean;
  status: string;
  cron_schedule: string;
  next_run: string | null;
}

export default function ProjectRefreshPage() {
  const params = useParams<{ projectId: string }>();
  const [schedule, setSchedule] = useState<RefreshStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const res = await api.get<RefreshStatus>(`/refresh/status?project_id=${params.projectId}`);
      setSchedule(res.data);
    } catch {
      // Engine unreachable / no access — treat as not scheduled, no error shown.
      setSchedule({ scheduled: false, status: "none", cron_schedule: "", next_run: null });
    } finally {
      setLoadingStatus(false);
    }
  }, [params.projectId]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleSchedule = async () => {
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const response = await api.post<RefreshResponse>("/refresh/schedule", {
        project_id: params.projectId,
      });
      toast.success(
        response.data.status === "already_scheduled"
          ? "Monthly content refresh is already active."
          : "Monthly content refresh scheduled.",
      );
      await loadStatus();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to schedule refresh.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextRunDate = (() => {
    const raw = schedule?.next_run;
    const d = raw ? new Date(raw) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return Number.isNaN(d.getTime())
      ? null
      : d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  })();

  const isScheduled = schedule?.scheduled ?? false;

  return (
    <FeaturePageFrame
      feature="refresh"
      eyebrow="Content Refresh"
      title="Schedule a monthly refresh"
      description="Automatically re-crawl, re-audit, and refresh your content every 30 days."
    >
      <section className="rounded-[1.5rem] border border-border/70 bg-card p-6">
        <button
          type="button"
          onClick={handleSchedule}
          disabled={isSubmitting || loadingStatus}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting || loadingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loadingStatus
            ? "Checking..."
            : isSubmitting
              ? "Scheduling..."
              : isScheduled
                ? "Reschedule monthly refresh"
                : "Schedule monthly refresh"}
        </button>
        {errorMessage ? <p className="mt-4 text-sm text-destructive">{errorMessage}</p> : null}
      </section>

      {isScheduled ? (
        <section className="rounded-[1.5rem] border border-success/30 bg-success/5 p-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <p className="text-base font-semibold text-foreground">Monthly refresh is scheduled</p>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-card p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Next refresh
              </p>
              <p className="text-lg font-semibold text-foreground">{nextRunDate ?? "Runs every 30 days"}</p>
              <p className="text-xs text-muted-foreground">Then automatically every 30 days.</p>
            </div>
          </div>
          <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
            <RefreshCcw className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              On that date, Highlight will re-crawl your site, re-audit on-page SEO, refresh the
              embeddings, and regenerate content — keeping your pages and AI visibility current. No
              action needed from you.
            </p>
          </div>
        </section>
      ) : null}
    </FeaturePageFrame>
  );
}
