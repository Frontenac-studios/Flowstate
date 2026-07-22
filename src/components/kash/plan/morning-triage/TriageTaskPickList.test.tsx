import { DndContext } from "@dnd-kit/core";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { TriageTaskPickList, type TriagePickTask } from "./TriageTaskPickList";

function makeTask(overrides: Partial<TriagePickTask> = {}): TriagePickTask {
  return {
    id: "task-1",
    title: "Scope Trainer Tool Build",
    projectName: "Hume Builds",
    category: "professional",
    ...overrides,
  };
}

function renderList(ui: ReactNode) {
  return render(<DndContext>{ui}</DndContext>);
}

describe("TriageTaskPickList", () => {
  it("renders the project name inline with the title, colored by category", () => {
    renderList(<TriageTaskPickList tasks={[makeTask()]} />);

    const row = screen.getByText("Scope Trainer Tool Build");
    expect(row).toHaveTextContent("· Hume Builds");
    const name = screen.getByText(/· Hume Builds/);
    expect(name).toHaveStyle({ color: "var(--cat-professional-text)" });
  });

  it("does not render a #slug meta line", () => {
    renderList(<TriageTaskPickList tasks={[makeTask()]} />);
    expect(screen.queryByText(/#/)).toBeNull();
  });

  it("omits the project name span when the task has none", () => {
    renderList(<TriageTaskPickList tasks={[makeTask({ projectName: null })]} />);
    expect(screen.queryByText(/·/)).toBeNull();
  });

  it("renders an always-visible drag grip per row", () => {
    renderList(<TriageTaskPickList tasks={[makeTask()]} />);
    expect(screen.getByRole("button", { name: "Drag task" })).toBeInTheDocument();
  });

  it("fires onComplete once per task from the hover ✓", () => {
    const onComplete = vi.fn();
    renderList(<TriageTaskPickList tasks={[makeTask()]} onComplete={onComplete} />);

    const button = screen.getByRole("button", {
      name: "Mark Scope Trainer Tool Build completed",
    });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith("task-1");
  });

  it("renders no complete button without an onComplete handler", () => {
    renderList(<TriageTaskPickList tasks={[makeTask()]} />);
    expect(screen.queryByRole("button", { name: /completed/ })).toBeNull();
  });

  it("disables the complete button while the list is disabled", () => {
    renderList(<TriageTaskPickList tasks={[makeTask()]} onComplete={vi.fn()} disabled />);
    expect(
      screen.getByRole("button", { name: "Mark Scope Trainer Tool Build completed" })
    ).toBeDisabled();
  });
});
