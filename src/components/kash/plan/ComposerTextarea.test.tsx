import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { ComposerTextarea } from "./ComposerTextarea";

afterEach(cleanup);

function Harness({
  onSubmit,
  onChange,
  submitOnEnter = true,
}: {
  onSubmit?: () => void;
  onChange?: (value: string) => void;
  submitOnEnter?: boolean;
}) {
  const [value, setValue] = useState("");
  return (
    <ComposerTextarea
      id="composer"
      value={value}
      submitOnEnter={submitOnEnter}
      onSubmit={onSubmit}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      placeholder="add tasks"
    />
  );
}

describe("ComposerTextarea Enter policy (D4)", () => {
  it("submits on plain Enter", () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    fireEvent.keyDown(screen.getByPlaceholderText("add tasks"), { key: "Enter" });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("does not submit on Shift+Enter (newline)", () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    fireEvent.keyDown(screen.getByPlaceholderText("add tasks"), {
      key: "Enter",
      shiftKey: true,
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not submit while an IME composition is active", () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    fireEvent.keyDown(screen.getByPlaceholderText("add tasks"), {
      key: "Enter",
      isComposing: true,
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("leaves Enter alone when submitOnEnter is not set", () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} submitOnEnter={false} />);

    fireEvent.keyDown(screen.getByPlaceholderText("add tasks"), { key: "Enter" });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("keeps multi-line paste as one batch draft and never submits per line", () => {
    const onSubmit = vi.fn();
    const onChange = vi.fn();
    render(<Harness onSubmit={onSubmit} onChange={onChange} />);

    const textarea = screen.getByPlaceholderText("add tasks");

    // A paste inserts newlines through the change/input path, not Enter keypresses,
    // so the whole multi-line block lands as draft text without any submit firing.
    fireEvent.change(textarea, { target: { value: "buy milk\ncall vet\nplan trip" } });

    expect(onChange).toHaveBeenCalledWith("buy milk\ncall vet\nplan trip");
    expect(onSubmit).not.toHaveBeenCalled();

    // One deliberate Enter then submits every pasted line as a single batch.
    fireEvent.keyDown(textarea, { key: "Enter" });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
