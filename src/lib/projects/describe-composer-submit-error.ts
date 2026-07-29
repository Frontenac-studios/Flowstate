import { TRPCClientError } from "@trpc/client";

const FALLBACK = "Couldn't add your tasks — please try again.";

/**
 * Turns a composer submit failure into a message that says what to fix, rather
 * than the old bare "please try again". Covers the two failure surfaces:
 *  - executeComposerSubmit throwing when a parent-dir phase can't be resolved, and
 *  - the tRPC create / bulkCreate mutations rejecting (limits, ownership, Zod).
 * The raw error is still logged by the caller for anything this doesn't map.
 */
export function describeComposerSubmitError(error: unknown): string {
  // executeComposerSubmit: `phase "X" not found under parent …` — the user
  // referenced a phase in a parent dir that doesn't exist and wasn't marked to
  // create. Prefixing the segment with + creates it.
  if (error instanceof Error) {
    const phaseMatch = error.message.match(/phase "([^"]+)" not found/i);
    if (phaseMatch) {
      const name = phaseMatch[1];
      return `Couldn't find the phase "${name}" for one of your lines. Prefix it with + in the parent dir to create it (e.g. …; +${name}).`;
    }
  }

  if (error instanceof TRPCClientError) {
    const message = String(error.message ?? "");

    if (/at most 50/i.test(message)) {
      return "You can add at most 50 tasks at once. Split your paste into smaller batches.";
    }
    if (/title/i.test(message) && /500/.test(message)) {
      return "One of your task titles is too long — keep each under 500 characters.";
    }

    const code = (error.data as { code?: string } | null | undefined)?.code;
    if (code === "NOT_FOUND") {
      return "This project couldn't be found. Reload the page and try again.";
    }
    if (code === "UNAUTHORIZED") {
      return "Your session expired. Sign in again, then re-add these tasks.";
    }

    // Zod issues arrive as a JSON-array string; anything else the server sent is
    // already human-readable, so surface it instead of the generic fallback.
    if (message && !message.trimStart().startsWith("[")) {
      return message;
    }
  }

  return FALLBACK;
}
