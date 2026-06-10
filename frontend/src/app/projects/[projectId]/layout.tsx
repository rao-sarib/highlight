"use client";

import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";

import api from "@/lib/api";
import { useProjectStore } from "@/store/projectStore";

export default function ProjectLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const setActiveProjectId = useProjectStore((state) => state.setActiveProjectId);
  const clearActiveProject = useProjectStore((state) => state.clearActiveProject);

  useEffect(() => {
    if (!params?.projectId) return;

    setActiveProjectId(params.projectId);

    // Verify the project actually exists for the current user.
    // On 404 (stale ID, wrong user, deleted project) clear state and go back.
    api.get(`/projects/${params.projectId}`).catch((error: Error) => {
      if (
        error.message.includes("not found") ||
        error.message.includes("404") ||
        error.message.includes("Not found")
      ) {
        clearActiveProject();
        router.replace("/projects");
      }
    });
  }, [params?.projectId, setActiveProjectId, clearActiveProject, router]);

  return <>{children}</>;
}
