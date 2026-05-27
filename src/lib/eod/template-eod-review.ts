import type { Top3Status } from "./types";

export type EodTemplateInput = {
  completionsToday: number;
  top3Status: Top3Status;
  focusSecondsTotal: number;
  focusTaskCount: number;
};

const SLOT_LABELS = ["①", "②", "③"] as const;

export function templateEodReview(input: EodTemplateInput): {
  summary: string;
  reflectiveQuestion: string;
} {
  const { completionsToday, top3Status, focusSecondsTotal, focusTaskCount } = input;

  const doneSlots = top3Status.slots.filter((s) => s.status === "done");
  const incompleteSlots = top3Status.slots.filter((s) => s.status === "incomplete");
  const emptySlots = top3Status.slots.filter((s) => s.status === "empty");

  const top3Line =
    doneSlots.length === 0 && incompleteSlots.length === 0
      ? "You didn't pin a Top 3 today."
      : `Top 3: ${doneSlots.length} done` +
        (incompleteSlots.length > 0 ? `, ${incompleteSlots.length} still open` : "") +
        (emptySlots.length > 0
          ? `, ${emptySlots.length} slot${emptySlots.length > 1 ? "s" : ""} empty`
          : "") +
        ".";

  const focusMinutes = Math.round(focusSecondsTotal / 60);
  const focusLine =
    focusTaskCount === 0
      ? "No focus sessions were logged today."
      : `You logged about **${focusMinutes}** minute${focusMinutes === 1 ? "" : "s"} of focus across **${focusTaskCount}** task${focusTaskCount === 1 ? "" : "s"}.`;

  const summary = [
    `You completed **${completionsToday}** task${completionsToday === 1 ? "" : "s"} today.`,
    top3Line,
    focusLine,
  ].join(" ");

  let reflectiveQuestion =
    "What felt most meaningful today, and what would you like to carry into tomorrow?";

  if (incompleteSlots.length > 0 && doneSlots.length === 0) {
    reflectiveQuestion =
      "Your Top 3 didn't get much movement — what got in the way, and is that signal worth listening to?";
  } else if (doneSlots.length === 3) {
    reflectiveQuestion =
      "You cleared your Top 3 — what helped you stay focused, and how can you repeat it?";
  }

  return { summary, reflectiveQuestion };
}

export function formatTop3ForPrompt(status: Top3Status): string {
  return status.slots
    .map((s) => {
      const label = SLOT_LABELS[s.order - 1] ?? `${s.order}`;
      if (s.status === "empty") return `  ${label}: (empty)`;
      return `  ${label}: ${s.title ?? "—"} — ${s.status}`;
    })
    .join("\n");
}
