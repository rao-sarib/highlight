"use client";

import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { Loader2, RefreshCcw } from "lucide-react";

import { AutoModePanel } from "@/components/global/auto-mode-panel";
import { FeaturePageFrame } from "@/components/global/feature-page-frame";
import api from "@/lib/api";
import { toLocalDateTime } from "@/lib/format";
import { useProjectContext } from "@/lib/useProjectContext";
import { toast } from "@/store/toastStore";

interface BacklinkOpportunity {
  prospect_url: string;
  prospect_title: string | null;
  rationale: string;
  outreach_email: string;
  serp_position: number | null;
}

interface BacklinkResponse {
  opportunities: BacklinkOpportunity[];
  total_found?: number;
  prospect_source: string;
  target_keyword?: string;
  generated_at?: string | null;
}

export default function ProjectBacklinksPage() {
  const params = useParams<{ projectId: string }>();
  const { context, isLoading: contextLoading } = useProjectContext(params.projectId);
  const [keyword, setKeyword] = useState("");
  const [prospects, setProspects] = useState("");
  const [result, setResult] = useState<BacklinkResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visibleCount, setVisibleCount] = useState(25);

  useEffect(() => {
    const restore = async () => {
      try {
        const response = await api.get<BacklinkResponse>(
          `/backlinks/${params.projectId}/latest`,
        );
        if (response.data.opportunities.length > 0) {
          setResult(response.data);
          if (response.data.target_keyword) setKeyword(response.data.target_keyword);
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
      const response = await api.post<BacklinkResponse>("/backlinks/opportunities", {
        project_id: params.projectId,
        target_keyword: keyword.trim() || null,
        prospect_urls: prospects
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
        force_refresh: forceRefresh,
      });
      setResult(response.data);
      setVisibleCount(25);
      toast.success(`Found ${response.data.opportunities.length} backlink opportunities.`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to generate opportunities.";
      setErrorMessage(msg);
      toast.error(msg);
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
      feature="backlinks"
      eyebrow="Backlinks"
      title="Find backlink opportunities"
      description="Finds pages that rank on Google for your keyword and drafts outreach emails to help you earn links."
    >
      <section className="space-y-4 rounded-[1.5rem] border border-border/70 bg-card p-6">
        <AutoModePanel
          context={context}
          isLoading={contextLoading}
          projectId={params.projectId}
          onPickKeyword={setKeyword}
        />
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={
              context?.primary_keyword
                ? `Leave blank to use “${context.primary_keyword}”`
                : "technical seo consultant"
            }
            className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
          />
          <textarea
            value={prospects}
            onChange={(event) => setProspects(event.target.value)}
            placeholder={"https://example.com/resource-page\nhttps://example.org/blog"}
            className="min-h-32 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
          />
          <button
            type="submit"
            disabled={isSubmitting || (!keyword.trim() && !context?.has_audit)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? "Finding opportunities..." : "Generate opportunities"}
          </button>
        </form>
        {errorMessage ? <p className="mt-4 text-sm text-destructive">{errorMessage}</p> : null}
      </section>

      {isSubmitting ? (
        <section className="rounded-[1.5rem] border border-border/70 bg-card p-8 shadow-sm">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Scraping prospects and drafting outreach emails — this may take 20–30 seconds…</span>
          </div>
          <div className="mt-6 space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-[1.5rem] border border-border/70 bg-background p-6">
                <div className="h-5 w-48 animate-pulse rounded-lg bg-muted" />
                <div className="mt-3 h-3 w-72 animate-pulse rounded-lg bg-muted" />
                <div className="mt-5 h-24 w-full animate-pulse rounded-xl bg-muted" />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {!isSubmitting && result?.opportunities.length ? (
        <section className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {result.opportunities.length} backlink opportunit
                {result.opportunities.length === 1 ? "y" : "ies"} found
              </p>
              <p className="text-xs text-muted-foreground">
                {result.generated_at
                  ? `Last generated ${toLocalDateTime(result.generated_at)}`
                  : "Ranking pages for your keyword + related searches"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void generate(true)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition hover:border-primary/50"
            >
              <RefreshCcw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
          {result.opportunities.slice(0, visibleCount).map((opportunity, index) => (
            <article
              key={`${opportunity.prospect_url}-${index}`}
              className="rounded-[1.25rem] border border-border/70 bg-card p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-foreground">
                  {opportunity.prospect_title || opportunity.prospect_url}
                </h2>
                {opportunity.serp_position ? (
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/30">
                    Ranks #{opportunity.serp_position} on Google
                  </span>
                ) : null}
              </div>
              <a
                href={opportunity.prospect_url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block max-w-full truncate text-xs text-primary hover:underline"
              >
                {opportunity.prospect_url}
              </a>
              <p className="mt-2 text-sm text-muted-foreground">{opportunity.rationale}</p>
              <details className="mt-3 group">
                <summary className="cursor-pointer text-sm font-semibold text-foreground transition hover:text-primary">
                  View outreach email
                </summary>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl bg-background p-4 text-sm leading-6 text-foreground">
                  {opportunity.outreach_email}
                </pre>
              </details>
            </article>
          ))}
          {visibleCount < result.opportunities.length ? (
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + 25)}
              className="mx-auto inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-6 text-sm font-semibold text-foreground transition hover:border-primary/50"
            >
              Show more ({result.opportunities.length - visibleCount} remaining)
            </button>
          ) : null}
        </section>
      ) : null}
    </FeaturePageFrame>
  );
}
