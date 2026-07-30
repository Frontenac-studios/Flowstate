import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import TaskContextMenu from "./TaskContextMenu";

const baseProps = {
  x: 10,
  y: 10,
  completed: false,
  onComplete: () => {},
  onEdit: () => {},
  onDelete: () => {},
  onClose: () => {},
};

describe("TaskContextMenu", () => {
  it("shows Complete / Edit / Delete for an incomplete task", () => {
    render(<TaskContextMenu {...baseProps} />);
    expect(screen.getByRole("menuitem", { name: "Complete" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeTruthy();
  });

  it("flips Complete to 'Mark not done' when completed", () => {
    render(<TaskContextMenu {...baseProps} completed />);
    expect(screen.getByRole("menuitem", { name: "Mark not done" })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "Complete" })).toBeNull();
  });

  it("reads Delete as 'Skip this occurrence' for a recurring occurrence", () => {
    render(<TaskContextMenu {...baseProps} isRecurringOccurrence />);
    expect(screen.getByRole("menuitem", { name: "Skip this occurrence" })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "Delete" })).toBeNull();
  });

  it("runs the action and closes on click", () => {
    const onDelete = vi.fn();
    const onClose = vi.fn();
    render(<TaskContextMenu {...baseProps} onDelete={onDelete} onClose={onClose} />);
    screen.getByRole("menuitem", { name: "Delete" }).click();
    expect(onDelete).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
