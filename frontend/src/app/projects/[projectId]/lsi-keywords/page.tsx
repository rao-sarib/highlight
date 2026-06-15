"use client";

import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { Loader2 } from "lucide-react";

import { AutoModePanel } from "@/components/global/auto-mode-panel";
import { FeaturePageFrame } from "@/components/global/feature-page-frame";
import api from "@/lib/api";
import { useProjectContext } from "@/lib/useProjectContext";

interface LsiResponse {
  keyword: string;
  suggestions: string[];
  supporting_chunks: string[];
  covered: string[];
  gaps: string[];
  method: string;
  generated_at?: string | null;
}

export default function ProjectLsiPage() {
  const params = useParams<{ projectId: string }>();
  const { context, isLoading: contextLoading } = useProjectContext(params.projectId);
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState<LsiResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const restore = async () => {
      try {
        const response = await api.get<LsiResponse>(`/lsi/${params.projectId}/latest`);
        if (response.data.suggestions.length > 0) {
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
    setIsSubmitting(true);
    try {
      const response = await api.post<LsiResponse>("/lsi/suggest", {
        project_id: params.projectId,
        keyword: keyword.trim() || null,
        limit: 12,
        force_refresh: forceRefresh,
      });
      setResult(response.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load LSI suggestions.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await generate(false);
  };

  return (
    <FeaturePageFrame
      feature="lsi"
      eyebrow="LSI Keywords"
      title="Find related keywords"
      description="Enter a keyword to get related terms to include in your content."
    >
      <section className="space-y-4 rounded-[1.5rem] border border-border/70 bg-card p-6">
        <AutoModePanel
          context={context}
          isLoading={contextLoading}
          projectId={params.projectId}
          onPickKeyword={setKeyword}
        />
        <form className="flex flex-col gap-4 md:flex-row" onSubmit={handleSubmit}>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={
              context?.primary_keyword
                ? `Leave blank to use “${context.primary_keyword}”`
                : "entity-based seo"
            }
            className="h-12 flex-1 rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
          />
          <button
            type="submit"
            disabled={isSubmitting || (!keyword.trim() && !context?.has_audit)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? "Analyzing..." : "Get suggestions"}
          </button>
        </form>
        {errorMessage ? <p className="mt-4 text-sm text-destructive">{errorMessage}</p> : null}
      </section>

      {isSubmitting ? (
        <section className="rounded-[1.5rem] border border-border/70 bg-card p-8 shadow-sm">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Searching embeddings for related terms…</span>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {[80, 120, 64, 96, 110, 72, 88, 104].map((w) => (
              <div key={w} className="h-8 animate-pulse rounded-full bg-muted" style={{ width: `${w}px` }} />
            ))}
          </div>
        </section>
      ) : null}

      {!isSubmitting && result ? (
        <section className="rounded-[1.5rem] border border-border/70 bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Suggested terms</h2>
          {result.suggestions.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No LSI terms found. Run the{" "}
              <span className="font-medium text-foreground">SEO Fixes</span> workflow first to
              index your site content, then try again.
            </p>
          ) : result.gaps.length > 0 || result.covered.length > 0 ? (
            <div className="mt-4 grid gap-5">
              {result.gaps.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-warning">
                    Content gaps — write these next
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {result.gaps.map((term) => (
                      <span
                        key={term}
                        className="rounded-full border border-warning/40 bg-warning/10 px-3 py-1.5 text-sm text-foreground"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {result.covered.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-success">
                    Already covered by your content
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {result.covered.map((term) => (
                      <span
                        key={term}
                        className="rounded-full border border-success/40 bg-success/10 px-3 py-1.5 text-sm text-foreground"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {result.suggestions.map((term) => (
                <span
                  key={term}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground"
                >
                  {term}
                </span>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </FeaturePageFrame>
  );
}

