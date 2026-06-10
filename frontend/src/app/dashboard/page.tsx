"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, FolderKanban, Globe2, Plus, Sparkles } from "lucide-react";

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
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 px-6 py-9 shadow-soft backdrop-blur md:px-9">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-aurora opacity-90"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Workspace
            </span>
            <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-foreground">
              Your projects, <span className="text-gradient">at a glance</span>
            </h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground">
              Jump into any project to run audits, generate prompts and content, benchmark
              competitors, and schedule automated fixes.
            </p>
          </div>
          <Link
            href="/projects/new"
            className="btn-brand inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
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
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[208px] animate-pulse rounded-3xl border border-border/60 bg-muted/40"
            />
          ))}
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project, index) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              onClick={() => setActiveProjectId(project.id)}
              style={{ animationDelay: `${index * 60}ms` }}
              className="group relative animate-fade-up overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-6 shadow-soft backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-glow"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
              />
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/10">
                  <Globe2 className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <h3 className="relative mt-5 font-display text-xl font-semibold text-foreground">
                {project.name}
              </h3>
              <p className="relative mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                {project.url}
              </p>
              <div className="relative mt-5 flex items-center justify-between border-t border-border/60 pt-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">
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
            className="group flex min-h-[208px] animate-fade-up flex-col justify-between rounded-3xl border border-dashed border-border bg-card/40 p-6 transition-all duration-300 hover:border-primary/50 hover:bg-card/70"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow transition group-hover:scale-105">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-xl font-semibold text-foreground">
                Create a new project
              </h3>
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
