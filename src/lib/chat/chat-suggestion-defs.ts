export type ChatSuggestionKind = "work_on" | "freeform";

export type ChatSuggestionDef = {
  id: string;
  label: string;
  kind: ChatSuggestionKind;
  /** User message text sent when the chip is clicked. */
  userText: string;
  source?: "builtin" | "custom";
  /** Chip click count for custom suggestions (from DB). */
  usageCount?: number;
};

export const CHAT_SUGGESTION_DEFS: ChatSuggestionDef[] = [
  {
    id: "work_on",
    label: "What should I work on",
    kind: "work_on",
    userText: "What should I work on",
    source: "builtin",
  },
];

export function getChatSuggestionDef(id: string): ChatSuggestionDef | undefined {
  return CHAT_SUGGESTION_DEFS.find((def) => def.id === id);
}

export function customSuggestionToDef(row: {
  id: string;
  label: string;
  userText: string;
  usageCount?: number;
}): ChatSuggestionDef {
  return {
    id: row.id,
    label: row.label,
    kind: "freeform",
    userText: row.userText,
    source: "custom",
    usageCount: row.usageCount ?? 0,
  };
}
