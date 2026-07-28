/** Shared types for the admin panel. */

export type Tab =
  | "overview"
  | "users"
  | "projects"
  | "messages"
  | "admins"
  | "keys"
  | "cms"
  | "smtp"
  | "rbac";

export interface SmtpSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  use_tls: boolean;
  enabled: boolean;
}

export interface RoleRow {
  role: string;
  label: string;
  description: string;
  features: string[];
}

export interface FeatureDef {
  key: string;
  label: string;
}

export interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  plan: string;
  scans_used: number;
  projects: number;
  created_at: string;
}

export interface ProjectRow {
  id: string;
  name: string;
  url: string;
  owner_email: string;
  niche: string;
  pages_crawled: number;
  seo_health_score: number | null;
  ai_visibility_score: number | null;
}

export interface AdminRow {
  id: string;
  username: string;
  created_at: string;
}

export interface KeyRow {
  key: string;
  label: string;
  is_set: boolean;
  masked: string;
  source: string;
}

export interface ContactMsg {
  id: string;
  name: string;
  email: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export type Overview = Record<string, number>;
