"use client";

import { useParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { Loader2 } from "lucide-react";

import { FeaturePageFrame } from "@/components/global/feature-page-frame";
import api from "@/lib/api";

interface BacklinkOpportunity {
  prospect_url: string;
  prospect_title: string | null;
  rationale: string;
  outreach_email: string;
}

interface BacklinkResponse {
  opportunities: BacklinkOpportunity[];
}

export default function ProjectBacklinksPage() {
  const params = useParams<{ projectId: string }>();
  const [keyword, setKeyword] = useState("");
  const [prospects, setProspects] = useState("");
  const [result, setResult] = useState<BacklinkResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const response = await api.post<BacklinkResponse>("/backlinks/opportunities", {
        project_id: params.projectId,
        target_keyword: keyword.trim(),
        prospect_urls: prospects
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      });
      setResult(response.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to generate opportunities.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FeaturePageFrame
      eyebrow="Backlinks"
      title="Find backlink opportunities"
      description="Collect outreach-ready backlink ideas and AI-generated emails for likely prospects."
    >
      <section className="rounded-[1.5rem] border border-border/70 bg-card p-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="technical seo consultant"
            className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
            required
          />
          <textarea
            value={prospects}
            onChange={(event) => setProspects(event.target.value)}
            placeholder={"https://example.com/resource-page\nhttps://example.org/blog"}
            className="min-h-32 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
          />
          <button
            type="submit"
            disabled={isSubmitting || !keyword.trim()}
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
          {result.opportunities.map((opportunity) => (
            <article
              key={opportunity.prospect_url}
              className="rounded-[1.5rem] border border-border/70 bg-card p-6"
            >
              <h2 className="text-lg font-semibold text-foreground">
                {opportunity.prospect_title || opportunity.prospect_url}
              </h2>
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
