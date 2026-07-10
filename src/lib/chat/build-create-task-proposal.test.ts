import { describe, expect, it } from "vitest";

import { buildCreateTaskProposal } from "./build-create-task-proposal";
import { createCaptureContext } from "./capture-context";

const PROJECT_ID = "00000000-0000-4000-8000-000000000001";
const PHASE_ID = "00000000-0000-4000-8000-000000000002";

function createItem(action: ReturnType<typeof buildCreateTaskProposal>) {
  if (!action.ok) throw new Error(`expected ok proposal, got: ${action.error}`);
  const { proposal } = action;
  if (proposal.kind !== "create_task") throw new Error("expected a create_task proposal");
  const item = proposal.items[0];
  if (!item) throw new Error("proposal had no items");
  return item;
}

describe("buildCreateTaskProposal", () => {
  it("errors when no titled tasks are supplied", () => {
    expect(buildCreateTaskProposal({ tasks: [] })).toEqual({
      ok: false,
      error: "tasks array is required",
    });
    expect(buildCreateTaskProposal({ tasks: [{ title: "   " }] })).toEqual({
      ok: false,
      error: "tasks array is required",
    });
  });

  it("row 1 (Week): demotes a model scheduledDate to a suggested date, no schedule", () => {
    const item = createItem(
      buildCreateTaskProposal(
        { tasks: [{ title: "pay water bill", scheduledDate: "2026-07-09" }] },
        createCaptureContext({ surface: "week", defaultBucket: "inbox" })
      )
    );
    expect(item.title).toBe("pay water bill");
    expect(item.suggestedDate).toBe("2026-07-09");
    expect(item.scheduledDate).toBeNull();
    expect(item.projectSlug).toBeNull();
    expect(item.category).toBeUndefined();
  });

  it("ignores a malformed scheduledDate (kept as null suggestion)", () => {
    const item = createItem(
      buildCreateTaskProposal({ tasks: [{ title: "task", scheduledDate: "next thursday" }] })
    );
    expect(item.suggestedDate).toBeNull();
  });

  it("row 2 (Projects): inherits project slug and phase from capture context", () => {
    const item = createItem(
      buildCreateTaskProposal(
        { tasks: [{ title: "order dumpster" }] },
        createCaptureContext({
          surface: "projects",
          projectId: PROJECT_ID,
          projectSlug: "demolition",
          phaseId: PHASE_ID,
          phaseName: "Demolition",
          category: "personal_projects",
        })
      )
    );
    expect(item.projectSlug).toBe("demolition");
    expect(item.phaseId).toBe(PHASE_ID);
    expect(item.phaseName).toBe("Demolition");
    expect(item.category).toBe("personal_projects");
  });

  it("prefers explicit item fields over capture context", () => {
    const item = createItem(
      buildCreateTaskProposal(
        {
          tasks: [
            {
              title: "order dumpster",
              projectSlug: "other-project",
              phaseName: "Framing",
              category: "professional",
            },
          ],
        },
        createCaptureContext({
          surface: "projects",
          projectSlug: "demolition",
          phaseName: "Demolition",
          category: "personal_projects",
        })
      )
    );
    expect(item.projectSlug).toBe("other-project");
    expect(item.phaseName).toBe("Framing");
    expect(item.category).toBe("professional");
  });

  it("row 3 (category lens): keeps an explicit category with no project/phase", () => {
    const item = createItem(
      buildCreateTaskProposal(
        { tasks: [{ title: "renew passport" }] },
        createCaptureContext({ surface: "projects", category: "adulting", defaultBucket: "inbox" })
      )
    );
    expect(item.category).toBe("adulting");
    expect(item.projectSlug).toBeNull();
    expect(item.phaseName).toBeNull();
    // phaseId comes from capture context (undefined here) — not forced to null.
    expect(item.phaseId).toBeUndefined();
  });

  it("passes through an explicit phaseId=null (project loose bucket) over capture phase", () => {
    const item = createItem(
      buildCreateTaskProposal(
        { tasks: [{ title: "loose task", phaseId: null }] },
        createCaptureContext({ surface: "projects", projectSlug: "reno", phaseId: PHASE_ID })
      )
    );
    expect(item.phaseId).toBeNull();
  });

  it("drops an invalid category and falls back to capture context", () => {
    const item = createItem(
      buildCreateTaskProposal(
        { tasks: [{ title: "task", category: "not-a-category" }] },
        createCaptureContext({ surface: "week", category: "body_mind" })
      )
    );
    expect(item.category).toBe("body_mind");
  });

  it("passes through tags, estimate, and priority", () => {
    const item = createItem(
      buildCreateTaskProposal({
        tasks: [{ title: "task", tags: ["errand", "home"], timeEstimateMinutes: 45, priority: 2 }],
      })
    );
    expect(item.tags).toEqual(["errand", "home"]);
    expect(item.timeEstimateMinutes).toBe(45);
    expect(item.priority).toBe(2);
  });

  it("maps multiple tasks and carries the summary", () => {
    const action = buildCreateTaskProposal({
      tasks: [{ title: "one" }, { title: "two" }],
      summary: "Two errands",
    });
    if (!action.ok) throw new Error("expected ok");
    expect(action.proposal.items).toHaveLength(2);
    expect(action.proposal.summary).toBe("Two errands");
    // Each row gets a distinct id.
    const [a, b] = action.proposal.items;
    expect(a!.itemId).not.toBe(b!.itemId);
  });
});
