import {
  BarChart3,
  FolderKanban,
  PenTool,
  Radar,
  Sparkles,
  Wrench,
} from "lucide-react";

export const dashboardNavigation = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: BarChart3,
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    title: "Prompts",
    href: "/projects/current/prompts",
    icon: Sparkles,
  },
  {
    title: "Content",
    href: "/projects/current/content-gen",
    icon: PenTool,
  },
  {
    title: "Visibility",
    href: "/projects/current/visibility",
    icon: Radar,
  },
  {
    title: "Fixes",
    href: "/projects/current/fixes",
    icon: Wrench,
  },
] as const;
