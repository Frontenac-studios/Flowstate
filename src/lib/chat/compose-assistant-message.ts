import type { ProposedAction } from "@/lib/chat/proposed-actions";

// A first-person claim that the assistant *did* build a card-backed action
// ("I've proposed…", "I just staged…", "I re-created…"). This is the app-action
// sense of "propose", not the conversational "I'd propose we start with X".
const FIRST_PERSON_PROPOSAL_CLAIM =
  /\bI(?:['’]ve|\s+(?:have|just))?\s+(?:re-?)?(?:proposed|staged|created)\b/i;

// A reference to the confirm card the user is told to accept / go find.
const CARD_REFERENCE =
  /\bconfirm(?:ation)?\s+cards?\b|\b(?:accept|find)\b[^.!?\n]{0,40}\bcards?\b|\b(?:the|those|these)\s+cards?\b/i;

/**
 * True when prose claims it built a confirm card the user should accept, in the
 * app-action sense. Requires BOTH a first-person "I proposed/staged/created"
 * claim AND a confirm-card reference so it fires on hallucinated cards but not on
 * help text ("type it and accept the card that appears" — no first-person claim)
 * or advice ("I'd propose starting with the API" — no card reference).
 */
export function claimsPhantomCard(prose: string): boolean {
  return FIRST_PERSON_PROPOSAL_CLAIM.test(prose) && CARD_REFERENCE.test(prose);
}

function proposalFallback(proposal: ProposedAction): string {
  const count = proposal.items.length;
  const plural = count === 1 ? "" : "s";
  switch (proposal.kind) {
    case "create_task":
      return `Proposed ${count} task${plural} — Accept the card to add them.`;
    case "create_phase":
      return `Proposed ${count} phase${plural} — Accept the card to add them.`;
    default:
      return "Proposed an update — Accept the card to apply it.";
  }
}

/**
 * Compose the assistant message to persist from the model's prose, any proposal
 * it built, and any tool errors. Returns null when there is nothing to save.
 *
 * Belt-and-braces against phantom confirm cards — prose that narrates a card the
 * model never built:
 *   - Tool called but refused to build a card → append the real reason (#230).
 *   - No tool called at all, prose still claims a card → append a correction so
 *     the false claim can't stand alone. #230's guard only covered the first case
 *     (it keyed off tool errors); a bare hallucination produces no error to append.
 */
export function composeAssistantMessage(input: {
  prose: string;
  proposal: ProposedAction | null;
  toolErrors: string[];
}): string | null {
  const { proposal, toolErrors } = input;
  const trimmed = input.prose.trim();
  // Persist even when the model returned only a tool proposal (empty prose) so
  // the confirm card is not dropped. Summarize from the proposal when needed.
  const body = trimmed || (proposal ? proposalFallback(proposal) : null);

  let note: string | null = null;
  if (!proposal) {
    if (toolErrors.length > 0) {
      note = `⚠️ Nothing was proposed — ${toolErrors.join(" ")}`;
    } else if (claimsPhantomCard(trimmed)) {
      note = "⚠️ Nothing was actually proposed — try asking again.";
    }
  }

  const text = [body, note].filter(Boolean).join("\n\n");
  return text || null;
}
