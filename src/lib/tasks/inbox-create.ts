import type { ParseResult } from "@/lib/parser/parse-quick-input";

export type InboxCreateFields = {
  scheduledDate: null;
  bucketOverride: "later";
  suggestedScheduledDate: string | null;
};

/** Maps parsed composer input to the chat-first inbox landing contract. */
export function resolveInboxCreateFields(parse: ParseResult): InboxCreateFields {
  if (parse.bucketOverride === "later") {
    return { scheduledDate: null, bucketOverride: "later", suggestedScheduledDate: null };
  }
  if (parse.scheduleIsExplicit && parse.scheduledDate != null) {
    return {
      scheduledDate: null,
      bucketOverride: "later",
      suggestedScheduledDate: parse.scheduledDate,
    };
  }
  return { scheduledDate: null, bucketOverride: "later", suggestedScheduledDate: null };
}
