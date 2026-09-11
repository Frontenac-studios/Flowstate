/**
 * Where a row goes when you press Tab or Shift+Tab in Plan mode.
 *
 * Kash 3.2, step 4, model A: **indent moves a row, it never changes its kind.**
 *
 * The design deck originally said indenting a top-level row would turn it into a
 * task. That reads well because while you are planning, phases and tasks feel like
 * one hierarchy at different depths. They are not: they are two tables carrying
 * different things. A task holds completion, logged time entries, tags, priority and
 * recurrence; a phase holds a date range, an estimate and children. There is no
 * conversion on the server, so changing kind would mean an insert plus a delete, and
 * logged time — which feeds the burn signal, the Ledger and the invoices — would have
 * nowhere to land. A keystroke should not be able to do that.
 *
 * So: Tab and Shift+Tab reparent. A task outdented past the top level becomes a loose
 * task on the project, which is a state the schema already has (`tasks.phaseId` is
 * nullable). Changing a row's kind stays possible as an explicit action elsewhere.
 *
 * Pure, so the rules are testable without a DOM.
 */

import type { PlanOutlineRow } from "@/lib/projects/flatten-plan-outline";

export type OutlineMove =
  | { kind: "phase"; id: string; parentPhaseId: string | null }
  | { kind: "task"; id: string; phaseId: string | null };

function parentOfPhase(rows: readonly PlanOutlineRow[], phaseId: string): string | null {
  const row = rows.find((r) => r.kind === "phase" && r.id === phaseId);
  return row?.parentPhaseId ?? null;
}

/**
 * Indent: adopt the nearest phase above this row that sits at the same depth — the
 * row's own preceding sibling, in outline terms. Null when there is nothing above it
 * to move into, which is a no-op rather than an error.
 *
 * A phase can never end up inside its own subtree, because everything beneath it in
 * the flat list comes *after* it and only preceding rows are considered.
 */
export function resolveIndent(rows: readonly PlanOutlineRow[], index: number): OutlineMove | null {
  const row = rows[index];
  if (!row) return null;

  for (let i = index - 1; i >= 0; i -= 1) {
    const candidate = rows[i];
    if (!candidate) continue;
    // Passing a shallower row means we have left this row's sibling group without
    // finding a phase to move into.
    if (candidate.depth < row.depth) return null;
    if (candidate.depth === row.depth && candidate.kind === "phase") {
      return row.kind === "phase"
        ? { kind: "phase", id: row.id, parentPhaseId: candidate.id }
        : { kind: "task", id: row.id, phaseId: candidate.id };
    }
  }

  return null;
}

/**
 * Outdent: move up to the parent of the row's current parent. At depth 0 there is
 * nowhere to go. A task leaving its last phase becomes a loose project task.
 */
export function resolveOutdent(rows: readonly PlanOutlineRow[], index: number): OutlineMove | null {
  const row = rows[index];
  if (!row || row.depth === 0 || row.parentPhaseId === null) return null;

  const grandparentId = parentOfPhase(rows, row.parentPhaseId);

  return row.kind === "phase"
    ? { kind: "phase", id: row.id, parentPhaseId: grandparentId }
    : { kind: "task", id: row.id, phaseId: grandparentId };
}

/**
 * The sort order to give a row joining `parentPhaseId`: one past whatever is already
 * there, so a moved row lands at the end of its new group rather than displacing a
 * sibling. Rows of the other kind are ignored — phases and tasks sort independently.
 */
export function nextSortOrder(
  rows: readonly PlanOutlineRow[],
  kind: "phase" | "task",
  parentPhaseId: string | null,
  movingId: string
): number {
  const siblings = rows.filter(
    (r) => r.kind === kind && r.parentPhaseId === parentPhaseId && r.id !== movingId
  );
  return siblings.length;
}
