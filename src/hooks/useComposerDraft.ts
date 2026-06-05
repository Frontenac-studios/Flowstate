"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

import {
  clearComposerDraft,
  readComposerDraft,
  writeComposerDraft,
} from "@/lib/composer/composer-draft-storage";

export function useComposerDraft(
  storageKey: string
): readonly [string, Dispatch<SetStateAction<string>>] {
  const [value, setValue] = useState("");
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    setRestored(false);
    const draft = readComposerDraft(storageKey);
    setValue(draft ?? "");
    setRestored(true);
  }, [storageKey]);

  useEffect(() => {
    if (!restored) return;
    if (value.trim()) writeComposerDraft(storageKey, value);
    else clearComposerDraft(storageKey);
  }, [value, storageKey, restored]);

  return [value, setValue] as const;
}
