"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, ExternalLink, Gauge, Loader2, Sparkles, XCircle } from "lucide-react";

import { FeaturePageFrame } from "@/components/global/feature-page-frame";
import api from "@/lib/api";

interface VisibilityResponse {
  visibility_score: number;
  rating: string;
  simulated_ai_answer: string;
  supporting_chunks: string[];
  perplexity_cited: boolean;
  perplexity_citations: string[];
  perplexity_score: number | null;
  scored_by: string;
}

export default function ProjectVisibilityPage() {
  const params = useParams<{ projectId: string }>();
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState<VisibilityResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await api.post<VisibilityResponse>("/visibility/score", {
        project_id: params.projectId,
        keyword: keyword.trim(),
      });
      setResult(response.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to calculate visibility.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPerplexity = result?.scored_by === "perplexity_citations";
  const hasNoData =
    result !== null &&
    result.visibility_score === 0 &&
    result.supporting_chunks.length === 0 &&
    !isPerplexity;

  return (
    <FeaturePageFrame
      eyebrow="AI Visibility"
      title="Measure answer-engine alignment"
      description="See how visible your project is on AI platforms. Provides citation-based scoring via Perplexity (requires PERPLEXITY_API_KEY) or cosine-similarity scoring via OpenAI embeddings."
    >
      <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
        <form className="grid gap-4 lg:grid-cols-[1fr_auto]" onSubmit={handleSubmit}>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="what is an ai visibility score"
            className="h-12 rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
            required
          />
          <button
            type="submit"
            disabled={isSubmitting || !keyword.trim()}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isSubmitting ? "Scoring..." : "Calculate score"}
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
            <span className="text-sm">Querying AI engines and calculating visibility score…</span>
          </div>
          <div className="mt-6 grid gap-4 xl:grid-cols-[320px_1fr]">
            <div className="rounded-[1.5rem] border border-border/70 bg-background p-6">
              <div className="h-14 w-14 animate-pulse rounded-2xl bg-muted" />
              <div className="mt-5 h-3 w-24 animate-pulse rounded-lg bg-muted" />
              <div className="mt-3 h-14 w-20 animate-pulse rounded-lg bg-muted" />
            </div>
            <div className="rounded-[1.5rem] border border-border/70 bg-background p-6">
              <div className="h-5 w-40 animate-pulse rounded-lg bg-muted" />
              <div className="mt-4 space-y-2">
                <div className="h-3 w-full animate-pulse rounded-lg bg-muted" />
                <div className="h-3 w-4/5 animate-pulse rounded-lg bg-muted" />
                <div className="h-3 w-3/5 animate-pulse rounded-lg bg-muted" />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {!isSubmitting && result ? (
        hasNoData ? (
          <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
            <p className="text-sm text-muted-foreground">
              No embeddings found for this project. Run the{" "}
              <span className="font-medium text-foreground">SEO Fixes</span> workflow first to
              index your site, then try again.
            </p>
          </section>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
            {/* Score card */}
            <section className="flex flex-col gap-4">
              <div className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Gauge className="h-6 w-6" />
                </div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Visibility score
                </p>
                <p className="mt-3 text-6xl font-semibold tracking-tight text-foreground">
                  {result.visibility_score}
                </p>
                <p className="mt-3 text-sm font-medium text-muted-foreground">
                  Rating:{" "}
                  <span className="text-foreground capitalize">{result.rating}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Scored by:{" "}
                  <span className="font-medium text-foreground">
                    {isPerplexity ? "Perplexity citations" : "OpenAI cosine similarity"}
                  </span>
                </p>
              </div>

              {/* Perplexity citation status */}
              {isPerplexity ? (
                <div className="rounded-[1.5rem] border border-border/70 bg-card p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Perplexity citation
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    {result.perplexity_cited ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="text-sm font-semibold text-foreground">
                          Your site is cited
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-destructive" />
                        <span className="text-sm font-semibold text-foreground">
                          Not cited by Perplexity
                        </span>
                      </>
                    )}
                  </div>

                  {result.perplexity_citations.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Cited sources ({result.perplexity_citations.length})
                      </p>
                      {result.perplexity_citations.slice(0, 5).map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="truncate">{url}</span>
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>

            {/* AI answer and supporting chunks */}
            <section className="grid gap-4 content-start">
              <article className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-foreground">
                  {isPerplexity ? "Perplexity answer" : "Simulated AI answer"}
                </h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {result.simulated_ai_answer || "No answer generated."}
                </p>
              </article>

              {result.supporting_chunks.length > 0 ? (
                <article className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-foreground">
                    Supporting project chunks
                  </h2>
                  <div className="mt-4 grid gap-3">
                    {result.supporting_chunks.map((chunk, index) => (
                      <div
                        key={`${index}-${chunk.slice(0, 24)}`}
                        className="rounded-xl border border-border bg-background p-4 text-sm leading-7 text-muted-foreground"
                      >
                        {chunk}
                      </div>
                    ))}
                  </div>
                </article>
              ) : null}
            </section>
          </div>
        )
      ) : null}
    </FeaturePageFrame>
  );
}
