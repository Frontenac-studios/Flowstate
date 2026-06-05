export const COMPOSER_DRAFT_PREFIX = "kash:composer-draft:";

export const COMPOSER_DRAFT_KEYS = {
  planDay: "plan-day",
  planThisWeek: "plan-this-week",
  planWeek: "plan-week",
} as const;

export function projectComposerDraftScope(projectId: string): string {
  return `project:${projectId}`;
}
