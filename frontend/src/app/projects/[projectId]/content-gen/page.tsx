"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Clock3, FileText, Loader2, Sparkles } from "lucide-react";

import { AutoModePanel } from "@/components/global/auto-mode-panel";
import { FeaturePageFrame } from "@/components/global/feature-page-frame";
import api from "@/lib/api";
import { useProjectContext } from "@/lib/useProjectContext";

type ContentType = "blog" | "faq" | "meta" | "geo";

interface PromptOptimizationResponse {
  keyword: string;
  prompts: string[];
}

interface WorkflowResponse {
  workflow_id: string;
  run_id: string;
  project_id: string;
  topic: string;
  content_type: ContentType;
  status: string;
}

interface ContentItem {
  id: string;
  project_id: string;
  topic: string;
  generated_text: string;
  content_type: ContentType;
  status: string;
  created_at: string;
}

export default function ProjectContentGenerationPage() {
  const params = useParams<{ projectId: string }>();
  const { context, isLoading: contextLoading } = useProjectContext(params.projectId);
  const [topic, setTopic] = useState("");
  const [contentType, setContentType] = useState<ContentType>("blog");
  const [optimizedPrompts, setOptimizedPrompts] = useState<string[]>([]);
  const [workflowResult, setWorkflowResult] = useState<WorkflowResponse | null>(null);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadContent = async () => {
      try {
        const response = await api.get<ContentItem[]>(
          `/content/project/${params.projectId}`,
        );
        setContentItems(response.data);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load generated content.",
        );
      } finally {
        setIsLoadingContent(false);
      }
    };

    // Reuse prompts already generated in Prompt Optimization for this project.
    const loadPrompts = async () => {
      try {
        const response = await api.get<PromptOptimizationResponse>(
          `/prompts/${params.projectId}/latest`,
        );
        setOptimizedPrompts(response.data.prompts ?? []);
      } catch {
        setOptimizedPrompts([]);
      }
    };

    if (params.projectId) {
      void loadContent();
      void loadPrompts();
    }
  }, [params.projectId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await api.post<WorkflowResponse>("/content/generate", {
        project_id: params.projectId,
        topic: topic.trim() || null,
        content_type: contentType,
      });
      setWorkflowResult(response.data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to trigger content generation.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FeaturePageFrame
      eyebrow="Content Generation"
      title="Launch the Temporal content workflow"
      description="Send a topic and content type to the backend workflow, then review the generated content already saved for this project. The GEO type produces AI-citable sections (direct answer, key facts, FAQ, schema) designed to win citations in AI engines."
    >
      <section className="space-y-4 rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
        <AutoModePanel
          context={context}
          isLoading={contextLoading}
          projectId={params.projectId}
          onPickKeyword={setTopic}
          termLabel="topic"
        />

        {optimizedPrompts.length > 0 ? (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="reuse-prompt">
              Reuse an optimized prompt{" "}
              <span className="font-normal text-muted-foreground">
                (from Prompt Optimization)
              </span>
            </label>
            <select
              id="reuse-prompt"
              value=""
              onChange={(event) => event.target.value && setTopic(event.target.value)}
              className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
            >
              <option value="">Select a saved prompt to use as the topic…</option>
              {optimizedPrompts.map((prompt, index) => (
                <option key={`${prompt}-${index}`} value={prompt}>
                  {prompt}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <form className="grid gap-4 xl:grid-cols-[1fr_180px_auto]" onSubmit={handleSubmit}>
          <input
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder={
              context?.primary_keyword
                ? `Leave blank to use “${context.primary_keyword}”`
                : "Best AI visibility strategies for software teams"
            }
            className="h-12 rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
          />
          <select
            value={contentType}
            onChange={(event) => setContentType(event.target.value as ContentType)}
            className="h-12 rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
          >
            <option value="blog">Blog</option>
            <option value="faq">FAQ</option>
            <option value="meta">Meta</option>
            <option value="geo">GEO — AI-citable</option>
          </select>
          <button
            type="submit"
            disabled={isSubmitting || (!topic.trim() && !context?.has_audit)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isSubmitting ? "Starting..." : "Start workflow"}
          </button>
        </form>

        {workflowResult ? (
          <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/10 p-4">
            <p className="text-sm font-semibold text-foreground">Workflow started</p>
            <div className="mt-3 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
              <p>Workflow ID: {workflowResult.workflow_id}</p>
              <p>Run ID: {workflowResult.run_id}</p>
            </div>
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
            <h2 className="text-xl font-semibold text-foreground">Generated content</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              These entries come from the backend content endpoint for the active project.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            {contentItems.length} items
          </div>
        </div>

        {isLoadingContent ? (
          <p className="mt-6 text-sm text-muted-foreground">Loading content history...</p>
        ) : contentItems.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            No generated content has been saved for this project yet.
          </p>
        ) : (
          <div className="mt-6 grid gap-4">
            {contentItems.map((item) => (
              <article
                key={item.id}
                className="rounded-[1.25rem] border border-border/70 bg-background p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {item.content_type}
                  </span>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {item.status}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{item.topic}</h3>
                <p className="mt-3 line-clamp-6 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                  {item.generated_text}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </FeaturePageFrame>
  );
}
