"use client";

import { useCallback, useEffect, useState } from "react";

import api from "@/lib/api";

export interface ProjectContext {
  project_id: string;
  niche: string;
  detected_niche: string | null;
  target_audience: string | null;
  keywords: string[];
  primary_keyword: string | null;
  has_audit: boolean;
}

/**
 * Fetches the auto-mode context for a project (detected niche, keywords, audit
 * status) so feature pages can run with zero manual input and prefill chips.
 */
export function useProjectContext(projectId: string | undefined) {
  const [context, setContext] = useState<ProjectContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const response = await api.get<ProjectContext>(`/projects/${projectId}/context`);
      setContext(response.data);
    } catch {
      setContext(null);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { context, isLoading, refresh };
}
