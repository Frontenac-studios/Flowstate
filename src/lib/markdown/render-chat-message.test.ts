import { describe, expect, it } from "vitest";

import { parseChatMessageSegments } from "./render-chat-message";

describe("parseChatMessageSegments", () => {
  it("parses task backticks and bold", () => {
    expect(parseChatMessageSegments("Work on `Ship fix` next — it is **Top 3**.")).toEqual([
      { type: "text", value: "Work on " },
      { type: "task", value: "Ship fix" },
      { type: "text", value: " next — it is " },
      { type: "bold", value: "Top 3" },
      { type: "text", value: "." },
    ]);
  });

  it("returns plain text when no markers", () => {
    expect(parseChatMessageSegments("Hello there.")).toEqual([
      { type: "text", value: "Hello there." },
    ]);
  });
});
