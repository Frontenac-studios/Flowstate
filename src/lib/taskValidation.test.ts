import { describe, expect, it } from "vitest";

import { getTaskTitleError, MAX_TASK_TITLE_LENGTH } from "./taskValidation";

describe("getTaskTitleError", () => {
  it("returns an error for an empty title", () => {
    expect(getTaskTitleError("")).toBe("Add a task name.");
  });

  it("returns an error for a whitespace-only title", () => {
    expect(getTaskTitleError("   \n\t")).toBe("Add a task name.");
  });

  it("returns null for a valid title", () => {
    expect(getTaskTitleError("Write the plan")).toBeNull();
  });

  it("returns null at exactly the max length", () => {
    expect(getTaskTitleError("a".repeat(MAX_TASK_TITLE_LENGTH))).toBeNull();
  });

  it("returns an error when the trimmed title exceeds the max length", () => {
    expect(getTaskTitleError("a".repeat(MAX_TASK_TITLE_LENGTH + 1))).toBe(
      `Task is too long — keep it under ${MAX_TASK_TITLE_LENGTH} characters.`
    );
  });

  it("ignores surrounding whitespace when measuring length", () => {
    const title = `  ${"a".repeat(MAX_TASK_TITLE_LENGTH)}  `;
    expect(getTaskTitleError(title)).toBeNull();
  });
});
