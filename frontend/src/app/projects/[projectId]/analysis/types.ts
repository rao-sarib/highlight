/** Shared types for the Full Analysis report and its PDF export. */

export interface ActionItem {
  priority: number;
  category: string;
  title: string;
  detail: string;
  effort: string;
  impact: string;
  prompts_targeted: string[];
}

export interface EngineBreakdown {
  engine: string;
  label: string;
  share_of_voice: number;
  cited_rate?: number;
  cited: number;
  in_sources?: number;
  prompts: number;
  responses?: number;
  attempted?: number;
  errored?: number;
  unavailable?: boolean;
  total_prompts?: number;
}

export interface AnalysisReport {
  project_id: string;
  niche: string | null;
  seo_health_score: number | null;
  pages_crawled: number;
  total_issues: number;
  top_issues: { issue_type: string; count: number }[];
  severity_counts: { critical?: number; warning?: number; info?: number };
  share_of_voice: number | null;
  engines_used: string[];
  per_engine: EngineBreakdown[];
  cited_count: number;
  in_sources_count: number;
  prompt_count: number;
  cited_prompts: string[];
  gap_prompts: string[];
  competitors: string[];
  strengths: string[];
  action_plan: ActionItem[];
  generated_at: string | null;
  report_locked?: boolean;
  summary?: string | null;
}

export interface ScorePointPdf {
  date: string;
  seo_health: number | null;
  ai_visibility: number | null;
}
export interface AnalyticsForPdf {
  ai_share_of_voice: number | null;
  seo_health_score: number | null;
  total_content_pieces: number;
  indexed_chunks: number;
  keywords_tracked: number;
  competitors_found: number;
  backlink_opportunities: number;
  scans_run: number;
  google_keywords_ranking: number;
  google_best_rank: number | null;
  google_avg_rank: number | null;
  content_by_type: Record<string, number>;
  score_history: ScorePointPdf[];
}

export type RGB = [number, number, number];
