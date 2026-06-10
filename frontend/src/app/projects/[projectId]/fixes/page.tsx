"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, WandSparkles, Wrench } from "lucide-react";

import { FeaturePageFrame } from "@/components/global/feature-page-frame";
import api from "@/lib/api";

interface FixWorkflowResponse {
  workflow_id: string;
  run_id: string;
  project_id: string;
  status: string;
}

interface ContentItem {
  id: string;
  topic: string;
  generated_text: string;
  content_type: "blog" | "faq" | "meta";
  status: string;
  created_at: string;
}

export default function ProjectFixesPage() {
  const params = useParams<{ projectId: string }>();
  const [workflowResult, setWorkflowResult] = useState<FixWorkflowResponse | null>(null);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadFixResults = async () => {
      try {
        const response = await api.get<ContentItem[]>(
          `/content/project/${params.projectId}`,
        );
        setContentItems(response.data);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to load fix results.");
      } finally {
        setIsLoading(false);
      }
    };

    if (params.projectId) {
      void loadFixResults();
    }
  }, [params.projectId]);

  const fixResults = useMemo(
    () =>
      contentItems.filter(
        (item) =>
          item.content_type === "meta" &&
          item.topic.toLowerCase().includes("seo fixes"),
      ),
    [contentItems],
  );

  const handleRun = async () => {
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await api.post<FixWorkflowResponse>("/fixes/run", {
        project_id: params.projectId,
      });
      setWorkflowResult(response.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to trigger SEO fixes.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FeaturePageFrame
      eyebrow="SEO Fixes"
      title="Trigger automated SEO fixes"
      description="Launch the audit workflow and review the latest saved SEO-fix outputs stored as generated meta content for this project."
    >
      <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Run auto-fix workflow
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This calls the Phase 3 fixes endpoint and starts the Temporal SEO audit workflow.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRun}
            disabled={isSubmitting}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
            {isSubmitting ? "Starting..." : "Run auto fixes"}
          </button>
        </div>

        {workflowResult ? (
          <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm text-foreground">
            Workflow started. ID: {workflowResult.workflow_id}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}
      </section>

      <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Saved fix results</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Latest backend-generated fix documents for this project.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Wrench className="h-3.5 w-3.5" />
            {fixResults.length} results
          </div>
        </div>

        {isLoading ? (
          <p className="mt-6 text-sm text-muted-foreground">Loading fix history...</p>
        ) : fixResults.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            No saved fix results yet. Run the workflow to generate your first one.
          </p>
        ) : (
          <div className="mt-6 grid gap-4">
            {fixResults.map((item) => (
              <article
                key={item.id}
                className="rounded-[1.25rem] border border-border/70 bg-background p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {new Date(item.created_at).toLocaleString()}
                </p>
                <h3 className="mt-3 text-lg font-semibold text-foreground">{item.topic}</h3>
                <pre className="mt-4 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                  {item.generated_text}
                </pre>
              </article>
            ))}
          </div>
        )}
      </section>
    </FeaturePageFrame>
  );
}
