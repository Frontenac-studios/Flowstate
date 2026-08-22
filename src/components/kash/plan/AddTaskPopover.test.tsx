import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

// FLAGS reads process.env at module load, so the parked/un-parked split has to be
// mocked rather than set. Both branches are live code: the popover ships today with
// chat parked, and the menu returns the moment the flag is flipped back on.
const flags = vi.hoisted(() => ({ care: false, chat: true, focus: false }));
vi.mock("@/lib/flags", () => ({ FLAGS: flags }));

// vi.mock is hoisted above imports, so a static import still gets the mock.
import { AddTaskPopover, type AddTaskPopoverHandle } from "./AddTaskPopover";

afterEach(cleanup);

describe("AddTaskPopover — chat available", () => {
  beforeEach(() => {
    flags.chat = true;
  });

  it("opens on click and offers both chat and manual paths", () => {
    render(<AddTaskPopover onAskChat={() => {}} onTypeManually={() => {}} />);

    const trigger = screen.getByRole("button", { name: "Add task" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menuitem", { name: /Ask chat/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Type tasks/ })).toBeInTheDocument();
  });

  it("labels reflect the noun prop", () => {
    render(<AddTaskPopover noun="item" onAskChat={() => {}} onTypeManually={() => {}} />);

    const trigger = screen.getByRole("button", { name: "Add item" });
    fireEvent.click(trigger);
    expect(screen.getByRole("menuitem", { name: /Type items/ })).toBeInTheDocument();
  });

  it("calls onAskChat and closes when the chat action is chosen", () => {
    const onAskChat = vi.fn();
    render(<AddTaskPopover onAskChat={onAskChat} onTypeManually={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Add task" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Ask chat/ }));

    expect(onAskChat).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("calls onTypeManually and closes when the manual action is chosen", () => {
    const onTypeManually = vi.fn();
    render(<AddTaskPopover onAskChat={() => {}} onTypeManually={onTypeManually} />);

    fireEvent.click(screen.getByRole("button", { name: "Add task" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Type tasks/ }));

    expect(onTypeManually).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes on Escape and restores focus to the trigger", () => {
    render(<AddTaskPopover onAskChat={() => {}} onTypeManually={() => {}} />);

    const trigger = screen.getByRole("button", { name: "Add task" });
    fireEvent.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("exposes focusTrigger() so a collapsing composer can restore focus", () => {
    const ref = createRef<AddTaskPopoverHandle>();
    render(<AddTaskPopover ref={ref} onAskChat={() => {}} onTypeManually={() => {}} />);

    ref.current?.focusTrigger();
    expect(screen.getByRole("button", { name: "Add task" })).toHaveFocus();
  });
});

describe("AddTaskPopover — chat parked", () => {
  beforeEach(() => {
    flags.chat = false;
  });

  // This is the guard on the one thing parking chat could plausibly break: chat
  // was the primary task-creation path, so "+" has to keep creating tasks.
  it("reveals the composer directly instead of opening a one-item menu", () => {
    const onTypeManually = vi.fn();
    const onAskChat = vi.fn();
    render(<AddTaskPopover onAskChat={onAskChat} onTypeManually={onTypeManually} />);

    fireEvent.click(screen.getByRole("button", { name: "Add task" }));

    expect(onTypeManually).toHaveBeenCalledTimes(1);
    expect(onAskChat).not.toHaveBeenCalled();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("offers no route into chat at all", () => {
    render(<AddTaskPopover onAskChat={() => {}} onTypeManually={() => {}} />);

    const trigger = screen.getByRole("button", { name: "Add task" });
    expect(trigger).not.toHaveAttribute("aria-haspopup");
    expect(screen.queryByText(/Ask chat/)).not.toBeInTheDocument();
  });

  it("still exposes focusTrigger() for the collapsing composer", () => {
    const ref = createRef<AddTaskPopoverHandle>();
    render(<AddTaskPopover ref={ref} onAskChat={() => {}} onTypeManually={() => {}} />);

    ref.current?.focusTrigger();
    expect(screen.getByRole("button", { name: "Add task" })).toHaveFocus();
  });
});
