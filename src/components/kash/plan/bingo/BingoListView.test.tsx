import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import type { BingoGoal } from "@/lib/planning/bingo-grid";

import BingoListView from "./BingoListView";

afterEach(cleanup);

const GOALS: BingoGoal[] = [
  { id: "g1", title: "file LLC", category: "professional", cellIndex: 0, state: "active" },
  { id: "g2", title: "read 5 books", category: "body_mind", cellIndex: 1, state: "active" },
];

describe("BingoListView", () => {
  it("groups by category with capitalized, bulleted items and no cell numbering", () => {
    render(
      <BingoListView goals={GOALS} onSelectGoal={vi.fn()} onRenameGoal={vi.fn()} locked={false} />
    );

    // Stored lower-first, presented capitalized.
    expect(screen.getByText("File LLC")).toBeDefined();
    expect(screen.getByText("Read 5 books")).toBeDefined();
    expect(screen.getAllByText("•")).toHaveLength(2);
    expect(screen.queryByText(/#\d/)).toBeNull();
    expect(screen.queryByText("Group by")).toBeNull();
  });

  it("hides the tap-to-open hint when locked", () => {
    render(<BingoListView goals={GOALS} onSelectGoal={vi.fn()} onRenameGoal={vi.fn()} locked />);
    expect(screen.queryByText("tap to open")).toBeNull();
  });

  it("double-click edits a goal and commits the rename on Enter", () => {
    const onRenameGoal = vi.fn();
    render(
      <BingoListView
        goals={GOALS}
        onSelectGoal={vi.fn()}
        onRenameGoal={onRenameGoal}
        locked={false}
      />
    );

    fireEvent.doubleClick(screen.getByText("File LLC"));
    const input = screen.getByRole("textbox", { name: /edit goal/i }) as HTMLInputElement;
    expect(input.value).toBe("File LLC");

    fireEvent.change(input, { target: { value: "File the LLC paperwork" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onRenameGoal).toHaveBeenCalledWith("g1", "File the LLC paperwork");
  });

  it("does not enter edit mode when the card is locked", () => {
    const onRenameGoal = vi.fn();
    render(
      <BingoListView goals={GOALS} onSelectGoal={vi.fn()} onRenameGoal={onRenameGoal} locked />
    );

    fireEvent.doubleClick(screen.getByText("File LLC"));
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(onRenameGoal).not.toHaveBeenCalled();
  });
});
