"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Copy, Loader2, RefreshCcw, Sparkles } from "lucide-react";

import { FeaturePageFrame } from "@/components/global/feature-page-frame";
import api from "@/lib/api";

interface PromptOptimizationResponse {
  keyword: string;
  prompts: string[];
  cached?: boolean;
  generated_at?: string | null;
}

export default function ProjectPromptsPage() {
  const params = useParams<{ projectId: string }>();
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState<PromptOptimizationResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Auto-restore the last result for this project on open (no new API call).
  useEffect(() => {
    const restore = async () => {
      try {
        const response = await api.get<PromptOptimizationResponse>(
          `/prompts/${params.projectId}/latest`,
        );
        if (response.data.prompts.length > 0) {
          setResult(response.data);
          setKeyword(response.data.keyword);
        }
      } catch {
        // none yet
      }
    };
    if (params.projectId) void restore();
  }, [params.projectId]);

  const generate = async (forceRefresh: boolean) => {
    setErrorMessage("");
    setCopiedIndex(null);
    setIsSubmitting(true);
    try {
      const response = await api.post<PromptOptimizationResponse>("/prompts/optimize", {
        project_id: params.projectId,
        keyword: keyword.trim(),
        force_refresh: forceRefresh,
      });
      setResult(response.data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to generate optimized prompts.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await generate(false);
  };

  const handleCopy = async (prompt: string, index: number) => {
    await navigator.clipboard.writeText(prompt);
    setCopiedIndex(index);
  };

  return (
    <FeaturePageFrame
      eyebrow="Prompt Optimization"
      title="Generate GEO-ready prompts"
      description="Feed a seed keyword into the OpenAI-powered optimization endpoint and turn it into search prompts tailored for AI answer engines."
    >
      <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
        <form className="grid gap-4 lg:grid-cols-[1fr_auto]" onSubmit={handleGenerate}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="keyword">
              Base keyword
            </label>
            <input
              id="keyword"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="ai seo software for ecommerce brands"
              className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !keyword.trim()}
            className="inline-flex h-12 items-center justify-center gap-2 self-end rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isSubmitting ? "Generating..." : "Optimize prompts"}
          </button>
        </form>
        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}
      </section>

      {isSubmitting ? (
        <section className="rounded-[1.5rem] border border-border/70 bg-card p-8 shadow-sm">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Generating prompts — this may take a few seconds…</span>
          </div>
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-[1.5rem] border border-border/70 bg-background p-5">
                <div className="h-3 w-16 animate-pulse rounded-lg bg-muted" />
                <div className="mt-4 space-y-2">
                  <div className="h-3 w-full animate-pulse rounded-lg bg-muted" />
                  <div className="h-3 w-4/5 animate-pulse rounded-lg bg-muted" />
                  <div className="h-3 w-3/5 animate-pulse rounded-lg bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {!isSubmitting && result && result.prompts.length > 0 ? (
        <>
          <div className="flex items-center justify-between gap-3 px-1">
            <p className="text-xs text-muted-foreground">
              {result.generated_at
                ? `Last generated ${new Date(result.generated_at).toLocaleString()}`
                : "Latest result"}
            </p>
            <button
              type="button"
              onClick={() => void generate(true)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition hover:border-primary/50"
            >
              <RefreshCcw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
          <section className="grid gap-4 xl:grid-cols-2">
            {result.prompts.map((prompt, index) => (
            <article
              key={`${prompt}-${index}`}
              className="rounded-[1.5rem] border border-border/70 bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Prompt {index + 1}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-foreground">{prompt}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopy(prompt, index)}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground transition hover:bg-muted"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              {copiedIndex === index ? (
                <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-primary">
                  Copied
                </p>
              ) : null}
            </article>
            ))}
          </section>
        </>
      ) : null}
    </FeaturePageFrame>
  );
}
