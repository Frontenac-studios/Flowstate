"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { readMotionDurationMs, MOTION_TOKEN } from "@/lib/animate/motion-tokens";
import { isProjectComplete } from "@/lib/projects/is-project-complete";

type ProjectProgressRow = {
  id: string;
  taskCount: number;
  completedCount: number;
};

export function useProjectFoldTransitions<T extends ProjectProgressRow>(projects: T[]) {
  const seeded = useRef(false);
  const seen = useRef(new Set<string>());
  const [foldingId, setFoldingId] = useState<string | null>(null);
  const [filedIds, setFiledIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!projects.length) return;

    if (!seeded.current) {
      seeded.current = true;
      const initial = new Set<string>();
      for (const project of projects) {
        if (isProjectComplete(project)) {
          initial.add(project.id);
          seen.current.add(project.id);
        }
      }
      if (initial.size) setFiledIds(initial);
      return;
    }

    for (const project of projects) {
      if (!isProjectComplete(project) || seen.current.has(project.id) || foldingId) return;
      seen.current.add(project.id);
      setFoldingId(project.id);
      const timer = window.setTimeout(() => {
        setFoldingId(null);
        setFiledIds((prev) => new Set(prev).add(project.id));
      }, readMotionDurationMs(MOTION_TOKEN.medium));
      return () => window.clearTimeout(timer);
    }
  }, [projects, foldingId]);

  return useMemo(() => {
    const activeProjects: T[] = [];
    const completedProjects: T[] = [];
    for (const project of projects) {
      (filedIds.has(project.id) ? completedProjects : activeProjects).push(project);
    }
    return { activeProjects, completedProjects, foldingId };
  }, [projects, filedIds, foldingId]);
}
