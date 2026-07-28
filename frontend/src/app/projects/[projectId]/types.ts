/** Shared types for the project analytics page (app metrics + GA4). */

export interface AnalyticsPoint {
  date: string;
  content_count: number;
}

export interface ScorePoint {
  date: string;
  seo_health: number | null;
  ai_visibility: number | null;
}

export interface AnalyticsSummary {
  project_id: string;
  niche: string | null;
  ai_share_of_voice: number | null;
  ai_rating: string | null;
  cited_count: number;
  in_sources_count: number;
  prompt_count: number;
  engines_checked: number;
  scans_run: number;
  seo_health_score: number | null;
  pages_crawled: number;
  last_audited_at: string | null;
  total_content_pieces: number;
  content_by_type: Record<string, number>;
  indexed_chunks: number;
  keywords_tracked: number;
  competitors_found: number;
  backlink_opportunities: number;
  google_keywords_ranking: number;
  google_best_rank: number | null;
  google_avg_rank: number | null;
  content_history: AnalyticsPoint[];
  score_history: ScorePoint[];
}

export interface ProjectDetail {
  id: string;
  name: string;
  url: string;
  ga4_property_id: string | null;
}

export interface GA4SetupInfo {
  configured: boolean;
  service_account_email: string | null;
}

export interface GA4DailyPoint {
  date: string;
  sessions: number;
  active_users: number;
  page_views: number;
}

export interface GA4TopPage {
  page_path: string;
  views: number;
}

export interface GA4ChannelPoint {
  channel: string;
  sessions: number;
}

export interface GA4Summary {
  property_id: string;
  period_days: number;
  total_sessions: number;
  total_active_users: number;
  total_new_users: number;
  total_page_views: number;
  average_bounce_rate: number;
  average_session_duration: number;
  history: GA4DailyPoint[];
  top_pages: GA4TopPage[];
  channels: GA4ChannelPoint[];
}
