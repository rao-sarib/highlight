"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

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
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 backdrop-blur">
      <div className="flex flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Highlight Shell
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Navigate audits, content, and AI search workflows
          </h2>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative min-w-[240px]">
            <select
              value={activeProjectId ?? ""}
              onChange={(event) => handleProjectChange(event.target.value)}
              className="h-12 w-full appearance-none rounded-xl border border-border bg-card px-4 pr-10 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
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

          <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-sm font-semibold text-primary">
              {user?.full_name?.slice(0, 2).toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {user?.full_name ?? "Loading user"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email ?? "Authenticated session"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
