import { describe, expect, it } from "vitest";

import { mergeProposals } from "./merge-proposals";
import type { ProposedAction } from "./proposed-actions";

function phaseProposal(names: string[], summary?: string): ProposedAction {
  return {
    kind: "create_phase",
    status: "pending",
    summary,
    items: names.map((name, index) => ({
      itemId: `item-${name}-${index}`,
      enabled: true,
      projectId: "11111111-1111-4111-8111-111111111111",
      projectSlug: "flowstate-x-kash",
      name,
      parentPhaseId: null,
      parentPhaseName: null,
    })),
  } as ProposedAction;
}

describe("mergeProposals", () => {
  it("returns the incoming proposal when there is nothing to merge with", () => {
    const next = phaseProposal(["Morning Triage"]);
    expect(mergeProposals(null, next)).toBe(next);
  });

  it("concatenates items when the model splits one batch across two calls", () => {
    const merged = mergeProposals(
      phaseProposal(["Morning Triage", "Calendar View"]),
      phaseProposal(["Today's Review", "Task List"])
    );

    expect(merged.kind).toBe("create_phase");
    expect(merged.items).toHaveLength(4);
    expect(merged.items.map((item) => (item as { name: string }).name)).toEqual([
      "Morning Triage",
      "Calendar View",
      "Today's Review",
      "Task List",
    ]);
  });

  it("keeps the first summary so the merged card is not renamed mid-batch", () => {
    const merged = mergeProposals(
      phaseProposal(["A"], "Nesting under Today"),
      phaseProposal(["B"], "More phases")
    );
    expect(merged.summary).toBe("Nesting under Today");
  });

  it("does not merge across different kinds", () => {
    const tasks = {
      kind: "delete_task",
      status: "pending",
      items: [{ itemId: "t1", enabled: true, taskId: "t1", title: "Task" }],
    } as ProposedAction;

    expect(mergeProposals(phaseProposal(["A"]), tasks)).toBe(tasks);
  });
});
