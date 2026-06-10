"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentType } from "react";
import {
  BarChart3,
  FolderKanban,
  Gauge,
  KeyRound,
  LineChart,
  LogOut,
  PenTool,
  RefreshCcw,
  ScanSearch,
  Settings2,
  Sparkles,
  Target,
  Wrench,
} from "lucide-react";

import { cn } from "@/lib/utils";
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
  { title: "Prompt Optimization", href: "/projects/:projectId/prompts", icon: Sparkles, requiresProject: true },
  { title: "Content Generation", href: "/projects/:projectId/content-gen", icon: PenTool, requiresProject: true },
  { title: "AI Visibility", href: "/projects/:projectId/visibility", icon: Gauge, requiresProject: true },
  { title: "Competitors", href: "/projects/:projectId/competitors", icon: Target, requiresProject: true },
  { title: "Backlinks", href: "/projects/:projectId/backlinks", icon: LineChart, requiresProject: true },
  { title: "Content Refresh", href: "/projects/:projectId/refresh", icon: RefreshCcw, requiresProject: true },
  { title: "SEO Fixes", href: "/projects/:projectId/fixes", icon: Wrench, requiresProject: true },
  { title: "LSI Keywords", href: "/projects/:projectId/lsi-keywords", icon: ScanSearch, requiresProject: true },
  { title: "Analytics", href: "/projects/:projectId", icon: BarChart3, requiresProject: true },
  { title: "RBAC Settings", href: "/settings/rbac", icon: KeyRound },
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

  if (item.href === "/settings/rbac") {
    return pathname.startsWith("/settings/rbac");
  }

  if (item.href === "/projects/:projectId" && activeProjectId) {
    return pathname === `/projects/${activeProjectId}`;
  }

  return pathname === resolvedHref || pathname.startsWith(`${resolvedHref}/`);
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

  return (
    <aside className="flex h-screen min-h-0 flex-col border-r border-border/70 bg-card/90 backdrop-blur">
      <div className="shrink-0 border-b border-border/70 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Highlight AI SEO
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
            <Settings2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Workspace Shell</h1>
            <p className="text-sm text-muted-foreground">
              Platform navigation
            </p>
          </div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const href = resolveHref(item.href, activeProjectId);
          const isDisabled = item.requiresProject && !activeProjectId;
          const isActive = isItemActive(pathname, item, href, activeProjectId);

          return (
            <Link
              key={item.title}
              href={isDisabled ? "/projects" : href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                isActive
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                isDisabled && "opacity-60",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-border/70 p-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
