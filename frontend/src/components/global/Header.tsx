"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, FolderKanban } from "lucide-react";

import ThemeToggle from "@/components/global/ThemeToggle";
import { useAuthStore } from "@/store/authStore";
import { useProjectStore } from "@/store/projectStore";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const fetchCurrentUser = useAuthStore((state) => state.fetchCurrentUser);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const activeProjectId = useProjectStore((state) => state.activeProjectId);
  const setActiveProjectId = useProjectStore((state) => state.setActiveProjectId);
  const projects = useProjectStore((state) => state.projects);
  const fetchProjects = useProjectStore((state) => state.fetchProjects);

  useEffect(() => {
    if (hasHydrated && isAuthenticated && !user) {
      void fetchCurrentUser();
    }
  }, [fetchCurrentUser, hasHydrated, isAuthenticated, user]);

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      void fetchProjects().catch(() => {
        // Keep shell responsive even if the selector request fails.
      });
    }
  }, [fetchProjects, hasHydrated, isAuthenticated]);

  const handleProjectChange = (projectId: string) => {
    setActiveProjectId(projectId);
    if (pathname.startsWith("/projects/") && projectId) {
      router.push(`/projects/${projectId}`);
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-5 py-3.5 md:px-8">
        {/* Active project selector */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary sm:flex">
            <FolderKanban className="h-4 w-4" />
          </div>
          <div className="relative min-w-[180px] max-w-[280px]">
            <label className="pointer-events-none absolute -top-2 left-3 hidden bg-background px-1 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:block">
              Active project
            </label>
            <select
              value={activeProjectId ?? ""}
              onChange={(event) => handleProjectChange(event.target.value)}
              className="h-11 w-full appearance-none rounded-xl border border-border bg-card px-3.5 pr-9 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
            >
              {projects.length === 0 ? (
                <option value="">No active project</option>
              ) : null}
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        {/* Right: theme + user */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/80 py-1.5 pl-1.5 pr-3.5 backdrop-blur">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-xs font-semibold text-white">
              {user?.full_name?.slice(0, 2).toUpperCase() ?? "U"}
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-semibold leading-tight text-foreground">
                {user?.full_name ?? "Loading…"}
              </p>
              <p className="truncate text-xs leading-tight text-muted-foreground">
                {user?.email ?? "Authenticated session"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
