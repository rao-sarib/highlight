"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import { Loader2 } from "lucide-react";

import { FeaturePageFrame } from "@/components/global/feature-page-frame";
import api from "@/lib/api";

interface RefreshResponse {
  workflow_id: string;
  run_id: string;
  project_id: string;
  cron_schedule: string;
  status: string;
}

export default function ProjectRefreshPage() {
  const params = useParams<{ projectId: string }>();
  const [result, setResult] = useState<RefreshResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSchedule = async () => {
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const response = await api.post<RefreshResponse>("/refresh/schedule", {
        project_id: params.projectId,
      });
      setResult(response.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to schedule refresh.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FeaturePageFrame
      eyebrow="Content Refresh"
      title="Schedule monthly re-audits"
      description="Create a recurring Temporal workflow that refreshes and re-audits stale content every 30 days."
    >
      <section className="rounded-[1.5rem] border border-border/70 bg-card p-6">
        <button
          type="button"
          onClick={handleSchedule}
          disabled={isSubmitting}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isSubmitting ? "Scheduling..." : "Schedule monthly refresh"}
        </button>
        {errorMessage ? <p className="mt-4 text-sm text-destructive">{errorMessage}</p> : null}
      </section>

      {result ? (
        <section className="rounded-[1.5rem] border border-border/70 bg-card p-6">
          <p className="text-sm font-semibold text-foreground">Refresh workflow scheduled</p>
          <p className="mt-3 text-sm text-muted-foreground">Workflow ID: {result.workflow_id}</p>
          <p className="mt-1 text-sm text-muted-foreground">Cron schedule: {result.cron_schedule}</p>
        </section>
      ) : null}
    </FeaturePageFrame>
  );
}
