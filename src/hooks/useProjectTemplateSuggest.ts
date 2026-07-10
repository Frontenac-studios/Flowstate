"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  isTemplateSuggestPending,
  queueTemplateSuggest,
  resolveTemplateSuggest,
  subscribeTemplateSuggestStorage,
} from "@/lib/projects/template-suggest-storage";

/**
 * Shows the template-suggest chip when a project completes (§5 P3).
 * Pending state persists in localStorage until dismiss or save-as-template.
 */
export function useProjectTemplateSuggest(projectId: string, isComplete: boolean, enabled = true) {
  const [showChip, setShowChip] = useState(false);
  const wasCompleteRef = useRef(isComplete);

  const syncPending = useCallback(() => {
    setShowChip(isTemplateSuggestPending(projectId));
  }, [projectId]);

  useEffect(() => {
    syncPending();
    return subscribeTemplateSuggestStorage(syncPending);
  }, [syncPending]);

  useEffect(() => {
    if (!enabled) return;
    if (isComplete && !wasCompleteRef.current) {
      queueTemplateSuggest(projectId);
    }
    wasCompleteRef.current = isComplete;
  }, [enabled, isComplete, projectId]);

  const dismiss = useCallback(() => {
    resolveTemplateSuggest(projectId);
  }, [projectId]);

  return { showChip, dismiss };
}
