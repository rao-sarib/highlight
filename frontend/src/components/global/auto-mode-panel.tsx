"use client";

import Link from "next/link";
import { AlertTriangle, Sparkles, Wand2 } from "lucide-react";

import type { ProjectContext } from "@/lib/useProjectContext";

interface AutoModePanelProps {
  context: ProjectContext | null;
  isLoading: boolean;
  projectId: string;
  /** Click a detected keyword chip to fill the input. */
  onPickKeyword?: (keyword: string) => void;
  /** Label for the auto-resolved term (e.g. "keyword" or "topic"). */
  termLabel?: string;
}

/**
 * Shows the project's detected niche + keyword chips and explains that the
 * feature runs automatically from this context when no input is given. When
 * the site hasn't been audited yet, it nudges the user to run the audit first.
 */
export function AutoModePanel({
  context,
  isLoading,
  projectId,
  onPickKeyword,
  termLabel = "keyword",
}: AutoModePanelProps) {
  if (isLoading || !context) return null;

  if (!context.has_audit) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          This project hasn&apos;t been audited yet, so there&apos;s no detected niche to work
          from. Run{" "}
          <Link href={`/projects/${projectId}/analysis`} className="font-semibold underline">
            Full Analysis
          </Link>{" "}
          (or SEO Fixes) first — then every feature works automatically, or enter a {termLabel}{" "}
          manually below.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        Auto mode ready
      </div>
      <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
        Leave the {termLabel} blank to use this project&apos;s detected context
        {context.niche ? (
          <>
            {" "}— niche <span className="font-medium text-foreground">{context.niche}</span>
          </>
        ) : null}
        {context.primary_keyword ? (
          <>
            , default {termLabel}{" "}
            <span className="font-medium text-foreground">{context.primary_keyword}</span>
          </>
        ) : null}
        . Manual input is checked against the niche before it runs.
      </p>
      {context.keywords.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {context.keywords.map((kw) => (
            <button
              key={kw}
              type="button"
              onClick={() => onPickKeyword?.(kw)}
              disabled={!onPickKeyword}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground transition hover:border-primary/50 hover:bg-primary/5 disabled:cursor-default disabled:hover:border-border disabled:hover:bg-background"
            >
              <Wand2 className="h-3 w-3 text-primary" />
              {kw}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
