"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, FolderKanban, Globe2, Sparkles } from "lucide-react";

import { useProjectStore } from "@/store/projectStore";

export default function DashboardPage() {
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
          error instanceof Error ? error.message : "Failed to load dashboard projects.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadProjects();
  }, [fetchProjects]);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-border/60 bg-card px-6 py-8 shadow-glow md:px-8">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
          Dashboard
        </p>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">
              Your projects at a glance
            </h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Jump into any project to run audits, generate prompts and content, benchmark competitors, and schedule automated fixes.
            </p>
          </div>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
          >
            <Sparkles className="h-4 w-4" />
            Create new project
          </Link>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      {isLoading || isLoadingProjects ? (
        <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 text-sm text-muted-foreground">
          Loading your projects...
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              onClick={() => setActiveProjectId(project.id)}
              className="group rounded-[1.5rem] border border-border/70 bg-card p-6 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Globe2 className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-foreground">{project.name}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {project.url}
              </p>
              <div className="mt-5 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <span>
                  {project.last_audited_at
                    ? `Audited ${new Date(project.last_audited_at).toLocaleDateString()}`
                    : "No audit yet"}
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                  Open
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}

          <Link
            href="/projects/new"
            className="flex min-h-[240px] flex-col justify-between rounded-[1.5rem] border border-dashed border-border bg-card p-6 transition hover:border-primary/50 hover:bg-muted/30"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">Create a new project</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Add another site and start using all 12 platform features from one shell.
              </p>
            </div>
          </Link>
        </section>
      )}
    </div>
  );
}
