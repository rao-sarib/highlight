"use client";

import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { Loader2, RefreshCcw } from "lucide-react";

import { AutoModePanel } from "@/components/global/auto-mode-panel";
import { FeaturePageFrame } from "@/components/global/feature-page-frame";
import api from "@/lib/api";
import { useProjectContext } from "@/lib/useProjectContext";

interface BacklinkOpportunity {
  prospect_url: string;
  prospect_title: string | null;
  rationale: string;
  outreach_email: string;
  serp_position: number | null;
}

interface BacklinkResponse {
  opportunities: BacklinkOpportunity[];
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
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to generate opportunities.");
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
      description="Finds pages that actually rank on Google for your keyword (real SERP prospects) and drafts personalized outreach emails — links from these pages boost both rankings and the sources AI engines cite."
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
          <div className="flex items-center justify-between gap-3 px-1">
            <p className="text-xs text-muted-foreground">
              {result.generated_at
                ? `Last generated ${new Date(result.generated_at).toLocaleString()}`
                : "Latest opportunities"}
            </p>
            <button
              type="button"
              onClick={() => void generate(true)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition hover:border-primary/50"
            >
              <RefreshCcw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
          {result.opportunities.map((opportunity) => (
            <article
              key={opportunity.prospect_url}
              className="rounded-[1.5rem] border border-border/70 bg-card p-6"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">
                  {opportunity.prospect_title || opportunity.prospect_url}
                </h2>
                {opportunity.serp_position ? (
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/30">
                    Ranks #{opportunity.serp_position} on Google
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{opportunity.rationale}</p>
              <pre className="mt-5 overflow-x-auto whitespace-pre-wrap rounded-xl bg-background p-4 text-sm leading-6 text-foreground">
                {opportunity.outreach_email}
              </pre>
            </article>
          ))}
        </section>
      ) : null}
    </FeaturePageFrame>
  );
}
