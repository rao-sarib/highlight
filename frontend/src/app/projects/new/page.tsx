"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { FeaturePageFrame } from "@/components/global/feature-page-frame";
import api from "@/lib/api";
import { useProjectStore } from "@/store/projectStore";

interface ProjectResponse {
  id: string;
  name: string;
  url: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const setActiveProjectId = useProjectStore((state) => state.setActiveProjectId);
  const upsertProject = useProjectStore((state) => state.upsertProject);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await api.post<ProjectResponse>("/projects", {
        name: name.trim(),
        url: url.trim(),
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
      <section className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm">
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

          {errorMessage ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || !name.trim() || !url.trim()}
            className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Creating project..." : "Create project"}
          </button>
        </form>
      </section>
    </FeaturePageFrame>
  );
}
