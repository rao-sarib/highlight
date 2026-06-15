"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, FolderPlus, Globe2 } from "lucide-react";

import { useProjectStore } from "@/store/projectStore";
import { FeaturePageFrame } from "@/components/global/feature-page-frame";

export default function ProjectsPage() {
  const setActiveProjectId = useProjectStore((state) => state.setActiveProjectId);
  const projects = useProjectStore((state) => state.projects);
  const fetchProjects = useProjectStore((state) => state.fetchProjects);
  const isLoadingProjects = useProjectStore((state) => state.isLoadingProjects);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadProjects = async () => {
      try {
        await fetchProjects();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load projects.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadProjects();
  }, [fetchProjects]);

  return (
    <FeaturePageFrame
      eyebrow="Projects"
      title="Your projects"
      description="Each project is a site you audit, optimize, and track."
      aside={
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
        >
          <FolderPlus className="h-4 w-4" />
          New project
        </Link>
      }
    >
      {errorMessage ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      {isLoading || isLoadingProjects ? (
        <div className="rounded-[1.5rem] border border-border/70 bg-card p-6 text-sm text-muted-foreground">
          Loading projects...
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-border bg-card p-10 text-center">
          <h2 className="text-xl font-semibold text-foreground">No projects yet</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Create your first project to start audits, prompt generation, and AI SEO workflows.
          </p>
          <Link
            href="/projects/new"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            <FolderPlus className="h-4 w-4" />
            Create your first project
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}/analysis`}
              onClick={() => setActiveProjectId(project.id)}
              className="group rounded-[1.5rem] border border-border/70 bg-card p-6 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Globe2 className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
              </div>
              <h2 className="mt-5 text-xl font-semibold text-foreground">{project.name}</h2>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                {project.url}
              </p>
              <div className="mt-5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {project.last_audited_at
                  ? `Last audited ${new Date(project.last_audited_at).toLocaleDateString()}`
                  : "Audit not run yet"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </FeaturePageFrame>
  );
}
