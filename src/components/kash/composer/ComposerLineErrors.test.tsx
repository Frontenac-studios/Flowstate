import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import ComposerLineErrors, { type ComposerLineErrorGroup } from "./ComposerLineErrors";

afterEach(cleanup);

describe("ComposerLineErrors", () => {
  it("renders nothing when there are no groups", () => {
    const { container } = render(<ComposerLineErrors groups={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a line-numbered label with a one-click suggestion (Plan style)", () => {
    const onApply = vi.fn();
    const groups: ComposerLineErrorGroup[] = [
      {
        key: 0,
        label: "Line 1",
        raw: "ship it; rdn",
        messages: [{ key: "project_not_found-0", text: 'No project "rdn"' }],
        suggestions: [{ label: "rdm", onApply }],
      },
    ];

    render(<ComposerLineErrors groups={groups} />);

    expect(screen.getByText("Line 1")).toBeInTheDocument();
    expect(screen.getByText('No project "rdn"')).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "rdm" }));
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it("renders a title label with blocking messages (Projects style)", () => {
    const groups: ComposerLineErrorGroup[] = [
      {
        key: 3,
        label: "Fix login bug",
        messages: [{ key: "invalid_property-0", text: 'Invalid due: "someday"' }],
      },
    ];

    render(<ComposerLineErrors groups={groups} />);

    expect(screen.getByText("Fix login bug")).toBeInTheDocument();
    expect(screen.getByText('Invalid due: "someday"')).toBeInTheDocument();
    // No suggestions supplied → no "Did you mean" affordance.
    expect(screen.queryByText(/Did you mean/)).not.toBeInTheDocument();
  });
});
