"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentType } from "react";
import {
  BarChart3,
  CreditCard,
  FolderKanban,
  Gauge,
  LineChart,
  LogOut,
  PenTool,
  RefreshCcw,
  Rocket,
  ScanSearch,
  Settings,
  Sparkles,
  Tags,
  Target,
  Wrench,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/global/Logo";
import { useAuthStore } from "@/store/authStore";
import { useProjectStore } from "@/store/projectStore";

interface NavItem {
  title: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  requiresProject?: boolean;
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { title: "Projects", href: "/projects", icon: FolderKanban },
  { title: "Full Analysis", href: "/projects/:projectId/analysis", icon: Rocket, requiresProject: true },
  { title: "Keyword Analysis", href: "/projects/:projectId/keywords", icon: Tags, requiresProject: true },
  { title: "Prompt Optimization", href: "/projects/:projectId/prompts", icon: Sparkles, requiresProject: true },
  { title: "Content Generation", href: "/projects/:projectId/content-gen", icon: PenTool, requiresProject: true },
  { title: "SEO Fixes", href: "/projects/:projectId/fixes", icon: Wrench, requiresProject: true },
  { title: "Backlinks", href: "/projects/:projectId/backlinks", icon: LineChart, requiresProject: true },
  { title: "LSI Keywords", href: "/projects/:projectId/lsi-keywords", icon: ScanSearch, requiresProject: true },
  { title: "Analytics", href: "/projects/:projectId", icon: BarChart3, requiresProject: true },
  { title: "AI Visibility", href: "/projects/:projectId/visibility", icon: Gauge, requiresProject: true },
  { title: "Content Refresh", href: "/projects/:projectId/refresh", icon: RefreshCcw, requiresProject: true },
  { title: "Competitors", href: "/projects/:projectId/competitors", icon: Target, requiresProject: true },
  { title: "Plan & Billing", href: "/settings/plan", icon: CreditCard },
  { title: "Settings", href: "/settings/account", icon: Settings },
];

function resolveHref(href: string, activeProjectId: string | null) {
  if (!href.includes(":projectId")) {
    return href;
  }

  return activeProjectId ? href.replace(":projectId", activeProjectId) : "/projects";
}

function isItemActive(
  pathname: string,
  item: NavItem,
  resolvedHref: string,
  activeProjectId: string | null,
): boolean {
  if (item.href === "/dashboard") {
    return pathname === "/dashboard";
  }

  if (item.href === "/projects") {
    return pathname === "/projects" || pathname === "/projects/new";
  }

  if (item.href === "/settings/account") {
    return pathname.startsWith("/settings/account");
  }

  if (item.href === "/projects/:projectId" && activeProjectId) {
    return pathname === `/projects/${activeProjectId}`;
  }

  return pathname === resolvedHref || pathname.startsWith(`${resolvedHref}/`);
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="px-3 pb-1 pt-4 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70">
      {children}
    </p>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const activeProjectId = useProjectStore((state) => state.activeProjectId);
  const clearSession = useAuthStore((state) => state.clearSession);

  const handleLogout = () => {
    clearSession();
    router.replace("/login");
  };

  let projectSectionRendered = false;
  let settingsSectionRendered = false;

  return (
    <aside className="relative z-10 flex h-screen min-h-0 flex-col border-r border-border/60 bg-card/60 backdrop-blur-xl">
      {/* Brand */}
      <div className="shrink-0 px-5 pb-5 pt-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Logo className="h-11 w-11 shadow-glow" />
          <div className="leading-tight">
            <p className="font-display text-lg font-semibold tracking-tight text-foreground">
              Highlight
            </p>
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              AI SEO · GEO
            </p>
          </div>
        </Link>
      </div>

      <div className="mx-5 h-px bg-border/70" />

      {/* Navigation */}
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3">
        <SectionLabel>Workspace</SectionLabel>
        {navItems.map((item) => {
          const Icon = item.icon;
          const href = resolveHref(item.href, activeProjectId);
          const isDisabled = item.requiresProject && !activeProjectId;
          const isActive = isItemActive(pathname, item, href, activeProjectId);

          let label: React.ReactNode = null;
          if (item.requiresProject && !projectSectionRendered) {
            projectSectionRendered = true;
            label = <SectionLabel key="lbl-tools">Project Tools</SectionLabel>;
          } else if (item.href === "/settings/plan" && !settingsSectionRendered) {
            settingsSectionRendered = true;
            label = <SectionLabel key="lbl-settings">Settings</SectionLabel>;
          }

          return (
            <div key={item.title}>
              {label}
              <Link
                href={isDisabled ? "/projects" : href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  isDisabled && "cursor-not-allowed opacity-45 hover:bg-transparent",
                )}
              >
                {/* Active accent bar */}
                <span
                  className={cn(
                    "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-gradient transition-all duration-200",
                    isActive ? "opacity-100" : "opacity-0",
                  )}
                />
                <Icon
                  className={cn(
                    "h-[1.05rem] w-[1.05rem] shrink-0 transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
                <span className="truncate">{item.title}</span>
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="shrink-0 border-t border-border/60 p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-[1.05rem] w-[1.05rem] shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
