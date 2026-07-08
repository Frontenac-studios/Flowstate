import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Ref } from "react";

import type { PlanTaskRow } from "../TaskRow";
import { WeekInbox } from "./WeekInbox";

// TaskRow pulls in tRPC/toast/lens/dnd providers; the inbox layout is what we're
// testing here, so stub it with a lightweight list item. The stub forwards the
// P6 highlight class + ref so the pulse and scroll-into-view assertions still
// exercise the real wiring (the row renders its own <li>, no wrapper).
vi.mock("../TaskRow", () => ({
  TaskRow: ({
    task,
    highlightClassName,
    highlightRef,
  }: {
    task: { id: string; title: string };
    highlightClassName?: string;
    highlightRef?: Ref<HTMLLIElement>;
  }) => (
    <li ref={highlightRef} className={highlightClassName} data-testid={`taskrow-${task.id}`}>
      {task.title}
    </li>
  ),
}));

beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as unknown as MediaQueryList;
  }
  Element.prototype.scrollIntoView = vi.fn();
});

function makeTask(id: string, title: string): PlanTaskRow {
  return {
    id,
    title,
    priority: 0,
    projectId: null,
    projectSlug: null,
    projectName: null,
    isTop3: false,
    category: null,
    categoryUnresolved: false,
    tags: [],
    scheduledDate: null,
    suggestedScheduledDate: null,
  };
}

const baseProps = {
  heightPx: 300,
  onComplete: vi.fn(),
  onDelete: vi.fn(),
  onDraftClick: vi.fn(),
  appliedMessage: null,
  draftPanel: null,
};

describe("WeekInbox", () => {
  it("stays collapsed while empty on the execution surface", () => {
    render(<WeekInbox {...baseProps} tasks={[]} collapseWhenEmpty />);

    const header = screen.getByTitle("Double-click to collapse or expand");
    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("No unscheduled tasks")).not.toBeInTheDocument();
  });

  it("force-expands and pulses highlighted rows when tasks are created", () => {
    const tasks = [makeTask("t1", "Pay electric bill"), makeTask("t2", "Call landlord")];
    const { container } = render(
      <WeekInbox
        {...baseProps}
        tasks={tasks}
        collapseWhenEmpty
        forceExpanded
        highlightTaskIds={new Set(["t1"])}
      />
    );

    const header = screen.getByTitle("Double-click to collapse or expand");
    expect(header).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("taskrow-t1")).toBeInTheDocument();
    expect(screen.getByTestId("taskrow-t2")).toBeInTheDocument();

    const pulsing = container.querySelectorAll(".kash-section-pulse");
    expect(pulsing).toHaveLength(1);
    expect(pulsing[0]).toContainElement(screen.getByTestId("taskrow-t1"));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
});
