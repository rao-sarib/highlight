"use client";

import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Loader2, RefreshCcw, Search } from "lucide-react";

import { AutoModePanel } from "@/components/global/auto-mode-panel";
import { FeaturePageFrame } from "@/components/global/feature-page-frame";
import api from "@/lib/api";
import { useProjectContext } from "@/lib/useProjectContext";
import { toast } from "@/store/toastStore";

interface AnalyzedKeyword {
  keyword: string;
  intent: string;
  type: string;
  relevance: string;
  note: string;
  your_rank: number | null;
}

interface KeywordResponse {
  niche: string;
  keywords: AnalyzedKeyword[];
  generated_at?: string | null;
}

const INTENT_STYLE: Record<string, string> = {
  informational: "bg-primary/10 text-primary ring-primary/30",
  commercial: "bg-accent/10 text-accent ring-accent/30",
  transactional: "bg-success/10 text-success ring-success/30",
  navigational: "bg-warning/10 text-warning ring-warning/30",
};

const RELEVANCE_STYLE: Record<string, string> = {
  high: "text-success",
  medium: "text-warning",
  low: "text-muted-foreground",
};

export default function ProjectKeywordsPage() {
  const params = useParams<{ projectId: string }>();
  const { context, isLoading: contextLoading } = useProjectContext(params.projectId);
  const [seed, setSeed] = useState("");
  const [result, setResult] = useState<KeywordResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const restore = async () => {
      try {
        const res = await api.get<KeywordResponse>(`/keywords/${params.projectId}/latest`);
        if (res.data.keywords.length > 0) setResult(res.data);
      } catch {
        // none yet
      }
    };
    if (params.projectId) void restore();
  }, [params.projectId]);

  const analyze = async (forceRefresh: boolean) => {
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const res = await api.post<KeywordResponse>("/keywords/analyze", {
        project_id: params.projectId,
        seed: seed.trim() || null,
        force_refresh: forceRefresh,
      });
      setResult(res.data);
      toast.success(`Analyzed ${res.data.keywords.length} keywords — now powering auto-mode.`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to analyze keywords.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await analyze(false);
  };

  return (
    <FeaturePageFrame
      feature="lsi"
      eyebrow="Keywords"
      title="Find keywords to target"
      description="Turns your site's topic into target keywords with intent, type, relevance, and your current Google rank for each."
    >
      <section className="space-y-4 rounded-[1.5rem] border border-border/70 bg-card p-6">
        <AutoModePanel
          context={context}
          isLoading={contextLoading}
          projectId={params.projectId}
          onPickKeyword={setSeed}
        />
        <form className="flex flex-col gap-4 md:flex-row" onSubmit={handleSubmit}>
          <input
            value={seed}
            onChange={(event) => setSeed(event.target.value)}
            placeholder={
              context?.primary_keyword
                ? `Leave blank to use “${context.primary_keyword}”`
                : "Leave blank to use your detected niche"
            }
            className="h-12 flex-1 rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
          />
          <button
            type="submit"
            disabled={isSubmitting || (!seed.trim() && !context?.has_audit)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {isSubmitting ? "Analyzing..." : "Analyze keywords"}
          </button>
        </form>
        {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      </section>

      {isSubmitting ? (
        <section className="rounded-[1.5rem] border border-border/70 bg-card p-8 shadow-sm">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Analyzing keywords and checking your Google rank…</span>
          </div>
        </section>
      ) : null}

      {!isSubmitting && result && result.keywords.length > 0 ? (
        <section className="grid gap-4">
          <div className="flex items-center justify-between gap-3 px-1">
            <p className="text-sm text-muted-foreground">
              {result.keywords.length} keywords for{" "}
              <span className="font-semibold text-foreground">{result.niche}</span> · now powering
              auto-mode
            </p>
            <button
              type="button"
              onClick={() => void analyze(true)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition hover:border-primary/50"
            >
              <RefreshCcw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
          <div className="overflow-x-auto rounded-[1.5rem] border border-border/70 bg-card">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Keyword</th>
                  <th className="px-4 py-3">Intent</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Relevance</th>
                  <th className="px-4 py-3">Your Google rank</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.keywords.map((k) => (
                  <tr key={k.keyword}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{k.keyword}</div>
                      {k.note ? <div className="text-xs text-muted-foreground">{k.note}</div> : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${
                          INTENT_STYLE[k.intent] ?? "bg-muted text-muted-foreground ring-border"
                        }`}
                      >
                        {k.intent}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">
                      {k.type.replace("_", " ")}
                    </td>
                    <td
                      className={`px-4 py-3 font-semibold capitalize ${
                        RELEVANCE_STYLE[k.relevance] ?? "text-muted-foreground"
                      }`}
                    >
                      {k.relevance}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {k.your_rank != null ? (
                        <span className="font-semibold text-foreground">#{k.your_rank}</span>
                      ) : (
                        "Not in top 10"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </FeaturePageFrame>
  );
}
