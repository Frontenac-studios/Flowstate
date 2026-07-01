import { describe, expect, it } from "vitest";

import { normalizeChatToolProposal } from "@/server/about-me/normalize-tool-proposal";

describe("normalizeChatToolProposal", () => {
  it("maps work prose fields", () => {
    expect(
      normalizeChatToolProposal({
        targetSection: "work",
        text: "Prefers async updates.",
        sourceText: "what you said in chat",
      })
    ).toMatchObject({ targetSection: "work" });
  });
});
