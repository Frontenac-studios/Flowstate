import { COMPOSER_DRAFT_PREFIX } from "./composer-draft-constants";

export function composerDraftKey(scope: string): string {
  return `${COMPOSER_DRAFT_PREFIX}${scope}`;
}

function readLocal(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* ignore quota / private mode */
  }
}

export function readComposerDraft(scope: string): string | null {
  return readLocal(composerDraftKey(scope));
}

export function writeComposerDraft(scope: string, text: string): void {
  writeLocal(composerDraftKey(scope), text);
}

export function clearComposerDraft(scope: string): void {
  writeLocal(composerDraftKey(scope), null);
}
