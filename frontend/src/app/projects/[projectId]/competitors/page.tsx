"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ExternalLink, Globe2, Loader2, Scale, Target, Trophy } from "lucide-react";

import { FeaturePageFrame } from "@/components/global/feature-page-frame";
import api from "@/lib/api";

interface SerpEntry {
  position: number;
  title: string;
  url: string;
  snippet: string;
}

interface CompetitorResponse {
  competitor_url: string;
  keyword: string;
  project_keyword_density: number;
  competitor_keyword_density: number;
  density_gap: number;
  semantic_gap_terms: string[];
  competitor_title: string | null;
  competitor_serp_rank: number | null;
  serp_top_results: SerpEntry[];
  serp_data_available: boolean;
}

export default function ProjectCompetitorPage() {
  const params = useParams<{ projectId: string }>();
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState<CompetitorResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await api.post<CompetitorResponse>("/competitors/benchmark", {
        project_id: params.projectId,
        competitor_url: competitorUrl.trim(),
        keyword: keyword.trim(),
      });
      setResult(response.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to benchmark competitor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FeaturePageFrame
      eyebrow="Competitor Benchmarking"
      title="Compare your project against a live competitor"
      description="Submit a competitor URL and target keyword to calculate relative density, surface semantic opportunities, and see real Google SERP rankings (requires Serper API key)."
    >
      <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
        <form className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr_auto]" onSubmit={handleSubmit}>
          <input
            value={competitorUrl}
            onChange={(event) => setCompetitorUrl(event.target.value)}
            placeholder="https://competitor.com/guide"
            className="h-12 rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
            required
          />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="generative engine optimization"
            className="h-12 rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
            required
          />
          <button
            type="submit"
            disabled={isSubmitting || !competitorUrl.trim() || !keyword.trim()}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
            {isSubmitting ? "Comparing..." : "Compare"}
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
            <span className="text-sm">Analysing competitor — scraping and comparing, please wait…</span>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-[1.5rem] border border-border/70 bg-background p-5">
                <div className="h-10 w-10 animate-pulse rounded-2xl bg-muted" />
                <div className="mt-4 h-3 w-24 animate-pulse rounded-lg bg-muted" />
                <div className="mt-3 h-8 w-16 animate-pulse rounded-lg bg-muted" />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {!isSubmitting && result ? (
        <>
          {/* Density metrics */}
          <div className="grid gap-4 md:grid-cols-3">
            <section className="rounded-[1.5rem] border border-border/70 bg-card p-5 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Scale className="h-5 w-5" />
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Your keyword density
              </p>
              <p className="mt-2 text-4xl font-semibold text-foreground">
                {result.project_keyword_density}%
              </p>
            </section>
            <section className="rounded-[1.5rem] border border-border/70 bg-card p-5 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Globe2 className="h-5 w-5" />
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Competitor density
              </p>
              <p className="mt-2 text-4xl font-semibold text-foreground">
                {result.competitor_keyword_density}%
              </p>
            </section>
            <section className="rounded-[1.5rem] border border-border/70 bg-card p-5 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Target className="h-5 w-5" />
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Density gap
              </p>
              <p className="mt-2 text-4xl font-semibold text-foreground">
                {result.density_gap}%
              </p>
            </section>
          </div>

          {/* SERP ranking (Serper API) */}
          {result.serp_data_available ? (
            <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Google SERP — top results for &ldquo;{result.keyword}&rdquo;
                  </h2>
                  {result.competitor_serp_rank !== null ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Competitor ranks{" "}
                      <span className="font-semibold text-foreground">
                        #{result.competitor_serp_rank}
                      </span>{" "}
                      on Google for this keyword.
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Competitor URL not found in top 10 Google results for this keyword.
                    </p>
                  )}
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Trophy className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                {result.serp_top_results.map((entry) => (
                  <div
                    key={entry.url}
                    className="flex gap-4 rounded-xl border border-border bg-background p-4"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
                      #{entry.position}
                    </span>
                    <div className="min-w-0">
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:underline"
                      >
                        {entry.title}
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      </a>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {entry.snippet}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Semantic gap */}
          <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Semantic gap terms</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {result.competitor_title ?? result.competitor_url}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {result.semantic_gap_terms.map((term) => (
                <span
                  key={term}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground"
                >
                  {term}
                </span>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </FeaturePageFrame>
  );
}

