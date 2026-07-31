import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import type { BingoGoal } from "@/lib/planning/bingo-grid";

import BingoListView from "./BingoListView";

afterEach(cleanup);

const GOALS: BingoGoal[] = [
  { id: "g1", title: "file LLC", category: "professional", cellIndex: 0, state: "active" },
  { id: "g2", title: "read 5 books", category: "body_mind", cellIndex: 1, state: "active" },
];

describe("BingoListView", () => {
  it("groups by category with bulleted items and no cell numbering", () => {
    render(<BingoListView goals={GOALS} onSelectGoal={vi.fn()} locked={false} />);

    expect(screen.getByText("file LLC")).toBeDefined();
    expect(screen.getByText("read 5 books")).toBeDefined();
    expect(screen.getAllByText("•")).toHaveLength(2);
    expect(screen.queryByText(/#\d/)).toBeNull();
    expect(screen.queryByText("Group by")).toBeNull();
  });

  it("hides the tap-to-open hint when locked", () => {
    render(<BingoListView goals={GOALS} onSelectGoal={vi.fn()} locked />);
    expect(screen.queryByText("tap to open")).toBeNull();
  });
});
