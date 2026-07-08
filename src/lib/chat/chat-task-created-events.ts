import type { ProjectCategory } from "@/lib/projects/categories";

import type { PlanningChatSurface } from "./planning-surface";

export const CHAT_TASKS_CREATED_EVENT = "kash:chat-tasks-created";

/** Metadata for a task created via a chat proposal apply. */
export type ChatCreatedTask = {
  id: string;
  title: string;
  projectId: string | null;
  phaseId: string | null;
  category: ProjectCategory | null;
  suggestedScheduledDate: string | null;
};

export type ChatTasksCreatedDetail = {
  tasks: ChatCreatedTask[];
  surface: PlanningChatSurface | null;
};

export function dispatchChatTasksCreated(detail: ChatTasksCreatedDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ChatTasksCreatedDetail>(CHAT_TASKS_CREATED_EVENT, { detail })
  );
}

export function onChatTasksCreated(handler: (detail: ChatTasksCreatedDetail) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => {
    handler((event as CustomEvent<ChatTasksCreatedDetail>).detail);
  };
  window.addEventListener(CHAT_TASKS_CREATED_EVENT, listener);
  return () => window.removeEventListener(CHAT_TASKS_CREATED_EVENT, listener);
}
