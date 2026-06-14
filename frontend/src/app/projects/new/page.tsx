"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { FeaturePageFrame } from "@/components/global/feature-page-frame";
import api from "@/lib/api";
import { useProjectStore, type ProjectSummary } from "@/store/projectStore";

export default function NewProjectPage() {
  const router = useRouter();
  const setActiveProjectId = useProjectStore((state) => state.setActiveProjectId);
  const upsertProject = useProjectStore((state) => state.upsertProject);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [niche, setNiche] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await api.post<ProjectSummary>("/projects", {
        name: name.trim(),
        url: url.trim(),
        niche: niche.trim() || null,
        target_audience: targetAudience.trim() || null,
        description: description.trim() || null,
      });

      upsertProject(response.data);
      setActiveProjectId(response.data.id);
      router.push(`/projects/${response.data.id}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to create project.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FeaturePageFrame
      eyebrow="Projects"
      title="Create a new project"
      description="Add the site you want to audit and optimize. This becomes the home for embeddings, generated content, audits, and feature workflows."
    >
      <section className="max-w-2xl rounded-3xl border border-border/60 bg-card/80 p-6 shadow-soft backdrop-blur md:p-8">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="project-name">
              Project name
            </label>
            <input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Highlight Marketing Site"
              className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="project-url">
              Website URL
            </label>
            <input
              id="project-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
              className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
              required
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="project-niche">
                Targeted niche
              </label>
              <input
                id="project-niche"
                value={niche}
                onChange={(event) => setNiche(event.target.value)}
                placeholder="e.g. project management software"
                className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
              />
              <p className="text-xs text-muted-foreground">
                Drives the AI-visibility prompts. We also auto-detect it from your site.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="project-audience">
                Target audience
              </label>
              <input
                id="project-audience"
                value={targetAudience}
                onChange={(event) => setTargetAudience(event.target.value)}
                placeholder="e.g. small marketing teams"
                className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="project-description">
              Short description <span className="text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id="project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What does this site offer, and what makes it different?"
              className="min-h-24 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
            />
          </div>

          {errorMessage ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || !name.trim() || !url.trim()}
            className="btn-brand inline-flex h-12 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {isSubmitting ? "Creating project..." : "Create project"}
          </button>
        </form>
      </section>
    </FeaturePageFrame>
  );
}
