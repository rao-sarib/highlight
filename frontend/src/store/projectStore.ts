"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import api from "@/lib/api";

const PROJECT_CACHE_TTL_MS = 60_000;

export interface ProjectSummary {
  id: string;
  name: string;
  url: string;
  last_audited_at: string | null;
  created_at?: string;
  updated_at?: string;
}

interface ProjectState {
  activeProjectId: string | null;
  projects: ProjectSummary[];
  projectsLoadedAt: number | null;
  isLoadingProjects: boolean;
  setActiveProjectId: (projectId: string | null) => void;
  setProjects: (projects: ProjectSummary[]) => void;
  fetchProjects: (force?: boolean) => Promise<ProjectSummary[]>;
  upsertProject: (project: ProjectSummary) => void;
  clearProjects: () => void;
  clearActiveProject: () => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      activeProjectId: null,
      projects: [],
      projectsLoadedAt: null,
      isLoadingProjects: false,
      setActiveProjectId: (projectId) => set({ activeProjectId: projectId }),
      setProjects: (projects) =>
        set({
          projects,
          projectsLoadedAt: Date.now(),
        }),
      fetchProjects: async (force = false) => {
        const { projects, projectsLoadedAt, isLoadingProjects } = get();
        const cacheIsFresh =
          !force &&
          projects.length > 0 &&
          projectsLoadedAt !== null &&
          Date.now() - projectsLoadedAt < PROJECT_CACHE_TTL_MS;

        if (cacheIsFresh) {
          return projects;
        }

        if (isLoadingProjects) {
          return projects;
        }

        set({ isLoadingProjects: true });
        try {
          const response = await api.get<ProjectSummary[]>("/projects");
          const nextProjects = response.data;
          const currentActiveId = get().activeProjectId;
          const idStillExists = nextProjects.some((p) => p.id === currentActiveId);
          set({
            projects: nextProjects,
            projectsLoadedAt: Date.now(),
            isLoadingProjects: false,
            activeProjectId: idStillExists
              ? currentActiveId
              : (nextProjects[0]?.id ?? null),
          });
          return nextProjects;
        } catch (error) {
          set({ isLoadingProjects: false });
          throw error;
        }
      },
      upsertProject: (project) => {
        const existingProjects = get().projects;
        const existingIndex = existingProjects.findIndex(
          (item) => item.id === project.id,
        );

        if (existingIndex === -1) {
          set({
            projects: [project, ...existingProjects],
            projectsLoadedAt: Date.now(),
          });
          return;
        }

        const nextProjects = [...existingProjects];
        nextProjects[existingIndex] = project;
        set({
          projects: nextProjects,
          projectsLoadedAt: Date.now(),
        });
      },
      clearProjects: () =>
        set({
          projects: [],
          projectsLoadedAt: null,
          isLoadingProjects: false,
        }),
      clearActiveProject: () => set({ activeProjectId: null }),
    }),
    {
      name: "highlight-project-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeProjectId: state.activeProjectId,
        projects: state.projects,
        projectsLoadedAt: state.projectsLoadedAt,
      }),
    },
  ),
);
